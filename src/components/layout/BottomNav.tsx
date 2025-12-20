import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Progress', icon: '📊' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/trails', label: 'Trails', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border">
      <div className="flex h-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? 'text-location' : 'text-secondary'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
