import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { POIMarkers } from './POIMarkers'
import { getPlacedPois, getUnplacedPois } from '@/data/pois'

// Stub the GL rendering edge (WebGL is unavailable in jsdom). The POI logic
// itself is tested mock-free in src/data/pois.test.ts.
vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-popup">{children}</div>
  ),
}))

describe('POIMarkers', () => {
  it('renders one marker per placed POI and labels it with the legend code', () => {
    render(<POIMarkers />)

    const markers = screen.getAllByTestId('map-marker')
    expect(markers).toHaveLength(getPlacedPois().length)
    // HR (Mt. Major hut ruins) is the one placed POI today.
    expect(screen.getByText('HR')).toBeInTheDocument()
  })

  it('does not render grid-cell-only POIs', () => {
    render(<POIMarkers />)

    for (const poi of getUnplacedPois()) {
      expect(screen.queryByText(poi.code)).not.toBeInTheDocument()
    }
  })
})
