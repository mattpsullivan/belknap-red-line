import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTrails, useCompletions, useLoops } from '@/hooks'
import { CompletionModal } from '@/components/trails'
import type { Completion } from '@/types'

const AREA_SHORT_NAMES: Record<string, string> = {
  'Lockes Hill': 'Lockes Hill',
  'Mt. Rowe & Gunstock Mountain': 'Rowe/Gunstock',
  'Belknap Mountain': 'Belknap',
  'Piper, Whiteface & Swett Mountains': 'Piper/Whiteface',
  'Mt. Klem, Mt. Mack & Mt. Anna': 'Klem/Mack/Anna',
  'Rand, Quarry & Straightback Mountains': 'Rand/Quarry',
  'Mt. Major': 'Mt. Major',
  'Mt. Shannon, Goat Pasture Hill & Pine Mountain': 'Shannon/Goat',
}

export function TrailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getTrailById, trails, getConnectedTrails } = useTrails()
  const { isTrailCompleted, getCompletionsForTrail, addCompletion } = useCompletions()
  const { getLoopsForTrail } = useLoops()
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const trail = id ? getTrailById(id) : null
  const completions = id ? getCompletionsForTrail(id) : []
  const isCompleted = id ? isTrailCompleted(id) : false
  const trailLoops = id ? getLoopsForTrail(id) : []
  const connectedTrails = id ? getConnectedTrails(id) : []

  // Find nearby trails (same area)
  const nearbyTrails = useMemo(() => {
    if (!trail) return []
    return trails
      .filter((t) => t.id !== trail.id && t.area === trail.area)
      .slice(0, 5)
  }, [trail, trails])

  if (!trail) {
    return (
      <div className="p-4 text-center">
        <p className="text-secondary mb-4">Trail not found</p>
        <Link to="/trails" className="text-location hover:underline">
          Back to Trails
        </Link>
      </div>
    )
  }

  const handleSaveCompletion = async (completion: Omit<Completion, 'id'>) => {
    await addCompletion(completion)
    setShowCompletionModal(false)
  }

  // Get the center point of the trail for the mini map
  const trailCenter = trail.coordinates[Math.floor(trail.coordinates.length / 2)]

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-secondary hover:text-primary transition-colors"
          aria-label="Go back"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-primary truncate">{trail.name}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Status and Area badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCompleted
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isCompleted ? 'Completed' : 'Not Hiked'}
          </span>
          {trail.area && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              {AREA_SHORT_NAMES[trail.area] || trail.area}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              trail.difficulty === 'easy'
                ? 'bg-green-100 text-green-700'
                : trail.difficulty === 'moderate'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {trail.difficulty}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{trail.distance}</p>
            <p className="text-sm text-secondary">miles</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {trail.elevationGain || '--'}
            </p>
            <p className="text-sm text-secondary">ft elevation</p>
          </div>
        </div>

        {/* Mini Map Preview */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <div className="h-48 bg-gray-200 relative">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+ef4444(${trailCenter.lng},${trailCenter.lat})/${trailCenter.lng},${trailCenter.lat},13,0/400x200@2x?access_token=pk.placeholder`}
              alt={`Map of ${trail.name}`}
              className="w-full h-full object-cover hidden"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Link
                to="/map"
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
                View on Map
              </Link>
            </div>
          </div>
          <div className="p-3 text-center">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${trail.trailhead.lat},${trail.trailhead.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-location hover:underline inline-flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
              Directions to Trailhead
            </a>
          </div>
        </div>

        {/* Completion History */}
        {completions.length > 0 && (
          <div className="bg-surface rounded-xl p-4">
            <h2 className="font-semibold text-primary mb-3">Completion History</h2>
            <div className="space-y-2">
              {completions.map((completion, index) => (
                <div
                  key={completion.id || index}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-primary">
                      {new Date(completion.completedAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {completion.notes && (
                      <p className="text-secondary mt-1">{completion.notes}</p>
                    )}
                    <p className="text-xs text-secondary mt-1">
                      {completion.manualEntry ? 'Manual entry' : 'Recorded via GPS'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part of these loops */}
        {trailLoops.length > 0 && (
          <div className="bg-surface rounded-xl p-4">
            <h2 className="font-semibold text-primary mb-3">Part of These Loops</h2>
            <div className="space-y-2">
              {trailLoops.map((loop) => (
                <Link
                  key={loop.id}
                  to={`/loops/${loop.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative w-8 h-8 shrink-0">
                    <svg className="w-8 h-8 transform -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-border"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 12}
                        strokeDashoffset={2 * Math.PI * 12 * (1 - loop.percentComplete / 100)}
                        strokeLinecap="round"
                        className={loop.isComplete ? 'text-red-500' : 'text-location'}
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {loop.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {loop.totalDistance} mi • {loop.trails.length} trails
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Connected Trails */}
        {connectedTrails.length > 0 && (
          <div className="bg-surface rounded-xl p-4">
            <h2 className="font-semibold text-primary mb-3">Connects To</h2>
            <p className="text-xs text-secondary mb-3">
              Trails that share an endpoint - combine for longer hikes
            </p>
            <div className="space-y-2">
              {connectedTrails.map((connectedTrail) => (
                <Link
                  key={connectedTrail.id}
                  to={`/trails/${connectedTrail.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isTrailCompleted(connectedTrail.id) ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {connectedTrail.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {connectedTrail.distance} mi • {connectedTrail.difficulty}
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Trails */}
        {nearbyTrails.length > 0 && (
          <div className="bg-surface rounded-xl p-4">
            <h2 className="font-semibold text-primary mb-3">
              More in {AREA_SHORT_NAMES[trail.area || ''] || trail.area}
            </h2>
            <div className="space-y-2">
              {nearbyTrails.map((nearbyTrail) => (
                <Link
                  key={nearbyTrail.id}
                  to={`/trails/${nearbyTrail.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isTrailCompleted(nearbyTrail.id) ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {nearbyTrail.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {nearbyTrail.distance} mi
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mark Complete Button */}
        {!isCompleted && (
          <button
            onClick={() => setShowCompletionModal(true)}
            className="w-full bg-red-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-red-600 transition-colors"
          >
            Mark as Complete
          </button>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <CompletionModal
          trail={trail}
          isOpen={true}
          onSave={handleSaveCompletion}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  )
}
