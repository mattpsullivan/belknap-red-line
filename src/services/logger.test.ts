import { describe, it, expect } from 'vitest'
import { createLogger, type LogEntry, type LogSink } from './logger'

/** In-memory sink - state-based, no mock framework (docs/TESTING.md). */
function memSink(seed: LogEntry[] = []) {
  const rows: LogEntry[] = [...seed]
  const sink: LogSink & { rows: LogEntry[]; writes: number } = {
    rows,
    writes: 0,
    async write(entries) {
      sink.writes++
      rows.push(...entries)
    },
    async readAll() {
      return rows.slice()
    },
    async clear() {
      rows.length = 0
    },
  }
  return sink
}

function fixedClock(start = 1000, step = 1000) {
  let t = start - step
  return () => (t += step)
}

describe('createLogger - structured events', () => {
  it('records category, event and flat data', () => {
    const log = createLogger({ now: () => 5 })
    log.event('gps', 'fix', { outcome: 'accepted', accuracy: 4.5 })
    expect(log.entries()).toEqual([
      { ts: 5, level: 'info', cat: 'gps', event: 'fix', data: { outcome: 'accepted', accuracy: 4.5 } },
    ])
  })

  it('omits undefined fields rather than serialising them', () => {
    const log = createLogger()
    log.event('gps', 'fix', { lat: 43.5, altitude: undefined })
    expect(log.entries()[0].data).toEqual({ lat: 43.5 })
  })

  it('stringifies values that would not survive IndexedDB', () => {
    const log = createLogger()
    log.event('app', 'x', { err: new Error('nope'), obj: { a: 1 } })
    const d = log.entries()[0].data!
    expect(String(d.err)).toContain('Error: nope')
    expect(d.obj).toBe('{"a":1}')
  })

  it('carries a level so warnings can be filtered out of a large export', () => {
    const log = createLogger()
    log.event('health', 'heartbeat', { seq: 1 }, 'debug')
    log.event('health', 'status.change', { to: 'stalled' }, 'warn')
    expect(log.entries().map((e) => e.level)).toEqual(['debug', 'warn'])
  })
})

describe('createLogger - batching and persistence', () => {
  it('does not write until the batch fills', async () => {
    const sink = memSink()
    const log = createLogger({ sink, batchSize: 3 })
    log.event('gps', 'fix')
    log.event('gps', 'fix')
    expect(sink.writes).toBe(0)
    log.event('gps', 'fix')
    await log.flush()
    expect(sink.rows).toHaveLength(3)
  })

  it('flush persists a partial batch', async () => {
    const sink = memSink()
    const log = createLogger({ sink, batchSize: 100 })
    log.event('app', 'startup')
    await log.flush()
    expect(sink.rows).toHaveLength(1)
  })

  it('never writes the same entry twice', async () => {
    const sink = memSink()
    const log = createLogger({ sink, batchSize: 2 })
    for (let i = 0; i < 5; i++) log.event('gps', 'fix', { i })
    await log.flush()
    expect(sink.rows.map((r) => r.data!.i)).toEqual([0, 1, 2, 3, 4])
  })

  it('keeps recording when the sink fails', async () => {
    const failing: LogSink = {
      write: () => Promise.reject(new Error('quota')),
      readAll: async () => [],
      clear: async () => {},
    }
    const log = createLogger({ sink: failing, batchSize: 1 })
    log.event('gps', 'fix')
    await expect(log.flush()).resolves.toBeUndefined()
    expect(log.entries()).toHaveLength(1)
  })

  it('readAll returns persisted entries oldest first, including a prior session', async () => {
    const sink = memSink([
      { ts: 200, level: 'info', cat: 'app', event: 'old' },
      { ts: 100, level: 'info', cat: 'app', event: 'older' },
    ])
    const log = createLogger({ sink, now: () => 300 })
    log.event('app', 'new')
    const all = await log.readAll()
    expect(all.map((e) => e.event)).toEqual(['older', 'old', 'new'])
  })

  it('caps the in-memory tail without losing persisted rows', async () => {
    const sink = memSink()
    const log = createLogger({ sink, memoryCapacity: 2, batchSize: 1 })
    for (let i = 0; i < 5; i++) log.event('gps', 'fix', { i })
    await log.flush()
    expect(log.entries()).toHaveLength(2)
    expect(sink.rows).toHaveLength(5)
  })
})

describe('createLogger - JSONL', () => {
  it('emits a header line then one JSON object per entry', () => {
    const log = createLogger({ now: fixedClock(0, 0) })
    log.event('gps', 'fix', { outcome: 'accepted' })
    const out = log.format(log.entries(), { app: 'Belknap Tracker' })
    const lines = out.trim().split('\n')
    expect(JSON.parse(lines[0])).toMatchObject({ type: 'header', app: 'Belknap Tracker' })
    expect(JSON.parse(lines[1])).toMatchObject({
      t: '1970-01-01T00:00:00.000Z',
      lvl: 'info',
      cat: 'gps',
      ev: 'fix',
      outcome: 'accepted',
    })
  })

  it('produces one parseable object per line', () => {
    const log = createLogger()
    log.event('health', 'heartbeat', { seq: 1 })
    log.event('health', 'heartbeat', { seq: 2 })
    const lines = log.format(log.entries()).trim().split('\n')
    expect(lines).toHaveLength(3) // header + 2
    expect(() => lines.forEach((l) => JSON.parse(l))).not.toThrow()
  })

  it('survives a message containing newlines and quotes', () => {
    const log = createLogger()
    log.error('line one\nline "two"')
    const lines = log.format(log.entries()).trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1]).message).toBe('line one\nline "two"')
  })
})

describe('createLogger - console capture', () => {
  it('routes error() into the error category', () => {
    const log = createLogger()
    log.error('boom', { code: 42 })
    const e = log.entries()[0]
    expect(e.cat).toBe('error')
    expect(e.data!.message).toBe('boom {"code":42}')
  })

  it('clear empties memory and the sink', async () => {
    const sink = memSink()
    const log = createLogger({ sink, batchSize: 1 })
    log.event('app', 'x')
    await log.flush()
    await log.clear()
    expect(log.entries()).toEqual([])
    expect(sink.rows).toEqual([])
  })
})
