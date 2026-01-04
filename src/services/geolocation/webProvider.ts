/**
 * Web Geolocation Provider
 *
 * Wraps the browser's navigator.geolocation API to conform to the
 * GeolocationProvider interface. Used for PWA/browser environments.
 */

import type {
  GeolocationProvider,
  GeoPosition,
  PositionCallback,
  ErrorCallback,
  WatcherOptions,
  PermissionStatus,
  GeolocationError,
} from './types';
import { GeolocationErrorCode } from './types';

/**
 * Create a web-based geolocation provider using navigator.geolocation
 */
export function createWebProvider(): GeolocationProvider {
  // Track active watchers by ID
  const watchers = new Map<string, number>();
  let watcherCounter = 0;

  /**
   * Convert browser GeolocationPosition to our GeoPosition type
   */
  function toGeoPosition(pos: GeolocationPosition): GeoPosition {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
      altitude: pos.coords.altitude ?? undefined,
      speed: pos.coords.speed ?? undefined,
      bearing: pos.coords.heading ?? undefined,
    };
  }

  /**
   * Convert browser GeolocationPositionError to our GeolocationError type
   */
  function toGeoError(err: GeolocationPositionError): GeolocationError {
    const codeMap: Record<number, GeolocationErrorCode> = {
      1: GeolocationErrorCode.PERMISSION_DENIED,
      2: GeolocationErrorCode.POSITION_UNAVAILABLE,
      3: GeolocationErrorCode.TIMEOUT,
    };

    return {
      code: codeMap[err.code] ?? GeolocationErrorCode.UNKNOWN,
      message: err.message || getDefaultMessage(err.code),
    };
  }

  function getDefaultMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location permission denied';
      case 2:
        return 'Position unavailable';
      case 3:
        return 'Location request timed out';
      default:
        return 'Unknown geolocation error';
    }
  }

  return {
    supportsBackground: false,

    async startWatching(
      onPosition: PositionCallback,
      onError: ErrorCallback,
      options?: WatcherOptions
    ): Promise<string> {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported in this browser');
      }

      const watcherId = `web-${++watcherCounter}`;

      const browserWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          onPosition(toGeoPosition(pos));
        },
        (err) => {
          onError(toGeoError(err));
        },
        {
          enableHighAccuracy: options?.accuracy !== 'low',
          timeout: options?.interval ?? 10000,
          maximumAge: 0,
        }
      );

      watchers.set(watcherId, browserWatchId);
      return watcherId;
    },

    async stopWatching(watcherId: string): Promise<void> {
      const browserWatchId = watchers.get(watcherId);
      if (browserWatchId !== undefined) {
        navigator.geolocation.clearWatch(browserWatchId);
        watchers.delete(watcherId);
      }
    },

    async checkPermissions(): Promise<PermissionStatus> {
      // Use Permissions API if available
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({
            name: 'geolocation',
          });
          return {
            location: result.state as 'granted' | 'denied' | 'prompt',
          };
        } catch {
          // Permissions API not supported for geolocation
        }
      }

      // Fallback: assume prompt state
      return { location: 'prompt' };
    },

    async requestPermissions(): Promise<PermissionStatus> {
      // Web doesn't have explicit permission request
      // The browser will prompt when watchPosition is called
      // We can trigger a position request to prompt the user
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ location: 'denied' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => resolve({ location: 'granted' }),
          (err) => {
            if (err.code === 1) {
              resolve({ location: 'denied' });
            } else {
              // Other errors don't mean permission denied
              resolve({ location: 'granted' });
            }
          },
          { timeout: 5000 }
        );
      });
    },

    async openSettings(): Promise<void> {
      // Web can't open settings programmatically
      // Best we can do is alert the user
      console.warn(
        'Cannot open settings from web. User must manually enable location in browser settings.'
      );
    },
  };
}
