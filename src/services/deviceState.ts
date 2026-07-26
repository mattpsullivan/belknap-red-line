/**
 * Ground truth for the device settings that decide whether background GPS works.
 *
 * Why this exists: the app could not previously see the one permission that
 * matters. `backgroundGeolocationClient.checkPermissions()` is backed by
 * @capacitor/geolocation, which reports ACCESS_FINE_LOCATION and flattens it to
 * granted/denied/prompt - so "While using the app" and "Allow all the time" are
 * indistinguishable from JS. The start-recording setup gate could therefore
 * instruct the user to grant background location but never verify that they had.
 * It was a guide wearing a gate's clothing.
 *
 * @capgo/background-geolocation offers no permission query either: its whole API
 * is start/stop/openSettings/setPlannedRoute/getPluginVersion.
 *
 * So this reads the values natively. Everything is optional and every failure
 * path is non-fatal - an unavailable plugin logs `available: false` rather than
 * breaking a recording. A diagnostic must never be the reason a hike is lost.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { logger } from './logger'

export interface DeviceStateSnapshot {
  /** False when the native plugin is missing or threw - all fields then unset. */
  available: boolean
  /** ACCESS_FINE_LOCATION. */
  fineLocation?: boolean
  /** ACCESS_COARSE_LOCATION. */
  coarseLocation?: boolean
  /**
   * ACCESS_BACKGROUND_LOCATION - the one that decides whether fixes keep coming
   * with the screen off, and the one nothing else in the app can see.
   */
  backgroundLocation?: boolean
  /** PowerManager.isIgnoringBatteryOptimizations - false means Doze may throttle us. */
  ignoringBatteryOptimizations?: boolean
  /** PowerManager.isDeviceIdleMode at sample time. */
  deviceIdleMode?: boolean
  /** PowerManager.isPowerSaveMode. */
  powerSaveMode?: boolean
  /** ActivityManager.isBackgroundRestricted - a separate, easily-missed killer. */
  backgroundRestricted?: boolean
  /** Whether location services are on at all. */
  locationServicesEnabled?: boolean
  /** Why the snapshot is unavailable, when it is. */
  error?: string
}

interface DeviceStatePlugin {
  getState(): Promise<Omit<DeviceStateSnapshot, 'available' | 'error'>>
}

const native = registerPlugin<DeviceStatePlugin>('DeviceState')

/** Read the current device state. Never throws. */
export async function readDeviceState(): Promise<DeviceStateSnapshot> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, error: 'not a native platform' }
  }
  try {
    const state = await native.getState()
    return { available: true, ...state }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Read and log the device state.
 *
 * @param reason why we sampled - 'record-start', 'resume', 'periodic'. Having
 *   the reason in the log matters: a state that was correct at record-start and
 *   wrong at resume is a completely different diagnosis from one that was always
 *   wrong.
 */
export async function logDeviceState(reason: string): Promise<DeviceStateSnapshot> {
  const state = await readDeviceState()
  logger.event(
    'device',
    'state',
    { reason, ...state },
    state.available && state.backgroundLocation === false ? 'warn' : 'info'
  )
  return state
}

/**
 * The settings that must hold for background recording to survive the screen
 * locking. Returns the ones that do not, for the setup gate to act on.
 */
export function backgroundBlockers(state: DeviceStateSnapshot): string[] {
  if (!state.available) return []
  const blockers: string[] = []
  if (state.backgroundLocation === false) {
    blockers.push('Location is not set to "Allow all the time"')
  }
  if (state.ignoringBatteryOptimizations === false) {
    blockers.push('Battery optimisation is still on for this app')
  }
  if (state.backgroundRestricted === true) {
    blockers.push('Background activity is restricted for this app')
  }
  if (state.locationServicesEnabled === false) {
    blockers.push('Location services are off')
  }
  return blockers
}
