import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

const mockCoords = {
  latitude: 43.5179,
  longitude: -71.3692,
  accuracy: 10,
  altitude: null,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};

const mockPosition = {
  coords: mockCoords,
  timestamp: Date.now(),
} as GeolocationPosition;

// Mock Capacitor to return web platform
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));

describe('useGeolocation', () => {
  beforeEach(() => {
    // @ts-expect-error - mocking geolocation
    navigator.geolocation = mockGeolocation;
    vi.clearAllMocks();
  });

  it('should start with null position and no error', () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.position).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isWatching).toBe(false);
    expect(result.current.supportsBackground).toBe(false);
  });

  it('should start watching position when startWatching is called', async () => {
    mockGeolocation.watchPosition.mockReturnValue(1);

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    expect(result.current.isWatching).toBe(true);

    await waitFor(() => {
      expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
    });
  });

  it('should update position when geolocation succeeds', async () => {
    mockGeolocation.watchPosition.mockImplementation((success) => {
      // Immediately call success
      success(mockPosition);
      return 1;
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(result.current.position).not.toBeNull();
    });

    expect(result.current.position).toEqual({
      lat: 43.5179,
      lng: -71.3692,
      accuracy: 10,
      timestamp: mockPosition.timestamp,
      altitude: undefined,
      speed: undefined,
      bearing: undefined,
    });
  });

  it('should set error when geolocation fails', async () => {
    const mockError: GeolocationPositionError = {
      code: 1,
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.watchPosition.mockImplementation((_, error) => {
      error(mockError);
      return 1;
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('User denied geolocation');
    });
    expect(result.current.isWatching).toBe(false);
  });

  it('should stop watching when stopWatching is called', async () => {
    mockGeolocation.watchPosition.mockReturnValue(42);

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    act(() => {
      result.current.stopWatching();
    });

    expect(result.current.isWatching).toBe(false);

    await waitFor(() => {
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(42);
    });
  });

  it('should throttle position updates', async () => {
    vi.useFakeTimers();
    let successCallback: (pos: GeolocationPosition) => void;

    mockGeolocation.watchPosition.mockImplementation((success) => {
      successCallback = success;
      return 1;
    });

    const { result } = renderHook(() => useGeolocation({ throttleMs: 5000 }));

    await act(async () => {
      result.current.startWatching();
      // Let the async provider initialize
      await vi.advanceTimersByTimeAsync(10);
    });

    // First position update should go through
    act(() => {
      successCallback(mockPosition);
    });

    expect(result.current.position?.lat).toBe(43.5179);

    // Second update immediately after should be throttled
    const newPosition = {
      ...mockPosition,
      coords: { ...mockPosition.coords, latitude: 43.52 },
    };

    act(() => {
      successCallback(newPosition);
    });

    // Position should still be the first one (throttled)
    expect(result.current.position?.lat).toBe(43.5179);

    // Advance time past throttle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5001);
    });

    // Now update should go through
    act(() => {
      successCallback(newPosition);
    });

    expect(result.current.position?.lat).toBe(43.52);

    vi.useRealTimers();
  });

  it('should clean up on unmount', async () => {
    mockGeolocation.watchPosition.mockReturnValue(99);

    const { result, unmount } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(99);
    });
  });

  it('should handle geolocation not supported', async () => {
    // @ts-expect-error - removing geolocation to simulate unsupported
    navigator.geolocation = undefined;

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Geolocation not supported in this browser');
    });
    expect(result.current.isWatching).toBe(false);
  });

  it('should skip updates when moved less than minDistanceMeters', async () => {
    let successCallback: (pos: GeolocationPosition) => void;

    mockGeolocation.watchPosition.mockImplementation((success) => {
      successCallback = success;
      return 1;
    });

    const { result } = renderHook(() =>
      useGeolocation({ throttleMs: 0, minDistanceMeters: 10 })
    );

    act(() => {
      result.current.startWatching();
    });

    await waitFor(() => {
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    // First position update should go through
    act(() => {
      successCallback(mockPosition);
    });

    expect(result.current.position?.lat).toBe(43.5179);

    // Second update only ~5m away should be skipped
    const closePosition = {
      ...mockPosition,
      coords: { ...mockPosition.coords, latitude: 43.51795 },
    };

    act(() => {
      successCallback(closePosition);
    });

    // Position should still be the first one (distance filtered)
    expect(result.current.position?.lat).toBe(43.5179);

    // Third update ~15m away should go through
    const farPosition = {
      ...mockPosition,
      coords: { ...mockPosition.coords, latitude: 43.5181 },
    };

    act(() => {
      successCallback(farPosition);
    });

    expect(result.current.position?.lat).toBe(43.5181);
  });
});
