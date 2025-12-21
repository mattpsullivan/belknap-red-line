import { describe, it, expect } from 'vitest'
import { trailMatcher, calculateCoverage, findMatchingTrails } from './trailMatcher'
import type { Trail, TrackPoint } from '@/types'

// Sample trail for testing (simplified coordinates)
const sampleTrail: Trail = {
  id: 'test-trail',
  name: 'Test Trail',
  distance: 1.0,
  difficulty: 'easy',
  coordinates: [
    { lat: 43.5170, lng: -71.3690 },
    { lat: 43.5175, lng: -71.3690 },
    { lat: 43.5180, lng: -71.3690 },
    { lat: 43.5185, lng: -71.3690 },
    { lat: 43.5190, lng: -71.3690 },
  ],
  trailhead: { lat: 43.5170, lng: -71.3690 },
  area: 'Test Area',
}

// Track points that follow the trail exactly
const matchingTrackPoints: TrackPoint[] = [
  { lat: 43.5170, lng: -71.3690, accuracy: 10, timestamp: 1000 },
  { lat: 43.5175, lng: -71.3690, accuracy: 10, timestamp: 2000 },
  { lat: 43.5180, lng: -71.3690, accuracy: 10, timestamp: 3000 },
  { lat: 43.5185, lng: -71.3690, accuracy: 10, timestamp: 4000 },
  { lat: 43.5190, lng: -71.3690, accuracy: 10, timestamp: 5000 },
]

// Track points that are far from the trail
const nonMatchingTrackPoints: TrackPoint[] = [
  { lat: 43.5000, lng: -71.4000, accuracy: 10, timestamp: 1000 },
  { lat: 43.5005, lng: -71.4000, accuracy: 10, timestamp: 2000 },
  { lat: 43.5010, lng: -71.4000, accuracy: 10, timestamp: 3000 },
]

// Track points that partially cover the trail
const partialTrackPoints: TrackPoint[] = [
  { lat: 43.5170, lng: -71.3690, accuracy: 10, timestamp: 1000 },
  { lat: 43.5175, lng: -71.3690, accuracy: 10, timestamp: 2000 },
]

describe('trailMatcher', () => {
  describe('calculateCoverage', () => {
    it('should return 100% coverage for exact match', () => {
      const coverage = calculateCoverage(sampleTrail, matchingTrackPoints, 50)
      expect(coverage).toBeGreaterThanOrEqual(0.95) // Allow small precision errors
    })

    it('should return 0% coverage for non-matching track', () => {
      const coverage = calculateCoverage(sampleTrail, nonMatchingTrackPoints, 50)
      expect(coverage).toBe(0)
    })

    it('should return partial coverage for partial match', () => {
      const coverage = calculateCoverage(sampleTrail, partialTrackPoints, 50)
      expect(coverage).toBeGreaterThan(0)
      expect(coverage).toBeLessThan(1)
    })

    it('should return 0 for empty track', () => {
      const coverage = calculateCoverage(sampleTrail, [], 50)
      expect(coverage).toBe(0)
    })

    it('should handle trail with single point', () => {
      const singlePointTrail: Trail = {
        ...sampleTrail,
        coordinates: [{ lat: 43.5170, lng: -71.3690 }],
      }
      const coverage = calculateCoverage(singlePointTrail, matchingTrackPoints, 50)
      expect(coverage).toBe(1)
    })
  })

  describe('findMatchingTrails', () => {
    const trails: Trail[] = [
      sampleTrail,
      {
        ...sampleTrail,
        id: 'other-trail',
        name: 'Other Trail',
        coordinates: [
          { lat: 43.6000, lng: -71.5000 },
          { lat: 43.6005, lng: -71.5000 },
        ],
      },
    ]

    it('should find trails with >= 80% coverage', () => {
      const matches = findMatchingTrails(trails, matchingTrackPoints, 50, 0.8)
      expect(matches).toHaveLength(1)
      expect(matches[0].trail.id).toBe('test-trail')
      expect(matches[0].coverage).toBeGreaterThanOrEqual(0.8)
    })

    it('should return empty array when no trails match', () => {
      const matches = findMatchingTrails(trails, nonMatchingTrackPoints, 50, 0.8)
      expect(matches).toHaveLength(0)
    })

    it('should sort results by coverage descending', () => {
      const moreTrails: Trail[] = [
        sampleTrail,
        {
          ...sampleTrail,
          id: 'partial-trail',
          coordinates: [
            { lat: 43.5170, lng: -71.3690 },
            { lat: 43.5175, lng: -71.3690 },
            { lat: 43.5180, lng: -71.3690 },
          ],
        },
      ]
      const matches = findMatchingTrails(moreTrails, partialTrackPoints, 50, 0.3)
      expect(matches.length).toBeGreaterThan(0)
      // Should be sorted by coverage descending
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].coverage).toBeGreaterThanOrEqual(matches[i].coverage)
      }
    })
  })

  describe('trailMatcher', () => {
    it('should detect current trail when on trail', () => {
      const result = trailMatcher([sampleTrail], matchingTrackPoints)
      expect(result.currentTrail).not.toBeNull()
      expect(result.currentTrail?.id).toBe('test-trail')
    })

    it('should return null when not on any trail', () => {
      const result = trailMatcher([sampleTrail], nonMatchingTrackPoints)
      expect(result.currentTrail).toBeNull()
    })

    it('should list completed trails with >= 80% coverage', () => {
      const result = trailMatcher([sampleTrail], matchingTrackPoints)
      expect(result.completedTrails).toHaveLength(1)
      expect(result.completedTrails[0].id).toBe('test-trail')
    })
  })
})
