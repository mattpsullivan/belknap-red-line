import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTrackHistory } from '@/hooks/useTrackHistory'
import { usePMTiles } from '@/providers/pmtilesContext'
import { downloadTrackGPX } from '@/services/gpxExport'
import type { GPSTrack } from '@/types'

const ONLINE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

function formatDuration(startedAt: Date, endedAt?: Date): string {
  if (!endedAt) return 'In progress'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  const miles = km * 0.621371
  return `${miles.toFixed(2)} mi (${km.toFixed(2)} km)`
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function calculateBounds(track: GPSTrack) {
  if (track.points.length === 0) return null

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  track.points.forEach((p) => {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  })

  // Add padding
  const latPad = (maxLat - minLat) * 0.1 || 0.001
  const lngPad = (maxLng - minLng) * 0.1 || 0.001

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  }
}

function calculateAverageSpeed(track: GPSTrack): string {
  if (!track.endedAt || track.distance === 0) return 'N/A'
  const ms = new Date(track.endedAt).getTime() - new Date(track.startedAt).getTime()
  const hours = ms / 3600000
  const miles = track.distance / 1609.34
  const mph = miles / hours
  return `${mph.toFixed(1)} mph`
}

export function TrackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getTrack, deleteTrack } = useTrackHistory()
  const { isOfflineMode, offlineStyle } = usePMTiles()
  const [track, setTrack] = useState<GPSTrack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (id) {
      getTrack(parseInt(id, 10)).then((t) => {
        setTrack(t ?? null)
        setIsLoading(false)
      })
    }
  }, [id, getTrack])

  const trackGeoJSON = useMemo(() => {
    if (!track || track.points.length < 2) return null

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: track.points.map((p) => [p.lng, p.lat]),
      },
    }
  }, [track])

  const bounds = useMemo(() => {
    if (!track) return null
    return calculateBounds(track)
  }, [track])

  const handleDelete = async () => {
    if (track?.id) {
      await deleteTrack(track.id)
      navigate('/tracks')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-secondary">Loading track...</div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-4">Track Not Found</h1>
        <p className="text-secondary mb-4">
          This track may have been deleted or doesn't exist.
        </p>
        <Link
          to="/tracks"
          className="text-location hover:underline"
        >
          ← Back to Track History
        </Link>
      </div>
    )
  }

  const startPoint = track.points[0]
  const endPoint = track.points[track.points.length - 1]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-2">
          <Link to="/tracks" className="text-location hover:underline text-sm">
            ← Back
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => downloadTrackGPX(track)}
              className="text-location text-sm hover:underline"
            >
              Export GPX
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-incomplete text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold text-primary">
          {formatDateTime(track.startedAt)}
        </h1>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          initialViewState={
            bounds
              ? {
                  bounds: [
                    [bounds.minLng, bounds.minLat],
                    [bounds.maxLng, bounds.maxLat],
                  ],
                  fitBoundsOptions: { padding: 40 },
                }
              : {
                  latitude: 43.52,
                  longitude: -71.34,
                  zoom: 12,
                }
          }
          style={{ width: '100%', height: '100%' }}
          mapStyle={isOfflineMode && offlineStyle ? offlineStyle : ONLINE_MAP_STYLE}
        >
          {/* Track line */}
          {trackGeoJSON && (
            <Source id="track" type="geojson" data={trackGeoJSON}>
              <Layer
                id="track-layer"
                type="line"
                paint={{
                  'line-color': '#F97316',
                  'line-width': 4,
                  'line-opacity': 0.9,
                }}
              />
            </Source>
          )}

          {/* Start marker */}
          {startPoint && (
            <Marker latitude={startPoint.lat} longitude={startPoint.lng} anchor="center">
              <div className="w-4 h-4 bg-complete rounded-full border-2 border-white shadow-lg" />
            </Marker>
          )}

          {/* End marker */}
          {endPoint && endPoint !== startPoint && (
            <Marker latitude={endPoint.lat} longitude={endPoint.lng} anchor="center">
              <div className="w-4 h-4 bg-incomplete rounded-full border-2 border-white shadow-lg" />
            </Marker>
          )}
        </Map>
      </div>

      {/* Stats */}
      <div className="p-4 bg-white border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-secondary uppercase">Distance</p>
            <p className="text-lg font-semibold text-primary">
              {formatDistance(track.distance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase">Duration</p>
            <p className="text-lg font-semibold text-primary">
              {formatDuration(track.startedAt, track.endedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase">Avg Speed</p>
            <p className="text-lg font-semibold text-primary">
              {calculateAverageSpeed(track)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase">Points</p>
            <p className="text-lg font-semibold text-primary">
              {track.points.length}
            </p>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Delete Track?
            </h3>
            <p className="text-secondary text-sm mb-4">
              This action cannot be undone. The track and all its data will be
              permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-secondary border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-incomplete text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
