import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrailMap } from './TrailMap'

// Mock maplibre-gl since it requires WebGL
vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  Source: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="map-source" {...props}>
      {children}
    </div>
  ),
  Layer: (props: Record<string, unknown>) => (
    <div data-testid="map-layer" data-type={props.type} />
  ),
}))

describe('TrailMap', () => {
  it('renders the map container', () => {
    render(
      <MemoryRouter>
        <TrailMap />
      </MemoryRouter>
    )

    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('renders trail layers', () => {
    render(
      <MemoryRouter>
        <TrailMap />
      </MemoryRouter>
    )

    const layers = screen.getAllByTestId('map-layer')
    expect(layers.length).toBeGreaterThan(0)
  })
})
