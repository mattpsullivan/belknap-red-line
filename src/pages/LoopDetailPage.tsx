import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLoops, useCompletions } from '@/hooks'
import { ElevationProfile } from '@/components/trails'
import type { Coordinate } from '@/types'

export function LoopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getLoopById } = useLoops()
  const { isTrailCompleted } = useCompletions()

  const loop = id ? getLoopById(id) : null

  // Combine coordinates from all trails for the elevation profile
  const combinedCoordinates = useMemo((): Coordinate[] => {
    if (!loop) return []
    return loop.trails.flatMap((trail) => trail.coordinates)
  }, [loop])

  if (!loop) {
    return (
      <div className="p-4 text-center">
        <p className="text-secondary mb-4">Loop not found</p>
        <Link to="/loops" className="text-location hover:underline">
          Back to Loops
        </Link>
      </div>
    )
  }

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
        <h1 className="text-lg font-semibold text-primary truncate">{loop.name}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Status and badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {loop.isComplete ? (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              Completed
            </span>
          ) : loop.completedTrailCount > 0 ? (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              {loop.percentComplete}% Complete
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              Not Started
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              loop.difficulty === 'easy'
                ? 'bg-green-100 text-green-700'
                : loop.difficulty === 'moderate'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {loop.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-secondary">{loop.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{loop.totalDistance}</p>
            <p className="text-sm text-secondary">miles</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{loop.trails.length}</p>
            <p className="text-sm text-secondary">trails</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{loop.estimatedTime.split('-')[0]}</p>
            <p className="text-sm text-secondary">hours</p>
          </div>
        </div>

        {/* Combined Elevation Profile */}
        <div>
          <h2 className="font-semibold text-primary mb-2">Elevation Profile</h2>
          <ElevationProfile coordinates={combinedCoordinates} />
        </div>

        {/* View on Map */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <div className="h-32 bg-gray-200 relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Link
                to={`/map?loop=${loop.id}`}
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
                View Loop on Map
              </Link>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-surface rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-primary">Loop Progress</span>
            <span className="text-secondary">
              {loop.completedTrailCount} / {loop.trails.length} trails
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                loop.isComplete ? 'bg-red-500' : 'bg-location'
              }`}
              style={{ width: `${loop.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Highlights */}
        {loop.highlights.length > 0 && (
          <div className="bg-surface rounded-xl p-4">
            <h2 className="font-semibold text-primary mb-3">Highlights</h2>
            <ul className="space-y-2">
              {loop.highlights.map((highlight, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="text-location">★</span>
                  <span className="text-secondary">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trails in this loop */}
        <div className="bg-surface rounded-xl p-4">
          <h2 className="font-semibold text-primary mb-3">Trails in this Loop</h2>
          <div className="space-y-2">
            {loop.trails.map((trail, index) => {
              const completed = isTrailCompleted(trail.id)
              return (
                <Link
                  key={trail.id}
                  to={`/trails/${trail.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-medium text-secondary">
                    {index + 1}
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      completed ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {trail.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {trail.distance} mi • {trail.difficulty}
                    </p>
                  </div>
                  {completed && (
                    <span className="text-red-500 text-sm shrink-0">✓</span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-secondary shrink-0"
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
              )
            })}
          </div>
        </div>

        {/* Action button */}
        {!loop.isComplete && (
          <Link
            to="/trails"
            className="block w-full bg-location text-white font-semibold py-3 px-4 rounded-xl text-center hover:opacity-90 transition-opacity"
          >
            View All Trails →
          </Link>
        )}
      </div>
    </div>
  )
}
