import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header - brand navy, pt-safe keeps the title clear of the status bar */}
      <header className="bg-brand shrink-0 pt-safe">
        <div className="h-14 flex items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-white">Belknap Tracker</h1>
          {__SHOW_BUILD_STAMP__ && (
            <span className="text-[10px] leading-tight text-white/60 text-right tabular-nums">
              {__APP_COMMIT__}
              <br />
              {__APP_BUILD_TIME__}
            </span>
          )}
        </div>
      </header>

      {/* Main content - pad past the fixed bottom nav + gesture bar */}
      <main className="flex-1 overflow-auto min-h-0 pb-nav-safe">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
