import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import type { Completion } from '@/types'

describe('Database', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.completions.clear()
  })

  describe('completions table', () => {
    it('should add a completion', async () => {
      const completion: Omit<Completion, 'id'> = {
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
        notes: 'Great views!',
      }

      const id = await db.completions.add(completion)
      expect(id).toBeDefined()

      const saved = await db.completions.get(id)
      expect(saved?.trailId).toBe('belknap-east')
      expect(saved?.notes).toBe('Great views!')
    })

    it('should get all completions', async () => {
      await db.completions.add({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
      await db.completions.add({
        trailId: 'major-main',
        completedAt: new Date('2024-12-10'),
        manualEntry: true,
      })

      const all = await db.completions.toArray()
      expect(all).toHaveLength(2)
    })

    it('should get completions by trail ID', async () => {
      await db.completions.add({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })
      await db.completions.add({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-20'),
        manualEntry: true,
      })
      await db.completions.add({
        trailId: 'major-main',
        completedAt: new Date('2024-12-10'),
        manualEntry: true,
      })

      const belknapCompletions = await db.completions
        .where('trailId')
        .equals('belknap-east')
        .toArray()

      expect(belknapCompletions).toHaveLength(2)
    })

    it('should delete a completion', async () => {
      const id = await db.completions.add({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })

      await db.completions.delete(id)

      const deleted = await db.completions.get(id)
      expect(deleted).toBeUndefined()
    })

    it('should update a completion', async () => {
      const id = await db.completions.add({
        trailId: 'belknap-east',
        completedAt: new Date('2024-12-15'),
        manualEntry: true,
      })

      await db.completions.update(id, { notes: 'Updated notes' })

      const updated = await db.completions.get(id)
      expect(updated?.notes).toBe('Updated notes')
    })
  })
})
