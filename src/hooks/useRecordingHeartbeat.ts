/**
 * Emit a periodic tick while recording, so that a gap in the log means something.
 *
 * The 2026-07-25 hike left 76 minutes of nothing between two track points, and
 * nothing in the log at all, so there was no way to tell whether:
 *
 *   - the OS revoked location but the app kept running, or
 *   - Android froze the whole WebView and no JS ran.
 *
 * A heartbeat separates them. It is a plain interval doing almost no work, so if
 * ticks stop, JS stopped. Combined with the `gps.fix` entries from
 * useGeolocation: ticks continuing while fixes stop means location was cut;
 * both stopping together means the WebView was suspended.
 *
 * Each tick also carries how late it was. A timer that should fire every 20s but
 * arrives 300s late is throttling rather than a clean freeze, which is a third
 * distinguishable state.
 */

import { useEffect, useRef } from 'react'
import { logger } from '@/services/logger'
import { logDeviceState } from '@/services/deviceState'

export const HEARTBEAT_INTERVAL_MS = 20_000

/** Sample device state every Nth heartbeat - permissions can change mid-hike. */
const DEVICE_STATE_EVERY = 15 // ~5 minutes

export function useRecordingHeartbeat(
  isRecording: boolean,
  intervalMs: number = HEARTBEAT_INTERVAL_MS
) {
  const seqRef = useRef(0)
  const expectedRef = useRef(0)

  useEffect(() => {
    if (!isRecording) return

    seqRef.current = 0
    expectedRef.current = Date.now() + intervalMs
    logger.event('health', 'heartbeat.start', { intervalMs })
    void logDeviceState('record-start')

    const id = setInterval(() => {
      const now = Date.now()
      const seq = ++seqRef.current
      // Positive lateness is the interesting number: it quantifies throttling.
      const lateMs = now - expectedRef.current
      expectedRef.current = now + intervalMs

      logger.event(
        'health',
        'heartbeat',
        { seq, lateMs: Math.round(lateMs) },
        lateMs > intervalMs ? 'warn' : 'debug'
      )

      if (seq % DEVICE_STATE_EVERY === 0) void logDeviceState('periodic')
      // Flush regularly: if the process is killed mid-hike, whatever reached
      // IndexedDB is the whole of the evidence.
      void logger.flush()
    }, intervalMs)

    return () => {
      clearInterval(id)
      logger.event('health', 'heartbeat.stop', { ticks: seqRef.current })
      void logger.flush()
    }
  }, [isRecording, intervalMs])
}
