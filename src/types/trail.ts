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
