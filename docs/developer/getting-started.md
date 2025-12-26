# Getting Started - Developer Guide

## Prerequisites

- **Node.js** 18.x or later (LTS recommended)
- **npm** 9.x or later
- **Git** for version control
- A modern browser (Chrome, Firefox, Safari, Edge)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd belknap-redline-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (TypeScript check + Vite build) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI mode) |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove node_modules and dist |
| `npm run reinstall` | Clean install (useful for dependency issues) |

## Project Structure

```
belknap-redline-tracker/
├── docs/                    # Documentation
├── public/                  # Static assets (PWA icons, etc.)
├── src/
│   ├── components/          # Reusable React components
│   │   ├── layout/          # App shell, navigation
│   │   ├── map/             # Map-related components
│   │   └── trails/          # Trail-specific components
│   ├── config/              # App configuration
│   │   └── styles.ts        # Centralized style tokens
│   ├── data/                # Static trail/loop data
│   │   ├── trails.ts        # Trail definitions
│   │   └── loops.json       # Loop itineraries
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Route-level components
│   ├── providers/           # React context providers
│   ├── services/            # Business logic
│   │   ├── database/        # Dexie/IndexedDB
│   │   └── geo/             # Geospatial utilities
│   ├── test/                # Test setup and utilities
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root component with routing
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite build configuration
```

## Technology Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type safety |
| Vite | 7.x | Build tool and dev server |
| React Router | 7.x | Client-side routing |
| Tailwind CSS | 4.x | Utility-first styling |

### Maps

| Technology | Version | Purpose |
|------------|---------|---------|
| MapLibre GL JS | 5.x | Vector map rendering |
| react-map-gl | 8.x | React bindings for MapLibre |
| PMTiles | 4.x | Offline tile storage |
| Turf.js | 7.x | Geospatial calculations |

### Data

| Technology | Version | Purpose |
|------------|---------|---------|
| Dexie.js | 4.x | IndexedDB wrapper |
| dexie-react-hooks | 4.x | Reactive queries |

### PWA

| Technology | Version | Purpose |
|------------|---------|---------|
| vite-plugin-pwa | 1.x | PWA generation |
| Workbox | (bundled) | Service worker |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.x | Test runner |
| Testing Library | 16.x | Component testing |
| fake-indexeddb | 6.x | IndexedDB mock |

## Development Workflow

### 1. Running the Dev Server

```bash
npm run dev
```

- Hot module replacement (HMR) enabled
- TypeScript errors shown in terminal and browser
- Open browser to `http://localhost:5173`

### 2. Making Changes

- **Components:** Edit files in `src/components/` or `src/pages/`
- **Styles:** Use Tailwind utility classes in JSX
- **Types:** Define in `src/types/trail.ts`
- **State:** Create/modify hooks in `src/hooks/`

### 3. Testing Changes

```bash
# Run tests in watch mode (recommended during development)
npm run test

# Run tests once
npm run test:run
```

Test files are colocated with source files using the `.test.ts(x)` suffix.

### 4. Type Checking

TypeScript errors are shown in the terminal during development. For a full type check:

```bash
npx tsc --noEmit
```

### 5. Building for Production

```bash
npm run build
```

Output is generated in `dist/`:
- Minified JS bundles (code-split by vendor)
- CSS bundle
- PWA assets (manifest, service worker)

### 6. Previewing Production Build

```bash
npm run preview
```

Serves the production build locally at `http://localhost:4173`

## Path Aliases

The project uses path aliases for cleaner imports:

```typescript
// Instead of:
import { useTrails } from '../../../hooks/useTrails'

// Use:
import { useTrails } from '@/hooks'
```

Configured in:
- `vite.config.ts` (for Vite)
- `tsconfig.json` (for TypeScript)

## Environment

### Browser APIs Used

- **Geolocation API** - GPS location tracking
- **IndexedDB** - Persistent local storage
- **Service Worker** - Offline caching

### Mobile Considerations

- Touch-friendly UI with large tap targets
- Bottom navigation for thumb-reachable actions
- Responsive design (mobile-first)
- PWA installable on iOS/Android

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/NewPage.tsx`
2. Export from `src/pages/index.ts`
3. Add route in `src/App.tsx`
4. Add navigation link in `src/components/layout/BottomNav.tsx`

### Adding a New Hook

1. Create hook in `src/hooks/useNewHook.ts`
2. Export from `src/hooks/index.ts`
3. Add tests in `src/hooks/useNewHook.test.ts`

### Modifying Trail Data

1. Edit `src/data/trails.ts` or regenerate from GPX files
2. Update types in `src/types/trail.ts` if structure changes
3. Test with `npm run test:run`

### Updating Styles

- Edit `src/config/styles.ts` for centralized tokens
- Use Tailwind classes in components
- Global styles in `src/index.css`

## Troubleshooting

### "Module not found" errors

```bash
npm run reinstall
```

### IndexedDB issues in tests

Tests use `fake-indexeddb`. If you see database errors:

```bash
# Check that setup file is configured
cat src/test/setup.ts

# Should contain:
# import 'fake-indexeddb/auto'
```

### Map not loading

Check browser console for:
- CORS errors (map tiles)
- WebGL support
- Network connectivity

### PWA not updating

Hard refresh or clear service worker:
- Chrome DevTools → Application → Service Workers → Unregister
- Clear cache and hard reload: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

## Next Steps

- [Project Structure](./project-structure.md) - Detailed directory layout
- [Component Guide](./components/map-components.md) - UI component documentation
- [Hook Reference](./hooks/hook-reference.md) - Custom hooks API
- [Testing Guide](./testing.md) - Testing patterns and best practices
