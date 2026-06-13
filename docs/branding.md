# Branding & white-label guide

The "Redline" concept generalizes to any trail network (Belknap Range today;
White Mountains, Middlesex Fells, etc. later). This doc captures the brand and
the seams to swap when spinning up a new range.

## Concept

A bold **red trail line switchbacks up and crests a mountain summit**, ending at
a green summit marker - the "red-lining" tradition (drawing a red line over
completed trails) rendered as the logo. White peaks on a twilight-navy field.

Master art is vector: `resources/icon.svg` (flattened, full-bleed square) and
`resources/icon-foreground.svg` (adaptive foreground, transparent). The original
Gemini reference sheet is at `resources/brand/brand-guidelines.png`.

## Palette

| | Role | Hex | CSS token | Usage |
|---|------|-----|-----------|-------|
| ![](../resources/brand/swatch-navy.png) | Brand / Background | `#0B2A4A` | `--color-brand` | icon background, app header & nav chrome, splash, PWA theme color |
| ![](../resources/brand/swatch-trail.png) | Red Trail | `#DC2626` | `--color-trail` / `--color-complete` | the red-line (logo trail + completed trails on the map) |
| ![](../resources/brand/swatch-peak.png) | Mountain Peaks | `#FFFFFF` | - | icon peaks |
| ![](../resources/brand/swatch-summit.png) | Summit Marker | `#22C55E` | `--color-summit` | icon summit dot (also "easy" difficulty / accents) |

These live as CSS tokens in `src/index.css`. The GPS location-marker blue
(`--color-location`, `#3B82F6`) is a map-only functional color, not brand chrome.

## Regenerating the icon / splash

```bash
# edit resources/icon.svg / icon-foreground.svg, then:
node scripts/render-icon.mjs resources/icon.svg            assets/icon-only.png       1024
node scripts/render-icon.mjs resources/icon-foreground.svg assets/icon-foreground.png 1024
magick -size 1024x1024 xc:'#0B2A4A' assets/icon-background.png
npx capacitor-assets generate --android   # (and --ios)
npx cap sync android
```

## White-label: what to swap per range

The app is one codebase; a new "<Range> Redline" needs only these changed:

1. **Name** - `capacitor.config.ts` (appName), `android/app/src/main/res/values/strings.xml`,
   the PWA manifest in `vite.config.ts`, and the header title in
   `src/components/layout/Layout.tsx`.
2. **Palette** - the brand tokens in `src/index.css` (and re-render the icon if
   the brand color changes). The red-line + peaks + summit can stay constant;
   typically only the background/accent would vary by range.
3. **Icon/splash** - `resources/icon*.svg` recolored, then regenerate (above).
   The SVG colors are the only edit needed.
4. **Trail data** - `src/data/trails.json`, `loops.json`, `pois.json`, and the
   bundled `public/tiles/<range>.pmtiles` basemap + its bounds.
5. **Copy** - safety disclaimer text, range name in strings/labels.

Items 1-3 are pure branding; 4-5 are the data layer. A future refactor could
lift 1-3 into a single `brand.config.ts` consumed at build time so a new range
is one config file plus a data set - noted for when the second range happens.
