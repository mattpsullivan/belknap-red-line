import { Link } from 'react-router-dom'
import { useTrackHistory } from '@/hooks/useTrackHistory'
import type { GPSTrack } from '@/types'

function formatDuration(startedAt: Date, endedAt?: Date): string {
  if (!endedAt) return 'In progress'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  const km = meters / 1000
  const miles = km * 0.621371
  return `${miles.toFixed(2)} mi`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function TrackCard({ track }: { track: GPSTrack }) {
  return (
    <Link
      to={`/tracks/${track.id}`}
      className="block bg-surface rounded-xl p-4 hover:bg-gray-100 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-primary">
            {formatDate(track.startedAt)}
          </p>
          <p className="text-sm text-secondary">
            {formatTime(track.startedAt)}
            {track.endedAt && ` - ${formatTime(track.endedAt)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-primary">
            {formatDistance(track.distance)}
          </p>
          <p className="text-sm text-secondary">
            {formatDuration(track.startedAt, track.endedAt)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-secondary">
        <span>{track.points.length} points</span>
        {!track.endedAt && (
          <span className="text-incomplete font-medium">Recording...</span>
        )}
      </div>
    </Link>
  )
}

export function TrackHistoryPage() {
  const { tracks, isLoading } = useTrackHistory()

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-4">Track History</h1>
        <div className="text-secondary">Loading tracks...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary mb-4">Track History</h1>

      {tracks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🥾</div>
          <p className="text-secondary">No tracks recorded yet</p>
          <p className="text-sm text-secondary mt-2">
            Start recording on the Map page to track your hikes
          </p>
          <Link
            to="/map"
            className="inline-block mt-4 px-4 py-2 bg-location text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Map
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  )
}
