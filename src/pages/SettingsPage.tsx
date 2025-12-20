import { useCompletions } from '@/hooks'

export function SettingsPage() {
  const { completions } = useCompletions()

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
