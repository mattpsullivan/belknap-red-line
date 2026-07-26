/**
 * Shows whether the device is actually configured for background recording.
 *
 * Replaces a paragraph of instructions that could never verify itself. On the
 * 2026-07-26 walk the log recorded `backgroundLocation: false` and
 * `ignoringBatteryOptimizations: false` - both of the things this panel had been
 * asking for were untrue, and the app had no way to know, because
 * @capacitor/geolocation reports only ACCESS_FINE_LOCATION and flattens it. The
 * native DeviceState plugin can see the real values, so the gate can now check
 * rather than instruct.
 *
 * Off-device (web, tests) the plugin is unavailable. In that case this shows the
 * original guidance and claims nothing - absent data must not read as a pass.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  backgroundBlockers,
  logDeviceState,
  type DeviceStateSnapshot,
} from '@/services/deviceState'

export interface BackgroundReadinessProps {
  onOpenSettings: () => void
  /** Injected in tests. */
  read?: (reason: string) => Promise<DeviceStateSnapshot>
}

export function BackgroundReadiness({
  onOpenSettings,
  read = logDeviceState,
}: BackgroundReadinessProps) {
  const [state, setState] = useState<DeviceStateSnapshot | null>(null)

  const refresh = useCallback(() => {
    void read('setup-gate').then(setState)
  }, [read])

  useEffect(refresh, [refresh])

  // Three states, deliberately distinct. Collapsing "not loaded yet" into
  // "cannot verify" made a correctly configured device flash the amber warning on
  // open, and made unknown indistinguishable from unavailable.
  const phase: 'checking' | 'verified' | 'unavailable' =
    state === null ? 'checking' : state.available ? 'verified' : 'unavailable'

  const blockers = state ? backgroundBlockers(state) : []
  const ready = phase === 'verified' && blockers.length === 0

  return (
    <div
      className={
        ready
          ? 'rounded-lg bg-green-50 border border-green-200 p-3 text-green-900'
          : phase === 'checking'
            ? 'rounded-lg bg-gray-50 border border-gray-200 p-3 text-secondary'
            : 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900'
      }
    >
      <p className="font-semibold">
        {ready
          ? 'Ready to track with your phone away'
          : phase === 'checking'
            ? 'Checking background settings…'
            : 'Keep tracking with your phone away'}
      </p>

      {ready && (
        <p className="mt-1 text-green-800">
          Background location and battery settings check out.
        </p>
      )}

      {phase === 'verified' && blockers.length > 0 && (
        <>
          <p className="mt-1 text-amber-800">
            {blockers.length === 1 ? 'One setting needs' : `${blockers.length} settings need`}{' '}
            changing, or the track stops whenever your screen is off:
          </p>
          <ul className="mt-2 space-y-1 text-amber-800">
            {blockers.map((b) => (
              <li key={b} className="flex gap-2">
                <span aria-hidden="true">✕</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {phase === 'unavailable' && (
        // No native plugin, so nothing is known. Fall back to the instructions and
        // do not imply they have been satisfied.
        <p className="mt-1 text-amber-800">
          Set this app&rsquo;s Location to <strong>&ldquo;Allow all the time&rdquo;</strong> and
          turn off battery optimization - otherwise the track stops whenever your screen
          is off (so the whole hike can be lost).
        </p>
      )}

      <div className="mt-2 flex gap-4">
        <button type="button" onClick={onOpenSettings} className="font-semibold underline">
          Open location settings
        </button>
        <button type="button" onClick={refresh} className="font-semibold underline">
          Re-check
        </button>
      </div>
    </div>
  )
}
