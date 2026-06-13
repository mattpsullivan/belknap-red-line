/**
 * Native Geolocation Provider
 *
 * Conforms the GeolocationProvider interface to the native Capacitor plugins
 * via the BackgroundGeolocation infrastructure wrapper. Used for iOS/Android
 * native apps and supports background tracking while the app is backgrounded
 * or the screen is locked.
 *
 * The wrapper is injected (defaulting to the real client) so tests can drive a
 * null instance with state-based assertions - see backgroundGeolocationClient.ts.
 */

import type { Location, CallbackError } from '@capgo/background-geolocation';
import {
  createBackgroundGeolocationClient,
  type BackgroundGeolocationClient,
} from './backgroundGeolocationClient';
import type {
  GeolocationProvider,
  GeoPosition,
  GeolocationError,
  PositionCallback,
  ErrorCallback,
  WatcherOptions,
  PermissionStatus,
} from './types';
import { GeolocationErrorCode } from './types';

/**
 * Default notification text for Android background tracking. @capgo shows a
 * persistent notification while the foreground-location service runs.
 */
const DEFAULT_NOTIFICATION = {
  title: 'Recording hike',
  text: 'Belknap Tracker is tracking your trail',
};

/** @capgo v8 exposes a single background watch, so we hand out one stable id. */
const WATCHER_ID = 'native-watcher';

/** Convert a @capgo Location into the app's GeoPosition. */
function toGeoPosition(location: Location): GeoPosition {
  return {
    lat: location.latitude,
    lng: location.longitude,
    accuracy: location.accuracy,
    timestamp: location.time ?? 0,
    altitude: location.altitude ?? undefined,
    speed: location.speed ?? undefined,
    bearing: location.bearing ?? undefined,
  };
}

/** Convert a @capgo CallbackError into the app's GeolocationError. */
function toGeoError(error: CallbackError): GeolocationError {
  const code =
    error.code === 'PERMISSION_DENIED'
      ? GeolocationErrorCode.PERMISSION_DENIED
      : GeolocationErrorCode.POSITION_UNAVAILABLE;
  return {
    code,
    message: error.message || 'Native geolocation error',
  };
}

/**
 * Create a native geolocation provider.
 *
 * @param client Infrastructure wrapper for the native plugins. Defaults to the
 *   real implementation; tests pass a null client.
 */
export function createNativeProvider(
  client: BackgroundGeolocationClient = createBackgroundGeolocationClient()
): GeolocationProvider {
  let isWatching = false;

  return {
    supportsBackground: true,

    async startWatching(
      onPosition: PositionCallback,
      onError: ErrorCallback,
      options?: WatcherOptions
    ): Promise<string> {
      if (isWatching) {
        throw new Error(
          'Already watching position. Stop the current watcher first.'
        );
      }

      await client.start(
        {
          backgroundTitle:
            options?.notificationTitle ?? DEFAULT_NOTIFICATION.title,
          backgroundMessage:
            options?.notificationText ?? DEFAULT_NOTIFICATION.text,
          distanceFilter: options?.distanceFilter ?? 5,
          requestPermissions: true,
        },
        (location) => onPosition(toGeoPosition(location)),
        (error) => onError(toGeoError(error))
      );

      isWatching = true;
      return WATCHER_ID;
    },

    async stopWatching(): Promise<void> {
      await client.stop();
      isWatching = false;
    },

    async checkPermissions(): Promise<PermissionStatus> {
      return client.checkPermissions();
    },

    async requestPermissions(): Promise<PermissionStatus> {
      return client.requestPermissions();
    },

    async openSettings(): Promise<void> {
      await client.openSettings();
    },
  };
}
