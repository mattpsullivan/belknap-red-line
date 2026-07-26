/**
 * Drives the recording liveness tick and logs it.
 *
 * Originally a `setInterval`. That turned out to measure Chromium's timer
 * throttling rather than app liveness: on 2026-07-26 it produced 8 ticks where 71
 * were due, one 468s late, while GPS callbacks ran 1,300 times uninterrupted. It
 * found the problem but could not serve as a health signal.
 *
 * Now backed by the native scheduler (services/heartbeat.ts), which Chromium does
 * not throttle. That makes the tick a genuine liveness source independent of GPS -
 * necessary because if fixes are both the data and the liveness trigger, "no data"
 * and "no liveness" become the same observation, which is what made 2026-07-25
 * impossible to diagnose.
 *
 * `driftMs` is now meaningful. Under a native tick it measures real scheduling
 * drift; under the JS fallback it still measures throttling, which is why the
 * source is recorded on every tick.
 */

import { useEffect, useRef } from 'react'
import { logger } from '@/services/logger'
import { logDeviceState } from '@/services/deviceState'
import { createHeartbeatSource, type HeartbeatSource } from '@/services/heartbeat'

export const HEARTBEAT_INTERVAL_MS = 20_000

/** Sample device state every Nth tick - permissions can change mid-hike. */
const DEVICE_STATE_EVERY = 15 // ~5 minutes

export function useRecordingHeartbeat(
  isRecording: boolean,
  intervalMs: number = HEARTBEAT_INTERVAL_MS,
  makeSource: () => HeartbeatSource = createHeartbeatSource
) {
  const sourceRef = useRef<HeartbeatSource | null>(null)

  useEffect(() => {
    if (!isRecording) return

    const source = makeSource()
    sourceRef.current = source
    let stopped = false

    logger.event('health', 'heartbeat.start', { intervalMs })
    void logDeviceState('record-start')

    void source
      .start(intervalMs, (tick) => {
        logger.event(
          'health',
          'heartbeat',
          {
            seq: tick.seq,
            driftMs: Math.round(tick.at - tick.expectedAt),
            elapsedMs: tick.elapsedMs,
            source: tick.fallback ? 'js-timer' : 'native',
          },
          // Drift beyond a whole interval means we are being throttled or delayed.
          tick.at - tick.expectedAt > intervalMs ? 'warn' : 'debug'
        )

        if (tick.seq % DEVICE_STATE_EVERY === 0) void logDeviceState('periodic')
        // Flush every tick: if the process is killed mid-hike, whatever reached
        // IndexedDB is the whole of the evidence.
        void logger.flush()
      })
      .then((kind) => {
        if (stopped) return
        logger.event(
          'health',
          'heartbeat.source',
          { kind },
          // A JS timer backgrounded is close to useless as supervision, so say so.
          kind === 'native' ? 'info' : 'warn'
        )
      })

    return () => {
      stopped = true
      void source.stop()
      sourceRef.current = null
      logger.event('health', 'heartbeat.stop')
      void logger.flush()
    }
  }, [isRecording, intervalMs, makeSource])
}
