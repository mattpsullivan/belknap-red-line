import { useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/services/database'
import { importFromJSON, type ImportResult } from '@/services/completionImport'
import type { Completion } from '@/types'

export function useCompletions() {
  const completions = useLiveQuery(() => db.completions.toArray()) ?? []

  const addCompletion = useCallback(
    async (completion: Omit<Completion, 'id'>): Promise<number> => {
      const id = await db.completions.add(completion)
      return id as number
    },
    []
  )

  const clearCompletions = useCallback(async (): Promise<void> => {
    await db.completions.clear()
  }, [])

  const importCompletions = useCallback(
    async (
      jsonString: string,
      validTrailIds: Set<string>,
      options?: { replace?: boolean; skipDuplicates?: boolean }
    ): Promise<ImportResult> => {
      return importFromJSON(jsonString, validTrailIds, options)
    },
    []
  )

  const removeCompletion = useCallback(async (id: number): Promise<void> => {
    await db.completions.delete(id)
  }, [])

  const updateCompletion = useCallback(
    async (id: number, changes: Partial<Completion>): Promise<void> => {
      await db.completions.update(id, changes)
    },
    []
  )

  const completedTrailIds = useMemo(() => {
    const ids = new Set<string>()
    completions.forEach((c) => ids.add(c.trailId))
    return ids
  }, [completions])

  const isTrailCompleted = useCallback(
    (trailId: string): boolean => {
      return completedTrailIds.has(trailId)
    },
    [completedTrailIds]
  )

  const getCompletionsForTrail = useCallback(
    (trailId: string): Completion[] => {
      return completions.filter((c) => c.trailId === trailId)
    },
    [completions]
  )

  return {
    completions,
    completedTrailIds,
    addCompletion,
    removeCompletion,
    updateCompletion,
    clearCompletions,
    importCompletions,
    isTrailCompleted,
    getCompletionsForTrail,
  }
}
