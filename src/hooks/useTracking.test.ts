import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTracking } from './useTracking'
import { createTrackingService } from '@/services/tracking/trackingService'
import type {
  GeolocationProvider,
  GeoPosition,
  PositionCallback,
  ErrorCallback,
} from '@/services/geolocation'
import type { GPSTrack } from '@/types'

function nullProvider() {
  let onPos: PositionCallback | null = null
  const p = {
    supportsBackground: true,
    async startWatching(a: PositionCallback, _b: ErrorCallback) {
      onPos = a
      return 'null-watcher'
    },
    async stopWatching() {},
    async checkPermissions() {
      return { location: 'granted' as const }
    },
    async requestPermissions() {
      return { location: 'granted' as const }
    },
    async openSettings() {},
    emit: (pos: GeoPosition) => onPos?.(pos),
  }
  return p as typeof p & GeolocationProvider
}

function nullStore() {
  const rows = new Map<number, GPSTrack>()
  let next = 1
  return {
    rows,
    async add(t: GPSTrack) {
      const id = next++
      rows.set(id, { ...t, id })
      return id
    },
    async update(id: number, changes: Partial<GPSTrack>) {
      rows.set(id, { ...rows.get(id)!, ...changes })
      return 1
    },
    async delete(id: number) {
      rows.delete(id)
    },
  }
}

const fix = (i: number): GeoPosition => ({
  lat: 43.513 + i * 0.0001,
  lng: -71.373,
  accuracy: 5,
  timestamp: 1_700_000_000_000 + i,
})

function setup() {
  const provider = nullProvider()
  const store = nullStore()
  let t = 1_000_000
  const service = createTrackingService({ provider, store, now: () => t })
  return { provider, store, service, advance: (ms: number) => (t += ms) }
}

describe('useTracking', () => {
  it('exposes the service snapshot', () => {
    const { service } = setup()
    const { result } = renderHook(() => useTracking(service))
    expect(result.current.position).toBeNull()
    expect(result.current.isRecording).toBe(false)
    expect(result.current.trackPoints).toEqual([])
  })

  it('re-renders when the service records a fix', async () => {
    const { provider, service, advance } = setup()
    const { result } = renderHook(() => useTracking(service))

    await act(async () => {
      await service.startRecording()
      service.startWatching()
    })
    await act(async () => {
      provider.emit(fix(0))
      advance(6000)
      provider.emit(fix(1))
    })

    expect(result.current.trackPoints).toHaveLength(2)
    expect(result.current.position).not.toBeNull()
  })

  it('keeps recording after the component unmounts', async () => {
    // The whole point of the service living outside React: a backgrounded app may
    // not render at all, and recording must not care.
    const { provider, store, service, advance } = setup()
    const { unmount } = renderHook(() => useTracking(service))

    await act(async () => {
      await service.startRecording()
      service.startWatching()
    })
    unmount()

    provider.emit(fix(0))
    advance(6000)
    provider.emit(fix(1))
    await service.flush()

    expect(service.getSnapshot().trackPoints).toHaveLength(2)
    expect([...store.rows.values()][0].points).toHaveLength(2)
  })

  it('does not re-render on repeated identical snapshots', () => {
    let renders = 0
    const { service } = setup()
    renderHook(() => {
      renders++
      return useTracking(service)
    })
    const after = renders
    // No service activity, so no notification and no additional render.
    expect(renders).toBe(after)
  })
})
