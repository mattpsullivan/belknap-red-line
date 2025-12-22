import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ElevationProfile } from './ElevationProfile'
import type { Coordinate } from '@/types'

describe('ElevationProfile', () => {
  const sampleCoordinates: Coordinate[] = [
    { lat: 43.52, lng: -71.34, elevation: 1000 },
    { lat: 43.521, lng: -71.341, elevation: 1200 },
    { lat: 43.522, lng: -71.342, elevation: 1400 },
    { lat: 43.523, lng: -71.343, elevation: 1300 },
    { lat: 43.524, lng: -71.344, elevation: 1500 },
  ]

  it('renders elevation profile SVG', () => {
    render(<ElevationProfile coordinates={sampleCoordinates} />)

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('displays min and max elevation', () => {
    render(<ElevationProfile coordinates={sampleCoordinates} />)

    expect(screen.getByText('1,000 ft')).toBeInTheDocument()
    expect(screen.getByText('1,500 ft')).toBeInTheDocument()
  })

  it('displays elevation gain and loss', () => {
    render(<ElevationProfile coordinates={sampleCoordinates} />)

    // Gain: 1000->1200 (+200) + 1200->1400 (+200) + 1300->1500 (+200) = 600
    // Loss: 1400->1300 (-100) = 100
    expect(screen.getByText(/\+600 ft/)).toBeInTheDocument()
    expect(screen.getByText(/-100 ft/)).toBeInTheDocument()
  })

  it('shows empty state when no elevation data', () => {
    const coordsWithoutElevation: Coordinate[] = [
      { lat: 43.52, lng: -71.34 },
      { lat: 43.521, lng: -71.341 },
    ]

    render(<ElevationProfile coordinates={coordsWithoutElevation} />)

    expect(screen.getByText(/no elevation data/i)).toBeInTheDocument()
  })

  it('renders with custom height', () => {
    render(<ElevationProfile coordinates={sampleCoordinates} height={200} />)

    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('handles single point gracefully', () => {
    const singlePoint: Coordinate[] = [{ lat: 43.52, lng: -71.34, elevation: 1000 }]

    render(<ElevationProfile coordinates={singlePoint} />)

    // Should still render without crashing (min and max are same value)
    const elevationLabels = screen.getAllByText('1,000 ft')
    expect(elevationLabels.length).toBe(2) // Both min and max show same value
  })
})
