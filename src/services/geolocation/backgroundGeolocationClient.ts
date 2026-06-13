/**
 * Background Geolocation infrastructure wrapper
 *
 * A thin wrapper around the two Capacitor plugins this app depends on:
 *   - @capgo/background-geolocation : background location watching + openSettings
 *   - @capacitor/geolocation        : permission queries (@capgo v8 has no
 *                                     standalone permission API)
 *
 * Architected per James Shore's "Testing Without Mocks" (Nullables):
 * https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks
 *
 * `createBackgroundGeolocationClient()` returns the real implementation that
 * talks to the native plugins. `createNullBackgroundGeolocationClient()`
 * returns an in-memory instance with the same interface - configurable
 * responses (permission state) and output tracking (start/stop/openSettings
 * calls) plus `emit()`/`emitError()` to drive the location callback. This lets
 * the provider be tested with state-based, sociable tests and no mock
 * framework.
 *
 * The wrapper deliberately deals in the plugin's own low-level `Location` /
 * `CallbackError` shapes; mapping to the app's GeoPosition type happens one
 * layer up, in nativeProvider.ts (mirroring how webProvider maps the browser's
 * GeolocationPosition).
 */

import { BackgroundGeolocation } from '@capgo/background-geolocation';
import type { Location, CallbackError } from '@capgo/background-geolocation';
import { Geolocation } from '@capacitor/geolocation';
import type { PermissionState } from '@capacitor/core';

/** Options the app passes when starting a background watch. */
export interface NativeStartOptions {
  /** Notification title shown while tracking in the background (Android). */
  backgroundTitle?: string;
  /** Notification body shown while tracking in the background (Android). */
  backgroundMessage?: string;
  /** Minimum metres of movement between updates. */
  distanceFilter?: number;
  /** Whether the plugin should auto-request permissions on start. */
  requestPermissions?: boolean;
}

/** Permission state normalised to the three states the app cares about. */
export interface NativePermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
}

export type LocationCallback = (location: Location) => void;
export type LocationErrorCallback = (error: CallbackError) => void;

export interface BackgroundGeolocationClient {
  start(
    options: NativeStartOptions,
    onLocation: LocationCallback,
    onError: LocationErrorCallback
  ): Promise<void>;
  stop(): Promise<void>;
  checkPermissions(): Promise<NativePermissionStatus>;
  requestPermissions(): Promise<NativePermissionStatus>;
  openSettings(): Promise<void>;
}

/**
 * Normalise @capacitor/geolocation's PermissionState (which includes
 * 'prompt-with-rationale') down to the app's three-state model.
 */
function normalisePermission(state: PermissionState): NativePermissionStatus {
  if (state === 'granted') return { location: 'granted' };
  if (state === 'denied') return { location: 'denied' };
  return { location: 'prompt' };
}

/**
 * The real client, backed by the native plugins.
 */
export function createBackgroundGeolocationClient(): BackgroundGeolocationClient {
  return {
    async start(options, onLocation, onError) {
      await BackgroundGeolocation.start(
        {
          backgroundTitle: options.backgroundTitle,
          backgroundMessage: options.backgroundMessage,
          distanceFilter: options.distanceFilter,
          requestPermissions: options.requestPermissions,
        },
        (location, error) => {
          if (error) {
            onError(error);
            return;
          }
          if (location) {
            onLocation(location);
          }
        }
      );
    },

    async stop() {
      await BackgroundGeolocation.stop();
    },

    async checkPermissions() {
      const result = await Geolocation.checkPermissions();
      return normalisePermission(result.location);
    },

    async requestPermissions() {
      const result = await Geolocation.requestPermissions();
      return normalisePermission(result.location);
    },

    async openSettings() {
      await BackgroundGeolocation.openSettings();
    },
  };
}

/** Configuration for a null (in-memory) client. */
export interface NullClientConfig {
  /** Response for checkPermissions(). Defaults to { location: 'prompt' }. */
  permissions?: NativePermissionStatus;
  /**
   * Response for requestPermissions(). Defaults to `permissions` if set,
   * otherwise { location: 'granted' }.
   */
  requestPermissionsResult?: NativePermissionStatus;
}

/**
 * A null client extends the interface with test-facing controls: `emit`/
 * `emitError` push data through the location callback, and the readonly
 * trackers record what the code under test asked the infrastructure to do.
 */
export interface NullBackgroundGeolocationClient
  extends BackgroundGeolocationClient {
  /** Deliver a location to the currently-registered callback. */
  emit(location: Location): void;
  /** Deliver an error to the currently-registered callback. */
  emitError(error: CallbackError): void;
  /** Options passed to each start() call, in order. */
  readonly starts: ReadonlyArray<NativeStartOptions>;
  /** Number of stop() calls. */
  readonly stopCount: number;
  /** Number of openSettings() calls. */
  readonly openSettingsCount: number;
}

/**
 * An in-memory client for tests. No native plugins, no mock framework - a real
 * (if simple) implementation that records calls and lets a test drive the
 * location callback deterministically.
 */
export function createNullBackgroundGeolocationClient(
  config: NullClientConfig = {}
): NullBackgroundGeolocationClient {
  const starts: NativeStartOptions[] = [];
  let stopCount = 0;
  let openSettingsCount = 0;
  let onLocation: LocationCallback | null = null;
  let onError: LocationErrorCallback | null = null;

  return {
    get starts() {
      return starts;
    },
    get stopCount() {
      return stopCount;
    },
    get openSettingsCount() {
      return openSettingsCount;
    },

    async start(options, location, error) {
      starts.push(options);
      onLocation = location;
      onError = error;
    },

    async stop() {
      stopCount += 1;
      onLocation = null;
      onError = null;
    },

    async checkPermissions() {
      return config.permissions ?? { location: 'prompt' };
    },

    async requestPermissions() {
      return (
        config.requestPermissionsResult ??
        config.permissions ?? { location: 'granted' }
      );
    },

    async openSettings() {
      openSettingsCount += 1;
    },

    emit(location) {
      onLocation?.(location);
    },

    emitError(error) {
      onError?.(error);
    },
  };
}
