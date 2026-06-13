import { describe, it, expect } from 'vitest'
import { evaluateRecordingHealth, STALL_THRESHOLD_MS } from './recordingHealth'

const T = 1_000_000

describe('evaluateRecordingHealth', () => {
  it('is idle when not recording', () => {
    expect(
      evaluateRecordingHealth({ isRecording: false, lastActivityAt: T, now: T + 999_999 })
    ).toEqual({ status: 'idle', secondsSinceFix: null })
  })

  it('is tracking with no fix yet (just started)', () => {
    expect(
      evaluateRecordingHealth({ isRecording: true, lastActivityAt: null, now: T })
    ).toEqual({ status: 'tracking', secondsSinceFix: null })
  })

  it('is tracking when a fix arrived recently', () => {
    const h = evaluateRecordingHealth({
      isRecording: true,
      lastActivityAt: T,
      now: T + 10_000,
    })
    expect(h.status).toBe('tracking')
    expect(h.secondsSinceFix).toBe(10)
  })

  it('stalls once the gap exceeds the threshold', () => {
    const h = evaluateRecordingHealth({
      isRecording: true,
      lastActivityAt: T,
      now: T + STALL_THRESHOLD_MS + 1_000,
    })
    expect(h.status).toBe('stalled')
    expect(h.secondsSinceFix).toBe(Math.round((STALL_THRESHOLD_MS + 1_000) / 1000))
  })

  it('does not stall exactly at the threshold', () => {
    expect(
      evaluateRecordingHealth({ isRecording: true, lastActivityAt: T, now: T + STALL_THRESHOLD_MS }).status
    ).toBe('tracking')
  })

  it('honors a custom threshold', () => {
    expect(
      evaluateRecordingHealth({ isRecording: true, lastActivityAt: T, now: T + 6_000, stallThresholdMs: 5_000 }).status
    ).toBe('stalled')
  })

  it('clamps negative elapsed (clock skew) to 0', () => {
    expect(
      evaluateRecordingHealth({ isRecording: true, lastActivityAt: T, now: T - 5_000 })
    ).toEqual({ status: 'tracking', secondsSinceFix: 0 })
  })
})
