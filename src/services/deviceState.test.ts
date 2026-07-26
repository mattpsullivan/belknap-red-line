import { describe, it, expect } from 'vitest'
import { backgroundBlockers, readDeviceState, type DeviceStateSnapshot } from './deviceState'

describe('readDeviceState', () => {
  it('reports unavailable off-device instead of throwing', async () => {
    // jsdom is not a native platform, so this exercises the fail-safe path that
    // must never break a recording.
    const state = await readDeviceState()
    expect(state.available).toBe(false)
    expect(state.error).toBeTruthy()
  })
})

describe('backgroundBlockers', () => {
  const ok: DeviceStateSnapshot = {
    available: true,
    fineLocation: true,
    backgroundLocation: true,
    ignoringBatteryOptimizations: true,
    backgroundRestricted: false,
    locationServicesEnabled: true,
  }

  it('finds nothing wrong with a correctly configured device', () => {
    expect(backgroundBlockers(ok)).toEqual([])
  })

  it('names background location - the permission nothing else can see', () => {
    expect(backgroundBlockers({ ...ok, backgroundLocation: false })).toEqual([
      'Location is not set to "Allow all the time"',
    ])
  })

  it('names battery optimisation', () => {
    expect(backgroundBlockers({ ...ok, ignoringBatteryOptimizations: false })).toEqual([
      'Battery optimisation is still on for this app',
    ])
  })

  it('names background restriction, which is separate from battery optimisation', () => {
    expect(backgroundBlockers({ ...ok, backgroundRestricted: true })).toEqual([
      'Background activity is restricted for this app',
    ])
  })

  it('reports every blocker at once rather than stopping at the first', () => {
    expect(
      backgroundBlockers({
        ...ok,
        backgroundLocation: false,
        ignoringBatteryOptimizations: false,
        locationServicesEnabled: false,
      })
    ).toHaveLength(3)
  })

  it('claims nothing when the native plugin is unavailable', () => {
    // Absent data must not masquerade as a clean bill of health.
    expect(backgroundBlockers({ available: false, error: 'no plugin' })).toEqual([])
  })

  it('treats an unknown field as unknown, not as a blocker', () => {
    expect(backgroundBlockers({ available: true })).toEqual([])
  })
})
