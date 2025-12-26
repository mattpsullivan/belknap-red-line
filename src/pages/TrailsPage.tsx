import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrails, useCompletions } from '@/hooks'
import { CompletionModal } from '@/components/trails'
import { getAreaColors } from '@/config/styles'
import type { Trail, Completion } from '@/types'

type FilterStatus = 'all' | 'complete' | 'incomplete'
type FilterDifficulty = 'all' | 'easy' | 'moderate' | 'difficult'

// Short names for area filter dropdown
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

export function TrailsPage() {
  const { trails } = useTrails()
  const { isTrailCompleted, addCompletion, getCompletionsForTrail } =
    useCompletions()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [difficultyFilter, setDifficultyFilter] =
    useState<FilterDifficulty>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null)

  // Get unique areas from trails
  const areas = [...new Set(trails.map((t) => t.area).filter(Boolean))] as string[]

  // Filter trails
  const filteredTrails = trails.filter((trail) => {
    // Status filter
    if (statusFilter === 'complete' && !isTrailCompleted(trail.id)) return false
    if (statusFilter === 'incomplete' && isTrailCompleted(trail.id)) return false

    // Difficulty filter
    if (difficultyFilter !== 'all' && trail.difficulty !== difficultyFilter)
      return false

    // Area filter
    if (areaFilter !== 'all' && trail.area !== areaFilter) return false

    // Search filter
    if (
      searchQuery &&
      !trail.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false

    return true
  })

  const handleMarkComplete = (trail: Trail) => {
    setSelectedTrail(trail)
  }

  const handleSaveCompletion = async (completion: Omit<Completion, 'id'>) => {
    await addCompletion(completion)
    setSelectedTrail(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Loops Banner */}
      <Link
        to="/loops"
        className="mx-4 mt-4 mb-2 p-3 bg-gradient-to-r from-location to-blue-500 rounded-xl flex items-center justify-between text-white hover:opacity-90 transition-opacity"
      >
        <div>
          <p className="font-semibold">Suggested Loops</p>
          <p className="text-sm opacity-90">Pre-planned multi-trail itineraries</p>
        </div>
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>

      {/* Search Bar and Area Filter */}
      <div className="p-4 pb-2 flex gap-2">
        <input
          type="search"
          placeholder="Search trails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-location"
        />
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-location"
        >
          <option value="all">All Areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {AREA_SHORT_NAMES[area] || area}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </FilterChip>
        <FilterChip
          active={statusFilter === 'complete'}
          onClick={() => setStatusFilter('complete')}
        >
          Complete
        </FilterChip>
        <FilterChip
          active={statusFilter === 'incomplete'}
          onClick={() => setStatusFilter('incomplete')}
        >
          Incomplete
        </FilterChip>
        <span className="w-px bg-border" />
        <FilterChip
          active={difficultyFilter === 'easy'}
          onClick={() =>
            setDifficultyFilter(difficultyFilter === 'easy' ? 'all' : 'easy')
          }
        >
          Easy
        </FilterChip>
        <FilterChip
          active={difficultyFilter === 'moderate'}
          onClick={() =>
            setDifficultyFilter(
              difficultyFilter === 'moderate' ? 'all' : 'moderate'
            )
          }
        >
          Moderate
        </FilterChip>
        <FilterChip
          active={difficultyFilter === 'difficult'}
          onClick={() =>
            setDifficultyFilter(
              difficultyFilter === 'difficult' ? 'all' : 'difficult'
            )
          }
        >
          Difficult
        </FilterChip>
      </div>

      {/* Trail List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredTrails.map((trail) => {
            const completed = isTrailCompleted(trail.id)
            const completions = getCompletionsForTrail(trail.id)
            const lastCompletion = completions[completions.length - 1]

            return (
              <div
                key={trail.id}
                className="bg-surface rounded-xl p-4 flex items-start gap-3"
              >
                {/* Status Indicator */}
                <div
                  className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
                    completed ? 'bg-complete' : 'bg-incomplete'
                  }`}
                />

                {/* Trail Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/trails/${trail.id}`}
                      className="font-medium text-primary hover:text-location transition-colors"
                    >
                      {trail.name}
                    </Link>
                    {trail.area && (
                      <AreaBadge area={trail.area} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-secondary">
                    <span>{trail.distance} mi</span>
                    <span>•</span>
                    <DifficultyBadge difficulty={trail.difficulty} />
                    {trail.elevationGain && (
                      <>
                        <span>•</span>
                        <span>{trail.elevationGain} ft</span>
                      </>
                    )}
                  </div>
                  {completed && lastCompletion && (
                    <p className="text-xs text-complete mt-1">
                      ✓ Completed{' '}
                      {new Date(lastCompletion.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {!completed && (
                  <button
                    onClick={() => handleMarkComplete(trail)}
                    className="shrink-0 px-3 py-1.5 bg-complete text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Complete
                  </button>
                )}
              </div>
            )
          })}

          {filteredTrails.length === 0 && (
            <div className="text-center py-8 text-secondary">
              No trails match your filters.
            </div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {selectedTrail && (
        <CompletionModal
          trail={selectedTrail}
          isOpen={true}
          onSave={handleSaveCompletion}
          onClose={() => setSelectedTrail(null)}
        />
      )}
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-location text-white'
          : 'bg-surface text-secondary hover:bg-border'
      }`}
    >
      {children}
    </button>
  )
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty: 'easy' | 'moderate' | 'difficult'
}) {
  const colors = {
    easy: 'text-easy',
    moderate: 'text-moderate',
    difficult: 'text-difficult',
  }

  return (
    <span className={`capitalize ${colors[difficulty]}`}>{difficulty}</span>
  )
}

function AreaBadge({ area }: { area: string }) {
  const shortName = AREA_SHORT_NAMES[area] || area
  const colors = getAreaColors(area)
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full truncate max-w-[100px]"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {shortName}
    </span>
  )
}
