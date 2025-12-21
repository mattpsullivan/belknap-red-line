import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/services/database/db'
import type { GPSTrack } from '@/types'

export interface UseTrackHistoryReturn {
  tracks: GPSTrack[]
  isLoading: boolean
  deleteTrack: (id: number) => Promise<void>
  getTrack: (id: number) => Promise<GPSTrack | undefined>
}

export function useTrackHistory(): UseTrackHistoryReturn {
  const tracks = useLiveQuery(
    () => db.tracks.orderBy('startedAt').reverse().toArray(),
    []
  )

  const deleteTrack = async (id: number) => {
    await db.tracks.delete(id)
  }

  const getTrack = async (id: number) => {
    return db.tracks.get(id)
  }

  return {
    tracks: tracks ?? [],
    isLoading: tracks === undefined,
    deleteTrack,
    getTrack,
  }
}
