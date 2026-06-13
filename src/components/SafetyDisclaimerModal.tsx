import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'belknap-safety-acknowledged'

interface SafetyDisclaimerModalProps {
  onAcknowledge?: () => void
}

export function SafetyDisclaimerModal({ onAcknowledge }: SafetyDisclaimerModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY)
    if (!acknowledged) {
      setIsOpen(true)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setIsOpen(false)
    onAcknowledge?.()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-auto">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary">
            Important Safety Information
          </h2>
          <p className="text-secondary text-sm mt-1">
            Please read before using this app
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-2">
              This is NOT a Navigation App
            </p>
            <p className="text-amber-700">
              Belknap Tracker is for recording trail completions only. Do not rely on this app for navigation, route-finding, or safety decisions.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <p className="font-semibold text-primary mb-2">
              The Destination is Your Car
            </p>
            <p className="text-secondary">
              Remember: the destination is always the <car at the end of the trip, not the summit. Weather changes, fatigue, and conditions may require turning back—and that's the right call.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <p className="font-semibold text-primary mb-2">
              Be Prepared: The Ten Essentials
            </p>
            <p className="text-secondary mb-3">
              Always carry proper gear, maps, and supplies for your hike.
            </p>
            <a
              href="https://www.nps.gov/articles/10essentials.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-location hover:underline font-medium"
            >
              Learn about the Ten Essentials
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleAcknowledge}
            className="w-full py-3 px-4 bg-location text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            I Understand
          </button>
          <p className="text-xs text-center text-secondary">
            You can review this information anytime in{' '}
            <Link to="/settings" className="text-location hover:underline" onClick={handleAcknowledge}>
              Settings
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function useSafetyAcknowledged() {
  const [acknowledged, setAcknowledged] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY)
  })

  const acknowledge = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setAcknowledged(true)
  }

  return { acknowledged, acknowledge }
}
