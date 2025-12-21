import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCompletions, useTrails } from '@/hooks'

export function TimelinePage() {
  const { completions } = useCompletions()
  const { getTrailById } = useTrails()

  // Group completions by date
  const groupedCompletions = useMemo(() => {
    const sorted = [...completions].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )

    const groups = new Map<string, typeof completions>()

    sorted.forEach((c) => {
      const date = new Date(c.completedAt)
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(c)
    })

    return Array.from(groups.entries())
  }, [completions])

  // Calculate stats for each date
  const dateStats = useMemo(() => {
    return groupedCompletions.map(([date, comps]) => {
      const miles = comps.reduce((sum, c) => {
        const trail = getTrailById(c.trailId)
        return sum + (trail?.distance || 0)
      }, 0)
      return { date, completions: comps, miles }
    })
  }, [groupedCompletions, getTrailById])

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/progress"
          className="p-2 -ml-2 hover:bg-surface rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5 text-secondary"
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
        </Link>
        <h1 className="text-2xl font-bold text-primary">Completion Timeline</h1>
      </div>

      {/* Summary */}
      <div className="bg-surface rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-2xl font-bold text-primary">{completions.length}</p>
          <p className="text-sm text-secondary">Total Completions</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{dateStats.length}</p>
          <p className="text-sm text-secondary">Hiking Days</p>
        </div>
      </div>

      {/* Timeline */}
      {dateStats.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center text-secondary">
          <p className="text-lg">No completions yet</p>
          <p className="text-sm mt-2">Start hiking to build your timeline!</p>
          <Link
            to="/trails"
            className="inline-block mt-4 px-4 py-2 bg-location text-white rounded-lg"
          >
            Find a Trail
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dateStats.map(({ date, completions: comps, miles }) => (
            <div key={date} className="relative">
              {/* Date header */}
              <div className="sticky top-0 bg-background z-10 py-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-primary">{date}</h2>
                  <span className="text-sm text-secondary">
                    {comps.length} trail{comps.length !== 1 ? 's' : ''} • {miles.toFixed(1)} mi
                  </span>
                </div>
              </div>

              {/* Completions for this date */}
              <div className="space-y-2 ml-4 border-l-2 border-complete pl-4">
                {comps.map((c) => {
                  const trail = getTrailById(c.trailId)
                  if (!trail) return null

                  return (
                    <div
                      key={c.id}
                      className="bg-surface rounded-xl p-3 relative"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[22px] top-4 w-3 h-3 bg-complete rounded-full border-2 border-background" />

                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-primary">{trail.name}</p>
                          <div className="flex items-center gap-2 text-sm text-secondary mt-1">
                            <span>{trail.distance} mi</span>
                            <span>•</span>
                            <span className="capitalize">{trail.difficulty}</span>
                            {trail.area && (
                              <>
                                <span>•</span>
                                <span className="truncate">{trail.area}</span>
                              </>
                            )}
                          </div>
                          {c.notes && (
                            <p className="text-sm text-secondary mt-2 italic">
                              "{c.notes}"
                            </p>
                          )}
                        </div>
                        {!c.manualEntry && (
                          <span className="shrink-0 px-2 py-0.5 bg-location/10 text-location text-xs rounded-full">
                            GPS
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
