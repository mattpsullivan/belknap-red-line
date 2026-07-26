import Dexie, { type EntityTable } from 'dexie'
import type { Completion, GPSTrack } from '@/types'
import type { LogEntry } from '@/services/logger'

const db = new Dexie('BelknapTracker') as Dexie & {
  completions: EntityTable<Completion, 'id'>
  tracks: EntityTable<GPSTrack, 'id'>
  logs: EntityTable<LogEntry, 'id'>
}

db.version(1).stores({
  completions: '++id, trailId, completedAt',
})

db.version(2).stores({
  completions: '++id, trailId, completedAt',
  tracks: '++id, startedAt, endedAt',
})

/**
 * v3 adds the diagnostic log.
 *
 * It lives in IndexedDB rather than localStorage because the 2026-07-25 hike
 * showed why: the previous in-memory/localStorage buffer held two entries for an
 * 81-minute recording, and localStorage re-serialises the whole array on every
 * write - unusable at the volume needed to diagnose background-GPS failure.
 * Persisting here also means the evidence survives the app being killed, which
 * is one of the failure modes under investigation.
 */
db.version(3).stores({
  completions: '++id, trailId, completedAt',
  tracks: '++id, startedAt, endedAt',
  logs: '++id, ts, cat',
})

export { db }
