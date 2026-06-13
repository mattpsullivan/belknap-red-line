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

**All colors live in one file: [`src/config/palette.ts`](../src/config/palette.ts).**
That single source feeds everything - the UI (injected as `--c-*` CSS vars that
`src/index.css` @theme maps to Tailwind `--color-*` tokens), the map
(`src/config/styles.ts` imports it), and the icon (`scripts/recolor-icon.mjs`).

| | Role | `palette` key | Hex | Usage |
|---|------|------|-----|-------|
| ![](../resources/brand/swatch-navy.png) | Brand / Background | `brand` | `#16314D` | header & nav chrome, icon bg, splash, PWA theme |
| ![](../resources/brand/swatch-trail.png) | Brand accent | `accent` | `#2563A8` | banners, active chips, buttons, links, GPS marker |
| ![](../resources/brand/swatch-trail.png) | Red Trail | `complete` | `#DC2626` | the red-line (icon trail + completed trails) |
| ![](../resources/brand/swatch-peak.png) | Mountain Peaks | `peak` | `#FFFFFF` | icon peaks |
| ![](../resources/brand/swatch-summit.png) | Summit Marker | `summit` | `#22C55E` | icon summit dot, "easy", accents |

(plus `incomplete`, `recorded`, `highlight`, `loop`, `marker`, `primary`,
`secondary`, `surface`, `border`, `moderate`, `difficult` - see the file.)

## Regenerating the icon / splash

```bash
# edit resources/icon.svg / icon-foreground.svg, then:
node scripts/render-icon.mjs resources/icon.svg            assets/icon-only.png       1024
node scripts/render-icon.mjs resources/icon-foreground.svg assets/icon-foreground.png 1024
magick -size 1024x1024 xc:'#16314D' assets/icon-background.png
npx capacitor-assets generate --android   # (and --ios)
npx cap sync android
```

## White-label: what to swap per range

The app is one codebase; a new "<Range> Redline" needs only these changed:

1. **Name** - `capacitor.config.ts` (appName), `android/app/src/main/res/values/strings.xml`,
   the PWA manifest in `vite.config.ts`, and the header title in
   `src/components/layout/Layout.tsx`.
2. **Palette** - edit `src/config/palette.ts` (one file; drives UI + map).
3. **Icon/splash** - recolor + regenerate from the palette:
   ```bash
   node scripts/recolor-icon.mjs
   node scripts/render-icon.mjs resources/icon.svg            assets/icon-only.png       1024
   node scripts/render-icon.mjs resources/icon-foreground.svg assets/icon-foreground.png 1024
   magick -size 1024x1024 xc:"$(sed -n "s/.*brand: '\\(#[0-9A-Fa-f]*\\)'.*/\\1/p" src/config/palette.ts)" assets/icon-background.png
   npx capacitor-assets generate --android --ios && npx cap sync
   ```
4. **Trail data** - `src/data/trails.json`, `loops.json`, `pois.json`, and the
   bundled `public/tiles/<range>.pmtiles` basemap + its bounds.
5. **Copy** - safety disclaimer text, range name in strings/labels.

Items 1-3 are pure branding (palette.ts is the one color edit); 4-5 are the data
layer.
