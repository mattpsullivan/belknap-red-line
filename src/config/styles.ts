/**
 * Centralized style configuration for the Belknap Trails app.
 *
 * This file provides a single source of truth for colors and styling
 * used throughout the application, particularly for map layers and
 * data visualizations.
 *
 * Color Philosophy:
 * - "Red-lining" is a hiking tradition where hikers draw a red line
 *   on a map to mark trails they've completed. Completed trails are
 *   therefore shown in RED.
 * - Incomplete trails use a bright, contrasting color for visibility.
 */

export const styleConfig = {
  /**
   * Trail colors for map display
   */
  trails: {
    /** Completed trails - red "red-line" marking */
    completed: {
      color: '#DC2626', // red-600 - slightly deeper red for better visibility
      width: 4,
      opacity: 0.9,
    },
    /** Incomplete trails - bright blue for contrast against terrain */
    incomplete: {
      color: '#0EA5E9', // sky-500 - high visibility against most map backgrounds
      width: 4,
      opacity: 0.8,
    },
    /** Active GPS recording track */
    recorded: {
      color: '#F97316', // orange-500
      width: 5,
      opacity: 0.9,
    },
    /** Highlighted/selected trail */
    highlighted: {
      color: '#FBBF24', // amber-400
      width: 6,
      opacity: 1,
    },
  },

  /**
   * User location marker colors
   */
  location: {
    marker: '#3B82F6', // blue-500
    accuracy: {
      fill: '#3B82F6',
      fillOpacity: 0.15,
      stroke: '#3B82F6',
      strokeWidth: 2,
      strokeOpacity: 0.5,
    },
  },

  /**
   * Elevation profile chart colors
   */
  elevation: {
    /** Main profile line and gradient */
    profile: {
      line: '#22C55E', // green-500
      gradientStart: '#22C55E',
      gradientStartOpacity: 0.3,
      gradientEnd: '#22C55E',
      gradientEndOpacity: 0.05,
    },
    /** Elevation gain/loss indicators */
    gain: '#16A34A', // green-600
    loss: '#DC2626', // red-600
    /** Min/max point markers */
    minPoint: '#DC2626', // red-600
    maxPoint: '#22C55E', // green-500
  },

  /**
   * Trail difficulty colors
   */
  difficulty: {
    easy: '#22C55E', // green-500
    moderate: '#EAB308', // yellow-500
    difficult: '#EF4444', // red-500
  },

  /**
   * UI semantic colors
   */
  ui: {
    primary: '#1E293B', // slate-800
    secondary: '#64748B', // slate-500
    surface: '#F8FAFC', // slate-50
    border: '#E2E8F0', // slate-200
  },
} as const

/**
 * Type for accessing trail status colors
 */
export type TrailStatus = 'completed' | 'incomplete' | 'recorded' | 'highlighted'

/**
 * Helper to get trail color by completion status
 */
export function getTrailColor(isCompleted: boolean): string {
  return isCompleted
    ? styleConfig.trails.completed.color
    : styleConfig.trails.incomplete.color
}

/**
 * Helper to get difficulty color
 */
export function getDifficultyColor(
  difficulty: 'easy' | 'moderate' | 'difficult'
): string {
  return styleConfig.difficulty[difficulty]
}
