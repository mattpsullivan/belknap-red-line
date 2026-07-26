import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateDistance } from '@/services/geo';
import { logger } from '@/services/logger';
import {
  createGeolocationProvider,
  supportsBackgroundGeolocation,
  type GeoPosition,
  type GeolocationProvider,
} from '@/services/geolocation';

/** Keep logged floats readable without losing meaningful precision. */
function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

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
  /** Wall-clock ms of the last raw GPS fix from the provider (liveness signal). */
  lastFixAt: number | null;
  /** Start watching for position updates */
  startWatching: () => void;
  /** Stop watching for position updates */
  stopWatching: () => void;
  /** Open the OS location settings for this app (to grant "Allow all the time"). */
  openLocationSettings: () => Promise<void>;
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

  const [lastFixAt, setLastFixAt] = useState<number | null>(null);

  const watcherIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPositionRef = useRef<GeoPosition | null>(null);
  const lastFixWriteRef = useRef<number>(0);
  /** Wall-clock of the previous arriving fix, for the gps.fix log only. */
  const lastFixAtRef = useRef<number | null>(null);

  // Handle incoming position from provider
  const handlePosition = useCallback(
    (pos: GeoPosition) => {
      const now = Date.now();

      // Every arriving fix is logged BEFORE the throttle and distance filters.
      // This is the distinction the 2026-07-25 hike could not make: stored track
      // points are not fixes, so "the provider went silent" and "fixes arrived
      // and were filtered out" looked identical in the exported track. With this,
      // fix entries continuing while points stop means the filters are eating
      // them; fix entries stopping while heartbeats continue means location was
      // cut; both stopping means the WebView was frozen.
      const sinceLast = lastFixAtRef.current ? now - lastFixAtRef.current : null;
      lastFixAtRef.current = now;

      // Liveness: record that a fix arrived (before throttle/distance gating, so
      // standing still doesn't read as a stall). Throttle the state write so a
      // high fix rate doesn't spam re-renders.
      if (now - lastFixWriteRef.current >= 5000) {
        lastFixWriteRef.current = now;
        setLastFixAt(now);
      }

      const moved = lastPositionRef.current
        ? calculateDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            pos.lat,
            pos.lng
          )
        : null;

      const logFix = (outcome: 'accepted' | 'throttled' | 'under-distance') =>
        logger.event('gps', 'fix', {
          outcome,
          lat: round(pos.lat, 6),
          lng: round(pos.lng, 6),
          accuracy: round(pos.accuracy, 1),
          altitude: pos.altitude === undefined ? undefined : round(pos.altitude, 1),
          speed: pos.speed === undefined ? undefined : round(pos.speed, 2),
          movedM: moved === null ? undefined : round(moved, 1),
          sinceLastFixMs: sinceLast ?? undefined,
        });

      // Throttle updates
      if (now - lastUpdateRef.current < throttleMs) {
        logFix('throttled');
        return;
      }

      // Skip if moved less than minimum distance
      if (moved !== null && moved < minDistanceMeters) {
        logFix('under-distance');
        return;
      }

      logFix('accepted');
      lastUpdateRef.current = now;
      lastPositionRef.current = pos;
      setPosition(pos);
      setError(null);
    },
    [throttleMs, minDistanceMeters]
  );

  // Handle errors from provider
  const handleError = useCallback((err: { message: string }) => {
    logger.event('gps', 'provider.error', { message: err.message }, 'error');
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
    lastFixWriteRef.current = 0;
    setLastFixAt(null); // fresh liveness baseline for this watch session

    // Start watching asynchronously
    provider
      .startWatching(handlePosition, handleError, {
        // Deliver every fix (we gate the exposed position via throttle +
        // minDistanceMeters below); a continuous fix stream is what makes the
        // stall/liveness signal accurate when stationary.
        distanceFilter: 0,
        interval: throttleMs,
        accuracy: enableHighAccuracy ? 'high' : 'balanced',
        enableBackground,
        notificationTitle: backgroundNotificationTitle,
        notificationText: backgroundNotificationText,
      })
      .then((watcherId) => {
        watcherIdRef.current = watcherId;
        logger.event('gps', 'watch.started', {
          watcherId,
          supportsBackground: provider.supportsBackground,
          enableBackground,
          throttleMs,
          minDistanceMeters,
          accuracy: enableHighAccuracy ? 'high' : 'balanced',
        });
      })
      .catch((err) => {
        logger.event('gps', 'watch.start-failed', { message: err?.message }, 'error');
        setError(err.message || 'Failed to start geolocation');
        setIsWatching(false);
      });
  }, [
    handlePosition,
    handleError,
    throttleMs,
    minDistanceMeters,
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

  const openLocationSettings = useCallback(() => getProvider().openSettings(), []);

  return {
    position,
    error,
    isWatching,
    lastFixAt,
    startWatching,
    stopWatching,
    openLocationSettings,
    supportsBackground: supportsBackgroundGeolocation(),
  };
}
