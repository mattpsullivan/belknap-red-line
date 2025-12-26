interface FilterChipProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

export function FilterChip({ children, active, onClick }: FilterChipProps) {
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
