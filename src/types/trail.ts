export interface Coordinate {
  lat: number
  lng: number
  elevation?: number // feet above sea level
}

export interface Trail {
  id: string
  name: string
  distance: number // miles
  elevationGain?: number // total feet climbed
  elevationLoss?: number // total feet descended
  elevationMin?: number // lowest point in feet
  elevationMax?: number // highest point in feet
  difficulty: 'easy' | 'moderate' | 'difficult'
  coordinates: Coordinate[]
  trailhead: { lat: number; lng: number }
  area?: string
}

export interface Completion {
  id?: number
  trailId: string
  completedAt: Date
  manualEntry: boolean
  notes?: string
  trackId?: number // Phase 2
}

export interface TrackPoint {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  /**
   * Raw GNSS altitude in metres above the **WGS 84 ellipsoid** - NOT mean sea
   * level, and NOT the same datum as `Coordinate.elevation` (which is feet
   * orthometric, sampled from a DEM by scripts/enrich-elevation*.py).
   *
   * Stored raw and uncorrected on purpose: this is an observation, and the
   * geoid correction is applied only at the export boundary (see
   * services/gpxExport.ts). Never store a corrected copy alongside it.
   *
   * Optional because a receiver with no vertical fix reports null. Absent must
   * stay absent - coercing to 0 would read as sea level.
   */
  altitudeEllipsoidM?: number
}

export interface GPSTrack {
  id?: number
  startedAt: Date
  endedAt?: Date
  points: TrackPoint[]
  distance: number // meters, calculated from points
}

export interface Loop {
  id: string
  name: string
  description: string
  trailIds: string[]
  difficulty: 'easy' | 'moderate' | 'difficult'
  estimatedTime: string
  highlights: string[]
}
