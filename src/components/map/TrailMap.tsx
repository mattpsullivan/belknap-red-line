import { useMemo, useRef, useCallback, useEffect } from 'react'
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTrails, useCompletions, useGeolocation, useTrackRecording } from '@/hooks'
import type { Trail } from '@/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Center of Belknap Range
const INITIAL_VIEW = {
  latitude: 43.52,
  longitude: -71.43,
  zoom: 11,
}

export function TrailMap() {
  const mapRef = useRef<MapRef>(null)
  const { trails } = useTrails()
  const { isTrailCompleted } = useCompletions()
  const { position, error, isWatching, startWatching, stopWatching } =
    useGeolocation()
  const {
    isRecording,
    trackPoints,
    totalDistance,
    startRecording,
    stopRecording,
    cancelRecording,
    addPoint,
  } = useTrackRecording()

  // Add position to track when recording
  useEffect(() => {
    if (isRecording && position) {
      addPoint({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: position.timestamp,
      })
    }
  }, [isRecording, position, addPoint])

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
      await stopRecording()
    } else {
      if (!isWatching) {
        startWatching()
      }
      await startRecording()
    }
  }, [isRecording, isWatching, startWatching, startRecording, stopRecording])

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
        mapStyle={MAP_STYLE}
      >
        {/* Incomplete trails (red) */}
        <Source id="incomplete-trails" type="geojson" data={incompleteTrails}>
          <Layer
            id="incomplete-trails-layer"
            type="line"
            paint={{
              'line-color': '#EF4444',
              'line-width': 4,
              'line-opacity': 0.8,
            }}
          />
        </Source>

        {/* Completed trails (green) */}
        <Source id="completed-trails" type="geojson" data={completedTrails}>
          <Layer
            id="completed-trails-layer"
            type="line"
            paint={{
              'line-color': '#22C55E',
              'line-width': 4,
              'line-opacity': 0.8,
            }}
          />
        </Source>

        {/* Recorded track (orange) */}
        {recordedTrackGeoJSON && (
          <Source id="recorded-track" type="geojson" data={recordedTrackGeoJSON}>
            <Layer
              id="recorded-track-layer"
              type="line"
              paint={{
                'line-color': '#F97316',
                'line-width': 5,
                'line-opacity': 0.9,
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
                'fill-color': '#3B82F6',
                'fill-opacity': 0.15,
              }}
            />
            <Layer
              id="accuracy-circle-outline"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 2,
                'line-opacity': 0.5,
              }}
            />
          </Source>
        )}

        {/* User location marker */}
        {position && (
          <Marker latitude={position.lat} longitude={position.lng} anchor="center">
            <div className="relative">
              <div className="w-4 h-4 bg-location rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-location rounded-full animate-ping opacity-75" />
            </div>
          </Marker>
        )}
      </Map>

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

// Trailhead markers component (for later use)
export function TrailheadMarkers({ trails }: { trails: Trail[] }) {
  const markersGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trails.map((trail) => ({
        type: 'Feature' as const,
        properties: {
          id: trail.id,
          name: trail.name,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [trail.trailhead.lng, trail.trailhead.lat],
        },
      })),
    }),
    [trails]
  )

  return (
    <Source id="trailheads" type="geojson" data={markersGeoJSON}>
      <Layer
        id="trailheads-layer"
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': '#3B82F6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  )
}
