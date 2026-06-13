import { describe, it, expect } from 'vitest'
import type { Trail } from '@/types/trail'
import { trails } from '@/data/trails'
import {
  findSparseTrails,
  findTrailsMissingElevation,
  findDuplicateTrailIds,
  findLargeGapTrails,
} from './trailValidation'

function trail(overrides: Partial<Trail> = {}): Trail {
  return {
    id: 'x',
    name: 'X',
    distance: 1,
    difficulty: 'easy',
    coordinates: [],
    trailhead: { lat: 43.5, lng: -71.3 },
    ...overrides,
  }
}

function path(n: number, withElevation = true) {
  return Array.from({ length: n }, (_, i) => ({
    lat: 43.5 + i * 0.001,
    lng: -71.3,
    ...(withElevation ? { elevation: 1000 + i } : {}),
  }))
}

describe('findSparseTrails', () => {
  it('flags trails below the point threshold, sorted by sparsity', () => {
    const trails = [
      trail({ id: 'rich', coordinates: path(50) }),
      trail({ id: 'thin', coordinates: path(3) }),
      trail({ id: 'thinner', coordinates: path(1) }),
    ]
    expect(findSparseTrails(trails, 10)).toEqual([
      { id: 'thinner', name: 'X', pointCount: 1 },
      { id: 'thin', name: 'X', pointCount: 3 },
    ])
  })

  it('respects a custom threshold', () => {
    const trails = [trail({ id: 'a', coordinates: path(15) })]
    expect(findSparseTrails(trails, 10)).toEqual([])
    expect(findSparseTrails(trails, 20)).toHaveLength(1)
  })
})

describe('findTrailsMissingElevation', () => {
  it('flags trails with no elevationMax or any coordinate missing elevation', () => {
    const ok = trail({ id: 'ok', elevationMax: 1500, coordinates: path(5, true) })
    const noMax = trail({ id: 'no-max', coordinates: path(5, true) })
    const gap = trail({
      id: 'gap',
      elevationMax: 1500,
      coordinates: path(5, false),
    })
    expect(
      findTrailsMissingElevation([ok, noMax, gap]).map((t) => t.id)
    ).toEqual(['no-max', 'gap'])
  })
})

describe('findDuplicateTrailIds', () => {
  it('returns ids that appear more than once', () => {
    const dupes = [trail({ id: 'a' }), trail({ id: 'b' }), trail({ id: 'a' })]
    expect(findDuplicateTrailIds(dupes)).toEqual(['a'])
  })

  it('returns empty when all ids are unique', () => {
    expect(
      findDuplicateTrailIds([trail({ id: 'a' }), trail({ id: 'b' })])
    ).toEqual([])
  })
})

describe('findLargeGapTrails', () => {
  it('flags a straight jump larger than the threshold', () => {
    // Two points ~1.5 km apart at this latitude.
    const jumpy = trail({
      id: 'jumpy',
      coordinates: [
        { lat: 43.5, lng: -71.3 },
        { lat: 43.5, lng: -71.281 },
      ],
    })
    const tight = trail({
      id: 'tight',
      coordinates: [
        { lat: 43.5, lng: -71.3 },
        { lat: 43.5001, lng: -71.3001 },
      ],
    })
    const found = findLargeGapTrails([jumpy, tight], 150)
    expect(found.map((t) => t.id)).toEqual(['jumpy'])
    expect(found[0].maxGapMeters).toBeGreaterThan(150)
  })
})

// Regression guard over the real dataset. These would have caught the
// straight-line trails (sparse OSM segments) and Mt. Rowe's scrambled order.
describe('trails.json data health', () => {
  it('has no straight gaps over 150 m between consecutive points', () => {
    expect(findLargeGapTrails(trails, 150)).toEqual([])
  })

  it('has complete elevation on every trail', () => {
    expect(findTrailsMissingElevation(trails).map((t) => t.name)).toEqual([])
  })

  it('has no duplicate trail ids', () => {
    expect(findDuplicateTrailIds(trails)).toEqual([])
  })
})
