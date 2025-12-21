import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTrackRecording } from './useTrackRecording'
import { db } from '@/services/database/db'

describe('useTrackRecording', () => {
  beforeEach(async () => {
    await db.tracks.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should start with no active track', () => {
    const { result } = renderHook(() => useTrackRecording())

    expect(result.current.isRecording).toBe(false)
    expect(result.current.currentTrack).toBeNull()
    expect(result.current.trackPoints).toEqual([])
  })

  it('should start recording a new track', async () => {
    const { result } = renderHook(() => useTrackRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.currentTrack).not.toBeNull()
    expect(result.current.currentTrack?.startedAt).toBeInstanceOf(Date)
  })

  it('should add points to the current track', async () => {
    const { result } = renderHook(() => useTrackRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    const point1 = { lat: 43.5179, lng: -71.3692, accuracy: 10, timestamp: Date.now() }
    const point2 = { lat: 43.5180, lng: -71.3693, accuracy: 10, timestamp: Date.now() + 1000 }

    act(() => {
      result.current.addPoint(point1)
    })

    expect(result.current.trackPoints).toHaveLength(1)
    expect(result.current.trackPoints[0]).toEqual(point1)

    act(() => {
      result.current.addPoint(point2)
    })

    expect(result.current.trackPoints).toHaveLength(2)
  })

  it('should calculate distance between points', async () => {
    const { result } = renderHook(() => useTrackRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    // Points roughly 15 meters apart
    const point1 = { lat: 43.5179, lng: -71.3692, accuracy: 10, timestamp: Date.now() }
    const point2 = { lat: 43.5180, lng: -71.3692, accuracy: 10, timestamp: Date.now() + 1000 }

    act(() => {
      result.current.addPoint(point1)
      result.current.addPoint(point2)
    })

    // Distance should be approximately 11 meters (0.0001 degrees lat ≈ 11m)
    expect(result.current.totalDistance).toBeGreaterThan(10)
    expect(result.current.totalDistance).toBeLessThan(15)
  })

  it('should stop recording and save the track', async () => {
    const { result } = renderHook(() => useTrackRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    const point = { lat: 43.5179, lng: -71.3692, accuracy: 10, timestamp: Date.now() }
    act(() => {
      result.current.addPoint(point)
    })

    let savedTrackId: number | undefined

    await act(async () => {
      savedTrackId = await result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(savedTrackId).toBeDefined()

    // Verify track was saved to database
    const savedTrack = await db.tracks.get(savedTrackId!)
    expect(savedTrack).toBeDefined()
    expect(savedTrack?.points).toHaveLength(1)
    expect(savedTrack?.endedAt).toBeInstanceOf(Date)
  })

  it('should discard track when cancelled', async () => {
    const { result } = renderHook(() => useTrackRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    const trackId = result.current.currentTrack?.id

    act(() => {
      result.current.addPoint({ lat: 43.5179, lng: -71.3692, accuracy: 10, timestamp: Date.now() })
    })

    await act(async () => {
      await result.current.cancelRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.trackPoints).toEqual([])

    // Verify track was deleted from database
    const deletedTrack = await db.tracks.get(trackId!)
    expect(deletedTrack).toBeUndefined()
  })

  it('should not add points when not recording', () => {
    const { result } = renderHook(() => useTrackRecording())

    act(() => {
      result.current.addPoint({ lat: 43.5179, lng: -71.3692, accuracy: 10, timestamp: Date.now() })
    })

    expect(result.current.trackPoints).toEqual([])
  })
})
