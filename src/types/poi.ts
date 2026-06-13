/**
 * Historical points of interest from the official Belknap Range Trails map
 * (Weldon Bosworth, 2018). The map keys each feature to an alpha-numeric grid
 * cell in its legend; those cells are authoritative. Latitude/longitude is only
 * present where it can be sourced defensibly (e.g. anchored to a summit in the
 * GPS-derived trail data) - the rest await field georeferencing of the grid.
 */

export interface PoiCoordinates {
  lat: number
  lng: number
}

export interface PointOfInterest {
  /** Stable slug id. */
  id: string
  /** Legend symbol (CK, HR, IM, PW, QS, TB, TP). */
  code: string
  /** Short name. */
  name: string
  /** Legend description. */
  description: string
  /** Authoritative map grid cell(s), e.g. "E11" or "E9, F9". */
  gridCell: string
  /** Present only when a defensible coordinate exists. */
  coordinates?: PoiCoordinates
  /** Provenance for `coordinates` when set. */
  coordinateSource?: string
  /** True when only the grid cell is known and a real coordinate is needed. */
  needsGeoreference: boolean
}
