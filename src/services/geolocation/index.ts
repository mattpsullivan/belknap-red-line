/**
 * Geolocation Service
 *
 * This module provides a unified geolocation interface that works across
 * web (PWA) and native (Capacitor iOS/Android) platforms.
 *
 * Usage:
 * ```typescript
 * import { createGeolocationProvider } from '@/services/geolocation';
 *
 * const provider = createGeolocationProvider();
 *
 * // Start tracking
 * const watcherId = await provider.startWatching(
 *   (position) => console.log('Position:', position),
 *   (error) => console.error('Error:', error),
 *   { distanceFilter: 5, enableBackground: true }
 * );
 *
 * // Stop tracking
 * await provider.stopWatching(watcherId);
 * ```
 */

import { Capacitor } from '@capacitor/core';
import { createWebProvider } from './webProvider';
import { createNativeProvider } from './nativeProvider';
import type { GeolocationProvider } from './types';

// Re-export types for consumers
export type {
  GeoPosition,
  WatcherOptions,
  PositionCallback,
  ErrorCallback,
  GeolocationError,
  PermissionStatus,
  GeolocationProvider,
} from './types';

export { GeolocationErrorCode } from './types';

/**
 * Create a geolocation provider appropriate for the current platform
 *
 * On native (iOS/Android), returns a provider using @capgo/background-geolocation
 * that supports background tracking.
 *
 * On web (PWA), returns a provider using navigator.geolocation that only works
 * while the browser tab is active.
 */
export function createGeolocationProvider(): GeolocationProvider {
  if (Capacitor.isNativePlatform()) {
    return createNativeProvider();
  }
  return createWebProvider();
}

/**
 * Check if the current platform supports background geolocation
 */
export function supportsBackgroundGeolocation(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform name
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }
  return 'web';
}
