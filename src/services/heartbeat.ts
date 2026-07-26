/**
 * A liveness tick independent of GPS.
 *
 * Prefers the native `Heartbeat` plugin, whose timer is not subject to Chromium's
 * background-page throttling. Falls back to `setInterval` off-device so web and
 * tests still work - but the fallback is explicitly labelled in the log, because a
 * throttled tick and a native one mean very different things and must never be
 * confused when reading a hike afterwards.
 *
 * Background: on 2026-07-26 a JS `setInterval` produced 8 ticks where 71 were due
 * (one 468s late) while GPS callbacks ran 1,300 times uninterrupted. That is why
 * supervision cannot live on a JS timer, and why GPS fixes cannot be the only
 * health signal - if fixes are both the data and the liveness trigger, "no data"
 * and "no liveness" are the same observation.
 */

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface HeartbeatTick {
  seq: number
  /** Wall-clock when the tick fired. */
  at: number
  elapsedMs: number
  /** Where the tick was scheduled to land; `at - expectedAt` is drift. */
  expectedAt: number
  /** True when this came from a JS timer rather than the native scheduler. */
  fallback?: boolean
}

interface HeartbeatPlugin {
  start(options: { intervalMs: number }): Promise<{ intervalMs: number }>
  stop(): Promise<{ ticks: number }>
  addListener(
    event: 'tick',
    cb: (tick: Omit<HeartbeatTick, 'fallback'>) => void
  ): Promise<PluginListenerHandle>
}

const native = registerPlugin<HeartbeatPlugin>('Heartbeat')

export interface HeartbeatSource {
  /** Resolves to how the tick is actually being produced. */
  start(intervalMs: number, onTick: (tick: HeartbeatTick) => void): Promise<'native' | 'fallback'>
  stop(): Promise<void>
}

/**
 * Native when available, JS timer otherwise. Never throws - a diagnostic must not
 * be the reason a recording fails.
 */
export function createHeartbeatSource(): HeartbeatSource {
  let handle: PluginListenerHandle | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function startFallback(
    intervalMs: number,
    onTick: (tick: HeartbeatTick) => void
  ): Promise<'fallback'> {
    const startedAt = Date.now()
    let seq = 0
    timer = setInterval(() => {
      seq++
      const at = Date.now()
      onTick({
        seq,
        at,
        elapsedMs: at - startedAt,
        expectedAt: startedAt + seq * intervalMs,
        fallback: true,
      })
    }, intervalMs)
    return 'fallback'
  }

  return {
    async start(intervalMs, onTick) {
      await this.stop()
      if (!Capacitor.isNativePlatform()) return startFallback(intervalMs, onTick)
      try {
        handle = await native.addListener('tick', (tick) => onTick(tick))
        await native.start({ intervalMs })
        return 'native'
      } catch {
        // Plugin missing or refused - degrade rather than lose supervision.
        if (handle) {
          await handle.remove().catch(() => {})
          handle = null
        }
        return startFallback(intervalMs, onTick)
      }
    },

    async stop() {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      if (handle) {
        await handle.remove().catch(() => {})
        handle = null
      }
      if (Capacitor.isNativePlatform()) {
        await native.stop().catch(() => {})
      }
    },
  }
}
