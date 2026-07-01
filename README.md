# Belknap Red-Line Tracker

A Progressive Web App (PWA) to track hiking progress on Belknap Range trails in New Hampshire. Aligned with the official [BRATTS Redlining Patch](https://www.belknaprangetrailtenders.org/redlining.php) program covering ~70.5 miles of sanctioned trails.

## Features

- **Progress Dashboard** - Visual progress ring, statistics, and recent activity
- **Interactive Map** - Trail visualization with color-coded completion status (green = complete, red = incomplete)
- **Trail List** - Searchable, filterable list with difficulty ratings
- **Manual Completion** - Mark trails complete with date and optional notes
- **GPS Tracking** - Live location, track recording, and auto-detection of completed trails
- **Background GPS (native)** - Records while the screen is locked via a Capacitor wrapper (@capgo/background-geolocation)
- **Historical POIs** - Map markers for historical sites from the official Belknap Range Trails map
- **Offline Support** - Works without internet connection (PWA with service worker + bundled PMTiles)
- **Local Storage** - All data stored locally in IndexedDB; JSON/CSV export + import

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Maps | MapLibre GL JS + react-map-gl |
| Map Tiles | [OpenFreeMap](https://openfreemap.org/) online; bundled [PMTiles](https://docs.protomaps.com/pmtiles/) (protomaps) for offline |
| Database | Dexie.js (IndexedDB wrapper) |
| PWA | vite-plugin-pwa + Workbox |
| Native | Capacitor (Android) - background GPS + sideload/Obtainium distribution |
| Theming | All colors in `src/config/palette.ts` (white-label ready) |
| Testing | Vitest + React Testing Library (no mock framework; Nullables) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/belknap-redline-tracker.git
cd belknap-redline-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Using DevContainer

This project includes a DevContainer configuration for VS Code:

1. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
2. Open the project folder in VS Code
3. Click "Reopen in Container" when prompted
4. Run `npm run dev` in the terminal

## Android (native build & install)

The app ships to a phone as a native Android wrapper (Capacitor) so GPS keeps
recording with the screen locked. Distribution is private, via signed APKs and
[Obtainium](https://github.com/ImranR98/Obtainium) - no Play Store.

```bash
npm run build            # build the web assets
npx cap sync android     # copy them into the Android project
# debug APK for sideload testing:
cd android && ./gradlew assembleDebug
```

- **Release pipeline:** pushing a `v*` tag builds a signed APK via GitHub Actions
  and attaches it to a GitHub Release for Obtainium to pull. See
  [`docs/adr/001-private-release-distribution.md`](./docs/adr/001-private-release-distribution.md)
  for the one-time setup (remote, keystore, `RELEASE_*` secrets, Obtainium + PAT).
- **Background GPS** needs Location set to "Allow all the time" + battery
  optimization off; the app's start-recording gate walks you through it. See
  Phase 7.10 in [PLAN.md](./PLAN.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── layout/       # Header, BottomNav, Layout
│   ├── map/          # TrailMap
│   └── trails/       # CompletionModal
├── data/
│   └── trails.json   # Trail definitions
├── hooks/
│   ├── useTrails.ts       # Load trail data
│   ├── useCompletions.ts  # CRUD for completions
│   └── useProgress.ts     # Derived statistics
├── pages/
│   ├── ProgressPage.tsx   # Dashboard
│   ├── MapPage.tsx        # Map view
│   ├── TrailsPage.tsx     # Trail list
│   └── SettingsPage.tsx   # Settings
├── services/
│   └── database/     # Dexie.js setup
└── types/            # TypeScript interfaces
```

## Testing

Tests are written with Vitest and React Testing Library:

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run specific test file
npm test -- src/hooks/useTrails.test.ts
```

Current test coverage: 161 tests across 26 test files (lint clean).

## Roadmap

- [x] **Phase 1: MVP** - Dashboard, map, trail list, manual completion
- [x] **Phase 2: GPS Tracking** - Live location, track recording, auto-detection
- [x] **Phase 3: Full Offline** - PMTiles for offline maps, export/import data
- [x] **Phase 4-5: Feedback + Elevation** - Trail detail pages, loops, elevation profiles
- [x] **Phase 7: Native wrapper** - Capacitor + background GPS (merged); distribution
  pipeline (GitHub Releases + Obtainium) wired, one-time setup pending
  ([ADR-001](./docs/adr/001-private-release-distribution.md))
- [x] **Brand + theming** - SVG icon/splash, navy theme, all colors consolidated
  in `src/config/palette.ts` for white-labeling ([docs/branding.md](./docs/branding.md))
- [~] **Background GPS reliability** - detection (stall banner + haptic buzz) and
  prevention (setup gate) built; **awaiting a real screen-off device walk** to
  confirm continuous capture (Phase 7.10)
- [ ] **Phase 8: Trail data cleanup** - a map-overlay audit
  (`scripts/map-overlay.py --check`) against the Bosworth reference map found
  duplicated/mislocated geometry in `trails.json`. Extract the trail roster from
  the map, fix the known data bugs, and re-survey suspect trails once background
  GPS is reliable ([docs/trail-validation.md](./docs/trail-validation.md))

See [PLAN.md](./PLAN.md) for the detailed implementation checklist and current state.

## Related Resources

- [BRATTS Redlining Program](https://www.belknaprangetrailtenders.org/redlining.php) - Official patch program
- [Redlining Workbook](https://www.newenglandtrailconditions.com/files/Belknap_Range_Redlining_2023v1.xls) - Authoritative trail list
- [OpenFreeMap](https://openfreemap.org/) - Free map tiles

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

This project follows [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## License

This project is licensed under the [MIT License](./LICENSE).

---

Built for hikers completing the Belknap Range Redlining Patch in New Hampshire.
