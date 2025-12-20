import { useProgress } from '@/hooks'
import { useCompletions } from '@/hooks'
import { useTrails } from '@/hooks'

export function ProgressPage() {
  const {
    completedCount,
    completedMiles,
    percentComplete,
    remainingCount,
    totalTrails,
    totalDistance,
  } = useProgress()

  const { completions } = useCompletions()
  const { getTrailById } = useTrails()

  // Get recent completions (last 5, sorted by date)
  const recentCompletions = [...completions]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, 5)

  return (
    <div className="p-4 space-y-6">
      {/* Hero Progress Card */}
      <div className="bg-surface rounded-2xl p-6 text-center">
        <div className="relative inline-flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-border"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - percentComplete / 100)}
              strokeLinecap="round"
              className="text-complete transition-all duration-500"
            />
          </svg>
          <span className="absolute text-4xl font-bold text-primary">
            {percentComplete}%
          </span>
        </div>
        <p className="mt-4 text-secondary">
          {completedCount} of {totalTrails} trails completed
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Miles Hiked"
          value={completedMiles.toFixed(1)}
          icon="🥾"
        />
        <StatCard
          label="Trails Left"
          value={remainingCount.toString()}
          icon="🎯"
        />
        <StatCard
          label="Total Miles"
          value={totalDistance.toFixed(1)}
          icon="📏"
        />
      </div>

      {/* Recent Completions */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">
          Recent Completions
        </h2>
        {recentCompletions.length === 0 ? (
          <div className="bg-surface rounded-xl p-4 text-center text-secondary">
            No trails completed yet. Get hiking! 🥾
          </div>
        ) : (
          <div className="space-y-2">
            {recentCompletions.map((completion) => {
              const trail = getTrailById(completion.trailId)
              if (!trail) return null
              return (
                <div
                  key={completion.id}
                  className="bg-surface rounded-xl p-3 flex items-center gap-3"
                >
                  <span className="text-2xl">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">
                      {trail.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {new Date(completion.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm text-secondary">
                    {trail.distance} mi
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Call to Action */}
      {remainingCount > 0 && (
        <a
          href="/trails"
          className="block w-full bg-location text-white font-semibold py-3 px-4 rounded-xl text-center hover:opacity-90 transition-opacity"
        >
          Find Your Next Hike →
        </a>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="bg-surface rounded-xl p-3 text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-xl font-bold text-primary mt-1">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  )
}
