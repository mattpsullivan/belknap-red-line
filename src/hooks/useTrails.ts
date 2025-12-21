import { useMemo, useCallback } from 'react'
import { trails, totalDistance, totalTrails } from '@/data/trails'
import { calculateDistance } from '@/services/geo'
import type { Trail } from '@/types'

// Threshold in meters for considering two trail endpoints as connected
const CONNECTION_THRESHOLD_METERS = 100

export function useTrails() {
  const getTrailById = useCallback(
    (id: string): Trail | undefined => {
      return trails.find((t) => t.id === id)
    },
    []
  )

  // Find trails that share an endpoint with the given trail
  const getConnectedTrails = useCallback(
    (trailId: string): Trail[] => {
      const trail = trails.find((t) => t.id === trailId)
      if (!trail || trail.coordinates.length === 0) return []

      const trailStart = trail.coordinates[0]
      const trailEnd = trail.coordinates[trail.coordinates.length - 1]

      return trails.filter((other) => {
        if (other.id === trailId || other.coordinates.length === 0) return false

        const otherStart = other.coordinates[0]
        const otherEnd = other.coordinates[other.coordinates.length - 1]

        // Check if any endpoint of the other trail is close to any endpoint of this trail
        const distanceStartToStart = calculateDistance(
          trailStart.lat, trailStart.lng, otherStart.lat, otherStart.lng
        )
        const distanceStartToEnd = calculateDistance(
          trailStart.lat, trailStart.lng, otherEnd.lat, otherEnd.lng
        )
        const distanceEndToStart = calculateDistance(
          trailEnd.lat, trailEnd.lng, otherStart.lat, otherStart.lng
        )
        const distanceEndToEnd = calculateDistance(
          trailEnd.lat, trailEnd.lng, otherEnd.lat, otherEnd.lng
        )

        return (
          distanceStartToStart < CONNECTION_THRESHOLD_METERS ||
          distanceStartToEnd < CONNECTION_THRESHOLD_METERS ||
          distanceEndToStart < CONNECTION_THRESHOLD_METERS ||
          distanceEndToEnd < CONNECTION_THRESHOLD_METERS
        )
      })
    },
    []
  )

  return useMemo(
    () => ({
      trails,
      totalDistance,
      totalTrails,
      getTrailById,
      getConnectedTrails,
    }),
    [getTrailById, getConnectedTrails]
  )
}
