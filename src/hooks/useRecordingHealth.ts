import { useEffect, useState } from 'react'
import {
  evaluateRecordingHealth,
  type RecordingHealth,
} from '@/services/recordingHealth'

/**
 * Derives recording health from the recording state + the last GPS fix time.
 * Ticks every few seconds while recording so the UI updates even when no new
 * fixes arrive (the stall case). Logic lives in evaluateRecordingHealth.
 */
export function useRecordingHealth(
  isRecording: boolean,
  lastFixAt: number | null,
  recordingStartedAt: number | null
): RecordingHealth {
  const [now, setNow] = useState(() => Date.now())

  // Tick while recording so the UI re-evaluates even with no new fixes. The
  // interval callback (async) keeps `now` fresh; the clamp in
  // evaluateRecordingHealth handles the brief stale-`now` window at start.
  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setNow(Date.now()), 3000)
    return () => clearInterval(id)
  }, [isRecording])

  // Baseline = the later of the last fix or when recording started, so "no fix
  // since start" (GPS off at launch) also stalls after the threshold.
  const lastActivityAt = isRecording
    ? Math.max(lastFixAt ?? 0, recordingStartedAt ?? 0) || null
    : null

  return evaluateRecordingHealth({ isRecording, lastActivityAt, now })
}
