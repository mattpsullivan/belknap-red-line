/**
 * Recording health: detect "recording but not actually recording" - i.e. a track
 * is active but GPS fixes have stopped arriving (background suspension, lost fix,
 * Doze, or missing "Allow all the time" permission). Pure + injectable `now` so
 * it's tested without mocks.
 */

export type RecordingStatus = 'idle' | 'tracking' | 'stalled'

/** How long without a GPS fix before we consider recording stalled. */
export const STALL_THRESHOLD_MS = 45_000

export interface RecordingHealth {
  status: RecordingStatus
  /** Seconds since the last GPS fix while recording (null when idle). */
  secondsSinceFix: number | null
}

/**
 * @param lastActivityAt the more recent of: the last GPS fix, or when recording
 *   started (so "no fix since start" also counts as a stall).
 */
export function evaluateRecordingHealth(params: {
  isRecording: boolean
  lastActivityAt: number | null
  now: number
  stallThresholdMs?: number
}): RecordingHealth {
  const {
    isRecording,
    lastActivityAt,
    now,
    stallThresholdMs = STALL_THRESHOLD_MS,
  } = params

  if (!isRecording) return { status: 'idle', secondsSinceFix: null }
  if (lastActivityAt == null) return { status: 'tracking', secondsSinceFix: null }

  const elapsed = Math.max(0, now - lastActivityAt)
  return {
    status: elapsed > stallThresholdMs ? 'stalled' : 'tracking',
    secondsSinceFix: Math.round(elapsed / 1000),
  }
}
