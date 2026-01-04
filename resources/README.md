# App Resources

This directory contains source assets for generating iOS and Android app icons and splash screens.

## Source Files

- `icon.svg` - App icon source (1024x1024)
- `splash.svg` - Splash screen source (2732x2732)

## Generating Platform Assets

### Option 1: Using @capacitor/assets (Recommended)

First, convert SVG to PNG (1024x1024 for icon, 2732x2732 for splash):

```bash
# Using ImageMagick
convert resources/icon.svg -resize 1024x1024 resources/icon.png
convert resources/splash.svg -resize 2732x2732 resources/splash.png

# Or using Inkscape CLI
inkscape resources/icon.svg -w 1024 -h 1024 -o resources/icon.png
inkscape resources/splash.svg -w 2732 -h 2732 -o resources/splash.png

# Or use an online converter like:
# - https://cloudconvert.com/svg-to-png
# - https://svgtopng.com/
```

Then generate all platform assets:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#3B82F6' --splashBackgroundColor '#3B82F6'
```

### Option 2: Manual Generation

#### iOS Icons (ios/App/App/Assets.xcassets/AppIcon.appiconset/)

| Size | Scale | Filename |
|------|-------|----------|
| 20x20 | 1x | AppIcon-20x20@1x.png |
| 20x20 | 2x | AppIcon-20x20@2x.png |
| 20x20 | 3x | AppIcon-20x20@3x.png |
| 29x29 | 1x | AppIcon-29x29@1x.png |
| 29x29 | 2x | AppIcon-29x29@2x.png |
| 29x29 | 3x | AppIcon-29x29@3x.png |
| 40x40 | 1x | AppIcon-40x40@1x.png |
| 40x40 | 2x | AppIcon-40x40@2x.png |
| 40x40 | 3x | AppIcon-40x40@3x.png |
| 60x60 | 2x | AppIcon-60x60@2x.png |
| 60x60 | 3x | AppIcon-60x60@3x.png |
| 76x76 | 1x | AppIcon-76x76@1x.png |
| 76x76 | 2x | AppIcon-76x76@2x.png |
| 83.5x83.5 | 2x | AppIcon-83.5x83.5@2x.png |
| 1024x1024 | 1x | AppIcon-512@2x.png |

#### Android Icons (android/app/src/main/res/)

| Density | Size | Directory |
|---------|------|-----------|
| mdpi | 48x48 | mipmap-mdpi/ |
| hdpi | 72x72 | mipmap-hdpi/ |
| xhdpi | 96x96 | mipmap-xhdpi/ |
| xxhdpi | 144x144 | mipmap-xxhdpi/ |
| xxxhdpi | 192x192 | mipmap-xxxhdpi/ |

Each directory needs:
- `ic_launcher.png` - Standard icon
- `ic_launcher_round.png` - Round icon (circular mask)
- `ic_launcher_foreground.png` - Adaptive icon foreground

## Design Guidelines

### Icon Design

- **Shape**: Square with rounded corners (automatically masked on iOS/Android)
- **Background**: Brand blue (#3B82F6)
- **Primary element**: White mountain outline (Belknap Range silhouette)
- **Accent**: Red trail line representing "red-lining"
- **Marker**: Green location dot for GPS tracking theme

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Brand Blue | #3B82F6 | Background |
| White | #FFFFFF | Mountain outline |
| Trail Red | #DC2626 | Red-line trail |
| Location Green | #22C55E | GPS marker |

### Safe Zone

Keep important elements within the center 66% of the icon to account for platform masking:
- iOS rounds corners significantly
- Android may use circular, rounded square, or squircle masks

## Testing Icons

After generating, test on:
1. iOS Simulator - Check all icon sizes
2. Android Emulator - Check adaptive icon behavior
3. App Store Connect - Validate 1024x1024 icon
4. Google Play Console - Validate high-res icon
