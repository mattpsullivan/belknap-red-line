import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initLogger } from '@/services/logger'
import { applyPalette } from '@/config/palette'

// Inject the brand palette as CSS variables, then start capturing logs.
applyPalette()
initLogger()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
