import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

const mockPosition: GeolocationPosition = {
  coords: {
    latitude: 43.5179,
    longitude: -71.3692,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
}

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // @ts-expect-error - mocking geolocation
    navigator.geolocation = mockGeolocation
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start with null position and no error', () => {
    const { result } = renderHook(() => useGeolocation())

    expect(result.current.position).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isWatching).toBe(false)
  })

  it('should start watching position when startWatching is called', () => {
    mockGeolocation.watchPosition.mockReturnValue(1)

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
    })

    expect(result.current.isWatching).toBe(true)
    expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1)
  })

  it('should update position when geolocation succeeds', () => {
    mockGeolocation.watchPosition.mockImplementation((success) => {
      setTimeout(() => success(mockPosition), 0)
      return 1
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
      vi.runAllTimers()
    })

    expect(result.current.position).toEqual({
      lat: 43.5179,
      lng: -71.3692,
      accuracy: 10,
      timestamp: mockPosition.timestamp,
    })
  })

  it('should set error when geolocation fails', () => {
    const mockError: GeolocationPositionError = {
      code: 1,
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }

    mockGeolocation.watchPosition.mockImplementation((_, error) => {
      setTimeout(() => error(mockError), 0)
      return 1
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
      vi.runAllTimers()
    })

    expect(result.current.error).toBe('Permission denied')
    expect(result.current.isWatching).toBe(false)
  })

  it('should stop watching when stopWatching is called', () => {
    mockGeolocation.watchPosition.mockReturnValue(42)

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
    })

    expect(result.current.isWatching).toBe(true)

    act(() => {
      result.current.stopWatching()
    })

    expect(result.current.isWatching).toBe(false)
    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(42)
  })

  it('should throttle position updates', async () => {
    let successCallback: (pos: GeolocationPosition) => void

    mockGeolocation.watchPosition.mockImplementation((success) => {
      successCallback = success
      return 1
    })

    const { result } = renderHook(() => useGeolocation({ throttleMs: 5000 }))

    act(() => {
      result.current.startWatching()
    })

    // First position update should go through
    act(() => {
      successCallback(mockPosition)
    })

    expect(result.current.position?.lat).toBe(43.5179)

    // Second update immediately after should be throttled
    const newPosition = {
      ...mockPosition,
      coords: { ...mockPosition.coords, latitude: 43.52 },
    }

    act(() => {
      successCallback(newPosition)
    })

    // Position should still be the first one (throttled)
    expect(result.current.position?.lat).toBe(43.5179)

    // Advance time past throttle
    act(() => {
      vi.advanceTimersByTime(5001)
    })

    // Now update should go through
    act(() => {
      successCallback(newPosition)
    })

    expect(result.current.position?.lat).toBe(43.52)
  })

  it('should clean up on unmount', () => {
    mockGeolocation.watchPosition.mockReturnValue(99)

    const { result, unmount } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
    })

    unmount()

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(99)
  })

  it('should handle geolocation not supported', () => {
    // @ts-expect-error - removing geolocation
    delete navigator.geolocation

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.startWatching()
    })

    expect(result.current.error).toBe('Geolocation not supported')
    expect(result.current.isWatching).toBe(false)
  })
})
