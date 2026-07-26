import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCompletions, useTrackHistory, useTrails } from '@/hooks'
import { usePMTiles } from '@/providers/pmtilesContext'
import {
  generateRedlineExportData,
  downloadRedlineCSV,
} from '@/services/redlineExport'
import { exportTextFile } from '@/services/fileExport'
import { shareDebugLogs } from '@/services/logger'
import { AboutBuild } from '@/components/AboutBuild'
import { BackgroundChecklist } from '@/components/BackgroundChecklist'

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
  const safetyRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // Scroll to safety section if hash is #safety
  useEffect(() => {
    if (location.hash === '#safety' && safetyRef.current) {
      safetyRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.hash])

  const exportData = generateRedlineExportData(trails, completions)

  const handleExportJSON = () => {
    void exportTextFile(
      'belknap-completions.json',
      JSON.stringify(completions, null, 2),
      'application/json'
    )
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
              aria-label="Toggle offline maps"
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
            <button
              onClick={() => void shareDebugLogs()}
              className="w-full py-2 px-4 bg-gray-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Share Debug Logs
            </button>
            <p className="text-xs text-secondary text-center mt-1">
              Export app logs via the share sheet (email, Telegram, Drive...)
            </p>
          </div>

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

      {/* Safety Information */}
      <section ref={safetyRef} id="safety" className="space-y-3 scroll-mt-4">
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-600"
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
          Safety Information
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="font-semibold text-amber-800 mb-1">
              This is NOT a Navigation App
            </p>
            <p className="text-sm text-amber-700">
              Belknap Tracker is for recording trail completions only. Do not rely on this app for navigation, route-finding, or safety decisions. Always carry proper maps and know how to use them.
            </p>
          </div>
        </div>
        <div className="bg-surface rounded-xl p-4 space-y-4">
          <div>
            <p className="font-semibold text-primary mb-1">
              The Destination is Your Car
            </p>
            <p className="text-sm text-secondary">
              Remember: the destination is always <b>the car at the end of the trip</b>, not the summit. Weather changes, fatigue, unexpected conditions, or simply not feeling right are all valid reasons to turn back. A successful hike is one where you return safely.
            </p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="font-semibold text-primary mb-2">
              The Ten Essentials
            </p>
            <p className="text-sm text-secondary mb-3">
              Always carry these items, even on short hikes:
            </p>
            <ol className="text-sm text-secondary space-y-1 list-decimal list-inside">
              <li>Navigation (map, compass, GPS)</li>
              <li>Sun protection (sunscreen, sunglasses, hat)</li>
              <li>Insulation (extra clothing)</li>
              <li>Illumination (headlamp, flashlight)</li>
              <li>First-aid supplies</li>
              <li>Fire (matches, lighter)</li>
              <li>Repair tools and knife</li>
              <li>Nutrition (extra food)</li>
              <li>Hydration (extra water)</li>
              <li>Emergency shelter</li>
            </ol>
            <p className="text-sm mt-3">
              <a
                href="https://www.nps.gov/articles/10essentials.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-location hover:underline inline-flex items-center gap-1"
              >
                Learn more about the Ten Essentials
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="font-semibold text-primary mb-2">
              Emergency Resources
            </p>
            <div className="text-sm text-secondary space-y-2">
              <p>
                <strong>NH Fish & Game (Search & Rescue):</strong>{' '}
                <a href="tel:+16032713361" className="text-location hover:underline">
                  (603) 271-3361
                </a>
              </p>
              <p>
                <strong>Emergency:</strong>{' '}
                <a href="tel:911" className="text-location hover:underline">
                  911
                </a>
              </p>
              <p className="text-xs text-secondary pt-2">
                Cell coverage may be limited in the Belknap Range. Let someone know your plans before you hike.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Background recording readiness */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Background recording</h2>
        <p className="text-sm text-secondary">
          Recording continues with the screen off only if all four of these hold.
        </p>
        <BackgroundChecklist mode="settings" />
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
          <div className="pt-3 border-t border-gray-200">
            <AboutBuild />
          </div>
        </div>
      </section>
    </div>
  )
}
