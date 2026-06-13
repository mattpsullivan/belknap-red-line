import { Haptics } from '@capacitor/haptics'

/**
 * A noticeable "alert" buzz - three strong pulses, meant to be felt through a
 * pocket (where the on-screen stall banner is useless). No-ops on platforms
 * without a vibrator. Injectable for tests.
 */
export interface Vibrator {
  vibrate(options: { duration: number }): Promise<void>
}

export async function alertVibrate(
  vibrator: Vibrator = Haptics,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms))
): Promise<void> {
  try {
    for (let i = 0; i < 3; i++) {
      await vibrator.vibrate({ duration: 400 })
      if (i < 2) await sleep(220)
    }
  } catch {
    // no vibrator (web/desktop) - ignore
  }
}
