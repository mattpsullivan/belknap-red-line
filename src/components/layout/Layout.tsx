import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-border flex items-center px-4 shrink-0">
        <h1 className="text-lg font-semibold text-primary">Belknap Tracker</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
