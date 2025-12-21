import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateCompletion,
  validateCompletions,
  importCompletions,
  importFromJSON,
} from './completionImport'
import { db } from '@/services/database/db'

const validTrailIds = new Set(['trail-1', 'trail-2', 'trail-3'])

describe('completionImport', () => {
  beforeEach(async () => {
    await db.completions.clear()
  })

  describe('validateCompletion', () => {
    it('validates a valid completion object', () => {
      const completion = {
        trailId: 'trail-1',
        completedAt: '2024-12-15',
        manualEntry: true,
        notes: 'Great hike!',
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors).toHaveLength(0)
    })

    it('rejects non-object input', () => {
      const errors = validateCompletion('not an object', 0, validTrailIds)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Must be an object')
    })

    it('requires trailId', () => {
      const completion = {
        completedAt: '2024-12-15',
        manualEntry: true,
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.field === 'trailId')).toBe(true)
    })

    it('rejects unknown trailId', () => {
      const completion = {
        trailId: 'unknown-trail',
        completedAt: '2024-12-15',
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.message.includes('Unknown trail'))).toBe(true)
    })

    it('requires completedAt', () => {
      const completion = {
        trailId: 'trail-1',
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.field === 'completedAt')).toBe(true)
    })

    it('rejects invalid date format', () => {
      const completion = {
        trailId: 'trail-1',
        completedAt: 'not-a-date',
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.message === 'Invalid date format')).toBe(true)
    })

    it('rejects non-boolean manualEntry', () => {
      const completion = {
        trailId: 'trail-1',
        completedAt: '2024-12-15',
        manualEntry: 'yes',
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.field === 'manualEntry')).toBe(true)
    })

    it('rejects non-string notes', () => {
      const completion = {
        trailId: 'trail-1',
        completedAt: '2024-12-15',
        notes: 123,
      }

      const errors = validateCompletion(completion, 0, validTrailIds)
      expect(errors.some((e) => e.field === 'notes')).toBe(true)
    })
  })

  describe('validateCompletions', () => {
    it('validates an array of completions', () => {
      const data = [
        { trailId: 'trail-1', completedAt: '2024-12-10' },
        { trailId: 'trail-2', completedAt: '2024-12-15' },
      ]

      const { valid, errors } = validateCompletions(data, validTrailIds)
      expect(valid).toHaveLength(2)
      expect(errors).toHaveLength(0)
    })

    it('rejects non-array input', () => {
      const { valid, errors } = validateCompletions({ notAnArray: true }, validTrailIds)
      expect(valid).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Data must be an array')
    })

    it('filters out invalid items and collects errors', () => {
      const data = [
        { trailId: 'trail-1', completedAt: '2024-12-10' }, // valid
        { trailId: 'unknown', completedAt: '2024-12-15' }, // invalid trailId
        { trailId: 'trail-2', completedAt: '2024-12-20' }, // valid
      ]

      const { valid, errors } = validateCompletions(data, validTrailIds)
      expect(valid).toHaveLength(2)
      expect(errors).toHaveLength(1)
    })

    it('defaults manualEntry to true if not provided', () => {
      const data = [{ trailId: 'trail-1', completedAt: '2024-12-10' }]

      const { valid } = validateCompletions(data, validTrailIds)
      expect(valid[0].manualEntry).toBe(true)
    })
  })

  describe('importCompletions', () => {
    it('imports completions into the database', async () => {
      const completions = [
        {
          trailId: 'trail-1',
          completedAt: new Date('2024-12-10'),
          manualEntry: true,
        },
        {
          trailId: 'trail-2',
          completedAt: new Date('2024-12-15'),
          manualEntry: false,
        },
      ]

      const result = await importCompletions(completions)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)

      const dbCompletions = await db.completions.toArray()
      expect(dbCompletions).toHaveLength(2)
    })

    it('skips duplicates by default', async () => {
      // Add initial completion
      await db.completions.add({
        trailId: 'trail-1',
        completedAt: new Date('2024-12-10'),
        manualEntry: true,
      })

      // Try to import same trail on same day
      const completions = [
        {
          trailId: 'trail-1',
          completedAt: new Date('2024-12-10'),
          manualEntry: true,
        },
      ]

      const result = await importCompletions(completions, { skipDuplicates: true })
      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(1)

      const dbCompletions = await db.completions.toArray()
      expect(dbCompletions).toHaveLength(1)
    })

    it('replaces data when replace option is true', async () => {
      // Add initial completions
      await db.completions.add({
        trailId: 'trail-1',
        completedAt: new Date('2024-12-05'),
        manualEntry: true,
      })
      await db.completions.add({
        trailId: 'trail-2',
        completedAt: new Date('2024-12-06'),
        manualEntry: true,
      })

      // Import new data with replace
      const completions = [
        {
          trailId: 'trail-3',
          completedAt: new Date('2024-12-15'),
          manualEntry: true,
        },
      ]

      const result = await importCompletions(completions, { replace: true })
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)

      const dbCompletions = await db.completions.toArray()
      expect(dbCompletions).toHaveLength(1)
      expect(dbCompletions[0].trailId).toBe('trail-3')
    })
  })

  describe('importFromJSON', () => {
    it('parses and imports valid JSON', async () => {
      const json = JSON.stringify([
        { trailId: 'trail-1', completedAt: '2024-12-10' },
        { trailId: 'trail-2', completedAt: '2024-12-15' },
      ])

      const result = await importFromJSON(json, validTrailIds)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
    })

    it('rejects invalid JSON', async () => {
      const result = await importFromJSON('not valid json', validTrailIds)
      expect(result.success).toBe(false)
      expect(result.errors[0]).toBe('Invalid JSON format')
    })

    it('reports validation errors', async () => {
      const json = JSON.stringify([
        { trailId: 'unknown-trail', completedAt: '2024-12-10' },
      ])

      const result = await importFromJSON(json, validTrailIds)
      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('Unknown trail'))).toBe(true)
    })

    it('imports valid items even with some errors', async () => {
      const json = JSON.stringify([
        { trailId: 'trail-1', completedAt: '2024-12-10' }, // valid
        { trailId: 'unknown', completedAt: '2024-12-15' }, // invalid
      ])

      const result = await importFromJSON(json, validTrailIds)
      expect(result.success).toBe(false) // has errors
      expect(result.imported).toBe(1) // but still imported valid one
      expect(result.skipped).toBe(1)
    })
  })
})
