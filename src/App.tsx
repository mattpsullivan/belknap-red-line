import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProgressPage, MapPage, TrailsPage, SettingsPage } from '@/pages'
import { Layout } from '@/components/layout/Layout'
import { PMTilesProvider } from '@/providers/PMTilesProvider'

function App() {
  return (
    <PMTilesProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ProgressPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="trails" element={<TrailsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PMTilesProvider>
  )
}

export default App
