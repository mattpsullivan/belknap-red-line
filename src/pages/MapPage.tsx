import { TrailMap } from '@/components/map'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function MapErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-surface">
      <div className="text-4xl mb-4">Map unavailable</div>
      <p className="text-secondary mb-4">
        There was a problem loading the map. Please check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-location text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Reload Page
      </button>
    </div>
  )
}

export function MapPage() {
  // Height: 100vh - header (56px) - nav (64px) = calc(100vh - 120px)
  return (
    <div className="w-full" style={{ height: 'calc(100vh - 120px)' }}>
      <ErrorBoundary fallback={<MapErrorFallback />}>
        <TrailMap />
      </ErrorBoundary>
    </div>
  )
}
