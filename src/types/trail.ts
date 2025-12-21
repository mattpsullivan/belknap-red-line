export interface Trail {
  id: string
  name: string
  distance: number // miles
  elevationGain?: number // feet
  difficulty: 'easy' | 'moderate' | 'difficult'
  coordinates: { lat: number; lng: number }[]
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
