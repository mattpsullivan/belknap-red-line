# App Resources

Source assets for the app icon, splash, and branding.

## Source files

- `icon.svg` - app icon master (flattened, full-bleed square)
- `icon-foreground.svg` - adaptive-icon foreground (art only, transparent)
- `brand/` - color swatches used by the branding doc
- `icon-prompt.md` - the prompt used to generate the original icon art

The vector SVGs are the source of truth. They were vector-traced once from the
generated brand art; edit the SVGs directly from here on (colors are plain
hex - recolor for a white-label range).

## Regenerating platform assets

SVG → PNG (via sharp) → `@capacitor/assets`:

```bash
node scripts/render-icon.mjs resources/icon.svg            assets/icon-only.png       1024
node scripts/render-icon.mjs resources/icon-foreground.svg assets/icon-foreground.png 1024
magick -size 1024x1024 xc:'#16314D' assets/icon-background.png        # adaptive bg
node scripts/render-icon.mjs resources/icon-foreground.svg /tmp/logo.png 820
magick -size 2732x2732 xc:'#16314D' /tmp/logo.png -gravity center -composite assets/splash.png
cp assets/splash.png assets/splash-dark.png
npx capacitor-assets generate --android --ios
npx cap sync
```

Splash is generated from the icon art on the navy field - there is no separate
splash source.

## Branding

Palette, concept, and white-label swap-points live in
[`docs/branding.md`](../docs/branding.md).
