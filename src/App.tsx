import { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PMTilesProvider } from '@/providers/PMTilesProvider'
import { SafetyDisclaimerModal } from '@/components/SafetyDisclaimerModal'
import { lazyWithRetry } from '@/utils/lazyWithRetry'

// Lazy load pages for better initial bundle size. lazyWithRetry reloads once if
// a chunk import fails after an app update (stale service-worker cache).
const ProgressPage = lazyWithRetry(() => import('@/pages/ProgressPage').then(m => ({ default: m.ProgressPage })))
const MapPage = lazyWithRetry(() => import('@/pages/MapPage').then(m => ({ default: m.MapPage })))
const TrailsPage = lazyWithRetry(() => import('@/pages/TrailsPage').then(m => ({ default: m.TrailsPage })))
const SettingsPage = lazyWithRetry(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const TrackHistoryPage = lazyWithRetry(() => import('@/pages/TrackHistoryPage').then(m => ({ default: m.TrackHistoryPage })))
const TrackDetailPage = lazyWithRetry(() => import('@/pages/TrackDetailPage').then(m => ({ default: m.TrackDetailPage })))
const TrailDetailPage = lazyWithRetry(() => import('@/pages/TrailDetailPage').then(m => ({ default: m.TrailDetailPage })))
const LoopsPage = lazyWithRetry(() => import('@/pages/LoopsPage').then(m => ({ default: m.LoopsPage })))
const LoopDetailPage = lazyWithRetry(() => import('@/pages/LoopDetailPage').then(m => ({ default: m.LoopDetailPage })))
const TimelinePage = lazyWithRetry(() => import('@/pages/TimelinePage').then(m => ({ default: m.TimelinePage })))

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
  // Fade out the branded load screen (index.html #app-splash) once mounted.
  useEffect(() => {
    const splash = document.getElementById('app-splash')
    if (!splash) return
    splash.classList.add('hidden')
    const t = setTimeout(() => splash.remove(), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <PMTilesProvider>
      <BrowserRouter>
        <SafetyDisclaimerModal />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<LazyPage><ProgressPage /></LazyPage>} />
            <Route path="map" element={<LazyPage><MapPage /></LazyPage>} />
            <Route path="trails" element={<LazyPage><TrailsPage /></LazyPage>} />
            <Route path="trails/:id" element={<LazyPage><TrailDetailPage /></LazyPage>} />
            <Route path="loops" element={<LazyPage><LoopsPage /></LazyPage>} />
            <Route path="loops/:id" element={<LazyPage><LoopDetailPage /></LazyPage>} />
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
