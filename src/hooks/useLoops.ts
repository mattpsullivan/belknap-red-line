import { useMemo, useCallback } from 'react'
import { loops } from '@/data/loops'
import { useTrails } from './useTrails'
import { useCompletions } from './useCompletions'
import type { Loop, Trail } from '@/types'

export interface LoopWithDetails extends Loop {
  trails: Trail[]
  totalDistance: number
  totalElevation: number
  completedTrailCount: number
  isComplete: boolean
  percentComplete: number
}

export function useLoops() {
  const { getTrailById } = useTrails()
  const { isTrailCompleted } = useCompletions()

  // Enrich loops with trail details and completion status
  const loopsWithDetails = useMemo((): LoopWithDetails[] => {
    return loops.map((loop) => {
      const trails = loop.trailIds
        .map((id) => getTrailById(id))
        .filter((t): t is Trail => t !== undefined)

      const totalDistance = trails.reduce((sum, t) => sum + t.distance, 0)
      const totalElevation = trails.reduce((sum, t) => sum + (t.elevationGain || 0), 0)
      const completedTrailCount = trails.filter((t) => isTrailCompleted(t.id)).length
      const isComplete = completedTrailCount === trails.length && trails.length > 0
      const percentComplete = trails.length > 0
        ? Math.round((completedTrailCount / trails.length) * 100)
        : 0

      return {
        ...loop,
        trails,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalElevation,
        completedTrailCount,
        isComplete,
        percentComplete,
      }
    })
  }, [getTrailById, isTrailCompleted])

  const getLoopById = useCallback(
    (id: string): LoopWithDetails | undefined => {
      return loopsWithDetails.find((l) => l.id === id)
    },
    [loopsWithDetails]
  )

  // Get loops that include a specific trail
  const getLoopsForTrail = useCallback(
    (trailId: string): LoopWithDetails[] => {
      return loopsWithDetails.filter((l) => l.trailIds.includes(trailId))
    },
    [loopsWithDetails]
  )

  // Get completed loops
  const completedLoops = useMemo(
    () => loopsWithDetails.filter((l) => l.isComplete),
    [loopsWithDetails]
  )

  // Get in-progress loops (at least one trail completed but not all)
  const inProgressLoops = useMemo(
    () => loopsWithDetails.filter((l) => l.completedTrailCount > 0 && !l.isComplete),
    [loopsWithDetails]
  )

  return {
    loops: loopsWithDetails,
    getLoopById,
    getLoopsForTrail,
    completedLoops,
    inProgressLoops,
    totalLoops: loops.length,
  }
}
