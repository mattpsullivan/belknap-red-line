import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompletionModal } from './CompletionModal'
import type { Trail } from '@/types'

const mockTrail: Trail = {
  id: 'test-trail',
  name: 'Test Trail',
  distance: 2.5,
  elevationGain: 1000,
  difficulty: 'moderate',
  trailhead: { lat: 43.52, lng: -71.43 },
  coordinates: [
    { lat: 43.52, lng: -71.43 },
    { lat: 43.53, lng: -71.42 },
  ],
}

describe('CompletionModal', () => {
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trail information', () => {
    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Test Trail')).toBeInTheDocument()
    expect(screen.getByText(/2.5 mi/)).toBeInTheDocument()
    expect(screen.getByText(/moderate/i)).toBeInTheDocument()
  })

  it('has a date input defaulting to today', () => {
    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    const dateInput = screen.getByLabelText(/date/i)
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveValue(new Date().toISOString().split('T')[0])
  })

  it('has a notes textarea', () => {
    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('calls onSave with completion data when save is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    // Add a note
    const notesInput = screen.getByLabelText(/notes/i)
    await user.type(notesInput, 'Great hike!')

    // Click save
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        trailId: 'test-trail',
        notes: 'Great hike!',
        manualEntry: true,
      })
    )
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    render(
      <CompletionModal
        trail={mockTrail}
        isOpen={false}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByText('Test Trail')).not.toBeInTheDocument()
  })
})
