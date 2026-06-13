import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { createOfflineStyle, loadPmtilesArchive } from './pmtiles'

interface PMTilesContextValue {
  isOfflineReady: boolean
  isOfflineMode: boolean
  setOfflineMode: (enabled: boolean) => void
  offlineStyle: ReturnType<typeof createOfflineStyle> | null
  error: string | null
}

const PMTilesContext = createContext<PMTilesContextValue>({
  isOfflineReady: false,
  isOfflineMode: false,
  setOfflineMode: () => {},
  offlineStyle: null,
  error: null,
})

export function usePMTiles() {
  return useContext(PMTilesContext)
}

interface PMTilesProviderProps {
  children: ReactNode
}

export function PMTilesProvider({ children }: PMTilesProviderProps) {
  const [isOfflineReady, setIsOfflineReady] = useState(false)
  const [isOfflineMode, setOfflineMode] = useState(false)
  const [offlineStyle, setOfflineStyle] = useState<ReturnType<typeof createOfflineStyle> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Register PMTiles protocol on mount and load the archive into memory.
  // We register the in-memory PMTiles instance with the protocol (protocol.add)
  // so MapLibre reads tiles from the buffer instead of issuing HTTP Range
  // requests, which the Capacitor asset server does not serve (left the
  // basemap blank). See ./pmtiles for the why.
  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    let cancelled = false
    loadPmtilesArchive()
      .then((archive) => {
        if (cancelled) return
        protocol.add(archive)
        setOfflineStyle(createOfflineStyle())
        setIsOfflineReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load offline map tiles')
      })

    return () => {
      cancelled = true
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  // Load offline preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('offlineMode')
    if (saved === 'true' && isOfflineReady) {
      setOfflineMode(true)
    }
  }, [isOfflineReady])

  // Save offline preference
  const handleSetOfflineMode = (enabled: boolean) => {
    setOfflineMode(enabled)
    localStorage.setItem('offlineMode', String(enabled))
  }

  return (
    <PMTilesContext.Provider
      value={{
        isOfflineReady,
        isOfflineMode,
        setOfflineMode: handleSetOfflineMode,
        offlineStyle,
        error,
      }}
    >
      {children}
    </PMTilesContext.Provider>
  )
}
