import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCompletions } from './useCompletions'
import { db } from '@/services/database'

describe('useCompletions', () => {
  beforeEach(async () => {
    await db.completions.clear()
  })

  it('returns empty completions initially', async () => {
    const { result } = renderHook(() => useCompletions())

    await waitFor(() => {
      expect(result.current.completions).toEqual([])
    })
  })

  it('adds a completion', async () => {
    const { result } = renderHook(() => useCompletions())

    await act(async () => {
      await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
        notes: 'Great hike!',
      })
    })

    await waitFor(() => {
      expect(result.current.completions).toHaveLength(1)
      expect(result.current.completions[0].trailId).toBe('belknap-east')
    })
  })

  it('removes a completion', async () => {
    const { result } = renderHook(() => useCompletions())

    let completionId: number

    await act(async () => {
      completionId = await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
    })

    await waitFor(() => {
      expect(result.current.completions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.removeCompletion(completionId!)
    })

    await waitFor(() => {
      expect(result.current.completions).toHaveLength(0)
    })
  })

  it('checks if trail is completed', async () => {
    const { result } = renderHook(() => useCompletions())

    await act(async () => {
      await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isTrailCompleted('belknap-east')).toBe(true)
      expect(result.current.isTrailCompleted('major-main')).toBe(false)
    })
  })

  it('gets completions for a specific trail', async () => {
    const { result } = renderHook(() => useCompletions())

    await act(async () => {
      await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
      await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-20'),
        manualEntry: true,
      })
      await result.current.addCompletion({
        trailId: 'major-main',
        completedAt: new Date('2024-12-10'),
        manualEntry: true,
      })
    })

    await waitFor(() => {
      const belknapCompletions =
        result.current.getCompletionsForTrail('belknap-east')
      expect(belknapCompletions).toHaveLength(2)
    })
  })

  it('returns completed trail IDs', async () => {
    const { result } = renderHook(() => useCompletions())

    await act(async () => {
      await result.current.addCompletion({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
      await result.current.addCompletion({
        trailId: 'major-main',
        completedAt: new Date('2024-12-10'),
        manualEntry: true,
      })
    })

    await waitFor(() => {
      expect(result.current.completedTrailIds).toContain('belknap-east')
      expect(result.current.completedTrailIds).toContain('major-main')
      expect(result.current.completedTrailIds).toHaveLength(2)
    })
  })
})
