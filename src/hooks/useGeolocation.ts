import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateDistance } from '@/services/geo';
import {
  createGeolocationProvider,
  supportsBackgroundGeolocation,
  type GeoPosition,
  type GeolocationProvider,
} from '@/services/geolocation';

// Re-export GeoPosition for consumers
export type { GeoPosition } from '@/services/geolocation';

export interface UseGeolocationOptions {
  /** Throttle updates to this interval in milliseconds (default: 5000) */
  throttleMs?: number;
  /** Enable high accuracy mode (default: true) */
  enableHighAccuracy?: boolean;
  /** Skip updates if moved less than this distance in meters (default: 5) */
  minDistanceMeters?: number;
  /** Enable background tracking on native platforms (default: false) */
  enableBackground?: boolean;
  /** Notification title for background tracking (Android) */
  backgroundNotificationTitle?: string;
  /** Notification text for background tracking (Android) */
  backgroundNotificationText?: string;
}

export interface UseGeolocationReturn {
  /** Current position, or null if not yet acquired */
  position: GeoPosition | null;
  /** Error message if geolocation failed */
  error: string | null;
  /** Whether actively watching position */
  isWatching: boolean;
  /** Start watching for position updates */
  startWatching: () => void;
  /** Stop watching for position updates */
  stopWatching: () => void;
  /** Whether background tracking is supported on this platform */
  supportsBackground: boolean;
}

// Create provider singleton (determined at module load time)
let providerInstance: GeolocationProvider | null = null;

function getProvider(): GeolocationProvider {
  if (!providerInstance) {
    providerInstance = createGeolocationProvider();
  }
  return providerInstance;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    throttleMs = 5000,
    enableHighAccuracy = true,
    minDistanceMeters = 5,
    enableBackground = false,
    backgroundNotificationTitle,
    backgroundNotificationText,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const watcherIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPositionRef = useRef<GeoPosition | null>(null);

  // Handle incoming position from provider
  const handlePosition = useCallback(
    (pos: GeoPosition) => {
      const now = Date.now();

      // Throttle updates
      if (now - lastUpdateRef.current < throttleMs) {
        return;
      }

      // Skip if moved less than minimum distance
      if (lastPositionRef.current) {
        const distance = calculateDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
          pos.lat,
          pos.lng
        );
        if (distance < minDistanceMeters) {
          return;
        }
      }

      lastUpdateRef.current = now;
      lastPositionRef.current = pos;
      setPosition(pos);
      setError(null);
    },
    [throttleMs, minDistanceMeters]
  );

  // Handle errors from provider
  const handleError = useCallback((err: { message: string }) => {
    setError(err.message);
    setIsWatching(false);
    watcherIdRef.current = null;
  }, []);

  const startWatching = useCallback(() => {
    if (watcherIdRef.current !== null) {
      return; // Already watching
    }

    const provider = getProvider();

    setError(null);
    setIsWatching(true);
    lastUpdateRef.current = 0; // Reset throttle on start
    lastPositionRef.current = null; // Reset distance check on start

    // Start watching asynchronously
    provider
      .startWatching(handlePosition, handleError, {
        distanceFilter: minDistanceMeters,
        interval: throttleMs,
        accuracy: enableHighAccuracy ? 'high' : 'balanced',
        enableBackground,
        notificationTitle: backgroundNotificationTitle,
        notificationText: backgroundNotificationText,
      })
      .then((watcherId) => {
        watcherIdRef.current = watcherId;
      })
      .catch((err) => {
        setError(err.message || 'Failed to start geolocation');
        setIsWatching(false);
      });
  }, [
    handlePosition,
    handleError,
    minDistanceMeters,
    throttleMs,
    enableHighAccuracy,
    enableBackground,
    backgroundNotificationTitle,
    backgroundNotificationText,
  ]);

  const stopWatching = useCallback(() => {
    if (watcherIdRef.current !== null) {
      const provider = getProvider();
      provider.stopWatching(watcherIdRef.current).catch((err) => {
        console.error('Error stopping geolocation:', err);
      });
      watcherIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watcherIdRef.current !== null) {
        const provider = getProvider();
        provider.stopWatching(watcherIdRef.current).catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  return {
    position,
    error,
    isWatching,
    startWatching,
    stopWatching,
    supportsBackground: supportsBackgroundGeolocation(),
  };
}
