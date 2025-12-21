import type { Trail } from '@/types/trail'
import trailsData from './trails.json'

// Import real trail data from BRATTS workbook (59 trails, 67.65 miles)
export const trails: Trail[] = trailsData as Trail[]

// Calculate total distance
export const totalDistance = trails.reduce((sum, t) => sum + t.distance, 0)
export const totalTrails = trails.length
