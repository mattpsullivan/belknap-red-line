/**
 * Geolocation abstraction types
 *
 * These types provide a unified interface for geolocation across web (PWA)
 * and native (Capacitor) platforms.
 */

/**
 * A geographic position with accuracy metadata
 */
export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number; // Unix timestamp in ms
  altitude?: number; // metres above the WGS 84 ellipsoid (NOT mean sea level)
  speed?: number; // meters per second
  bearing?: number; // degrees from north
}

/**
 * Configuration options for starting a geolocation watcher
 */
export interface WatcherOptions {
  /** Minimum distance in meters between updates (default: 5) */
  distanceFilter?: number;

  /** Update interval in milliseconds (default: 5000) */
  interval?: number;

  /** Accuracy mode: 'high' for GPS, 'balanced' for power saving */
  accuracy?: 'high' | 'balanced' | 'low';

  /** Enable background tracking (native only, default: false) */
  enableBackground?: boolean;

  /** Notification title shown during background tracking (Android) */
  notificationTitle?: string;

  /** Notification text shown during background tracking (Android) */
  notificationText?: string;
}

/**
 * Callback function for position updates
 */
export type PositionCallback = (position: GeoPosition) => void;

/**
 * Callback function for errors
 */
export type ErrorCallback = (error: GeolocationError) => void;

/**
 * Geolocation error with code and message
 */
export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * Error codes matching the Web Geolocation API
 *
 * Declared as a const object rather than a TS `enum` so the file compiles
 * under `erasableSyntaxOnly` (enums emit runtime code that is not erasable).
 */
export const GeolocationErrorCode = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  UNKNOWN: 0,
} as const;

export type GeolocationErrorCode =
  (typeof GeolocationErrorCode)[keyof typeof GeolocationErrorCode];

/**
 * Permission status for geolocation
 */
export interface PermissionStatus {
  /** Permission for foreground location */
  location: 'granted' | 'denied' | 'prompt';

  /** Permission for background location (Android 10+, iOS) */
  backgroundLocation?: 'granted' | 'denied' | 'prompt';
}

/**
 * Interface for geolocation providers (web or native)
 *
 * Both the web and native implementations must conform to this interface,
 * allowing the app to switch between them based on the runtime platform.
 */
export interface GeolocationProvider {
  /**
   * Start watching for position updates
   * @param onPosition Callback for position updates
   * @param onError Callback for errors
   * @param options Configuration options
   * @returns Promise resolving to a watcher ID for stopping
   */
  startWatching(
    onPosition: PositionCallback,
    onError: ErrorCallback,
    options?: WatcherOptions
  ): Promise<string>;

  /**
   * Stop watching for position updates
   * @param watcherId The ID returned from startWatching
   */
  stopWatching(watcherId: string): Promise<void>;

  /**
   * Check current permission status
   */
  checkPermissions(): Promise<PermissionStatus>;

  /**
   * Request location permissions
   */
  requestPermissions(): Promise<PermissionStatus>;

  /**
   * Open device location settings
   * Useful when permission is denied
   */
  openSettings(): Promise<void>;

  /**
   * Whether this provider supports background tracking
   */
  readonly supportsBackground: boolean;
}
