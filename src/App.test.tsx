import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app with navigation', async () => {
    render(<App />)

    // Check that the header is present
    expect(screen.getByText('Belknap Tracker')).toBeInTheDocument()

    // Check that navigation items are present (use getAllByText for items that may appear elsewhere)
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Trails')).toBeInTheDocument()
    // Settings appears in both nav and safety modal, so check it exists
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
  })

  it('shows progress page by default', async () => {
    render(<App />)

    // Wait for lazy-loaded progress page to render
    await waitFor(() => {
      // Use getAllByText since there are multiple percentage displays (main + per-area)
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Find Your Next Hike →')).toBeInTheDocument()
  })
})
