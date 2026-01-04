/**
 * Native Geolocation Provider
 *
 * Wraps the @capgo/background-geolocation Capacitor plugin to conform to
 * the GeolocationProvider interface. Used for iOS/Android native apps.
 *
 * This provider supports background location tracking while the app is
 * backgrounded or the screen is locked.
 */

import BackgroundGeolocation from '@capgo/background-geolocation';
import type { PluginListenerHandle } from '@capacitor/core';
import type {
  GeolocationProvider,
  GeoPosition,
  PositionCallback,
  ErrorCallback,
  WatcherOptions,
  PermissionStatus,
} from './types';
import { GeolocationErrorCode } from './types';

/**
 * Default notification settings for Android background tracking
 */
const DEFAULT_NOTIFICATION = {
  title: 'Recording hike',
  text: 'Belknap Tracker is tracking your trail',
  iconColor: '#3B82F6',
};

/**
 * Create a native geolocation provider using @capgo/background-geolocation
 */
export function createNativeProvider(): GeolocationProvider {
  // Track listeners for cleanup
  let positionListener: PluginListenerHandle | null = null;
  let errorListener: PluginListenerHandle | null = null;
  let isWatching = false;

  return {
    supportsBackground: true,

    async startWatching(
      onPosition: PositionCallback,
      onError: ErrorCallback,
      options?: WatcherOptions
    ): Promise<string> {
      // Prevent multiple simultaneous watchers
      if (isWatching) {
        throw new Error('Already watching position. Stop the current watcher first.');
      }

      // Set up position listener
      positionListener = await BackgroundGeolocation.addListener(
        'position',
        (position: {
          latitude: number;
          longitude: number;
          accuracy: number;
          altitude?: number;
          speed?: number;
          bearing?: number;
          time: number;
        }) => {
          const geoPos: GeoPosition = {
            lat: position.latitude,
            lng: position.longitude,
            accuracy: position.accuracy,
            timestamp: position.time,
            altitude: position.altitude,
            speed: position.speed,
            bearing: position.bearing,
          };
          onPosition(geoPos);
        }
      );

      // Set up error listener
      errorListener = await BackgroundGeolocation.addListener(
        'error',
        (error: { message: string }) => {
          onError({
            code: GeolocationErrorCode.POSITION_UNAVAILABLE,
            message: error.message,
          });
        }
      );

      // Start the plugin with configuration
      await BackgroundGeolocation.start({
        // Distance filter (meters between updates)
        distanceFilter: options?.distanceFilter ?? 5,

        // Accuracy mode
        desiredAccuracy:
          options?.accuracy === 'low'
            ? 'low'
            : options?.accuracy === 'balanced'
              ? 'balanced'
              : 'high',

        // Update interval
        interval: options?.interval ?? 5000,
        fastestInterval: Math.min(options?.interval ?? 5000, 2000),

        // Notification (Android)
        notificationTitle: options?.notificationTitle ?? DEFAULT_NOTIFICATION.title,
        notificationText: options?.notificationText ?? DEFAULT_NOTIFICATION.text,
        notificationIconColor: DEFAULT_NOTIFICATION.iconColor,

        // iOS activity type for better accuracy
        activityType: 'fitness',

        // Don't pause automatically - we want continuous tracking
        pauseLocationUpdatesAutomatically: false,
      });

      isWatching = true;
      return 'native-watcher';
    },

    async stopWatching(_watcherId: string): Promise<void> {
      // Stop the plugin
      await BackgroundGeolocation.stop();

      // Remove listeners
      if (positionListener) {
        positionListener.remove();
        positionListener = null;
      }
      if (errorListener) {
        errorListener.remove();
        errorListener = null;
      }

      isWatching = false;
    },

    async checkPermissions(): Promise<PermissionStatus> {
      const result = await BackgroundGeolocation.checkPermissions();

      return {
        location: result.location as 'granted' | 'denied' | 'prompt',
        backgroundLocation: result.backgroundLocation as
          | 'granted'
          | 'denied'
          | 'prompt'
          | undefined,
      };
    },

    async requestPermissions(): Promise<PermissionStatus> {
      const result = await BackgroundGeolocation.requestPermissions();

      return {
        location: result.location as 'granted' | 'denied' | 'prompt',
        backgroundLocation: result.backgroundLocation as
          | 'granted'
          | 'denied'
          | 'prompt'
          | undefined,
      };
    },

    async openSettings(): Promise<void> {
      await BackgroundGeolocation.openSettings();
    },
  };
}
