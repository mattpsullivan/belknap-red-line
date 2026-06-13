import { NavLink, Link } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Progress', icon: '📊' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/trails', label: 'Trails', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe">
      <div className="relative flex h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? 'text-brand' : 'text-secondary'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {/* Safety info link */}
        <Link
          to="/settings#safety"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-amber-600 hover:text-amber-700 transition-colors"
        aria-label="Safety information"
        title="Safety information"
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        </Link>
      </div>
    </nav>
  )
}
