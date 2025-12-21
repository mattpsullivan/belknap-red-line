import { useMemo } from 'react'
import { trailMatcher } from '@/services/geo'
import type { Trail, TrackPoint } from '@/types'
import type { TrailMatch, TrailMatcherResult } from '@/services/geo'

export interface UseTrailDetectionReturn extends TrailMatcherResult {
  /** Trails that are newly completed (not already marked complete) */
  newlyCompletedTrails: Trail[]
}

/**
 * Hook to detect trails based on recorded GPS track
 * @param trails All available trails
 * @param trackPoints Current recorded GPS points
 * @param completedTrailIds Array or Set of already completed trail IDs
 * @param bufferMeters Detection buffer in meters
 */
export function useTrailDetection(
  trails: Trail[],
  trackPoints: TrackPoint[],
  completedTrailIds: string[] | Set<string> = [],
  bufferMeters: number = 50
): UseTrailDetectionReturn {
  const completedSet = useMemo(
    () => (completedTrailIds instanceof Set ? completedTrailIds : new Set(completedTrailIds)),
    [completedTrailIds]
  )
  const result = useMemo(() => {
    if (trackPoints.length < 2) {
      return {
        currentTrail: null,
        currentCoverage: 0,
        completedTrails: [],
        nearbyTrails: [] as TrailMatch[],
        newlyCompletedTrails: [],
      }
    }

    const matchResult = trailMatcher(trails, trackPoints, bufferMeters)

    // Filter out already completed trails
    const newlyCompletedTrails = matchResult.completedTrails.filter(
      (trail) => !completedSet.has(trail.id)
    )

    return {
      ...matchResult,
      newlyCompletedTrails,
    }
  }, [trails, trackPoints, completedSet, bufferMeters])

  return result
}
