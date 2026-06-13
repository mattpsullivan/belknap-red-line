import { describe, it, expect } from 'vitest'
import type { Trail } from '@/types/trail'
import {
  findSparseTrails,
  findTrailsMissingElevation,
  findDuplicateTrailIds,
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
    const trails = [trail({ id: 'a' }), trail({ id: 'b' }), trail({ id: 'a' })]
    expect(findDuplicateTrailIds(trails)).toEqual(['a'])
  })

  it('returns empty when all ids are unique', () => {
    expect(
      findDuplicateTrailIds([trail({ id: 'a' }), trail({ id: 'b' })])
    ).toEqual([])
  })
})
