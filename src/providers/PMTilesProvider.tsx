import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers, LIGHT } from '@protomaps/basemaps'

// PMTiles URL (bundled with app)
const PMTILES_URL = '/tiles/belknap-range.pmtiles'

// Generate map style with PMTiles source
function createOfflineStyle() {
  // Use LIGHT theme from protomaps basemaps
  const baseLayers = layers('protomaps', LIGHT)

  return {
    version: 8 as const,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
      protomaps: {
        type: 'vector' as const,
        url: `pmtiles://${window.location.origin}${PMTILES_URL}`,
        attribution: '<a href="https://protomaps.com">Protomaps</a> | <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: baseLayers,
  }
}

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

  // Register PMTiles protocol on mount
  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    // Check if PMTiles file is available
    fetch(PMTILES_URL, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          setOfflineStyle(createOfflineStyle())
          setIsOfflineReady(true)
        } else {
          setError('Offline map tiles not available')
        }
      })
      .catch(() => {
        setError('Could not load offline map tiles')
      })

    return () => {
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
