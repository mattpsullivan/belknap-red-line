import * as turf from '@turf/turf'
import type { Trail, TrackPoint } from '@/types'

// Trail matching configuration constants
const DEFAULT_BUFFER_METERS = 50 // Buffer distance around GPS track
const COMPLETION_THRESHOLD = 0.8 // 80% coverage required to mark trail as complete
const NEARBY_THRESHOLD = 0.1 // 10% coverage to be considered "nearby"
const SAMPLE_INTERVAL_METERS = 10 // Sample points along trail every 10 meters
const MIN_SAMPLE_POINTS = 10 // Minimum number of sample points per trail

export interface TrailMatch {
  trail: Trail
  coverage: number // 0-1, percentage of trail covered
}

export interface TrailMatcherResult {
  currentTrail: Trail | null
  currentCoverage: number
  completedTrails: Trail[]
  nearbyTrails: TrailMatch[]
}

/**
 * Calculate what percentage of a trail is covered by a GPS track
 * @param trail The trail to check
 * @param trackPoints The recorded GPS points
 * @param bufferMeters Buffer distance in meters (default 50m)
 * @returns Coverage percentage (0-1)
 */
export function calculateCoverage(
  trail: Trail,
  trackPoints: TrackPoint[],
  bufferMeters: number = DEFAULT_BUFFER_METERS
): number {
  if (trackPoints.length === 0) return 0
  if (trail.coordinates.length === 0) return 0

  // Handle single-point trail
  if (trail.coordinates.length === 1) {
    const trailPoint = turf.point([trail.coordinates[0].lng, trail.coordinates[0].lat])
    for (const tp of trackPoints) {
      const trackPoint = turf.point([tp.lng, tp.lat])
      const distance = turf.distance(trailPoint, trackPoint, { units: 'meters' })
      if (distance <= bufferMeters) {
        return 1
      }
    }
    return 0
  }

  // Create a buffer around the track
  const trackLine = turf.lineString(trackPoints.map((p) => [p.lng, p.lat]))
  const trackBuffer = turf.buffer(trackLine, bufferMeters, { units: 'meters' })

  if (!trackBuffer) return 0

  // Sample points along the trail and count how many are within the buffer
  const trailLine = turf.lineString(trail.coordinates.map((c) => [c.lng, c.lat]))
  const trailLength = turf.length(trailLine, { units: 'meters' })

  // Sample points along the trail at regular intervals
  const sampleCount = Math.max(MIN_SAMPLE_POINTS, Math.floor(trailLength / SAMPLE_INTERVAL_METERS))
  let coveredPoints = 0

  for (let i = 0; i <= sampleCount; i++) {
    const fraction = i / sampleCount
    const point = turf.along(trailLine, trailLength * fraction, { units: 'meters' })

    if (turf.booleanPointInPolygon(point, trackBuffer)) {
      coveredPoints++
    }
  }

  return coveredPoints / (sampleCount + 1)
}

/**
 * Find all trails that match a given GPS track
 * @param trails List of trails to check
 * @param trackPoints The recorded GPS points
 * @param bufferMeters Buffer distance in meters
 * @param minCoverage Minimum coverage to be considered a match (0-1)
 * @returns List of matching trails sorted by coverage (descending)
 */
export function findMatchingTrails(
  trails: Trail[],
  trackPoints: TrackPoint[],
  bufferMeters: number = DEFAULT_BUFFER_METERS,
  minCoverage: number = COMPLETION_THRESHOLD
): TrailMatch[] {
  const matches: TrailMatch[] = []

  for (const trail of trails) {
    const coverage = calculateCoverage(trail, trackPoints, bufferMeters)
    if (coverage >= minCoverage) {
      matches.push({ trail, coverage })
    }
  }

  // Sort by coverage descending
  return matches.sort((a, b) => b.coverage - a.coverage)
}

/**
 * Main trail matcher function - detects current trail and completed trails
 * @param trails List of all trails
 * @param trackPoints The recorded GPS points
 * @param bufferMeters Buffer distance in meters (default 50m)
 * @returns Current trail, coverage, and list of completed trails
 */
export function trailMatcher(
  trails: Trail[],
  trackPoints: TrackPoint[],
  bufferMeters: number = DEFAULT_BUFFER_METERS
): TrailMatcherResult {
  if (trackPoints.length === 0) {
    return {
      currentTrail: null,
      currentCoverage: 0,
      completedTrails: [],
      nearbyTrails: [],
    }
  }

  // Find all trails with any meaningful coverage
  const allMatches = findMatchingTrails(trails, trackPoints, bufferMeters, NEARBY_THRESHOLD)

  // Completed trails meet the completion threshold
  const completedTrails = allMatches
    .filter((m) => m.coverage >= COMPLETION_THRESHOLD)
    .map((m) => m.trail)

  // Current trail is the one with highest coverage (if any)
  const currentMatch = allMatches[0] || null

  // Nearby trails are those with partial coverage (between nearby and completion thresholds)
  const nearbyTrails = allMatches.filter(
    (m) => m.coverage >= NEARBY_THRESHOLD && m.coverage < COMPLETION_THRESHOLD
  )

  return {
    currentTrail: currentMatch?.trail || null,
    currentCoverage: currentMatch?.coverage || 0,
    completedTrails,
    nearbyTrails,
  }
}
