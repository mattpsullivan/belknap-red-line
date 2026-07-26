import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutBuild } from './AboutBuild'
import type { DeviceStateSnapshot } from '@/services/deviceState'

const onDevice: DeviceStateSnapshot = {
  available: true,
  appVersion: '1.0.3',
  appBuild: 131,
  sdkInt: 37,
  manufacturer: 'Google',
  model: 'Pixel 9a',
}

describe('AboutBuild', () => {
  it('shows versionName and versionCode from native', async () => {
    // versionCode is the CI commit count; the web bundle cannot know it, which is
    // why this comes from the plugin rather than package.json.
    render(<AboutBuild read={async () => onDevice} />)
    expect(await screen.findByText('1.0.3 (131)')).toBeInTheDocument()
  })

  it('shows the commit and build time even before native responds', () => {
    // These are compile-time constants, so they identify the build immediately -
    // the thing release builds previously hid entirely.
    render(<AboutBuild read={() => new Promise<DeviceStateSnapshot>(() => {})} />)
    expect(screen.getByText(__APP_COMMIT__)).toBeInTheDocument()
    expect(screen.getByText(__APP_BUILD_TIME__)).toBeInTheDocument()
  })

  it('renders a placeholder rather than a wrong version when native is unavailable', async () => {
    render(
      <AboutBuild
        read={async () => ({ available: false, error: 'not a native platform' })}
        deviceStateAvailable={() => false}
        heartbeatNative={() => false}
      />
    )
    expect(await screen.findByText('—')).toBeInTheDocument()
  })

  it('reports the device and API level', async () => {
    render(<AboutBuild read={async () => onDevice} />)
    expect(await screen.findByText('Pixel 9a')).toBeInTheDocument()
    expect(screen.getByText(/Android API 37/)).toBeInTheDocument()
  })

  it('reports both plugins as loaded', async () => {
    render(
      <AboutBuild
        read={async () => onDevice}
        deviceStateAvailable={() => true}
        heartbeatNative={() => true}
      />
    )
    expect(await screen.findByText(/DeviceState: available/)).toBeInTheDocument()
    expect(screen.getByText(/Heartbeat: native/)).toBeInTheDocument()
  })

  it('says so loudly when the heartbeat fell back to a JS timer', async () => {
    // A throttled JS timer is close to useless as supervision, so a build that
    // shipped without the plugin must be visible here rather than inferred from a
    // disappointing log after a hike.
    render(
      <AboutBuild
        read={async () => onDevice}
        deviceStateAvailable={() => false}
        heartbeatNative={() => false}
      />
    )
    expect(await screen.findByText(/Heartbeat: js-timer fallback/)).toBeInTheDocument()
    expect(screen.getByText(/DeviceState: unavailable/)).toBeInTheDocument()
  })

  it('omits the version code when only a name is known', async () => {
    render(<AboutBuild read={async () => ({ available: true, appVersion: '1.0.3' })} />)
    expect(await screen.findByText('1.0.3')).toBeInTheDocument()
  })
})
