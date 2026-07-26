import { describe, it, expect } from 'vitest'
import { createTrackingService, type TrackStore } from './trackingService'
import type {
  GeolocationProvider,
  GeoPosition,
  PositionCallback,
  ErrorCallback,
} from '@/services/geolocation'
import type { GPSTrack } from '@/types'

/**
 * Null provider: `emit` pushes a position through the registered callback, and
 * the trackers record what the service asked of the infrastructure. Mirrors
 * createNullBackgroundGeolocationClient - state-based, no mock framework.
 */
function nullProvider() {
  let onPos: PositionCallback | null = null
  let onErr: ErrorCallback | null = null
  const p = {
    supportsBackground: true,
    startCount: 0,
    stopCount: 0,
    async startWatching(a: PositionCallback, b: ErrorCallback) {
      p.startCount++
      onPos = a
      onErr = b
      return 'null-watcher'
    },
    async stopWatching() {
      p.stopCount++
    },
    async checkPermissions() {
      return { location: 'granted' as const }
    },
    async requestPermissions() {
      return { location: 'granted' as const }
    },
    async openSettings() {},
    emit(pos: GeoPosition) {
      onPos?.(pos)
    },
    emitError(message: string) {
      onErr?.({ code: 2, message } as Parameters<ErrorCallback>[0])
    },
  }
  return p as typeof p & GeolocationProvider
}

/** In-memory tracks table, recording every write so batching is observable. */
function nullStore() {
  const rows = new Map<number, GPSTrack>()
  let nextId = 1
  const s = {
    rows,
    updates: [] as Partial<GPSTrack>[],
    async add(t: GPSTrack) {
      const id = nextId++
      rows.set(id, { ...t, id })
      return id
    },
    async update(id: number, changes: Partial<GPSTrack>) {
      s.updates.push(changes)
      rows.set(id, { ...rows.get(id)!, ...changes })
      return 1
    },
    async delete(id: number) {
      rows.delete(id)
    },
  }
  return s as typeof s & TrackStore
}

/** A clock the test advances explicitly, so throttling is deterministic. */
function clock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

const fix = (lat: number, lng: number, over: Partial<GeoPosition> = {}): GeoPosition => ({
  lat,
  lng,
  accuracy: 5,
  timestamp: 1_700_000_000_000,
  ...over,
})

/** ~11 m apart per 0.0001 degree of latitude. */
const walk = (i: number) => fix(43.513 + i * 0.0001, -71.373)

function setup(over: Parameters<typeof createTrackingService>[0] = {}) {
  const provider = nullProvider()
  const store = nullStore()
  const c = clock()
  const service = createTrackingService({ provider, store, now: c.now, ...over })
  return { provider, store, clock: c, service }
}

describe('persistence without React', () => {
  it('writes points to the store driven only by the provider callback', async () => {
    // The crux. There is no React in this test at all - no render, no effect, no
    // hook. If this passes, recording no longer depends on the render loop.
    const { provider, store, clock, service } = setup({ batchSize: 3 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()

    for (let i = 0; i < 3; i++) {
      provider.emit(walk(i))
      clock.advance(6000)
    }
    await service.flush()

    const row = [...store.rows.values()][0]
    expect(row.points).toHaveLength(3)
    expect(row.points.map((p) => p.lat)).toEqual([43.513, 43.5131, 43.5132])
  })

  it('persists incrementally, so a kill mid-recording keeps what came before', async () => {
    // The old code held the track in useState and only wrote on stop, so a kill
    // at minute 90 lost everything.
    const { provider, store, clock, service } = setup({ batchSize: 2 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()

    for (let i = 0; i < 4; i++) {
      provider.emit(walk(i))
      clock.advance(6000)
    }
    await service.flush()

    // Never stopped the recording - the store already holds the points.
    expect(service.getSnapshot().isRecording).toBe(true)
    expect([...store.rows.values()][0].points).toHaveLength(4)
  })

  it('batches rather than writing once per point', async () => {
    const { provider, store, clock, service } = setup({ batchSize: 5, batchMs: 10 ** 9 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    const writesAfterStart = store.updates.length

    for (let i = 0; i < 4; i++) {
      provider.emit(walk(i))
      clock.advance(6000)
    }
    expect(store.updates.length).toBe(writesAfterStart) // under batchSize
    provider.emit(walk(4))
    await Promise.resolve()
    expect(store.updates.length).toBeGreaterThan(writesAfterStart)
  })

  it('flushes on demand even below the batch threshold', async () => {
    const { provider, store, clock, service } = setup({ batchSize: 100, batchMs: 10 ** 9 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    clock.advance(6000)
    provider.emit(walk(1))
    await service.flush()
    expect([...store.rows.values()][0].points).toHaveLength(2)
  })

  it('keeps recording when a write fails', async () => {
    const { provider, clock, service } = setup({
      batchSize: 1,
      store: {
        add: async () => 1,
        update: () => Promise.reject(new Error('quota')),
        delete: async () => {},
      },
    })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    expect(() => provider.emit(walk(0))).not.toThrow()
    clock.advance(6000)
    provider.emit(walk(1))
    await service.flush()
    expect(service.getSnapshot().trackPoints).toHaveLength(2)
  })
})

describe('filters', () => {
  it('throttles points closer together than throttleMs', async () => {
    const { provider, clock, service } = setup()
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    clock.advance(1000) // under the 5s default
    provider.emit(walk(5))
    expect(service.getSnapshot().trackPoints).toHaveLength(1)
  })

  it('drops points that have not moved far enough', async () => {
    const { provider, clock, service } = setup()
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    provider.emit(fix(43.513, -71.373))
    clock.advance(6000)
    provider.emit(fix(43.51301, -71.373)) // ~1 m
    expect(service.getSnapshot().trackPoints).toHaveLength(1)
  })

  it('records liveness for a filtered fix - a discarded fix is still a fix', async () => {
    // The distinction that made 2026-07-25 undiagnosable.
    const { provider, clock, service } = setup()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    const first = service.getSnapshot().lastFixAt
    clock.advance(1000)
    provider.emit(walk(0)) // throttled AND unmoved
    expect(service.getSnapshot().lastFixAt).toBeGreaterThan(first!)
  })

  it('accumulates distance only from accepted points', async () => {
    const { provider, clock, service } = setup()
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    clock.advance(6000)
    provider.emit(walk(1))
    const d = service.getSnapshot().totalDistance
    expect(d).toBeGreaterThan(5)
    expect(d).toBeLessThan(20)
  })

  it('does not record points when watching but not recording', async () => {
    const { provider, store, clock, service } = setup()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    clock.advance(6000)
    provider.emit(walk(1))
    expect(service.getSnapshot().trackPoints).toEqual([])
    expect(store.rows.size).toBe(0)
    expect(service.getSnapshot().position).not.toBeNull()
  })
})

describe('snapshot contract', () => {
  it('returns a stable reference until something changes', () => {
    // useSyncExternalStore compares by identity; an unstable snapshot loops.
    const { service } = setup()
    expect(service.getSnapshot()).toBe(service.getSnapshot())
  })

  it('changes identity when a fix arrives', async () => {
    const { provider, service } = setup()
    service.startWatching()
    await Promise.resolve()
    const before = service.getSnapshot()
    provider.emit(walk(0))
    expect(service.getSnapshot()).not.toBe(before)
  })

  it('notifies subscribers and stops after unsubscribe', async () => {
    const { provider, clock, service } = setup()
    let calls = 0
    const off = service.subscribe(() => calls++)
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    expect(calls).toBeGreaterThan(0)
    const seen = calls
    off()
    clock.advance(6000)
    provider.emit(walk(1))
    expect(calls).toBe(seen)
  })
})

describe('lifecycle', () => {
  it('starts exactly one watch even if asked twice', async () => {
    // @capgo exposes a single background watch and nativeProvider throws on a
    // second, so the service must never double-subscribe.
    const { provider, service } = setup()
    service.startWatching()
    await Promise.resolve()
    service.startWatching()
    await Promise.resolve()
    expect(provider.startCount).toBe(1)
  })

  it('stops the provider watch', async () => {
    const { provider, service } = setup()
    service.startWatching()
    await Promise.resolve()
    service.stopWatching()
    await Promise.resolve()
    expect(provider.stopCount).toBe(1)
    expect(service.getSnapshot().isWatching).toBe(false)
  })

  it('stopRecording writes endedAt and the final points', async () => {
    const { provider, store, clock, service } = setup({ batchSize: 100, batchMs: 10 ** 9 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()
    provider.emit(walk(0))
    clock.advance(6000)
    provider.emit(walk(1))
    const id = await service.stopRecording()

    const row = store.rows.get(id!)!
    expect(row.points).toHaveLength(2)
    expect(row.endedAt).toBeInstanceOf(Date)
    expect(row.distance).toBeGreaterThan(0)
    expect(service.getSnapshot().isRecording).toBe(false)
  })

  it('cancelRecording deletes the row', async () => {
    const { store, service } = setup()
    await service.startRecording()
    expect(store.rows.size).toBe(1)
    await service.cancelRecording()
    expect(store.rows.size).toBe(0)
    expect(service.getSnapshot().isRecording).toBe(false)
  })

  it('surfaces a provider error and marks the watch stopped', async () => {
    const { provider, service } = setup()
    service.startWatching()
    await Promise.resolve()
    provider.emitError('Position unavailable')
    expect(service.getSnapshot().error).toBe('Position unavailable')
    expect(service.getSnapshot().isWatching).toBe(false)
  })

  it('clears a stale error once a fix arrives', async () => {
    const { provider, service } = setup()
    service.startWatching()
    await Promise.resolve()
    provider.emitError('Position unavailable')
    provider.emit(walk(0))
    expect(service.getSnapshot().error).toBeNull()
  })
})

describe('volume', () => {
  it('handles 2000 fixes without pathological cost', async () => {
    // Guards the O(n^2) concern in the batched full-array write: a 4-hour hike is
    // ~1,600 accepted points.
    const { provider, store, clock, service } = setup({ batchSize: 10 })
    await service.startRecording()
    service.startWatching()
    await Promise.resolve()

    const started = Date.now()
    for (let i = 0; i < 2000; i++) {
      provider.emit(walk(i))
      clock.advance(6000)
    }
    await service.flush()
    const elapsed = Date.now() - started

    expect(service.getSnapshot().trackPoints).toHaveLength(2000)
    expect([...store.rows.values()][0].points).toHaveLength(2000)
    expect(elapsed).toBeLessThan(5000)
  })
})
