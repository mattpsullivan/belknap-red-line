import { Link } from 'react-router-dom'
import { useCompletions, useTrackHistory } from '@/hooks'
import { usePMTiles } from '@/providers/PMTilesProvider'

export function SettingsPage() {
  const { completions } = useCompletions()
  const { tracks } = useTrackHistory()
  const { isOfflineReady, isOfflineMode, setOfflineMode, error: offlineError } = usePMTiles()

  const handleExport = () => {
    const data = JSON.stringify(completions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'belknap-completions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Settings</h1>

      {/* Offline Mode */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Offline Maps</h2>
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-primary">Use Offline Maps</p>
              <p className="text-xs text-secondary">
                {isOfflineReady
                  ? 'Local map tiles available (1.8 MB)'
                  : 'Downloading map tiles...'}
              </p>
            </div>
            <button
              onClick={() => setOfflineMode(!isOfflineMode)}
              disabled={!isOfflineReady}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isOfflineMode ? 'bg-complete' : 'bg-gray-300'
              } ${!isOfflineReady ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={isOfflineMode}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isOfflineMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {offlineError && (
            <p className="text-xs text-incomplete">{offlineError}</p>
          )}
          {isOfflineMode && (
            <p className="text-xs text-complete">
              Map tiles are cached locally for offline use
            </p>
          )}
        </div>
      </section>

      {/* GPS Tracks */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">GPS Tracks</h2>
        <Link
          to="/tracks"
          className="block bg-surface rounded-xl p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-primary">Track History</p>
              <p className="text-xs text-secondary">
                View and manage your recorded hikes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">{tracks.length} tracks</span>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </Link>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Data Management</h2>
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <button
            onClick={handleExport}
            className="w-full py-2 px-4 bg-location text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Export Data (JSON)
          </button>
          <p className="text-xs text-secondary text-center">
            {completions.length} completion records
          </p>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">About</h2>
        <div className="bg-surface rounded-xl p-4 space-y-2 text-sm text-secondary">
          <p>
            <strong className="text-primary">Belknap Red-Line Tracker</strong>
          </p>
          <p>
            Track your progress on the BRATTS Redlining Patch program - 70.5
            miles of trails in the Belknap Range, NH.
          </p>
          <p className="pt-2">
            <a
              href="https://www.belknaprangetrailtenders.org/redlining.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-location hover:underline"
            >
              Learn more about BRATTS →
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
