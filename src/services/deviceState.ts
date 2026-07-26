/**
 * Ground truth for the device settings that decide whether background GPS works,
 * plus the actions that let the user fix them.
 *
 * Why this exists: the app could not previously see the one permission that
 * matters. `backgroundGeolocationClient.checkPermissions()` is backed by
 * @capacitor/geolocation, which reports ACCESS_FINE_LOCATION and flattens it to
 * granted/denied/prompt - so "While using the app" and "Allow all the time" are
 * indistinguishable from JS. The start-recording setup gate could therefore
 * instruct the user to grant background location but never verify that they had.
 * It was a guide wearing a gate's clothing. On the 2026-07-26 walk neither
 * background location nor the battery exemption was actually in place.
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
  /** versionName, e.g. "1.0.3". */
  appVersion?: string
  /** versionCode - the CI commit count, which the web bundle cannot know. */
  appBuild?: number
  sdkInt?: number
  manufacturer?: string
  model?: string
  /** Why the snapshot is unavailable, when it is. */
  error?: string
}

interface DeviceStatePlugin {
  getState(): Promise<Omit<DeviceStateSnapshot, 'available' | 'error'>>
  openAppSettings(): Promise<void>
  requestIgnoreBatteryOptimizations(): Promise<void>
  openLocationSourceSettings(): Promise<void>
}

const native = registerPlugin<DeviceStatePlugin>('DeviceState')

/** Whether the native plugin is present at all. Side-effect free. */
export function isDeviceStateAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('DeviceState')
}

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

// --- remedies --------------------------------------------------------------

/**
 * How a failing check can be fixed.
 *
 * `direct` means one tap resolves it. `navigate` means Android provides no intent
 * for the specific toggle, so the best available is a settings screen plus written
 * directions - true of every permission, by design.
 */
export type RemedyKind = 'direct' | 'navigate' | 'none'

export interface BackgroundCheck {
  id: 'backgroundLocation' | 'batteryOptimization' | 'backgroundActivity' | 'locationServices'
  label: string
  /** true = fine, false = needs changing, undefined = unknown. */
  ok: boolean | undefined
  /** Current value, for display. */
  value: string
  /** Present only when `ok === false`. */
  problem?: string
  remedy: RemedyKind
  /** Button text, when there is an action. */
  actionLabel?: string
  /** Where Android drops you, and what to tap once there. */
  directions?: string
  run?: () => Promise<void>
}

const openAppSettings = async () => {
  if (!isDeviceStateAvailable()) return
  await native.openAppSettings().catch(() => {})
}

const requestBatteryExemption = async () => {
  if (!isDeviceStateAvailable()) return
  await native.requestIgnoreBatteryOptimizations().catch(() => {})
}

const openLocationServices = async () => {
  if (!isDeviceStateAvailable()) return
  await native.openLocationSourceSettings().catch(() => {})
}

const yesNo = (v: boolean | undefined, yes: string, no: string) =>
  v === undefined ? 'Unknown' : v ? yes : no

/**
 * Every background-recording requirement with its current state - including the
 * ones that pass.
 *
 * `backgroundBlockers()` returns only failures, which is what a gate wants.
 * Settings wants the whole checklist, so both derive from this one place.
 */
export function backgroundChecks(state: DeviceStateSnapshot): BackgroundCheck[] {
  if (!state.available) return []

  return [
    {
      id: 'backgroundLocation',
      label: 'Location permission',
      ok: state.backgroundLocation,
      value: yesNo(state.backgroundLocation, 'Allow all the time', 'While using the app'),
      problem:
        state.backgroundLocation === false
          ? 'Location is not set to "Allow all the time"'
          : undefined,
      // Android has no intent for a specific permission toggle, deliberately.
      remedy: 'navigate',
      actionLabel: 'Open app settings',
      directions: 'Permissions → Location → "Allow all the time"',
      run: openAppSettings,
    },
    {
      id: 'batteryOptimization',
      label: 'Battery optimisation',
      ok: state.ignoringBatteryOptimizations,
      value: yesNo(state.ignoringBatteryOptimizations, 'Exempt', 'On'),
      problem:
        state.ignoringBatteryOptimizations === false
          ? 'Battery optimisation is still on for this app'
          : undefined,
      // The only one Android lets us fix outright.
      remedy: 'direct',
      actionLabel: 'Fix',
      run: requestBatteryExemption,
    },
    {
      id: 'backgroundActivity',
      label: 'Background activity',
      ok: state.backgroundRestricted === undefined ? undefined : !state.backgroundRestricted,
      value: yesNo(
        state.backgroundRestricted === undefined ? undefined : !state.backgroundRestricted,
        'Unrestricted',
        'Restricted'
      ),
      problem:
        state.backgroundRestricted === true
          ? 'Background activity is restricted for this app'
          : undefined,
      remedy: 'navigate',
      actionLabel: 'Open app settings',
      directions: 'App battery usage → Unrestricted',
      run: openAppSettings,
    },
    {
      id: 'locationServices',
      label: 'Location services',
      ok: state.locationServicesEnabled,
      value: yesNo(state.locationServicesEnabled, 'On', 'Off'),
      problem:
        state.locationServicesEnabled === false ? 'Location services are off' : undefined,
      remedy: 'direct',
      actionLabel: 'Open location settings',
      run: openLocationServices,
    },
  ]
}

/**
 * The settings that must hold for background recording to survive the screen
 * locking. Returns the ones that do not.
 */
export function backgroundBlockers(state: DeviceStateSnapshot): string[] {
  return backgroundChecks(state)
    .map((c) => c.problem)
    .filter((p): p is string => p !== undefined)
}
