import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BackgroundReadiness } from './BackgroundReadiness'
import type { DeviceStateSnapshot } from '@/services/deviceState'

const reader = (state: DeviceStateSnapshot) => async () => state

const configured: DeviceStateSnapshot = {
  available: true,
  fineLocation: true,
  backgroundLocation: true,
  ignoringBatteryOptimizations: true,
  backgroundRestricted: false,
  locationServicesEnabled: true,
}

describe('BackgroundReadiness', () => {
  it('confirms a correctly configured device', async () => {
    render(<BackgroundReadiness onOpenSettings={() => {}} read={reader(configured)} />)
    expect(await screen.findByText(/Ready to track with your phone away/)).toBeInTheDocument()
  })

  it('names the two settings that were actually wrong on 2026-07-26', async () => {
    // The log recorded backgroundLocation:false and
    // ignoringBatteryOptimizations:false while the gate said nothing.
    render(
      <BackgroundReadiness
        onOpenSettings={() => {}}
        read={reader({
          ...configured,
          backgroundLocation: false,
          ignoringBatteryOptimizations: false,
        })}
      />
    )
    expect(await screen.findByText(/2 settings need/)).toBeInTheDocument()
    expect(
      screen.getByText('Location is not set to "Allow all the time"')
    ).toBeInTheDocument()
    expect(screen.getByText(/Battery optimisation is still on/)).toBeInTheDocument()
  })

  it('uses the singular when only one setting is wrong', async () => {
    render(
      <BackgroundReadiness
        onOpenSettings={() => {}}
        read={reader({ ...configured, backgroundLocation: false })}
      />
    )
    expect(await screen.findByText(/One setting needs/)).toBeInTheDocument()
  })

  it('claims nothing when the native plugin is unavailable', async () => {
    // Absent data must not render as a pass.
    render(
      <BackgroundReadiness
        onOpenSettings={() => {}}
        read={reader({ available: false, error: 'not a native platform' })}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/Keep tracking with your phone away/)).toBeInTheDocument()
    )
    expect(screen.queryByText(/Ready to track/)).not.toBeInTheDocument()
    expect(screen.getByText(/otherwise the track stops/)).toBeInTheDocument()
  })

  it('shows a neutral checking state before the read resolves', () => {
    // Not the same as "cannot verify": a configured device must not flash the
    // amber warning while the native call is in flight.
    let resolve: (s: DeviceStateSnapshot) => void = () => {}
    render(
      <BackgroundReadiness
        onOpenSettings={() => {}}
        read={() => new Promise<DeviceStateSnapshot>((r) => (resolve = r))}
      />
    )
    expect(screen.getByText(/Checking background settings/)).toBeInTheDocument()
    expect(screen.queryByText(/otherwise the track stops/)).not.toBeInTheDocument()
    resolve(configured)
  })

  it('offers a settings shortcut', async () => {
    let opened = 0
    render(
      <BackgroundReadiness onOpenSettings={() => opened++} read={reader(configured)} />
    )
    ;(await screen.findByText('Open location settings')).click()
    expect(opened).toBe(1)
  })

  it('can re-check after the user changes a setting', async () => {
    let reads = 0
    render(
      <BackgroundReadiness
        onOpenSettings={() => {}}
        read={async () => {
          reads++
          return configured
        }}
      />
    )
    await screen.findByText(/Ready to track/)
    expect(reads).toBe(1)
    screen.getByText('Re-check').click()
    await waitFor(() => expect(reads).toBe(2))
  })
})
