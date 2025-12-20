import Dexie, { type EntityTable } from 'dexie'
import type { Completion } from '@/types'

const db = new Dexie('BelknapTracker') as Dexie & {
  completions: EntityTable<Completion, 'id'>
}

db.version(1).stores({
  completions: '++id, trailId, completedAt',
})

export { db }
