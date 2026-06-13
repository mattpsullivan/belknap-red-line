/**
 * SINGLE SOURCE OF TRUTH for all app colors.
 *
 * White-label / re-theme: edit the values here. Everything derives from them:
 *  - UI (Tailwind): `applyPalette()` injects these as `--c-*` CSS variables at
 *    startup; src/index.css @theme maps `--color-*` tokens to them.
 *  - Map (MapLibre): src/config/styles.ts imports `palette`.
 *  - Icon/splash: the SVG masters use these hexes; `npm run recolor-icon`
 *    rewrites them from this file (see scripts/recolor-icon.mjs).
 */
export const palette = {
  /** Twilight navy - app chrome (header/nav), icon background, splash. */
  brand: '#16314D',
  /** Interactive accent (brand blue) - banners, active chips, buttons, links. */
  accent: '#2563A8',

  /** Red-line: completed trails + the icon trail. */
  complete: '#DC2626',
  /** Incomplete trails (map). */
  incomplete: '#0EA5E9',
  /** Active GPS recording track (map). */
  recorded: '#F97316',
  /** Highlighted/selected trail (map). */
  highlight: '#FBBF24',
  /** Highlighted loop (map). */
  loop: '#A855F7',
  /** Summit marker (icon) + accents. */
  summit: '#22C55E',
  /** User GPS location marker (map). */
  marker: '#2563A8',

  /** Icon mountain peaks. */
  peak: '#FFFFFF',

  /* UI neutrals */
  primary: '#1E293B',
  secondary: '#64748B',
  surface: '#F8FAFC',
  border: '#E2E8F0',

  /* Difficulty */
  easy: '#22C55E',
  moderate: '#EAB308',
  difficult: '#EF4444',
} as const

export type Palette = typeof palette

/** Inject the palette as `--c-*` CSS variables on :root (call once at startup). */
export function applyPalette(p: Record<string, string> = palette): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [key, value] of Object.entries(p)) {
    root.style.setProperty(`--c-${key}`, value)
  }
}
