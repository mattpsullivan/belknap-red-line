import { describe, it, expect } from 'vitest'
import type { PointOfInterest } from '@/types/poi'
import {
  pois,
  getPlacedPois,
  getUnplacedPois,
  getPoiByCode,
} from './pois'

const fixture: PointOfInterest[] = [
  {
    id: 'placed',
    code: 'HR',
    name: 'Placed',
    description: 'has a coordinate',
    gridCell: 'E11',
    coordinates: { lat: 43.5, lng: -71.3 },
    needsGeoreference: false,
  },
  {
    id: 'unplaced',
    code: 'CK',
    name: 'Unplaced',
    description: 'grid cell only',
    gridCell: 'H6',
    needsGeoreference: true,
  },
]

describe('poi helpers', () => {
  it('splits placed from unplaced by presence of coordinates', () => {
    expect(getPlacedPois(fixture).map((p) => p.id)).toEqual(['placed'])
    expect(getUnplacedPois(fixture).map((p) => p.id)).toEqual(['unplaced'])
  })

  it('looks up a poi by legend code', () => {
    expect(getPoiByCode('CK', fixture)?.id).toBe('unplaced')
    expect(getPoiByCode('ZZ', fixture)).toBeUndefined()
  })
})

describe('belknap poi dataset', () => {
  it('has all seven legend features with unique codes', () => {
    expect(pois).toHaveLength(7)
    const codes = pois.map((p) => p.code)
    expect(new Set(codes)).toEqual(
      new Set(['CK', 'HR', 'IM', 'PW', 'QS', 'TB', 'TP'])
    )
  })

  it('records an authoritative grid cell for every feature', () => {
    for (const p of pois) {
      expect(p.gridCell, p.code).toMatch(/[A-J]\d/)
    }
  })

  it('marks every coordinate-less feature as needing georeference', () => {
    for (const p of pois) {
      expect(p.needsGeoreference, p.code).toBe(p.coordinates === undefined)
    }
  })

  it('cites a source for any placed coordinate', () => {
    for (const p of getPlacedPois()) {
      expect(p.coordinateSource, p.code).toBeTruthy()
    }
  })

  it('places the Mt. Major hut ruins near the summit', () => {
    const hut = getPoiByCode('HR')
    expect(hut?.coordinates).toBeDefined()
    // Sanity-bound to the Belknap Range, not a fabricated far-off point.
    expect(hut!.coordinates!.lat).toBeCloseTo(43.51, 1)
    expect(hut!.coordinates!.lng).toBeCloseTo(-71.29, 1)
  })
})
