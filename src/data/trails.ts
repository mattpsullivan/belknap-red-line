import type { Trail } from '@/types/trail'

// Sample trail data for development
// TODO: Replace with actual BRATTS trail data in production
export const trails: Trail[] = [
  {
    id: 'belknap-east',
    name: 'Mount Belknap via East Trail',
    distance: 2.4,
    elevationGain: 1200,
    difficulty: 'moderate',
    area: 'Belknap Mountain',
    trailhead: { lat: 43.5178, lng: -71.4512 },
    coordinates: [
      { lat: 43.5178, lng: -71.4512 },
      { lat: 43.5195, lng: -71.4498 },
      { lat: 43.5212, lng: -71.4485 },
      { lat: 43.5230, lng: -71.4470 },
    ],
  },
  {
    id: 'major-main',
    name: 'Mount Major via Main Trail',
    distance: 2.8,
    elevationGain: 1100,
    difficulty: 'easy',
    area: 'Mount Major',
    trailhead: { lat: 43.5089, lng: -71.3912 },
    coordinates: [
      { lat: 43.5089, lng: -71.3912 },
      { lat: 43.5102, lng: -71.3898 },
      { lat: 43.5118, lng: -71.3885 },
      { lat: 43.5135, lng: -71.3870 },
    ],
  },
  {
    id: 'gunstock',
    name: 'Gunstock Mountain',
    distance: 3.2,
    elevationGain: 1400,
    difficulty: 'moderate',
    area: 'Gunstock',
    trailhead: { lat: 43.5345, lng: -71.3678 },
    coordinates: [
      { lat: 43.5345, lng: -71.3678 },
      { lat: 43.5362, lng: -71.3665 },
      { lat: 43.5380, lng: -71.3650 },
      { lat: 43.5398, lng: -71.3635 },
    ],
  },
  {
    id: 'piper',
    name: 'Piper Mountain',
    distance: 2.0,
    elevationGain: 800,
    difficulty: 'easy',
    area: 'Piper Mountain',
    trailhead: { lat: 43.5456, lng: -71.4234 },
    coordinates: [
      { lat: 43.5456, lng: -71.4234 },
      { lat: 43.5470, lng: -71.4220 },
      { lat: 43.5485, lng: -71.4205 },
    ],
  },
  {
    id: 'klem',
    name: 'Mount Klem',
    distance: 1.8,
    elevationGain: 600,
    difficulty: 'easy',
    area: 'Mount Klem',
    trailhead: { lat: 43.5289, lng: -71.4567 },
    coordinates: [
      { lat: 43.5289, lng: -71.4567 },
      { lat: 43.5302, lng: -71.4555 },
      { lat: 43.5315, lng: -71.4542 },
    ],
  },
  {
    id: 'whiteface',
    name: 'Whiteface Mountain',
    distance: 4.5,
    elevationGain: 1800,
    difficulty: 'difficult',
    area: 'Whiteface',
    trailhead: { lat: 43.5123, lng: -71.4789 },
    coordinates: [
      { lat: 43.5123, lng: -71.4789 },
      { lat: 43.5145, lng: -71.4770 },
      { lat: 43.5168, lng: -71.4752 },
      { lat: 43.5190, lng: -71.4735 },
      { lat: 43.5212, lng: -71.4718 },
    ],
  },
  {
    id: 'mack',
    name: 'Mount Mack',
    distance: 2.2,
    elevationGain: 950,
    difficulty: 'moderate',
    area: 'Mount Mack',
    trailhead: { lat: 43.5234, lng: -71.4345 },
    coordinates: [
      { lat: 43.5234, lng: -71.4345 },
      { lat: 43.5248, lng: -71.4330 },
      { lat: 43.5262, lng: -71.4315 },
    ],
  },
  {
    id: 'round-pond',
    name: 'Round Pond Trail',
    distance: 1.5,
    elevationGain: 400,
    difficulty: 'easy',
    area: 'Round Pond',
    trailhead: { lat: 43.5367, lng: -71.4123 },
    coordinates: [
      { lat: 43.5367, lng: -71.4123 },
      { lat: 43.5378, lng: -71.4112 },
      { lat: 43.5389, lng: -71.4100 },
    ],
  },
]

// Calculate total distance
export const totalDistance = trails.reduce((sum, t) => sum + t.distance, 0)
export const totalTrails = trails.length
