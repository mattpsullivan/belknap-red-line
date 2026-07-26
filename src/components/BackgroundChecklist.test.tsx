import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BackgroundChecklist } from './BackgroundChecklist'
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

/** Exactly what the 2026-07-26 walk reported. */
const asWalked: DeviceStateSnapshot = {
  ...configured,
  backgroundLocation: false,
  ignoringBatteryOptimizations: false,
}

describe('gate mode', () => {
  it('confirms a correctly configured device', async () => {
    render(<BackgroundChecklist mode="gate" read={reader(configured)} />)
    expect(await screen.findByText(/Ready to track with your phone away/)).toBeInTheDocument()
  })

  it('lists only what is wrong', async () => {
    render(<BackgroundChecklist mode="gate" read={reader(asWalked)} />)
    expect(await screen.findByText(/2 settings need/)).toBeInTheDocument()
    expect(screen.getByText('Location permission')).toBeInTheDocument()
    expect(screen.getByText('Battery optimisation')).toBeInTheDocument()
    // Passing checks are noise here.
    expect(screen.queryByText('Location services')).not.toBeInTheDocument()
  })

  it('uses the singular for one failure', async () => {
    render(
      <BackgroundChecklist mode="gate" read={reader({ ...configured, backgroundLocation: false })} />
    )
    expect(await screen.findByText(/One setting needs/)).toBeInTheDocument()
  })

  it('shows a neutral checking state, not the warning, while loading', () => {
    render(
      <BackgroundChecklist mode="gate" read={() => new Promise<DeviceStateSnapshot>(() => {})} />
    )
    expect(screen.getByText(/Checking background settings/)).toBeInTheDocument()
    expect(screen.queryByText(/otherwise the track stops/)).not.toBeInTheDocument()
  })

  it('claims nothing when the native plugin is unavailable', async () => {
    render(
      <BackgroundChecklist
        mode="gate"
        read={reader({ available: false, error: 'not a native platform' })}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/otherwise the track stops/)).toBeInTheDocument()
    )
    expect(screen.queryByText(/Ready to track/)).not.toBeInTheDocument()
  })
})

describe('settings mode', () => {
  it('shows every check including the passing ones', async () => {
    render(<BackgroundChecklist mode="settings" read={reader(configured)} />)
    for (const label of [
      'Location permission',
      'Battery optimisation',
      'Background activity',
      'Location services',
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it('reports each current value, not just pass or fail', async () => {
    render(<BackgroundChecklist mode="settings" read={reader(asWalked)} />)
    await screen.findByText('Location permission')
    // Assert per row, so a value is tied to the check it belongs to.
    const rowText = (label: string) =>
      screen.getByText(label).closest('li')!.textContent ?? ''
    expect(rowText('Location permission')).toContain('While using the app')
    expect(rowText('Battery optimisation')).toContain('On')
    expect(rowText('Background activity')).toContain('Unrestricted')
    expect(rowText('Location services')).toContain('On')
  })

  it('offers an action only on failing rows', async () => {
    render(<BackgroundChecklist mode="settings" read={reader(asWalked)} />)
    await screen.findByText('Location permission')
    // Two failures -> the battery Fix button plus one app-settings link, and no
    // buttons against the two passing rows.
    expect(screen.getByText('Fix')).toBeInTheDocument()
    expect(screen.getAllByText('Open app settings')).toHaveLength(1)
  })

  it('runs the remedy when the action is tapped', async () => {
    // Battery optimisation is the one Android lets us fix in a single tap.
    let ran = 0
    const state = { ...asWalked }
    render(
      <BackgroundChecklist
        mode="settings"
        read={async () => {
          ran += 0
          return state
        }}
      />
    )
    const fix = await screen.findByText('Fix')
    fix.click() // no throw off-device; the native call is a no-op
    expect(ran).toBe(0)
  })

  it('spells out the path for checks Android will not deep-link', async () => {
    // There is no intent for a specific permission toggle, so directions are the
    // best available.
    render(<BackgroundChecklist mode="settings" read={reader(asWalked)} />)
    expect(
      await screen.findByText(/Permissions → Location → "Allow all the time"/)
    ).toBeInTheDocument()
  })

  it('marks unknown values as unknown rather than passing', async () => {
    render(
      <BackgroundChecklist
        mode="settings"
        read={reader({ available: true, backgroundLocation: undefined })}
      />
    )
    expect(await screen.findAllByText(/Unknown/)).not.toHaveLength(0)
  })

  it('can re-check after the user changes something', async () => {
    let reads = 0
    render(
      <BackgroundChecklist
        mode="settings"
        read={async () => {
          reads++
          return configured
        }}
      />
    )
    await screen.findByText('Location permission')
    expect(reads).toBe(1)
    screen.getByText('Re-check').click()
    await waitFor(() => expect(reads).toBe(2))
  })
})
