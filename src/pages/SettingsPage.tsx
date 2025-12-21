import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCompletions, useTrackHistory, useTrails } from '@/hooks'
import { usePMTiles } from '@/providers/PMTilesProvider'
import {
  generateRedlineExportData,
  downloadRedlineCSV,
} from '@/services/redlineExport'

export function SettingsPage() {
  const { completions, importCompletions, clearCompletions } = useCompletions()
  const { trails } = useTrails()
  const { tracks } = useTrackHistory()
  const { isOfflineReady, isOfflineMode, setOfflineMode, error: offlineError } = usePMTiles()
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'warning' | null
    message: string
  }>({ type: null, message: '' })
  const [isImporting, setIsImporting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportData = generateRedlineExportData(trails, completions)

  const handleExportJSON = () => {
    const data = JSON.stringify(completions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'belknap-completions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportRedline = () => {
    const date = new Date().toISOString().split('T')[0]
    downloadRedlineCSV(exportData, `belknap-redline-${date}.csv`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportStatus({ type: null, message: '' })

    try {
      const jsonString = await file.text()
      const validTrailIds = new Set(trails.map((t) => t.id))
      const result = await importCompletions(jsonString, validTrailIds, {
        replace: false,
        skipDuplicates: true,
      })

      if (result.success && result.errors.length === 0) {
        setImportStatus({
          type: 'success',
          message: `Imported ${result.imported} completion${result.imported !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}` : ''}`,
        })
      } else if (result.imported > 0) {
        setImportStatus({
          type: 'warning',
          message: `Imported ${result.imported}, but ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}: ${result.errors[0]}`,
        })
      } else {
        setImportStatus({
          type: 'error',
          message: result.errors[0] || 'Import failed',
        })
      }
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Failed to read file',
      })
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClearData = async () => {
    await clearCompletions()
    setShowClearConfirm(false)
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

      {/* Patch Submission */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Patch Submission</h2>
        <div className="bg-surface rounded-xl p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-primary">Progress</span>
              <span className="text-sm text-secondary">
                {exportData.totals.completedTrails}/{exportData.totals.totalTrails} trails
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-complete h-2 rounded-full transition-all"
                style={{ width: `${exportData.totals.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-secondary mt-1">
              {exportData.totals.completedMiles} of {exportData.totals.totalMiles} miles ({exportData.totals.percentComplete}%)
            </p>
          </div>
          <button
            onClick={handleExportRedline}
            className="w-full py-2 px-4 bg-complete text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Export Redline Report (CSV)
          </button>
          <p className="text-xs text-secondary text-center">
            Download your progress in BRATTS workbook format
          </p>
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Data Management</h2>
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <button
            onClick={handleExportJSON}
            className="w-full py-2 px-4 bg-location text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Export Raw Data (JSON)
          </button>
          <p className="text-xs text-secondary text-center">
            {completions.length} completion records
          </p>

          <div className="border-t border-gray-200 pt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full py-2 px-4 bg-gray-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import from JSON'}
            </button>
            <p className="text-xs text-secondary text-center mt-1">
              Restore from a previous backup
            </p>
            {importStatus.type && (
              <p
                className={`text-xs text-center mt-2 ${
                  importStatus.type === 'success'
                    ? 'text-complete'
                    : importStatus.type === 'warning'
                      ? 'text-yellow-600'
                      : 'text-incomplete'
                }`}
              >
                {importStatus.message}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3">
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-2 px-4 bg-incomplete text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Clear All Data
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-center text-incomplete font-medium">
                  Delete all {completions.length} completion records?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 py-2 px-4 bg-incomplete text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
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
