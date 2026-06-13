/**
 * Trail data validation helpers.
 *
 * The official Belknap Range Trails map (Bosworth, 2018) is the authoritative
 * reference for trail names, routing, and completeness. These pure functions
 * surface trails in trails.json that are the best candidates for hand-checking
 * against that map - sparse geometry (few GPS points) and missing elevation.
 *
 * See docs/trail-validation.md for the manual cross-check checklist.
 */

import type { Trail } from '@/types/trail'

export interface SparseTrail {
  id: string
  name: string
  pointCount: number
}

/**
 * Trails whose coordinate path has fewer than `minPoints` points. These render
 * as coarse polylines and are the prime candidates for correction against the
 * authoritative map / GPX data.
 */
export function findSparseTrails(
  trails: readonly Trail[],
  minPoints = 10
): SparseTrail[] {
  return trails
    .filter((t) => t.coordinates.length < minPoints)
    .map((t) => ({ id: t.id, name: t.name, pointCount: t.coordinates.length }))
    .sort((a, b) => a.pointCount - b.pointCount)
}

/** Trails missing per-coordinate elevation or summary elevation stats. */
export function findTrailsMissingElevation(
  trails: readonly Trail[]
): Trail[] {
  return trails.filter(
    (t) =>
      t.elevationMax === undefined ||
      t.coordinates.some((c) => c.elevation === undefined)
  )
}

/** Trails sharing a duplicate id - a data-integrity smell. */
export function findDuplicateTrailIds(trails: readonly Trail[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const t of trails) {
    if (seen.has(t.id)) dupes.add(t.id)
    seen.add(t.id)
  }
  return [...dupes]
}
