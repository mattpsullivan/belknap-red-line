/**
 * The background-recording requirements, their real state, and how to fix them.
 *
 * Replaces a paragraph of instructions that could never verify itself. On the
 * 2026-07-26 walk the log recorded `backgroundLocation: false` and
 * `ignoringBatteryOptimizations: false` - both of the things the old panel had been
 * asking for were untrue, and the app had no way to know.
 *
 * Two modes over one data source (`backgroundChecks`):
 *   gate     - only what is wrong, shown when you are about to record
 *   settings - the whole checklist, for looking before you leave
 *
 * Off-device the plugin is unavailable, and then this claims nothing and falls back
 * to the original guidance. Absent data must never render as a pass.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  backgroundChecks,
  logDeviceState,
  type BackgroundCheck,
  type DeviceStateSnapshot,
} from '@/services/deviceState'

export interface BackgroundChecklistProps {
  mode?: 'gate' | 'settings'
  /** Rendered above the list; the gate uses this for its own framing. */
  onOpenSettings?: () => void
  /** Injected in tests. */
  read?: (reason: string) => Promise<DeviceStateSnapshot>
}

function CheckRow({ check }: { check: BackgroundCheck }) {
  const mark = check.ok === undefined ? '?' : check.ok ? '✓' : '✕'
  const tone =
    check.ok === undefined ? 'text-secondary' : check.ok ? 'text-green-700' : 'text-amber-800'

  return (
    <li className="flex items-start gap-2 py-1">
      <span className={`${tone} font-semibold`} aria-hidden="true">
        {mark}
      </span>
      <span className="flex-1">
        <span className="text-primary">{check.label}</span>
        <span className="text-secondary"> — {check.value}</span>
        {check.ok === false && check.directions && (
          <span className="block text-xs text-secondary mt-0.5">{check.directions}</span>
        )}
      </span>
      {check.ok === false && check.run && (
        <button
          type="button"
          onClick={() => void check.run!()}
          className="text-xs font-semibold underline whitespace-nowrap"
        >
          {check.actionLabel}
        </button>
      )}
    </li>
  )
}

export function BackgroundChecklist({
  mode = 'gate',
  onOpenSettings,
  read = logDeviceState,
}: BackgroundChecklistProps) {
  const [state, setState] = useState<DeviceStateSnapshot | null>(null)

  const refresh = useCallback(() => {
    void read(mode === 'gate' ? 'setup-gate' : 'settings').then(setState)
  }, [read, mode])

  useEffect(refresh, [refresh])

  // Three distinct states. Collapsing "not loaded yet" into "cannot verify" made a
  // configured device flash the amber warning on open.
  const phase: 'checking' | 'verified' | 'unavailable' =
    state === null ? 'checking' : state.available ? 'verified' : 'unavailable'

  const checks = state ? backgroundChecks(state) : []
  const failing = checks.filter((c) => c.ok === false)
  const ready = phase === 'verified' && failing.length === 0
  const shown = mode === 'settings' ? checks : failing

  const box =
    ready || mode === 'settings'
      ? phase === 'verified' && failing.length > 0
        ? 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900'
        : 'rounded-lg bg-surface p-3'
      : phase === 'checking'
        ? 'rounded-lg bg-gray-50 border border-gray-200 p-3 text-secondary'
        : 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900'

  return (
    <div className={box}>
      {mode === 'gate' && (
        <p className="font-semibold">
          {ready
            ? 'Ready to track with your phone away'
            : phase === 'checking'
              ? 'Checking background settings…'
              : 'Keep tracking with your phone away'}
        </p>
      )}

      {mode === 'gate' && ready && (
        <p className="mt-1 text-green-800">
          Background location and battery settings check out.
        </p>
      )}

      {mode === 'gate' && phase === 'verified' && failing.length > 0 && (
        <p className="mt-1 text-amber-800">
          {failing.length === 1 ? 'One setting needs' : `${failing.length} settings need`}{' '}
          changing, or the track stops whenever your screen is off:
        </p>
      )}

      {phase === 'unavailable' && (
        // Nothing is known, so instruct and imply nothing.
        <p className="mt-1 text-amber-800">
          Set this app&rsquo;s Location to <strong>&ldquo;Allow all the time&rdquo;</strong> and
          turn off battery optimization - otherwise the track stops whenever your screen
          is off (so the whole hike can be lost).
        </p>
      )}

      {phase === 'checking' && mode === 'settings' && (
        <p className="text-secondary">Checking background settings…</p>
      )}

      {shown.length > 0 && (
        <ul className="mt-2 text-sm">
          {shown.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-4 text-sm">
        {onOpenSettings && (
          <button type="button" onClick={onOpenSettings} className="font-semibold underline">
            Open app settings
          </button>
        )}
        <button type="button" onClick={refresh} className="font-semibold underline">
          Re-check
        </button>
      </div>
    </div>
  )
}
