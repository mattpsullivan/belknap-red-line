import { describe, it, expect } from 'vitest'
import { alertVibrate } from './haptics'

describe('alertVibrate', () => {
  it('fires three buzzes with gaps between them', async () => {
    const calls: number[] = []
    const sleeps: number[] = []
    await alertVibrate(
      { vibrate: async ({ duration }) => void calls.push(duration) },
      async (ms) => void sleeps.push(ms)
    )
    expect(calls).toEqual([400, 400, 400])
    expect(sleeps).toEqual([220, 220]) // gap only between pulses, not after the last
  })

  it('swallows vibrator errors (no vibrator available)', async () => {
    await expect(
      alertVibrate({
        vibrate: async () => {
          throw new Error('no vibrator')
        },
      })
    ).resolves.toBeUndefined()
  })
})
