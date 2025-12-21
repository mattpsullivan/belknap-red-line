import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoops } from '@/hooks'

type FilterDifficulty = 'all' | 'easy' | 'moderate' | 'difficult'
type FilterStatus = 'all' | 'complete' | 'incomplete' | 'in-progress'

export function LoopsPage() {
  const { loops } = useLoops()
  const [difficultyFilter, setDifficultyFilter] = useState<FilterDifficulty>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLoops = loops.filter((loop) => {
    // Difficulty filter
    if (difficultyFilter !== 'all' && loop.difficulty !== difficultyFilter) {
      return false
    }

    // Status filter
    if (statusFilter === 'complete' && !loop.isComplete) return false
    if (statusFilter === 'incomplete' && loop.completedTrailCount > 0) return false
    if (statusFilter === 'in-progress' && (loop.isComplete || loop.completedTrailCount === 0)) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        loop.name.toLowerCase().includes(query) ||
        loop.description.toLowerCase().includes(query)
      )
    }

    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-2">
        <h1 className="text-xl font-bold text-primary mb-3">Suggested Loops</h1>
        <input
          type="search"
          placeholder="Search loops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-location"
        />
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
          Completed
        </FilterChip>
        <FilterChip
          active={statusFilter === 'in-progress'}
          onClick={() => setStatusFilter('in-progress')}
        >
          In Progress
        </FilterChip>
        <FilterChip
          active={statusFilter === 'incomplete'}
          onClick={() => setStatusFilter('incomplete')}
        >
          Not Started
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
            setDifficultyFilter(difficultyFilter === 'moderate' ? 'all' : 'moderate')
          }
        >
          Moderate
        </FilterChip>
        <FilterChip
          active={difficultyFilter === 'difficult'}
          onClick={() =>
            setDifficultyFilter(difficultyFilter === 'difficult' ? 'all' : 'difficult')
          }
        >
          Difficult
        </FilterChip>
      </div>

      {/* Loops List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredLoops.map((loop) => (
            <Link
              key={loop.id}
              to={`/loops/${loop.id}`}
              className="block bg-surface rounded-xl p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Progress indicator */}
                <div className="relative w-10 h-10 shrink-0">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-border"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 16}
                      strokeDashoffset={2 * Math.PI * 16 * (1 - loop.percentComplete / 100)}
                      strokeLinecap="round"
                      className={loop.isComplete ? 'text-red-500' : 'text-location'}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {loop.percentComplete}%
                  </span>
                </div>

                {/* Loop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary">{loop.name}</h3>
                    {loop.isComplete && (
                      <span className="text-red-500 text-sm">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary mt-1 line-clamp-2">
                    {loop.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-secondary">
                    <span>{loop.totalDistance} mi</span>
                    <span>•</span>
                    <span>{loop.trails.length} trails</span>
                    <span>•</span>
                    <span className={`capitalize ${
                      loop.difficulty === 'easy' ? 'text-green-600' :
                      loop.difficulty === 'moderate' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {loop.difficulty}
                    </span>
                    <span>•</span>
                    <span>{loop.estimatedTime}</span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-secondary shrink-0"
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
              </div>
            </Link>
          ))}

          {filteredLoops.length === 0 && (
            <div className="text-center py-8 text-secondary">
              No loops match your filters.
            </div>
          )}
        </div>
      </div>
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
