import { useState, useCallback, useEffect, useRef } from 'react'
import { calculateDistance } from '@/services/geo'

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

export interface UseGeolocationOptions {
  throttleMs?: number
  enableHighAccuracy?: boolean
  minDistanceMeters?: number // Skip updates if moved less than this distance
}

export interface UseGeolocationReturn {
  position: GeoPosition | null
  error: string | null
  isWatching: boolean
  startWatching: () => void
  stopWatching: () => void
}

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Permission denied',
  2: 'Position unavailable',
  3: 'Timeout',
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const { throttleMs = 5000, enableHighAccuracy = true, minDistanceMeters = 5 } = options

  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const lastPositionRef = useRef<GeoPosition | null>(null)

  const handleSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const now = Date.now()

      // Throttle updates
      if (now - lastUpdateRef.current < throttleMs) {
        return
      }

      // Skip if moved less than minimum distance
      if (lastPositionRef.current) {
        const distance = calculateDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
          pos.coords.latitude,
          pos.coords.longitude
        )
        if (distance < minDistanceMeters) {
          return
        }
      }

      lastUpdateRef.current = now

      const newPosition: GeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      }

      lastPositionRef.current = newPosition
      setPosition(newPosition)
      setError(null)
    },
    [throttleMs, minDistanceMeters]
  )

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(ERROR_MESSAGES[err.code] || err.message)
    setIsWatching(false)

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    if (watchIdRef.current !== null) {
      return // Already watching
    }

    setError(null)
    setIsWatching(true)
    lastUpdateRef.current = 0 // Reset throttle on start
    lastPositionRef.current = null // Reset distance check on start

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [handleSuccess, handleError, enableHighAccuracy])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsWatching(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    position,
    error,
    isWatching,
    startWatching,
    stopWatching,
  }
}
