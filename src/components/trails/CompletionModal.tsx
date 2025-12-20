import { useState } from 'react'
import type { Trail, Completion } from '@/types'

interface CompletionModalProps {
  trail: Trail
  isOpen: boolean
  onSave: (completion: Omit<Completion, 'id'>) => void
  onClose: () => void
}

export function CompletionModal({
  trail,
  isOpen,
  onSave,
  onClose,
}: CompletionModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      trailId: trail.id,
      completedAt: new Date(date),
      manualEntry: true,
      notes: notes || undefined,
    })
    setNotes('')
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-primary">
            Mark Trail Complete
          </h2>
          <button
            onClick={handleClose}
            className="text-secondary hover:text-primary p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Trail Info */}
        <div className="bg-surface rounded-xl p-4">
          <h3 className="font-medium text-primary">{trail.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-secondary">
            <span>{trail.distance} mi</span>
            <span>•</span>
            <span className="capitalize">{trail.difficulty}</span>
            {trail.elevationGain && (
              <>
                <span>•</span>
                <span>{trail.elevationGain} ft</span>
              </>
            )}
          </div>
        </div>

        {/* Date Input */}
        <div>
          <label
            htmlFor="completion-date"
            className="block text-sm font-medium text-primary mb-1"
          >
            Date Completed
          </label>
          <input
            id="completion-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-location"
          />
        </div>

        {/* Notes Input */}
        <div>
          <label
            htmlFor="completion-notes"
            className="block text-sm font-medium text-primary mb-1"
          >
            Notes (optional)
          </label>
          <textarea
            id="completion-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was the hike?"
            rows={3}
            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-location resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 border border-border text-secondary font-medium rounded-xl hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 bg-complete text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
