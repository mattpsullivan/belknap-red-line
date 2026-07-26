import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initLogger } from '@/services/logger'
import { attachTrackingLifecycle } from '@/services/tracking'
import { applyPalette } from '@/config/palette'

// Inject the brand palette as CSS variables, then start capturing logs.
applyPalette()
initLogger()
// Persist pending track points before the app is backgrounded or torn down -
// the last guaranteed moment before Chromium starts throttling.
attachTrackingLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
