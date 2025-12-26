import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProgress, useCompletions, useTrails } from '@/hooks'
import { getAreaShortName, getAreaColors } from '@/config/styles'

export function ProgressPage() {
  const {
    completedCount,
    completedMiles,
    percentComplete,
    remainingCount,
    totalTrails,
    totalDistance,
  } = useProgress()

  const { completions, isTrailCompleted } = useCompletions()
  const { getTrailById, trails } = useTrails()

  // Calculate progress by area
  const areaProgress = useMemo(() => {
    const areaMap = new Map<string, { total: number; completed: number; miles: number; completedMiles: number }>()

    trails.forEach((trail) => {
      const area = trail.area || 'Unknown'
      if (!areaMap.has(area)) {
        areaMap.set(area, { total: 0, completed: 0, miles: 0, completedMiles: 0 })
      }
      const entry = areaMap.get(area)!
      entry.total++
      entry.miles += trail.distance
      if (isTrailCompleted(trail.id)) {
        entry.completed++
        entry.completedMiles += trail.distance
      }
    })

    return Array.from(areaMap.entries())
      .map(([area, stats]) => ({
        area,
        shortName: getAreaShortName(area),
        colors: getAreaColors(area),
        ...stats,
        percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent || a.shortName.localeCompare(b.shortName))
  }, [trails, isTrailCompleted])

  // Get recent completions (last 5, sorted by date)
  const recentCompletions = [...completions]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, 5)

  // Calculate progress over time (cumulative completions by month)
  const progressData = useMemo(() => {
    if (completions.length === 0) return []

    // Sort completions by date
    const sorted = [...completions].sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    )

    // Group by month
    const monthlyData = new Map<string, { count: number; cumulative: number }>()
    let cumulative = 0

    sorted.forEach((c) => {
      const date = new Date(c.completedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { count: 0, cumulative: 0 })
      }

      const entry = monthlyData.get(monthKey)!
      entry.count++
      cumulative++
      entry.cumulative = cumulative
    })

    // Convert to array with labels
    return Array.from(monthlyData.entries()).map(([key, data]) => {
      const [year, month] = key.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' })
      return {
        label: `${monthName} '${year.slice(2)}`,
        count: data.count,
        cumulative: data.cumulative,
      }
    }).slice(-6) // Show last 6 months
  }, [completions])

  return (
    <div className="p-4 space-y-6">
      {/* Hero Progress Card */}
      <div className="bg-surface rounded-2xl p-6 text-center">
        <div className="relative inline-flex items-center justify-center">
          {/* Progress Ring */}
          <svg
            className="w-32 h-32 transform -rotate-90"
            role="progressbar"
            aria-valuenow={percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Trail completion progress: ${percentComplete}%`}
          >
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

      {/* Progress Over Time Chart */}
      {progressData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3">
            Progress Over Time
          </h2>
          <div className="bg-surface rounded-xl p-4">
            <ProgressChart data={progressData} total={totalTrails} />
          </div>
        </div>
      )}

      {/* Progress by Area */}
      {areaProgress.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3">
            Progress by Area
          </h2>
          <div className="space-y-2">
            {areaProgress.map((area) => (
              <Link
                key={area.area}
                to={`/trails?area=${encodeURIComponent(area.area)}`}
                className="block bg-surface rounded-xl p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: area.colors.bg, color: area.colors.text }}
                  >
                    {area.shortName}
                  </span>
                  <span className="text-xs text-secondary">
                    {area.completed}/{area.total} trails
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${area.percent}%`,
                      backgroundColor: area.percent === 100 ? '#DC2626' : area.colors.text,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-secondary">
                    {area.completedMiles.toFixed(1)} / {area.miles.toFixed(1)} mi
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: area.percent === 100 ? '#DC2626' : area.colors.text }}
                  >
                    {area.percent}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Recent Completions
          </h2>
          {completions.length > 0 && (
            <Link
              to="/timeline"
              className="text-sm text-location hover:underline"
            >
              View All →
            </Link>
          )}
        </div>
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
        <Link
          to="/trails"
          className="block w-full bg-location text-white font-semibold py-3 px-4 rounded-xl text-center hover:opacity-90 transition-opacity"
        >
          Find Your Next Hike →
        </Link>
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

function ProgressChart({
  data,
  total,
}: {
  data: { label: string; count: number; cumulative: number }[]
  total: number
}) {
  if (data.length === 0) return null

  const maxCumulative = data[data.length - 1]?.cumulative || 1

  return (
    <div className="space-y-3">
      {/* Cumulative progress line */}
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-20">
                {/* Monthly count bar */}
                <div
                  className="w-full bg-location rounded-t transition-all duration-300"
                  style={{ height: `${(d.count / Math.max(...data.map(x => x.count), 1)) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.count} trail${d.count !== 1 ? 's' : ''} in ${d.label}`}
                />
              </div>
              <span className="text-[10px] text-secondary truncate w-full text-center">
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cumulative progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-secondary">
          <span>Cumulative Progress</span>
          <span>{maxCumulative} of {total}</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-complete h-2 rounded-full transition-all duration-500"
            style={{ width: `${(maxCumulative / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
