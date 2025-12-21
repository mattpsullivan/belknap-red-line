import type { Completion } from '@/types'
import { db } from '@/services/database'

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

export interface ValidationError {
  index: number
  field: string
  message: string
}

/**
 * Validates a single completion object
 */
export function validateCompletion(
  data: unknown,
  index: number,
  validTrailIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof data !== 'object' || data === null) {
    errors.push({ index, field: 'root', message: 'Must be an object' })
    return errors
  }

  const obj = data as Record<string, unknown>

  // trailId is required and must be a valid trail
  if (typeof obj.trailId !== 'string' || !obj.trailId.trim()) {
    errors.push({ index, field: 'trailId', message: 'trailId is required' })
  } else if (!validTrailIds.has(obj.trailId)) {
    errors.push({
      index,
      field: 'trailId',
      message: `Unknown trail: ${obj.trailId}`,
    })
  }

  // completedAt is required and must be a valid date
  if (!obj.completedAt) {
    errors.push({ index, field: 'completedAt', message: 'completedAt is required' })
  } else {
    const date = new Date(obj.completedAt as string | number | Date)
    if (isNaN(date.getTime())) {
      errors.push({ index, field: 'completedAt', message: 'Invalid date format' })
    }
  }

  // manualEntry must be a boolean if present
  if (obj.manualEntry !== undefined && typeof obj.manualEntry !== 'boolean') {
    errors.push({ index, field: 'manualEntry', message: 'manualEntry must be a boolean' })
  }

  // notes must be a string if present
  if (obj.notes !== undefined && typeof obj.notes !== 'string') {
    errors.push({ index, field: 'notes', message: 'notes must be a string' })
  }

  // trackId must be a number if present
  if (obj.trackId !== undefined && typeof obj.trackId !== 'number') {
    errors.push({ index, field: 'trackId', message: 'trackId must be a number' })
  }

  return errors
}

/**
 * Parses and validates an array of completion data
 */
export function validateCompletions(
  data: unknown,
  validTrailIds: Set<string>
): { valid: Omit<Completion, 'id'>[]; errors: ValidationError[] } {
  const valid: Omit<Completion, 'id'>[] = []
  const errors: ValidationError[] = []

  if (!Array.isArray(data)) {
    errors.push({ index: -1, field: 'root', message: 'Data must be an array' })
    return { valid, errors }
  }

  data.forEach((item, index) => {
    const itemErrors = validateCompletion(item, index, validTrailIds)
    if (itemErrors.length > 0) {
      errors.push(...itemErrors)
    } else {
      const obj = item as Record<string, unknown>
      valid.push({
        trailId: obj.trailId as string,
        completedAt: new Date(obj.completedAt as string | number | Date),
        manualEntry: obj.manualEntry !== undefined ? (obj.manualEntry as boolean) : true,
        notes: obj.notes as string | undefined,
        trackId: obj.trackId as number | undefined,
      })
    }
  })

  return { valid, errors }
}

/**
 * Imports completions into the database
 * Options:
 * - replace: Clear existing completions before import
 * - skipDuplicates: Skip completions that match existing trailId + date
 */
export async function importCompletions(
  completions: Omit<Completion, 'id'>[],
  options: { replace?: boolean; skipDuplicates?: boolean } = {}
): Promise<ImportResult> {
  const { replace = false, skipDuplicates = true } = options
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  try {
    if (replace) {
      await db.completions.clear()
    }

    // Get existing completions for duplicate detection
    const existing = skipDuplicates ? await db.completions.toArray() : []
    const existingSet = new Set(
      existing.map(
        (c) => `${c.trailId}:${new Date(c.completedAt).toISOString().split('T')[0]}`
      )
    )

    for (const completion of completions) {
      const key = `${completion.trailId}:${new Date(completion.completedAt).toISOString().split('T')[0]}`

      if (skipDuplicates && existingSet.has(key)) {
        result.skipped++
        continue
      }

      await db.completions.add(completion)
      existingSet.add(key)
      result.imported++
    }
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Parses JSON and imports completions
 */
export async function importFromJSON(
  jsonString: string,
  validTrailIds: Set<string>,
  options: { replace?: boolean; skipDuplicates?: boolean } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  // Parse JSON
  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    result.errors.push('Invalid JSON format')
    return result
  }

  // Validate
  const { valid, errors } = validateCompletions(data, validTrailIds)

  if (errors.length > 0) {
    result.errors = errors.map(
      (e) =>
        e.index >= 0
          ? `Item ${e.index}: ${e.field} - ${e.message}`
          : e.message
    )
    // Still try to import valid items
    if (valid.length === 0) {
      return result
    }
  }

  // Import
  const importResult = await importCompletions(valid, options)

  return {
    success: importResult.success && errors.length === 0,
    imported: importResult.imported,
    skipped: importResult.skipped + (data as unknown[]).length - valid.length,
    errors: [...result.errors, ...importResult.errors],
  }
}
