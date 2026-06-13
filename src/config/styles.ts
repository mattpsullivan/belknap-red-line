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

import { palette } from './palette'

export const styleConfig = {
  /**
   * Trail colors for map display (sourced from src/config/palette.ts).
   */
  trails: {
    /** Completed trails - red "red-line" marking */
    completed: { color: palette.complete, width: 4, opacity: 0.9 },
    /** Incomplete trails - bright color for contrast against terrain */
    incomplete: { color: palette.incomplete, width: 4, opacity: 0.8 },
    /** Active GPS recording track */
    recorded: { color: palette.recorded, width: 5, opacity: 0.9 },
    /** Highlighted/selected trail */
    highlighted: { color: palette.highlight, width: 6, opacity: 1 },
    /** Highlighted loop trails (distinct from single trail) */
    highlightedLoop: { color: palette.loop, width: 6, opacity: 1 },
  },

  /**
   * User location marker colors
   */
  location: {
    marker: palette.marker,
    accuracy: {
      fill: palette.marker,
      fillOpacity: 0.15,
      stroke: palette.marker,
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
      line: palette.summit,
      gradientStart: palette.summit,
      gradientStartOpacity: 0.3,
      gradientEnd: palette.summit,
      gradientEndOpacity: 0.05,
    },
    /** Elevation gain/loss indicators */
    gain: '#16A34A', // green-600 (darker green, gain-specific)
    loss: palette.complete,
    /** Min/max point markers */
    minPoint: palette.complete,
    maxPoint: palette.summit,
  },

  /**
   * Trail difficulty colors
   */
  difficulty: {
    easy: palette.easy,
    moderate: palette.moderate,
    difficult: palette.difficult,
  },

  /**
   * UI semantic colors
   */
  ui: {
    primary: palette.primary,
    secondary: palette.secondary,
    surface: palette.surface,
    border: palette.border,
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
