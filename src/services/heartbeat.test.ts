import { describe, it, expect } from 'vitest'
import { createHeartbeatSource, type HeartbeatTick } from './heartbeat'

describe('createHeartbeatSource', () => {
  it('falls back to a JS timer off-device and labels it as such', async () => {
    // jsdom is not a native platform. The label matters: a throttled JS tick and a
    // native one mean completely different things when reading a hike log, and
    // must never be confused.
    const source = createHeartbeatSource()
    const ticks: HeartbeatTick[] = []
    const kind = await source.start(10, (t) => ticks.push(t))
    expect(kind).toBe('fallback')

    await new Promise((r) => setTimeout(r, 45))
    await source.stop()

    expect(ticks.length).toBeGreaterThanOrEqual(2)
    expect(ticks.every((t) => t.fallback)).toBe(true)
  })

  it('numbers ticks and reports where each should have landed', async () => {
    const source = createHeartbeatSource()
    const ticks: HeartbeatTick[] = []
    await source.start(10, (t) => ticks.push(t))
    await new Promise((r) => setTimeout(r, 45))
    await source.stop()

    expect(ticks.map((t) => t.seq).slice(0, 3)).toEqual([1, 2, 3])
    // expectedAt is what makes drift computable without a second timer.
    for (const t of ticks) expect(typeof t.expectedAt).toBe('number')
    expect(ticks[0].elapsedMs).toBeGreaterThan(0)
  })

  it('stops delivering ticks after stop()', async () => {
    const source = createHeartbeatSource()
    let count = 0
    await source.start(10, () => count++)
    await new Promise((r) => setTimeout(r, 35))
    await source.stop()
    const settled = count

    await new Promise((r) => setTimeout(r, 35))
    expect(count).toBe(settled)
  })

  it('is safe to stop when never started', async () => {
    await expect(createHeartbeatSource().stop()).resolves.toBeUndefined()
  })

  it('replaces an existing tick rather than stacking two', async () => {
    // Two concurrent sources would double every liveness entry in the log.
    const source = createHeartbeatSource()
    const seqs: number[] = []
    await source.start(10, (t) => seqs.push(t.seq))
    await source.start(10, (t) => seqs.push(t.seq))
    await new Promise((r) => setTimeout(r, 35))
    await source.stop()

    // A restart resets numbering, so a stacked timer would show duplicate 1s.
    expect(seqs.filter((s) => s === 1)).toHaveLength(1)
  })
})
