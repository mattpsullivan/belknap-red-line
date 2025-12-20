# Belknap Red-Line Tracker

A Progressive Web App (PWA) to track hiking progress on Belknap Range trails in New Hampshire. Aligned with the official [BRATTS Redlining Patch](https://www.belknaprangetrailtenders.org/redlining.php) program covering ~70.5 miles of sanctioned trails.

## Features

- **Progress Dashboard** - Visual progress ring, statistics, and recent activity
- **Interactive Map** - Trail visualization with color-coded completion status (green = complete, red = incomplete)
- **Trail List** - Searchable, filterable list with difficulty ratings
- **Manual Completion** - Mark trails complete with date and optional notes
- **Offline Support** - Works without internet connection (PWA with service worker)
- **Local Storage** - All data stored locally in IndexedDB

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Maps | MapLibre GL JS + react-map-gl |
| Map Tiles | [OpenFreeMap](https://openfreemap.org/) (free, no API key) |
| Database | Dexie.js (IndexedDB wrapper) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + React Testing Library |

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

Current test coverage: 32 tests across 7 test files.

## Roadmap

- [x] **Phase 1: MVP** - Dashboard, map, trail list, manual completion
- [ ] **Phase 2: GPS Tracking** - Live location, track recording, auto-detection
- [ ] **Phase 3: Full Offline** - PMTiles for offline maps, export/import data

See [PLAN.md](./PLAN.md) for detailed implementation checklist.

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

This project is not currently licensed. Please contact the maintainers for usage terms.

---

Built for hikers completing the Belknap Range Redlining Patch in New Hampshire.
