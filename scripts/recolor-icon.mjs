/**
 * Recolor the icon SVG masters from the palette (src/config/palette.ts).
 *
 * The SVGs use the canonical Belknap hexes as placeholders; this maps each to
 * the current palette value. For the Belknap brand it's a no-op; for a
 * white-label range, edit palette.ts then run:
 *   node scripts/recolor-icon.mjs && \
 *   node scripts/render-icon.mjs resources/icon.svg assets/icon-only.png 1024 && \
 *   node scripts/render-icon.mjs resources/icon-foreground.svg assets/icon-foreground.png 1024 && \
 *   npx capacitor-assets generate --android --ios
 */
import { readFileSync, writeFileSync } from 'node:fs'

const pal = readFileSync('src/config/palette.ts', 'utf8')
const hex = (key) => {
  const m = pal.match(new RegExp(`\\b${key}:\\s*'(#[0-9A-Fa-f]{6})'`))
  if (!m) throw new Error(`palette key not found: ${key}`)
  return m[1].toUpperCase()
}

// canonical placeholder (Belknap) -> palette role
const remap = [
  ['#16314D', hex('brand')], // background
  ['#FFFFFF', hex('peak')], // mountain peaks
  ['#DC2626', hex('complete')], // red-line trail
  ['#22C55E', hex('summit')], // summit dot
]

for (const file of ['resources/icon.svg', 'resources/icon-foreground.svg']) {
  let svg = readFileSync(file, 'utf8')
  for (const [from, to] of remap) {
    svg = svg.replaceAll(new RegExp(from, 'gi'), to)
  }
  writeFileSync(file, svg)
  console.log(`recolored ${file}`)
}
