export { useTrails } from './useTrails'
export { useCompletions } from './useCompletions'
export { useProgress } from './useProgress'
// useGeolocation and useTrackRecording were retired 2026-07-26. They held the
// recording in React state, so a backgrounded WebView - which does not render -
// silently discarded most of it. Both are replaced by useTracking, a view onto
// services/tracking, which records from the GPS callback with no render involved.
export { useTracking } from './useTracking'
export type { UseTrackingReturn } from './useTracking'
export type { GeoPosition } from '@/services/geolocation'
export { useTrailDetection } from './useTrailDetection'
export { useTrackHistory } from './useTrackHistory'
export { useLoops } from './useLoops'
export type { LoopWithDetails } from './useLoops'
