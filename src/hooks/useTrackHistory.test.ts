import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTrackHistory } from './useTrackHistory'
import { db } from '@/services/database/db'

describe('useTrackHistory', () => {
  beforeEach(async () => {
    await db.tracks.clear()
  })

  it('returns empty array when no tracks exist', async () => {
    const { result } = renderHook(() => useTrackHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.tracks).toEqual([])
  })

  it('returns tracks ordered by startedAt descending', async () => {
    const track1 = {
      startedAt: new Date('2025-12-10'),
      endedAt: new Date('2025-12-10'),
      points: [],
      distance: 1000,
    }
    const track2 = {
      startedAt: new Date('2025-12-15'),
      endedAt: new Date('2025-12-15'),
      points: [],
      distance: 2000,
    }

    await db.tracks.add(track1)
    await db.tracks.add(track2)

    const { result } = renderHook(() => useTrackHistory())

    await waitFor(() => {
      expect(result.current.tracks.length).toBe(2)
    })

    // Most recent first
    expect(result.current.tracks[0].distance).toBe(2000)
    expect(result.current.tracks[1].distance).toBe(1000)
  })

  it('deletes a track', async () => {
    const track = {
      startedAt: new Date(),
      endedAt: new Date(),
      points: [],
      distance: 1000,
    }

    const id = await db.tracks.add(track)

    const { result } = renderHook(() => useTrackHistory())

    await waitFor(() => {
      expect(result.current.tracks.length).toBe(1)
    })

    await act(async () => {
      await result.current.deleteTrack(id as number)
    })

    await waitFor(() => {
      expect(result.current.tracks.length).toBe(0)
    })
  })

  it('gets a track by id', async () => {
    const track = {
      startedAt: new Date(),
      endedAt: new Date(),
      points: [{ lat: 43.5, lng: -71.3, accuracy: 10, timestamp: Date.now() }],
      distance: 1500,
    }

    const id = await db.tracks.add(track)

    const { result } = renderHook(() => useTrackHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const fetched = await result.current.getTrack(id as number)
    expect(fetched?.distance).toBe(1500)
    expect(fetched?.points.length).toBe(1)
  })

  it('returns undefined for non-existent track', async () => {
    const { result } = renderHook(() => useTrackHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const fetched = await result.current.getTrack(99999)
    expect(fetched).toBeUndefined()
  })
})
