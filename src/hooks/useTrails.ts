import { useMemo, useCallback } from 'react'
import { trails, totalDistance, totalTrails } from '@/data/trails'
import type { Trail } from '@/types'

export function useTrails() {
  const getTrailById = useCallback(
    (id: string): Trail | undefined => {
      return trails.find((t) => t.id === id)
    },
    []
  )

  return useMemo(
    () => ({
      trails,
      totalDistance,
      totalTrails,
      getTrailById,
    }),
    [getTrailById]
  )
}
