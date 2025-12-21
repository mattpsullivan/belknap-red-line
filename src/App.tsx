import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PMTilesProvider } from '@/providers/PMTilesProvider'

// Lazy load pages for better initial bundle size
const ProgressPage = lazy(() => import('@/pages/ProgressPage').then(m => ({ default: m.ProgressPage })))
const MapPage = lazy(() => import('@/pages/MapPage').then(m => ({ default: m.MapPage })))
const TrailsPage = lazy(() => import('@/pages/TrailsPage').then(m => ({ default: m.TrailsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const TrackHistoryPage = lazy(() => import('@/pages/TrackHistoryPage').then(m => ({ default: m.TrackHistoryPage })))
const TrackDetailPage = lazy(() => import('@/pages/TrackDetailPage').then(m => ({ default: m.TrackDetailPage })))
const TrailDetailPage = lazy(() => import('@/pages/TrailDetailPage').then(m => ({ default: m.TrailDetailPage })))
const TimelinePage = lazy(() => import('@/pages/TimelinePage').then(m => ({ default: m.TimelinePage })))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-location" />
    </div>
  )
}

// Wrapper to add Suspense and ErrorBoundary to lazy-loaded pages
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <PMTilesProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<LazyPage><ProgressPage /></LazyPage>} />
            <Route path="map" element={<LazyPage><MapPage /></LazyPage>} />
            <Route path="trails" element={<LazyPage><TrailsPage /></LazyPage>} />
            <Route path="trails/:id" element={<LazyPage><TrailDetailPage /></LazyPage>} />
            <Route path="tracks" element={<LazyPage><TrackHistoryPage /></LazyPage>} />
            <Route path="tracks/:id" element={<LazyPage><TrackDetailPage /></LazyPage>} />
            <Route path="timeline" element={<LazyPage><TimelinePage /></LazyPage>} />
            <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PMTilesProvider>
  )
}

export default App
