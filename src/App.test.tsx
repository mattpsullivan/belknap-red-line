import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app with navigation', () => {
    render(<App />)

    // Check that the header is present
    expect(screen.getByText('Belknap Tracker')).toBeInTheDocument()

    // Check that navigation items are present
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Trails')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows progress page by default', () => {
    render(<App />)

    // Progress page shows the percentage display
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Find Your Next Hike →')).toBeInTheDocument()
  })
})
