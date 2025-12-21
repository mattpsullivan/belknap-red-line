# Belknap Red-Line Tracker - Implementation Plan

> **Agents:** Read `AGENTS.md` first for workflow rules (TDD, devcontainer restrictions, plan tracking).

## Overview
A React PWA to track hiking progress on Belknap Range trails (NH). Aligned with the official **Belknap Range Trail Tenders (BRATTS) Redlining Patch** program: ~70.5 miles of sanctioned trails.

**Official Resources**:
- [BRATTS Redlining Program](https://www.belknaprangetrailtenders.org/redlining.php)
- [Redlining Workbook (Excel)](https://www.newenglandtrailconditions.com/files/Belknap_Range_Redlining_2023v1.xls) - authoritative trail list
- [NewEnglandTrailConditions Belknap Page](https://www.newenglandtrailconditions.com/listsnhbelknap.php)

---

## Tech Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 18 + TypeScript + Vite | Fast dev, good PWA support |
| Routing | React Router v6 | URL-based navigation, browser back button |
| Maps | MapLibre GL JS + react-map-gl | Vector tiles (smaller), WebGL, open-source |
| Map Tiles | **OpenFreeMap** | Unlimited free, no API key needed |
| Offline Tiles | PMTiles (Phase 3) | Single-file format, native MapLibre support |
| Storage | Dexie.js (IndexedDB) | Async API, service worker compatible, reactive hooks |
| PWA | vite-plugin-pwa + Workbox | Zero-config, automatic caching |
| Geo Utils | Turf.js | Trail detection algorithm |
| Styling | Tailwind CSS | Rapid UI development |
| Testing | Vitest + Playwright | Unit/integration + E2E |

---

## Trail Data Strategy

### Source: BRATTS Redlining Workbook
- [ ] Download official Excel workbook from NewEnglandTrailConditions
- [ ] Extract trail names, distances, and any metadata
- [ ] Cross-reference with Trailforks GPX data for GPS coordinates
- [ ] Combine into `trails.json` with full coordinate paths

### Data Pipeline
```
BRATTS Workbook (authoritative list)
    ↓
Trailforks GPX (GPS coordinates)
    ↓
OpenStreetMap (verification/gaps)
    ↓
trails.json (app bundle)
```

---

## Project Structure

```
src/
├── components/
│   ├── map/          # TrailMap, TrailLayer, TrailPopup
│   ├── trails/       # TrailList, TrailCard, TrailDetail
│   ├── progress/     # ProgressDashboard, ProgressChart
│   └── layout/       # Header, Navigation, OfflineIndicator
├── hooks/            # useTrails, useCompletions, useProgress, useGeolocation
├── services/
│   ├── database/     # Dexie setup, CRUD operations
│   └── geo/          # Trail detection algorithm
├── data/
│   └── trails.json   # Static trail definitions (~70.5 miles)
├── types/            # TypeScript interfaces
└── pages/            # MapPage, ProgressPage, TrailsPage, SettingsPage
```

---

## Data Models

**Trail** (static, bundled):
```typescript
interface Trail {
  id: string;
  name: string;
  distance: number;        // miles
  elevationGain?: number;  // feet (if available)
  difficulty?: 'easy' | 'moderate' | 'difficult';
  coordinates: { lat: number; lng: number }[];
  trailhead: { lat: number; lng: number };
  area?: string;           // e.g., "Belknap Mountain"
}
```

**Completion** (IndexedDB):
```typescript
interface Completion {
  id?: number;
  trailId: string;
  completedAt: Date;
  manualEntry: boolean;
  notes?: string;
  trackId?: number;  // Phase 2
}
```

---

## UI Prototyping (Pre-Implementation)

### Objective
Create 2-3 HTML/Tailwind prototypes to evaluate design directions before coding.

### Screen Inventory

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| **Map View** | Primary screen, trail visualization | Map, trail overlays, current location, completion toggle |
| **Progress Dashboard** | Motivation & stats | Completion %, miles hiked, recent activity, remaining trails |
| **Trail List** | Browse/search all trails | Filterable list, completion status, distance, difficulty |
| **Trail Detail** | Single trail info + completion | Name, stats, notes, mark complete button, history |
| **Settings** | App config, data management | Export/import, clear data, about |

### User Flows

```
1. VIEW PROGRESS:      Launch → Dashboard (see %) → Map (explore)
2. MARK COMPLETE:      Map → Tap trail → Popup → "Mark Complete" → Date/notes → Confirm
3. FIND NEXT HIKE:     Dashboard → "Remaining" → Trail List → Sort → Detail
4. TRACK HIKE (Ph2):   Map → "Start Tracking" → Hike → Auto-detect → "End" → Confirm
```

### Design Constraints

- **Viewport**: Mobile-first, 375x667 (iPhone SE)
- **Touch targets**: Minimum 44x44px
- **Thumb zone**: Primary actions in bottom 2/3
- **Colors**: Green (#22C55E) = complete, Red (#EF4444) = incomplete, Blue (#3B82F6) = location

### Prototype Directions

| Prototype | Direction | Description |
|-----------|-----------|-------------|
| A | Map-Centric | Map 80% of viewport, floating overlays, bottom sheet details |
| B | Dashboard-First | Progress/gamification home, card-based UI, map via nav |
| C | List-Focused | Trail list primary, inline toggles, dense info, power-user |

### Prototype Checklist

#### Phase 0: UI Prototyping
- [x] Create `UI-SPEC.md` with full design spec
- [x] Create `prototypes/` directory structure
- [x] **Prototype A: Map-Centric**
  - [x] index.html (entry/dashboard)
  - [x] progress.html (progress view)
  - [x] trails.html (trail list)
  - [x] trail-detail.html (single trail)
- [x] **Prototype B: Dashboard-First**
  - [x] index.html
  - [x] map.html
  - [x] trails.html
  - [x] trail-detail.html
- [x] **Prototype C: List-Focused**
  - [x] index.html
  - [x] map.html
  - [x] trail-detail.html
  - [x] settings.html
- [x] Review prototypes and select direction
- [x] Document chosen design in UI-SPEC.md

**Selected: Prototype B (Dashboard-First)** - Progress/gamification as home screen, card-based UI, bottom tab navigation.

---

### ✅ CURRENT STATE: Phase 1 MVP Complete

**Status:** Phase 1 MVP implementation complete with 32 passing tests.

**What's Working:**
- Progress Dashboard with animated progress ring
- Trail list with search and filtering
- Map view with trail polylines (green=complete, red=incomplete)
- Completion modal with date picker and notes
- PWA configured with service worker and offline caching
- IndexedDB for persistent offline storage

**Next:** Phase 2 (GPS Tracking) or Phase 3 (Enhanced Offline)

---

### Prototype Technical Requirements
- Tailwind CSS via CDN (no build step)
- Mobile viewport meta tag
- Static gray placeholder for map areas
- Mock data: 5-10 sample trails
- Interactive: button states, modal open/close

---

## Implementation Checklist

### Phase 1: MVP

#### 1.1 Project Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS (v4 with Vite plugin, custom theme colors)
- [x] Set up React Router v6 (Layout + 4 pages: Progress, Map, Trails, Settings)
- [x] Configure vite-plugin-pwa (manifest, service worker, offline caching)
- [x] Set up Vitest for testing (with React Testing Library)
- [x] Configure path aliases (`@/`)

#### 1.2 Trail Data
- [x] Create sample trail data for development (8 trails, ~20 miles)
- [x] Download BRATTS Redlining Workbook and extract trail names/distances
- [x] Generate production `trails.json` with 61 trails, 70.45 miles
- [ ] Refine trail coordinates with GPX data (moved to Phase 2)

#### 1.3 Database Layer
- [x] Set up Dexie.js database (`src/services/database/db.ts`)
- [x] Define Completion table schema
- [x] Write tests for database operations
- [x] Implement CRUD operations

#### 1.4 Core Hooks
- [x] `useTrails` - load static trail data
  - [x] Write tests
  - [x] Implement hook
- [x] `useCompletions` - CRUD for completions
  - [x] Write tests
  - [x] Implement hook
- [x] `useProgress` - derived statistics
  - [x] Write tests
  - [x] Implement hook

#### 1.5 Map View
- [x] `TrailMap` - MapLibre + OpenFreeMap container
  - [x] Write tests
  - [x] Implement component
- [x] `TrailLayer` - trail polylines (green/red) - integrated into TrailMap
  - [x] Write tests
  - [x] Implement component
- [ ] `TrailPopup` - trail info on click (deferred to Phase 2)

#### 1.6 Manual Entry
- [x] `CompletionModal` - completion modal
  - [x] Write tests (6 tests)
  - [x] Implement component
- [x] Date picker for completion date
- [x] Notes field
- [ ] Undo/remove completion (deferred)

#### 1.7 Progress Dashboard
- [x] `ProgressDashboard` - layout container
- [x] Completion percentage display (with progress ring)
- [x] Total miles hiked
- [x] Recent completions list
- [x] Remaining trails count
- [x] Stats cards row

#### 1.8 Navigation & Layout
- [x] `Header` component (in Layout.tsx)
- [x] `Navigation` - bottom tabs (BottomNav.tsx)
- [x] Route setup (`/map`, `/progress`, `/trails`, `/settings`)
- [ ] `OfflineIndicator` component (deferred to Phase 3)

#### 1.9 PWA Configuration
- [x] Create app icons (SVG placeholders)
- [x] Configure `manifest.json` (in vite.config.ts)
- [x] Set up service worker caching (workbox configured)
- [ ] Test offline app shell (requires deployment)
- [ ] Test install prompt (requires deployment)

---

### Phase 2: GPS Tracking

#### 2.0 Detailed Trail Coordinates
- [x] Query OpenStreetMap Overpass API for Belknap Range trails
- [x] Cross-reference OSM trails with BRATTS trail names (48/61 matched)
- [x] Create `scripts/match-osm-trails.js` conversion script
- [x] Update `trails.json` with 3,541 real coordinate points
- [ ] Manually add remaining 13 unmatched trails (optional refinement)

#### 2.1 Geolocation
- [x] `useGeolocation` hook
  - [x] Write tests (8 tests with mocked geolocation)
  - [x] Implement with configurable throttle (default 5s)
  - [x] Handle permission denied
  - [x] Handle GPS errors gracefully

#### 2.2 Live Position Display
- [x] User location marker on map (blue pulsing dot)
- [x] Accuracy circle visualization (translucent blue)
- [x] Center-on-user button (flyTo animation)
- [x] Toggle tracking button with active state
- [x] Error message display

#### 2.3 Track Recording
- [x] GPSTrack table in Dexie (version 2 migration)
- [x] Start/stop/cancel recording controls
- [x] Store points with timestamps and accuracy
- [x] Display recorded track on map (orange line)
- [x] Live distance calculation (Haversine formula)
- [x] Recording status indicator

#### 2.4 Trail Detection
- [x] `trailMatcher` service (11 tests)
  - [x] Turf.js for spatial operations
  - [x] 50m buffer around GPS track
  - [x] 80% coverage threshold for completion
  - [x] Sample points along trail for accuracy
- [x] `calculateCoverage` - trail coverage percentage
- [x] `findMatchingTrails` - find trails matching track
- [x] `trailMatcher` - current trail + completed trails

#### 2.5 Auto-Completion
- [x] `useTrailDetection` hook for real-time trail matching
- [x] Current trail indicator while recording (name + coverage %)
- [x] Detect newly completed trails when recording stops
- [x] Completion confirmation modal with trail list
- [x] Mark trails as completed (manualEntry: false)

#### 2.6 Battery Optimization
- [ ] Throttle to 5s intervals
- [ ] Skip if moved < 5m
- [ ] Balanced accuracy mode
- [ ] Battery usage testing

---

### Phase 3: Full Offline + Polish

#### 3.1 PMTiles Offline Maps
- [ ] Generate Belknap Range PMTiles extract
- [ ] Configure PMTiles protocol in MapLibre
- [ ] Bundle tiles with app (or download option)
- [ ] Test fully offline map display

#### 3.2 Export/Import
- [ ] Export completions to JSON
- [ ] Export to CSV format
- [ ] Import from JSON backup
- [ ] Data validation on import

#### 3.3 Enhanced Statistics
- [ ] Progress over time chart
- [ ] Filter by difficulty
- [ ] Filter by area
- [ ] Timeline view of completions

#### 3.4 Performance
- [ ] Bundle size optimization
- [ ] Lazy load routes
- [ ] Image optimization
- [ ] Lighthouse audit (target: 90+)

---

### Phase 4: Future Enhancements
- [ ] Social features
- [ ] Photo attachments
- [ ] Weather integration
- [ ] Trail condition reports
- [ ] BRATTS patch application helper

---

## Key Implementation Details

### OpenFreeMap Setup
```typescript
// No API key needed
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
```

### Trail Detection Algorithm (Phase 2)
```
1. Create 50m buffer around user's GPS track
2. For each trail, sample points along its path
3. Count what % of trail points fall within buffer
4. If coverage >= 80%, mark trail as complete
```

### Offline Strategy
- **App shell**: Precached at install (HTML/CSS/JS/icons)
- **Trail data**: Precached at install (~200KB JSON)
- **Map tiles**: CacheFirst with 30-day expiration
- **PMTiles**: Full offline tiles bundled in app (Phase 3)
- **User data**: IndexedDB (persists automatically)

### Battery Optimization (Phase 2)
- Throttle GPS to 5-second intervals
- Skip recording if moved < 5m
- Use balanced accuracy until on-trail detected

---

## Files to Create (Phase 1 MVP)

| File | Status | Purpose |
|------|--------|---------|
| `vite.config.ts` | [ ] | Vite + PWA + path aliases |
| `src/main.tsx` | [ ] | App entry with React Router |
| `src/App.tsx` | [ ] | Router setup, layout |
| `src/services/database/db.ts` | [ ] | Dexie database setup |
| `src/data/trails.json` | [ ] | Trail definitions (70.5 miles) |
| `src/hooks/useTrails.ts` | [ ] | Load static trail data |
| `src/hooks/useCompletions.ts` | [ ] | CRUD for completions |
| `src/hooks/useProgress.ts` | [ ] | Derived statistics |
| `src/components/map/TrailMap.tsx` | [ ] | MapLibre + OpenFreeMap |
| `src/components/map/TrailLayer.tsx` | [ ] | Trail polylines |
| `src/components/trails/TrailDetail.tsx` | [ ] | Manual entry modal |
| `src/pages/MapPage.tsx` | [ ] | Main map view |
| `src/pages/ProgressPage.tsx` | [ ] | Dashboard |
| `src/pages/TrailsPage.tsx` | [ ] | Filterable trail list |
| `public/manifest.json` | [ ] | PWA manifest |

---

## Progress Log

| Date | Change | Status |
|------|--------|--------|
| 2024-12-20 | Created devcontainer config (Dockerfile, docker-compose, devcontainer.json) | Done |
| 2024-12-20 | Created PLAN.md with full implementation checklist | Done |
| 2024-12-20 | Created AGENTS.md with TDD/devcontainer rules | Done |
| 2024-12-20 | Added UI Prototyping section to PLAN.md | Done |
| 2024-12-20 | Added cross-references between docs for agent context | Done |
| 2024-12-20 | Verified devcontainer builds and runs correctly | Done |
| 2025-12-20 | Created UI-SPEC.md with design spec, color system, components | Done |
| 2025-12-20 | Built 3 HTML/Tailwind prototypes (A: Map-Centric, B: Dashboard-First, C: List-Focused) | Done |
| 2025-12-20 | Selected Prototype B (Dashboard-First) as design direction | Done |
| 2025-12-20 | Phase 1.1: Project setup complete (Vite, Tailwind, Router, PWA, Vitest, paths) | Done |
| 2025-12-20 | Phase 1.2-1.4: Trail data, database, and core hooks complete (24 tests passing) | Done |
| 2025-12-20 | Phase 1.7-1.8: Progress Dashboard and Trails List pages complete | Done |
| 2025-12-20 | Phase 1.5: TrailMap with MapLibre + OpenFreeMap | Done |
| 2025-12-20 | Phase 1.6: CompletionModal with date picker and notes | Done |
| 2025-12-20 | Phase 1.9: PWA icons and manifest configured | Done |
| 2025-12-20 | **Phase 1 MVP Complete** (32 tests passing) | Done |

<!-- Update this log after each work session -->
