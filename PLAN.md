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
- [ ] Review prototypes and select direction
- [ ] Document chosen design in UI-SPEC.md

---

### ⏸️ CURRENT STATE: Awaiting Prototype Review

**Status:** Phase 0 prototypes complete. Waiting for user feedback before proceeding.

**Action Required:** Review the 3 prototype directions and provide feedback:

| Prototype | Path | Description |
|-----------|------|-------------|
| A | `prototypes/a-map-centric/index.html` | Map dominates viewport, bottom sheet for trails, floating progress pill |
| B | `prototypes/b-dashboard-first/index.html` | Progress/gamification home screen, bottom tab navigation, card-based UI |
| C | `prototypes/c-list-focused/index.html` | Compact table layout, inline checkboxes, power-user focused |

**Feedback needed:**
1. Which prototype direction do you prefer? (A, B, C, or hybrid)
2. What elements work well that should be kept?
3. What elements don't work or should be changed?
4. Any other UI/UX preferences?

**Next steps after feedback:**
1. Document chosen design direction in UI-SPEC.md
2. Proceed to Phase 1: MVP implementation

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
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up React Router v6
- [ ] Configure vite-plugin-pwa
- [ ] Set up Vitest for testing
- [ ] Configure path aliases (`@/`)

#### 1.2 Trail Data
- [ ] Download BRATTS Redlining Workbook
- [ ] Download Trailforks GPX for Belknap Range
- [ ] Create data conversion script
- [ ] Generate `src/data/trails.json`
- [ ] Validate trail data completeness

#### 1.3 Database Layer
- [ ] Set up Dexie.js database (`src/services/database/db.ts`)
- [ ] Define Completion table schema
- [ ] Write tests for database operations
- [ ] Implement CRUD operations

#### 1.4 Core Hooks
- [ ] `useTrails` - load static trail data
  - [ ] Write tests
  - [ ] Implement hook
- [ ] `useCompletions` - CRUD for completions
  - [ ] Write tests
  - [ ] Implement hook
- [ ] `useProgress` - derived statistics
  - [ ] Write tests
  - [ ] Implement hook

#### 1.5 Map View
- [ ] `TrailMap` - MapLibre + OpenFreeMap container
  - [ ] Write tests
  - [ ] Implement component
- [ ] `TrailLayer` - trail polylines (green/red)
  - [ ] Write tests
  - [ ] Implement component
- [ ] `TrailPopup` - trail info on click
  - [ ] Write tests
  - [ ] Implement component

#### 1.6 Manual Entry
- [ ] `TrailDetail` - completion modal
  - [ ] Write tests
  - [ ] Implement component
- [ ] Date picker for completion date
- [ ] Notes field
- [ ] Undo/remove completion

#### 1.7 Progress Dashboard
- [ ] `ProgressDashboard` - layout container
- [ ] Completion percentage display
- [ ] Total miles hiked
- [ ] Recent completions list
- [ ] Remaining trails count

#### 1.8 Navigation & Layout
- [ ] `Header` component
- [ ] `Navigation` - bottom tabs
- [ ] Route setup (`/map`, `/progress`, `/trails`)
- [ ] `OfflineIndicator` component

#### 1.9 PWA Configuration
- [ ] Create app icons (192x192, 512x512, maskable)
- [ ] Configure `manifest.json`
- [ ] Set up service worker caching
- [ ] Test offline app shell
- [ ] Test install prompt

---

### Phase 2: GPS Tracking

#### 2.1 Geolocation
- [ ] `useGeolocation` hook
  - [ ] Write tests (with mocked geolocation)
  - [ ] Implement with 5s throttle
  - [ ] Handle permission denied
  - [ ] Handle GPS errors gracefully

#### 2.2 Live Position Display
- [ ] User location marker on map
- [ ] Accuracy circle visualization
- [ ] Center-on-user button

#### 2.3 Track Recording
- [ ] GPSTrack table in Dexie
- [ ] Start/stop tracking controls
- [ ] Store points with timestamps
- [ ] Display recorded track on map

#### 2.4 Trail Detection
- [ ] `trailMatcher` service
  - [ ] Write tests with sample data
  - [ ] Implement 50m buffer algorithm
  - [ ] Implement 80% coverage check
- [ ] Real-time "current trail" detection
- [ ] Coverage progress indicator

#### 2.5 Auto-Completion
- [ ] Detect completed trails from track
- [ ] Prompt user to confirm completion
- [ ] Link completion to track record
- [ ] Show detection confidence

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

<!-- Update this log after each work session -->
