import { useState, useCallback, useRef } from 'react'
import { db } from '@/services/database/db'
import { calculateDistance } from '@/services/geo'
import type { GPSTrack, TrackPoint } from '@/types'

export interface UseTrackRecordingReturn {
  isRecording: boolean
  currentTrack: GPSTrack | null
  trackPoints: TrackPoint[]
  totalDistance: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<number | undefined>
  cancelRecording: () => Promise<void>
  addPoint: (point: TrackPoint) => void
}

export function useTrackRecording(): UseTrackRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<GPSTrack | null>(null)
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([])
  const [totalDistance, setTotalDistance] = useState(0)

  const trackIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<TrackPoint | null>(null)

  const startRecording = useCallback(async () => {
    const newTrack: GPSTrack = {
      startedAt: new Date(),
      points: [],
      distance: 0,
    }

    // Save initial track to database
    const id = await db.tracks.add(newTrack)
    trackIdRef.current = id as number
    newTrack.id = id as number

    setCurrentTrack(newTrack)
    setTrackPoints([])
    setTotalDistance(0)
    setIsRecording(true)
    lastPointRef.current = null
  }, [])

  const addPoint = useCallback(
    (point: TrackPoint) => {
      if (!isRecording || trackIdRef.current === null) {
        return
      }

      // Calculate distance from previous point before updating state
      if (lastPointRef.current) {
        const distance = calculateDistance(
          lastPointRef.current.lat,
          lastPointRef.current.lng,
          point.lat,
          point.lng
        )
        setTotalDistance((d) => d + distance)
      }

      // Update the last point ref
      lastPointRef.current = point

      // Add point to track
      setTrackPoints((prev) => [...prev, point])
    },
    [isRecording]
  )

  const stopRecording = useCallback(async () => {
    if (trackIdRef.current === null) {
      return undefined
    }

    const trackId = trackIdRef.current

    // Update track with final data
    await db.tracks.update(trackId, {
      endedAt: new Date(),
      points: trackPoints,
      distance: totalDistance,
    })

    setIsRecording(false)
    setCurrentTrack(null)
    trackIdRef.current = null

    return trackId
  }, [trackPoints, totalDistance])

  const cancelRecording = useCallback(async () => {
    if (trackIdRef.current !== null) {
      await db.tracks.delete(trackIdRef.current)
    }

    setIsRecording(false)
    setCurrentTrack(null)
    setTrackPoints([])
    setTotalDistance(0)
    trackIdRef.current = null
    lastPointRef.current = null
  }, [])

  return {
    isRecording,
    currentTrack,
    trackPoints,
    totalDistance,
    startRecording,
    stopRecording,
    cancelRecording,
    addPoint,
  }
}
