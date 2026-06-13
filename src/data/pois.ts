import type { PointOfInterest } from '@/types/poi'
import poisData from './pois.json'

/**
 * Historical points of interest from the official Belknap Range Trails map.
 * See src/types/poi.ts for the sourcing policy (grid cells authoritative,
 * coordinates only where defensible).
 */
export const pois: PointOfInterest[] = poisData as PointOfInterest[]

/** POIs that have a real coordinate and can be drawn on the map. */
export function getPlacedPois(
  all: readonly PointOfInterest[] = pois
): PointOfInterest[] {
  return all.filter((p) => p.coordinates !== undefined)
}

/** POIs known only by grid cell, awaiting georeferencing. */
export function getUnplacedPois(
  all: readonly PointOfInterest[] = pois
): PointOfInterest[] {
  return all.filter((p) => p.coordinates === undefined)
}

/** Look up a POI by its legend symbol (CK, HR, ...). */
export function getPoiByCode(
  code: string,
  all: readonly PointOfInterest[] = pois
): PointOfInterest | undefined {
  return all.find((p) => p.code === code)
}
