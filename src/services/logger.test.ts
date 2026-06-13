import { describe, it, expect } from 'vitest'
import { createLogger, type LogEntry } from './logger'

function memStorage(seed?: LogEntry[]) {
  const map = new Map<string, string>()
  if (seed) map.set('belknap-debug-log', JSON.stringify(seed))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

function fixedClock() {
  let t = 1_000
  return () => (t += 1000) // advances 1s per call
}

describe('createLogger', () => {
  it('records entries with level and joined message', () => {
    const log = createLogger({ storage: memStorage(), now: fixedClock() })
    log.error('boom', { code: 42 })
    const [e] = log.entries()
    expect(e.level).toBe('error')
    expect(e.message).toBe('boom {"code":42}')
  })

  it('serializes Error objects with stack', () => {
    const log = createLogger({ storage: memStorage() })
    log.error(new Error('nope'))
    expect(log.entries()[0].message).toContain('Error: nope')
  })

  it('caps the ring buffer at capacity', () => {
    const log = createLogger({ storage: memStorage(), capacity: 3 })
    for (let i = 0; i < 10; i++) log.info(`m${i}`)
    const msgs = log.entries().map((e) => e.message)
    expect(msgs).toEqual(['m7', 'm8', 'm9'])
  })

  it('persists to storage and hydrates a new instance', () => {
    const storage = memStorage()
    const a = createLogger({ storage })
    a.warn('persisted')
    const b = createLogger({ storage })
    expect(b.entries().map((e) => e.message)).toEqual(['persisted'])
  })

  it('clear empties the buffer and storage', () => {
    const storage = memStorage()
    const log = createLogger({ storage })
    log.info('x')
    log.clear()
    expect(log.entries()).toEqual([])
    expect(storage.getItem('belknap-debug-log')).toBeNull()
  })

  it('format includes the header and ISO-stamped levelled lines', () => {
    const log = createLogger({ storage: memStorage(), now: () => 0 })
    log.error('kaboom')
    const out = log.format({ app: 'Belknap Tracker', platform: 'android' })
    expect(out).toContain('app: Belknap Tracker')
    expect(out).toContain('platform: android')
    expect(out).toContain('1970-01-01T00:00:00.000Z [ERROR] kaboom')
  })
})
