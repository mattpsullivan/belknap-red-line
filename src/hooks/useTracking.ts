/**
 * React's view onto the tracking service.
 *
 * Replaces `useGeolocation` and `useTrackRecording`, which held the recording in
 * React state and therefore lost it whenever Chromium throttled renders in the
 * background - 15 of 153 accepted fixes survived the 2026-07-26 walk.
 *
 * `useSyncExternalStore` is React's sanctioned way to read an external mutable
 * source. The important property is the direction of travel: the service records
 * whether or not React ever renders, and this hook only observes. Nothing on the
 * recording path passes through here.
 */

import { useSyncExternalStore } from 'react'
import {
  trackingService,
  type TrackingService,
  type TrackingSnapshot,
} from '@/services/tracking'

export interface UseTrackingReturn extends TrackingSnapshot {
  startWatching: TrackingService['startWatching']
  stopWatching: TrackingService['stopWatching']
  startRecording: TrackingService['startRecording']
  stopRecording: TrackingService['stopRecording']
  cancelRecording: TrackingService['cancelRecording']
  openLocationSettings: TrackingService['openLocationSettings']
}

export function useTracking(service: TrackingService = trackingService): UseTrackingReturn {
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot)

  return {
    ...snapshot,
    startWatching: service.startWatching,
    stopWatching: service.stopWatching,
    startRecording: service.startRecording,
    stopRecording: service.stopRecording,
    cancelRecording: service.cancelRecording,
    openLocationSettings: service.openLocationSettings,
  }
}
