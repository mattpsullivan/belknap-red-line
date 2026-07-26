import { useMemo, useRef, useCallback, useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  useTrails,
  useCompletions,
  useTrailDetection,
  useLoops,
} from '@/hooks'
import { useTracking } from '@/hooks/useTracking'
import { useRecordingHealth } from '@/hooks/useRecordingHealth'
import { useRecordingHeartbeat } from '@/hooks/useRecordingHeartbeat'
import { alertVibrate } from '@/services/haptics'
import { logger } from '@/services/logger'
import { usePMTiles } from '@/providers/pmtilesContext'
import { styleConfig } from '@/config/styles'
import { POIMarkers } from './POIMarkers'
import { BackgroundChecklist } from '@/components/BackgroundChecklist'
import type { Trail } from '@/types'

const ONLINE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Center of Belknap Range (based on trail coordinate bounds)
const INITIAL_VIEW = {
  latitude: 43.52,
  longitude: -71.34,
  zoom: 12,
}

export function TrailMap() {
  const mapRef = useRef<MapRef>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { trails, getTrailById } = useTrails()
  const { isTrailCompleted, addCompletion, completedTrailIds } = useCompletions()
  const { isOfflineMode, offlineStyle } = usePMTiles()
  // One hook, one service. Recording happens in the service whether or not this
  // component ever renders - which is the whole point, since a backgrounded
  // WebView does not render. See services/tracking/trackingService.ts.
  const {
    position,
    error,
    isWatching,
    lastFixAt,
    isRecording,
    currentTrack,
    trackPoints,
    totalDistance,
    startWatching,
    stopWatching,
    startRecording,
    stopRecording,
    cancelRecording,
    openLocationSettings,
  } = useTracking()
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)
  const [pendingCompletions, setPendingCompletions] = useState<Trail[]>([])
  const [showRecordingReminder, setShowRecordingReminder] = useState(false)
  const [selectedTrail, setSelectedTrail] = useState<{
    trail: Trail
    lng: number
    lat: number
  } | null>(null)
  const [hoveredTrail, setHoveredTrail] = useState<{
    trail: Trail
    x: number
    y: number
  } | null>(null)

  // Get highlighted trail from URL param (e.g., /map?trail=xyz)
  const highlightedTrailId = searchParams.get('trail')
  const highlightedTrail = highlightedTrailId ? getTrailById(highlightedTrailId) : null

  // Get highlighted loop from URL param (e.g., /map?loop=xyz)
  const { getLoopById } = useLoops()
  const highlightedLoopId = searchParams.get('loop')
  const highlightedLoop = highlightedLoopId ? getLoopById(highlightedLoopId) : null
  // Warn when recording but GPS fixes have stopped arriving (background
  // suspension / lost fix / missing "Allow all the time").
  const recordingStatus = useRecordingHealth(
    isRecording,
    lastFixAt,
    currentTrack ? new Date(currentTrack.startedAt).getTime() : null
  )

  // Trail detection based on recorded track
  const { currentTrail, currentCoverage, newlyCompletedTrails } = useTrailDetection(
    trails,
    trackPoints,
    completedTrailIds
  )

  // A tick every 20s while recording. If ticks stop, JS stopped - that is what
  // distinguishes "location was revoked" from "the WebView was frozen".
  useRecordingHeartbeat(isRecording)

  // Log every health transition. "Did it buzz?" was unanswerable after the
  // 2026-07-25 hike because nothing on this path wrote to the log.
  const prevStatusRef = useRef(recordingStatus.status)
  useEffect(() => {
    if (prevStatusRef.current === recordingStatus.status) return
    logger.event(
      'health',
      'status.change',
      {
        from: prevStatusRef.current,
        to: recordingStatus.status,
        secondsSinceFix: recordingStatus.secondsSinceFix ?? undefined,
      },
      recordingStatus.status === 'stalled' ? 'warn' : 'info'
    )
    prevStatusRef.current = recordingStatus.status
  }, [recordingStatus.status, recordingStatus.secondsSinceFix])

  // Buzz when tracking stalls - a pocketed phone can't show a banner.
  //
  // Backs off rather than nagging. No fix for a couple of minutes is ordinary
  // under canopy or in a col, and buzzing every 20s through a legitimately weak
  // stretch trains you to ignore it - the same alert-fatigue failure the trail
  // ingest gate was built to avoid. So: buzz on entering the stalled state, again
  // after a minute, then every five minutes.
  useEffect(() => {
    if (recordingStatus.status !== 'stalled') return
    let n = 0
    const buzz = () => {
      // Logged so the buzz is evidence rather than something to be remembered.
      // Only records that a buzz was *requested*: if JS is not running this never
      // fires, and the absence is itself the finding.
      logger.event('health', 'stall.buzz', { n: ++n }, 'warn')
      void alertVibrate()
    }
    buzz()
    const followUp = setTimeout(buzz, 60_000)
    const recurring = setInterval(buzz, 5 * 60_000)
    return () => {
      clearTimeout(followUp)
      clearInterval(recurring)
    }
  }, [recordingStatus.status])

  // NOTE: there used to be an effect here that called addPoint() whenever
  // `position` changed. That was the bug. It required a React render per fix, and
  // Chromium throttles renders in a backgrounded WebView, so 138 of 153 accepted
  // fixes were silently discarded on the 2026-07-26 walk. Points are now appended
  // and persisted inside the service's GPS callback, which needs no render.

  // Fit bounds to highlighted trail from URL param
  useEffect(() => {
    if (highlightedTrail && mapRef.current) {
      const coords = highlightedTrail.coordinates
      if (coords.length > 0) {
        // Calculate bounds from trail coordinates
        const lngs = coords.map((c) => c.lng)
        const lats = coords.map((c) => c.lat)
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ]

        // Fit map to trail bounds with padding
        mapRef.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 40, right: 40 },
          duration: 1000,
        })

        // Auto-select the trail to show its popup. This effect synchronizes UI
        // to the external router URL (?trail=) and drives the imperative
        // fitBounds above, so it belongs in an effect; the lint rule can't see
        // that the setState here mirrors external state rather than cascading.
        const centerIdx = Math.floor(coords.length / 2)
        setSelectedTrail({
          trail: highlightedTrail,
          lng: coords[centerIdx].lng,
          lat: coords[centerIdx].lat,
        })
      }
    }
  }, [highlightedTrail])

  // Fit bounds to highlighted loop from URL param
  useEffect(() => {
    if (highlightedLoop && mapRef.current) {
      // Collect all coordinates from all trails in the loop
      const allCoords = highlightedLoop.trails.flatMap((t) => t.coordinates)
      if (allCoords.length > 0) {
        // Calculate bounds from all trail coordinates
        const lngs = allCoords.map((c) => c.lng)
        const lats = allCoords.map((c) => c.lat)
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ]

        // Fit map to loop bounds with padding
        mapRef.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 40, right: 40 },
          duration: 1000,
        })
      }
    }
  }, [highlightedLoop])

  // Clear highlight param when popup is closed
  const handleClosePopup = useCallback(() => {
    setSelectedTrail(null)
    // Clear the trail/loop param from URL when closing popup
    if (highlightedTrailId || highlightedLoopId) {
      setSearchParams({}, { replace: true })
    }
  }, [highlightedTrailId, highlightedLoopId, setSearchParams])

  // Center map on user location
  const centerOnUser = useCallback(() => {
    if (position && mapRef.current) {
      mapRef.current.flyTo({
        center: [position.lng, position.lat],
        zoom: 14,
        duration: 1000,
      })
    }
  }, [position])

  // Toggle location tracking
  const toggleTracking = useCallback(() => {
    if (isWatching) {
      stopWatching()
    } else {
      startWatching()
    }
  }, [isWatching, startWatching, stopWatching])

  // Toggle track recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Capture completed trails before any async operations to avoid race conditions
      const completedTrails = [...newlyCompletedTrails]

      // Stop recording first to finalize the track
      await stopRecording()

      // Then show the completion prompt if trails were completed
      if (completedTrails.length > 0) {
        setPendingCompletions(completedTrails)
        setShowCompletionPrompt(true)
      }
    } else {
      // Show safety reminder before starting recording
      setShowRecordingReminder(true)
    }
  }, [isRecording, stopRecording, newlyCompletedTrails])

  // Confirm recording start after safety reminder
  const confirmStartRecording = useCallback(async () => {
    setShowRecordingReminder(false)
    if (!isWatching) {
      startWatching()
    }
    await startRecording()
  }, [isWatching, startWatching, startRecording])

  // Dismiss recording reminder
  const dismissRecordingReminder = useCallback(() => {
    setShowRecordingReminder(false)
  }, [])

  // Confirm trail completions
  const confirmCompletions = useCallback(async () => {
    for (const trail of pendingCompletions) {
      await addCompletion({
        trailId: trail.id,
        completedAt: new Date(),
        manualEntry: false,
      })
    }
    setPendingCompletions([])
    setShowCompletionPrompt(false)
  }, [pendingCompletions, addCompletion])

  // Dismiss completion prompt
  const dismissCompletions = useCallback(() => {
    setPendingCompletions([])
    setShowCompletionPrompt(false)
  }, [])

  // Handle trail click
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features
      if (features && features.length > 0) {
        const feature = features[0]
        const trailId = feature.properties?.id
        const trail = trails.find((t) => t.id === trailId)
        if (trail) {
          setSelectedTrail({
            trail,
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
          })
          // Clear hover when clicking
          setHoveredTrail(null)
        }
      }
    },
    [trails]
  )

  // Handle trail hover (desktop only)
  const handleMapMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      // Don't show hover tooltip if a popup is already open
      if (selectedTrail) {
        setHoveredTrail(null)
        return
      }

      const features = e.features
      if (features && features.length > 0) {
        const feature = features[0]
        const trailId = feature.properties?.id
        const trail = trails.find((t) => t.id === trailId)
        if (trail) {
          setHoveredTrail({
            trail,
            x: e.point.x,
            y: e.point.y,
          })
        }
      } else {
        setHoveredTrail(null)
      }
    },
    [trails, selectedTrail]
  )

  const handleMapMouseLeave = useCallback(() => {
    setHoveredTrail(null)
  }, [])

  // Convert trails to GeoJSON for MapLibre
  const trailsGeoJSON = useMemo(() => {
    const features = trails.map((trail) => ({
      type: 'Feature' as const,
      properties: {
        id: trail.id,
        name: trail.name,
        completed: isTrailCompleted(trail.id),
        distance: trail.distance,
        difficulty: trail.difficulty,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: trail.coordinates.map((c) => [c.lng, c.lat]),
      },
    }))

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [trails, isTrailCompleted])

  // Separate completed and incomplete trails for styling
  const completedTrails = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trailsGeoJSON.features.filter((f) => f.properties.completed),
    }),
    [trailsGeoJSON]
  )

  const incompleteTrails = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trailsGeoJSON.features.filter((f) => !f.properties.completed),
    }),
    [trailsGeoJSON]
  )

  // Recorded track GeoJSON
  const recordedTrackGeoJSON = useMemo(() => {
    if (trackPoints.length < 2) return null

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: trackPoints.map((p) => [p.lng, p.lat]),
      },
    }
  }, [trackPoints])

  // User location accuracy circle
  const accuracyCircle = useMemo(() => {
    if (!position) return null

    // Create a circle polygon from accuracy radius
    const points = 64
    const coords: [number, number][] = []
    // Convert accuracy (meters) to approximate degrees
    const radiusInDeg = position.accuracy / 111320

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI
      coords.push([
        position.lng + radiusInDeg * Math.cos(angle),
        position.lat + radiusInDeg * Math.sin(angle),
      ])
    }

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords],
      },
    }
  }, [position])

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isOfflineMode && offlineStyle ? offlineStyle : ONLINE_MAP_STYLE}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        interactiveLayerIds={['trails-hit-area']}
        cursor="pointer"
      >
        {/* Invisible wider hit area for easier trail clicking */}
        <Source id="trails-hit-area" type="geojson" data={trailsGeoJSON}>
          <Layer
            id="trails-hit-area"
            type="line"
            paint={{
              'line-color': 'transparent',
              'line-width': 20,
            }}
          />
        </Source>

        {/* Incomplete trails (bright blue - yet to be hiked) */}
        <Source id="incomplete-trails" type="geojson" data={incompleteTrails}>
          <Layer
            id="incomplete-trails-layer"
            type="line"
            paint={{
              'line-color': styleConfig.trails.incomplete.color,
              'line-width': styleConfig.trails.incomplete.width,
              'line-opacity': styleConfig.trails.incomplete.opacity,
            }}
          />
        </Source>

        {/* Completed trails (red - "red-lined") */}
        <Source id="completed-trails" type="geojson" data={completedTrails}>
          <Layer
            id="completed-trails-layer"
            type="line"
            paint={{
              'line-color': styleConfig.trails.completed.color,
              'line-width': styleConfig.trails.completed.width,
              'line-opacity': styleConfig.trails.completed.opacity,
            }}
          />
        </Source>

        {/* Highlighted trail (from "View on Map" navigation) */}
        {highlightedTrail && (
          <Source
            id="highlighted-trail"
            type="geojson"
            data={{
              type: 'Feature',
              properties: { id: highlightedTrail.id },
              geometry: {
                type: 'LineString',
                coordinates: highlightedTrail.coordinates.map((c) => [c.lng, c.lat]),
              },
            }}
          >
            <Layer
              id="highlighted-trail-layer"
              type="line"
              paint={{
                'line-color': styleConfig.trails.highlighted.color,
                'line-width': styleConfig.trails.highlighted.width,
                'line-opacity': styleConfig.trails.highlighted.opacity,
              }}
            />
          </Source>
        )}

        {/* Highlighted loop trails (from "View Loop on Map" navigation) */}
        {highlightedLoop && (
          <Source
            id="highlighted-loop"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: highlightedLoop.trails.map((trail) => ({
                type: 'Feature' as const,
                properties: { id: trail.id, name: trail.name },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: trail.coordinates.map((c) => [c.lng, c.lat]),
                },
              })),
            }}
          >
            <Layer
              id="highlighted-loop-layer"
              type="line"
              paint={{
                'line-color': styleConfig.trails.highlightedLoop.color,
                'line-width': styleConfig.trails.highlightedLoop.width,
                'line-opacity': styleConfig.trails.highlightedLoop.opacity,
              }}
            />
          </Source>
        )}

        {/* Recorded track (orange) */}
        {recordedTrackGeoJSON && (
          <Source id="recorded-track" type="geojson" data={recordedTrackGeoJSON}>
            <Layer
              id="recorded-track-layer"
              type="line"
              paint={{
                'line-color': styleConfig.trails.recorded.color,
                'line-width': styleConfig.trails.recorded.width,
                'line-opacity': styleConfig.trails.recorded.opacity,
              }}
            />
          </Source>
        )}

        {/* User location accuracy circle */}
        {accuracyCircle && (
          <Source id="accuracy-circle" type="geojson" data={accuracyCircle}>
            <Layer
              id="accuracy-circle-layer"
              type="fill"
              paint={{
                'fill-color': styleConfig.location.accuracy.fill,
                'fill-opacity': styleConfig.location.accuracy.fillOpacity,
              }}
            />
            <Layer
              id="accuracy-circle-outline"
              type="line"
              paint={{
                'line-color': styleConfig.location.accuracy.stroke,
                'line-width': styleConfig.location.accuracy.strokeWidth,
                'line-opacity': styleConfig.location.accuracy.strokeOpacity,
              }}
            />
          </Source>
        )}

        {/* Historical points of interest from the Belknap Range Trails map */}
        <POIMarkers />

        {/* User location marker */}
        {position && (
          <Marker latitude={position.lat} longitude={position.lng} anchor="center">
            <div className="relative">
              <div className="w-4 h-4 bg-location rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-location rounded-full animate-ping opacity-75" />
            </div>
          </Marker>
        )}

        {/* Trail info popup */}
        {selectedTrail && (
          <Popup
            latitude={selectedTrail.lat}
            longitude={selectedTrail.lng}
            anchor="bottom"
            onClose={handleClosePopup}
            closeOnClick={false}
            className="trail-popup"
          >
            <div className="p-1 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isTrailCompleted(selectedTrail.trail.id)
                      ? 'bg-red-600'
                      : 'bg-sky-500'
                  }`}
                />
                <h3 className="font-semibold text-primary text-sm">
                  {selectedTrail.trail.name}
                </h3>
              </div>
              <div className="text-xs text-secondary space-y-1">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{selectedTrail.trail.distance} mi</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className={`font-medium capitalize ${
                    selectedTrail.trail.difficulty === 'easy' ? 'text-easy' :
                    selectedTrail.trail.difficulty === 'moderate' ? 'text-moderate' :
                    'text-difficult'
                  }`}>
                    {selectedTrail.trail.difficulty}
                  </span>
                </div>
                {(selectedTrail.trail.elevationGain ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Elevation:</span>
                    <span className="font-medium">{selectedTrail.trail.elevationGain} ft</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-medium ${
                    isTrailCompleted(selectedTrail.trail.id)
                      ? 'text-red-600'
                      : 'text-sky-500'
                  }`}>
                    {isTrailCompleted(selectedTrail.trail.id) ? 'Completed' : 'Not hiked'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/trails/${selectedTrail.trail.id}`}
                  className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
                >
                  View Details
                </Link>
                {!isTrailCompleted(selectedTrail.trail.id) && (
                  <button
                    onClick={() => {
                      addCompletion({
                        trailId: selectedTrail.trail.id,
                        completedAt: new Date(),
                        manualEntry: true,
                      })
                      setSelectedTrail(null)
                    }}
                    className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Hover tooltip (desktop only) */}
      {hoveredTrail && (
        <div
          className="absolute pointer-events-none bg-white rounded-lg shadow-lg px-3 py-2 z-10 hidden md:block"
          style={{
            left: hoveredTrail.x + 12,
            top: hoveredTrail.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isTrailCompleted(hoveredTrail.trail.id) ? 'bg-red-600' : 'bg-sky-500'
              }`}
            />
            <span className="font-medium text-sm text-primary">
              {hoveredTrail.trail.name}
            </span>
          </div>
          <div className="text-xs text-secondary mt-1">
            {hoveredTrail.trail.distance} mi • {hoveredTrail.trail.difficulty}
          </div>
        </div>
      )}

      {/* Location controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={toggleTracking}
          className={`p-3 rounded-full shadow-lg transition-colors ${
            isWatching
              ? 'bg-location text-white'
              : 'bg-white text-secondary hover:bg-gray-100'
          }`}
          aria-label={isWatching ? 'Stop tracking' : 'Start tracking'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {position && (
          <button
            onClick={centerOnUser}
            className="p-3 bg-white rounded-full shadow-lg text-secondary hover:bg-gray-100 transition-colors"
            aria-label="Center on my location"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </button>
        )}

        {/* Record button */}
        <button
          onClick={toggleRecording}
          className={`p-3 rounded-full shadow-lg transition-colors ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-white text-secondary hover:bg-gray-100'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Cancel recording button */}
        {isRecording && (
          <button
            onClick={cancelRecording}
            className="p-3 bg-white rounded-full shadow-lg text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Cancel recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Recording status */}
      {isRecording && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
          </div>
          <div className="text-xs text-secondary mt-1">
            {(totalDistance / 1000).toFixed(2)} km • {trackPoints.length} points
          </div>
          {/* Current trail detection */}
          {currentTrail && (
            <div className="text-xs mt-2 pt-2 border-t border-gray-200">
              <span className="text-secondary">On trail: </span>
              <span className="font-medium text-primary">{currentTrail.name}</span>
              <div className="text-secondary">
                {Math.round(currentCoverage * 100)}% covered
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stall warning - recording but no GPS fixes arriving */}
      {isRecording && recordingStatus.status === 'stalled' && (
        <div className="absolute top-4 inset-x-4 z-20 bg-amber-50 border border-amber-300 rounded-lg shadow-lg p-3">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Tracking may be paused
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                No GPS fix for {recordingStatus.secondsSinceFix}s - your track may
                have gaps. Set Location to "Allow all the time" and turn off
                battery optimization for this app.
              </p>
              <button
                onClick={() => void openLocationSettings()}
                className="mt-2 text-xs font-semibold text-amber-900 underline"
              >
                Open location settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-completion prompt */}
      {showCompletionPrompt && pendingCompletions.length > 0 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Trails Completed!
            </h3>
            <p className="text-secondary text-sm mb-4">
              Based on your GPS track, you completed:
            </p>
            <ul className="space-y-2 mb-6">
              {pendingCompletions.map((trail) => (
                <li
                  key={trail.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-complete" />
                  <span className="font-medium">{trail.name}</span>
                  <span className="text-secondary">({trail.distance} mi)</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={dismissCompletions}
                className="flex-1 px-4 py-2 text-secondary border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={confirmCompletions}
                className="flex-1 px-4 py-2 bg-complete text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recording safety reminder */}
      {showRecordingReminder && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Before You Go</h3>
            </div>
            <div className="space-y-3 text-sm text-secondary mb-6">
              <p>
                <strong className="text-primary">This app does not provide navigation.</strong>{' '}
                Bring proper maps and know your route.
              </p>
              <p>
                Remember: your destination is always your car, not the summit. Turn back if conditions change.
              </p>
              <p>
                <a
                  href="https://www.nps.gov/articles/10essentials.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-location hover:underline"
                >
                  Do you have the Ten Essentials?
                </a>
              </p>
              <BackgroundChecklist mode="gate" onOpenSettings={() => void openLocationSettings()} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={dismissRecordingReminder}
                className="flex-1 px-4 py-2 text-secondary border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartRecording}
                className="flex-1 px-4 py-2 bg-location text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
