/**
 * Which build is this, and did its native plugins load.
 *
 * Release builds hide the header build stamp (`RELEASE_BUILD=1` in the release
 * workflow), so until now nothing identified the installed build from inside the
 * app. That cost real time on 2026-07-25: the phone turned out to be running a
 * *debug* APK from 2026-06-13 rather than any release, and the only clue was that
 * the stamp happened to be visible. On a release build there would have been none.
 *
 * `versionCode` comes from native because it is the CI commit count - the web
 * bundle has no way to know it. `versionName` likewise, so it reflects the APK
 * rather than whatever package.json said at bundle time.
 *
 * The plugin rows matter more than they look. A build that shipped without its
 * plugins registered would silently lose the device checks and fall back to a
 * throttled JS heartbeat, which is close to useless as supervision. Seeing it here
 * beats inferring it from a disappointing log after a hike.
 */

import { useEffect, useState } from 'react'
import { isDeviceStateAvailable, readDeviceState, type DeviceStateSnapshot } from '@/services/deviceState'
import { isNativeHeartbeatAvailable } from '@/services/heartbeat'

export interface AboutBuildProps {
  read?: () => Promise<DeviceStateSnapshot>
  deviceStateAvailable?: () => boolean
  heartbeatNative?: () => boolean
}

export function AboutBuild({
  read = readDeviceState,
  deviceStateAvailable = isDeviceStateAvailable,
  heartbeatNative = isNativeHeartbeatAvailable,
}: AboutBuildProps) {
  const [state, setState] = useState<DeviceStateSnapshot | null>(null)

  useEffect(() => {
    void read().then(setState)
  }, [read])

  const version = state?.appVersion
  const build = state?.appBuild

  return (
    <dl className="text-sm space-y-1">
      <div className="flex justify-between gap-4">
        <dt className="text-secondary">Version</dt>
        <dd className="text-primary tabular-nums">
          {version ? `${version}${build !== undefined ? ` (${build})` : ''}` : '—'}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-secondary">Build</dt>
        <dd className="text-primary tabular-nums text-right">
          {__APP_COMMIT__}
          <span className="block text-xs text-secondary">{__APP_BUILD_TIME__}</span>
        </dd>
      </div>
      {state?.model && (
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Device</dt>
          <dd className="text-primary text-right">
            {state.model}
            {state.sdkInt !== undefined && (
              <span className="block text-xs text-secondary">Android API {state.sdkInt}</span>
            )}
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt className="text-secondary">Native plugins</dt>
        <dd className="text-primary text-right">
          <span className="block">
            DeviceState: {deviceStateAvailable() ? 'available' : 'unavailable'}
          </span>
          <span className="block">
            Heartbeat: {heartbeatNative() ? 'native' : 'js-timer fallback'}
          </span>
        </dd>
      </div>
    </dl>
  )
}
