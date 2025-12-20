import { useMemo } from 'react'
import { useTrails } from './useTrails'
import { useCompletions } from './useCompletions'

export function useProgress() {
  const { trails, totalTrails, totalDistance } = useTrails()
  const { completedTrailIds } = useCompletions()

  const completedCount = completedTrailIds.length

  const completedMiles = useMemo(() => {
    return trails
      .filter((t) => completedTrailIds.includes(t.id))
      .reduce((sum, t) => sum + t.distance, 0)
  }, [trails, completedTrailIds])

  const percentComplete = useMemo(() => {
    if (totalTrails === 0) return 0
    return Math.round((completedCount / totalTrails) * 100)
  }, [completedCount, totalTrails])

  const remainingCount = totalTrails - completedCount
  const remainingMiles = totalDistance - completedMiles

  return {
    completedCount,
    completedMiles,
    percentComplete,
    remainingCount,
    remainingMiles,
    totalTrails,
    totalDistance,
  }
}
