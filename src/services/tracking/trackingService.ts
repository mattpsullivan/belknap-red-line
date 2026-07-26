/**
 * Owns location tracking and track recording. Plain TypeScript - no React.
 *
 * WHY THIS EXISTS
 *
 * On the 2026-07-26 dog walk, two paths ran inside the same GPS callback, over
 * the same 23 minutes, writing to the same IndexedDB:
 *
 *   logger.event()  direct call -> array -> batched Dexie write   1300 / 1300 kept
 *   track point     setPosition() -> React render -> useEffect ->    15 /  153 kept
 *                   addPoint()
 *
 * Location was healthy: 1,300 fixes arrived at 1/s, uninterrupted for 21 minutes
 * while backgrounded, and 153 passed the throttle and distance filters. But
 * Chromium throttles the scheduler in a backgrounded WebView, so `setPosition`
 * never caused a render, TrailMap's effect never ran, and the point was dropped.
 * The 15 survivors cluster exactly in the windows the app was foreground.
 *
 * Worse, the old `useTrackRecording` held the whole track in `useState` and only
 * wrote it to Dexie in `stopRecording`. React state WAS the storage for the
 * duration of a hike, so a kill at minute 90 lost everything.
 *
 * So: persistence must never depend on a render. This service is driven by the
 * provider callback and writes straight to the database, exactly as the logger
 * does. React attaches as a view via useSyncExternalStore.
 *
 * ONE WATCHER ONLY
 *
 * nativeProvider throws if a watch is already active, and @capgo v8 exposes a
 * single background watch. This service owns that one subscription; the UI cannot
 * start its own, so live position is served from here too.
 *
 * Dependencies are injected so tests drive it with the existing null geolocation
 * client and an in-memory store - state-based, no mock framework.
 */

import {
  createGeolocationProvider,
  type GeoPosition,
  type GeolocationProvider,
} from '@/services/geolocation'
import { calculateDistance } from '@/services/geo'
import { logger } from '@/services/logger'
import { STALL_THRESHOLD_MS } from '@/services/recordingHealth'
import type { GPSTrack, TrackPoint } from '@/types'

/** The slice of Dexie's tracks table this service needs. */
export interface TrackStore {
  add(track: GPSTrack): Promise<number>
  update(id: number, changes: Partial<GPSTrack>): Promise<unknown>
  delete(id: number): Promise<void>
}

export interface TrackingSnapshot {
  position: GeoPosition | null
  error: string | null
  isWatching: boolean
  /** Wall-clock of the last fix that arrived, pre-filter. Liveness, not position. */
  lastFixAt: number | null
  isRecording: boolean
  currentTrack: GPSTrack | null
  trackPoints: TrackPoint[]
  /** Metres, accumulated from accepted points. */
  totalDistance: number
}

export interface TrackingServiceDeps {
  provider?: GeolocationProvider
  store?: TrackStore
  now?: () => number
  /** Minimum gap between accepted points. */
  throttleMs?: number
  /** Accepted points must be at least this far from the last one. */
  minDistanceMeters?: number
  enableHighAccuracy?: boolean
  /** Persist after this many pending points. */
  batchSize?: number
  /** Persist at least this often while points are pending. */
  batchMs?: number
}

export interface TrackingService {
  subscribe(listener: () => void): () => void
  getSnapshot(): TrackingSnapshot
  startWatching(): void
  stopWatching(): void
  startRecording(): Promise<void>
  stopRecording(): Promise<number | undefined>
  cancelRecording(): Promise<void>
  /** Write any pending points now. Call before the app may be suspended. */
  flush(): Promise<void>
  openLocationSettings(): Promise<void>
}

const DEFAULTS = {
  throttleMs: 5000,
  minDistanceMeters: 5,
  enableHighAccuracy: true,
  batchSize: 10,
  batchMs: 15_000,
}

export function createTrackingService(deps: TrackingServiceDeps = {}): TrackingService {
  const cfg = { ...DEFAULTS, ...deps }
  const now = deps.now ?? (() => Date.now())
  let provider = deps.provider ?? null
  const store: TrackStore | null = deps.store ?? null

  const listeners = new Set<() => void>()

  // Mutable truth. The snapshot below is derived and memoised.
  let position: GeoPosition | null = null
  let error: string | null = null
  let isWatching = false
  let lastFixAt: number | null = null
  let isRecording = false
  let currentTrack: GPSTrack | null = null
  let trackPoints: TrackPoint[] = []
  let totalDistance = 0

  let watcherId: string | null = null
  let trackId: number | null = null
  let lastAcceptedAt = 0
  let lastAcceptedPoint: TrackPoint | null = null
  let pendingCount = 0
  let lastPersistAt = 0
  let persisting: Promise<void> = Promise.resolve()

  // useSyncExternalStore compares snapshots by identity, so this must be stable
  // between changes or React re-renders forever.
  let snapshot: TrackingSnapshot = buildSnapshot()

  function buildSnapshot(): TrackingSnapshot {
    return {
      position,
      error,
      isWatching,
      lastFixAt,
      isRecording,
      currentTrack,
      trackPoints,
      totalDistance,
    }
  }

  function emit() {
    snapshot = buildSnapshot()
    for (const l of listeners) l()
  }

  function getProvider(): GeolocationProvider {
    provider ??= createGeolocationProvider()
    return provider
  }

  // --- persistence ---------------------------------------------------------

  /**
   * Write the accumulated points. Serialised so writes land in order, and
   * failures never propagate into the GPS callback - losing a batch is bad, but
   * throwing inside the callback that feeds recording is worse.
   */
  function persist(): Promise<void> {
    if (!store || trackId === null || pendingCount === 0) return persisting
    const id = trackId
    const points = trackPoints
    const distance = totalDistance
    pendingCount = 0
    lastPersistAt = now()
    persisting = persisting
      .then(async () => {
        await store.update(id, { points, distance })
      })
      .catch((err) => {
        logger.event('track', 'persist.failed', { message: String(err) }, 'error')
      })
    return persisting
  }

  function maybePersist() {
    if (pendingCount >= cfg.batchSize || now() - lastPersistAt >= cfg.batchMs) {
      void persist()
    }
  }

  // --- the GPS callback ----------------------------------------------------

  function handlePosition(pos: GeoPosition) {
    const t = now()
    const sinceLastFix = lastFixAt === null ? null : t - lastFixAt

    // Retrospective gap report. Cannot warn during a gap - only after one ends -
    // but it survives even when the liveness tick does not.
    if (sinceLastFix !== null && sinceLastFix > STALL_THRESHOLD_MS) {
      logger.event('gps', 'gap', { ms: sinceLastFix, recording: isRecording }, 'warn')
    }
    lastFixAt = t

    const moved = lastAcceptedPoint
      ? calculateDistance(lastAcceptedPoint.lat, lastAcceptedPoint.lng, pos.lat, pos.lng)
      : null

    const logFix = (outcome: 'accepted' | 'throttled' | 'under-distance') =>
      logger.event('gps', 'fix', {
        outcome,
        lat: round(pos.lat, 6),
        lng: round(pos.lng, 6),
        accuracy: round(pos.accuracy, 1),
        altitude: pos.altitude === undefined ? undefined : round(pos.altitude, 1),
        movedM: moved === null ? undefined : round(moved, 1),
        sinceLastFixMs: sinceLastFix ?? undefined,
        recording: isRecording,
      })

    if (t - lastAcceptedAt < cfg.throttleMs) {
      logFix('throttled')
      emit() // lastFixAt changed; liveness matters to the UI
      return
    }
    if (moved !== null && moved < cfg.minDistanceMeters) {
      logFix('under-distance')
      emit()
      return
    }

    logFix('accepted')
    lastAcceptedAt = t
    error = null
    position = pos

    if (isRecording && trackId !== null) {
      const point: TrackPoint = {
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp,
        // Raw ellipsoidal metres; stays undefined with no vertical fix.
        altitudeEllipsoidM: pos.altitude,
      }
      if (lastAcceptedPoint) {
        totalDistance += calculateDistance(
          lastAcceptedPoint.lat,
          lastAcceptedPoint.lng,
          point.lat,
          point.lng
        )
      }
      // New array so the snapshot's identity changes for React.
      trackPoints = [...trackPoints, point]
      pendingCount++
      maybePersist()
    }

    lastAcceptedPoint = {
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      timestamp: pos.timestamp,
    }
    emit()
  }

  function handleError(err: { message: string }) {
    logger.event('gps', 'provider.error', { message: err.message }, 'error')
    error = err.message
    isWatching = false
    watcherId = null
    emit()
  }

  // --- public --------------------------------------------------------------

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSnapshot: () => snapshot,

    startWatching() {
      if (watcherId !== null) return
      error = null
      isWatching = true
      lastAcceptedAt = 0
      lastAcceptedPoint = null
      lastFixAt = null
      emit()

      getProvider()
        .startWatching(handlePosition, handleError, {
          // Deliver every fix; this service does the gating. A continuous stream
          // is what makes the liveness signal meaningful when stationary.
          distanceFilter: 0,
          interval: cfg.throttleMs,
          accuracy: cfg.enableHighAccuracy ? 'high' : 'balanced',
          enableBackground: true,
        })
        .then((id) => {
          watcherId = id
          logger.event('gps', 'watch.started', {
            watcherId: id,
            supportsBackground: getProvider().supportsBackground,
            throttleMs: cfg.throttleMs,
            minDistanceMeters: cfg.minDistanceMeters,
          })
        })
        .catch((err: Error) => {
          logger.event('gps', 'watch.start-failed', { message: err?.message }, 'error')
          error = err?.message ?? 'Failed to start geolocation'
          isWatching = false
          emit()
        })
    },

    stopWatching() {
      if (watcherId === null) return
      const id = watcherId
      watcherId = null
      isWatching = false
      emit()
      void getProvider()
        .stopWatching(id)
        .catch((err: Error) =>
          logger.event('gps', 'watch.stop-failed', { message: err?.message }, 'warn')
        )
    },

    async startRecording() {
      if (isRecording) return
      const track: GPSTrack = { startedAt: new Date(now()), points: [], distance: 0 }
      if (store) {
        trackId = await store.add(track)
        track.id = trackId
      }
      currentTrack = track
      trackPoints = []
      totalDistance = 0
      pendingCount = 0
      lastPersistAt = now()
      lastAcceptedPoint = null
      lastAcceptedAt = 0
      isRecording = true
      logger.event('track', 'recording.started', { trackId })
      emit()
    },

    async stopRecording() {
      if (!isRecording || trackId === null) return undefined
      const id = trackId
      // Force the final write regardless of batch state.
      pendingCount = Math.max(pendingCount, 1)
      await persist()
      if (store) {
        await store.update(id, { endedAt: new Date(now()) })
      }
      isRecording = false
      currentTrack = null
      trackId = null
      logger.event('track', 'recording.stopped', {
        trackId: id,
        points: trackPoints.length,
        distanceM: Math.round(totalDistance),
      })
      emit()
      return id
    },

    async cancelRecording() {
      const id = trackId
      isRecording = false
      currentTrack = null
      trackId = null
      trackPoints = []
      totalDistance = 0
      pendingCount = 0
      lastAcceptedPoint = null
      logger.event('track', 'recording.cancelled', { trackId: id })
      emit()
      if (store && id !== null) await store.delete(id)
    },

    flush() {
      pendingCount = Math.max(pendingCount, trackPoints.length > 0 ? 1 : 0)
      return persist()
    },

    openLocationSettings() {
      return getProvider().openSettings()
    },
  }
}

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
