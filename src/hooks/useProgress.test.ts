import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProgress } from './useProgress'
import { db } from '@/services/database'

describe('useProgress', () => {
  beforeEach(async () => {
    await db.completions.clear()
  })

  it('returns zero progress when no completions', async () => {
    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.completedCount).toBe(0)
      expect(result.current.completedMiles).toBe(0)
      expect(result.current.percentComplete).toBe(0)
    })
  })

  it('calculates completed count correctly', async () => {
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-15'),
      manualEntry: true,
    })
    await db.completions.add({
      trailId: 'major-main',
      completedAt: new Date('2024-12-10'),
      manualEntry: true,
    })

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.completedCount).toBe(2)
    })
  })

  it('calculates completed miles correctly', async () => {
    // belknap-east is 2.4 miles
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-15'),
      manualEntry: true,
    })

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.completedMiles).toBe(2.4)
    })
  })

  it('calculates percent complete correctly', async () => {
    // Add 2 of 8 trails (25%)
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-15'),
      manualEntry: true,
    })
    await db.completions.add({
      trailId: 'major-main',
      completedAt: new Date('2024-12-10'),
      manualEntry: true,
    })

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.percentComplete).toBe(25) // 2/8 = 25%
    })
  })

  it('returns remaining count correctly', async () => {
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-15'),
      manualEntry: true,
    })

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.remainingCount).toBe(7) // 8 - 1 = 7
    })
  })

  it('counts unique trails only (no duplicates)', async () => {
    // Complete same trail twice
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-15'),
      manualEntry: true,
    })
    await db.completions.add({
      trailId: 'belknap-east',
      completedAt: new Date('2024-12-20'),
      manualEntry: true,
    })

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.completedCount).toBe(1) // Only 1 unique trail
      expect(result.current.completedMiles).toBe(2.4) // Only count once
    })
  })
})
