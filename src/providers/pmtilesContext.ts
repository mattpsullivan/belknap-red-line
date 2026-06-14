import { createContext, useContext } from 'react'
import type { createOfflineStyle } from './pmtiles'

export interface PMTilesContextValue {
  isOfflineReady: boolean
  isOfflineMode: boolean
  setOfflineMode: (enabled: boolean) => void
  offlineStyle: ReturnType<typeof createOfflineStyle> | null
  error: string | null
}

export const PMTilesContext = createContext<PMTilesContextValue>({
  isOfflineReady: false,
  isOfflineMode: false,
  setOfflineMode: () => {},
  offlineStyle: null,
  error: null,
})

export function usePMTiles() {
  return useContext(PMTilesContext)
}
