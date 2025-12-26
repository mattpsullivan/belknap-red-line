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
    /** Highlighted loop trails (distinct from single trail) */
    highlightedLoop: {
      color: '#A855F7', // purple-500
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

  /**
   * Trail area colors for badges and map highlighting
   * Each area gets a distinct, accessible color
   */
  areas: {
    'Lockes Hill': {
      bg: '#DBEAFE', // blue-100
      text: '#1E40AF', // blue-800
    },
    'Mt. Rowe & Gunstock Mountain': {
      bg: '#D1FAE5', // emerald-100
      text: '#065F46', // emerald-800
    },
    'Belknap Mountain': {
      bg: '#FEE2E2', // red-100
      text: '#991B1B', // red-800
    },
    'Piper, Whiteface & Swett Mountains': {
      bg: '#E0E7FF', // indigo-100
      text: '#3730A3', // indigo-800
    },
    'Mt. Klem, Mt. Mack & Mt. Anna': {
      bg: '#FEF3C7', // amber-100
      text: '#92400E', // amber-800
    },
    'Rand, Quarry & Straightback Mountains': {
      bg: '#FCE7F3', // pink-100
      text: '#9D174D', // pink-800
    },
    'Mt. Major': {
      bg: '#CCFBF1', // teal-100
      text: '#115E59', // teal-800
    },
    'Mt. Shannon, Goat Pasture Hill & Pine Mountain': {
      bg: '#F3E8FF', // purple-100
      text: '#6B21A8', // purple-800
    },
  } as Record<string, { bg: string; text: string }>,
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

/**
 * Default area colors for unknown areas
 */
const defaultAreaColors = {
  bg: '#F1F5F9', // slate-100
  text: '#475569', // slate-600
}

/**
 * Helper to get area colors
 */
export function getAreaColors(area: string): { bg: string; text: string } {
  return styleConfig.areas[area] || defaultAreaColors
}

/**
 * Short display names for trail areas
 * Used in badges and dropdowns where space is limited
 */
export const AREA_SHORT_NAMES: Record<string, string> = {
  'Lockes Hill': 'Lockes Hill',
  'Mt. Rowe & Gunstock Mountain': 'Rowe/Gunstock',
  'Belknap Mountain': 'Belknap',
  'Piper, Whiteface & Swett Mountains': 'Piper/Whiteface',
  'Mt. Klem, Mt. Mack & Mt. Anna': 'Klem/Mack/Anna',
  'Rand, Quarry & Straightback Mountains': 'Rand/Quarry',
  'Mt. Major': 'Mt. Major',
  'Mt. Shannon, Goat Pasture Hill & Pine Mountain': 'Shannon/Goat',
}

/**
 * Helper to get short area name
 */
export function getAreaShortName(area: string): string {
  return AREA_SHORT_NAMES[area] || area
}
