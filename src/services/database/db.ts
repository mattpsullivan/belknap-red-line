import Dexie, { type EntityTable } from 'dexie'
import type { Completion, GPSTrack } from '@/types'

const db = new Dexie('BelknapTracker') as Dexie & {
  completions: EntityTable<Completion, 'id'>
  tracks: EntityTable<GPSTrack, 'id'>
}

db.version(1).stores({
  completions: '++id, trailId, completedAt',
})

db.version(2).stores({
  completions: '++id, trailId, completedAt',
  tracks: '++id, startedAt, endedAt',
})

export { db }
