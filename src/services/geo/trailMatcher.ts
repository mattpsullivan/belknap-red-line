import * as turf from '@turf/turf'
import type { Trail, TrackPoint } from '@/types'

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
  bufferMeters: number = 50
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

  // Sample every 10 meters or at least 10 points
  const sampleCount = Math.max(10, Math.floor(trailLength / 10))
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
  bufferMeters: number = 50,
  minCoverage: number = 0.8
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
  bufferMeters: number = 50
): TrailMatcherResult {
  if (trackPoints.length === 0) {
    return {
      currentTrail: null,
      currentCoverage: 0,
      completedTrails: [],
      nearbyTrails: [],
    }
  }

  // Find all trails with any coverage
  const allMatches = findMatchingTrails(trails, trackPoints, bufferMeters, 0.1)

  // Completed trails have >= 80% coverage
  const completedTrails = allMatches
    .filter((m) => m.coverage >= 0.8)
    .map((m) => m.trail)

  // Current trail is the one with highest coverage (if any)
  const currentMatch = allMatches[0] || null

  // Nearby trails are those with 10-80% coverage
  const nearbyTrails = allMatches.filter((m) => m.coverage >= 0.1 && m.coverage < 0.8)

  return {
    currentTrail: currentMatch?.trail || null,
    currentCoverage: currentMatch?.coverage || 0,
    completedTrails,
    nearbyTrails,
  }
}
