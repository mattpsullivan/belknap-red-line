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

### ✅ CURRENT STATE: Phase 7 In Progress

**Status:** Phase 5 complete. Phase 7 (Capacitor Native Wrapper) in progress on `feature/capacitor-native` branch.

**What's Working:**
- Progress Dashboard with animated progress ring
- Trail list with search, difficulty, and area filtering
- Map view with trail polylines (**red=complete "red-lined"**, gray=incomplete)
- **Trail tap/click popup** with info and mark complete button
- Completion modal with date picker and notes
- PWA configured with service worker and offline caching
- IndexedDB for persistent offline storage
- Real trail coordinates from OpenStreetMap (48/61 trails with GPS data)
- Live GPS tracking with accuracy circle and pulsing marker
- Track recording with start/stop/cancel and distance display
- Trail detection using Turf.js (50m buffer, 80% coverage threshold)
- Auto-completion when GPS track matches trails
- Battery optimization (5s throttle, 5m minimum distance filter)
- PMTiles provider for offline map tiles
- Offline mode toggle in Settings
- Track history UI (list view, detail page with map and stats)
- BRATTS Redline CSV export (workbook format with progress summary)
- JSON import/export (backup, restore, validation, clear data)
- Progress over time chart (monthly bar chart with cumulative progress)
- Timeline view (dedicated page showing all completions chronologically)
- Lazy loading (code-split pages for faster initial load)
- Optimized bundles (vendor chunks for caching)
- **TrailDetailPage** (/trails/:id) with stats, completion history, nearby trails
- **Progress by Area** section on ProgressPage
- **12 pre-built loops** with LoopsPage and LoopDetailPage
- **Connected trails** detection (100m endpoint threshold)
- **Area badges** on trail cards
- **Elevation Profile** component with SVG chart on TrailDetailPage
- **Elevation data** enriched for all trail coordinates
- **Elevation stats** (gain, loss, min, max) per trail

**Next:** Phase 6 Future Enhancements (optional: elevation in map popup, elevation filter)

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
- [x] Throttle to 5s intervals (default throttleMs in useGeolocation)
- [x] Skip if moved < 5m (minDistanceMeters option with Haversine distance)
- [x] Balanced accuracy mode (enableHighAccuracy option)
- [ ] Battery usage testing (requires real device)

---

### Phase 3: Full Offline + Polish

#### 3.1 PMTiles Offline Maps ✅
- [x] Configure PMTiles protocol in MapLibre (PMTilesProvider.tsx)
- [x] Add offline mode toggle in Settings
- [x] Bundle PMTiles file (1.7MB belknap-range.pmtiles)
- [x] Add PMTilesProvider tests (8 tests)
- [x] Verify build includes tiles correctly
- [x] Remove font dependency (protomaps basemaps only uses fill/line layers, no text)

#### 3.2 Trail Coordinate Improvement
- [x] Analyze trail data quality (59 trails, 67.65 miles)
- [x] Fix duplicate trail entries (removed Brook Trail, Blue Trail duplicates)
- [x] Assign unique IDs to Yellow Trail variants
- [x] Import GPX files from AllTrails (15 hike recordings)
- [x] Create import script to match GPX segments to trails
- [x] Improve Yellow Trail (Rowe) coordinates (15 → 89 points)
- [ ] Continue improving sparse trails from GPX data

#### 3.3 Export/Import ✅
- [x] Export completions to JSON (raw data backup)
- [x] Export Redline Report to CSV (BRATTS workbook format)
- [x] Download official BRATTS workbook (data/Belknap_Range_Redlining_2023v1.xls)
- [x] Import from JSON backup (completionImport service, 19 tests)
- [x] Data validation on import (trail ID validation, date parsing, type checking)
- [x] Clear all data functionality with confirmation

#### 3.4 Enhanced Statistics ✅
- [x] Progress over time chart (monthly bar chart with cumulative progress)
- [x] Filter by difficulty (already existed)
- [x] Filter by area (dropdown with 8 mountain areas)
- [x] Timeline view of completions (dedicated page at /timeline)

#### 3.5 Performance ✅
- [x] Bundle size optimization (manual chunks for vendors)
- [x] Lazy load routes (React.lazy + Suspense for all pages)
- [x] Bundle analysis: Initial 29KB gzip, pages 1-4KB each
- [ ] Image optimization (not needed - SVG icons only)
- [ ] Lighthouse audit (requires deployment)

---

### Phase 4: User Feedback Implementation (Complete)

#### 4.1 Phase 1 Quick Wins ✅
- [x] Swap trail colors (completed=red "red-lined", incomplete=gray)
- [x] Add area badges to trail cards in TrailsPage

#### 4.2 Phase 2 Core Enhancements ✅
- [x] Trail tap/click on map with info popup
- [x] TrailDetailPage (/trails/:id) with stats, history, nearby trails
- [x] Progress by Area section on ProgressPage

#### 4.3 Phase 3 Trip Planning ✅
- [x] Pre-built loops/itineraries data (12 loops in loops.json)
- [x] LoopsPage with filtering and LoopDetailPage
- [x] useLoops hook with completion tracking
- [x] Connected trails detection (100m endpoint threshold)
- [x] "Connects To" section on TrailDetailPage

---

### Phase 5: Elevation Data Enhancement

#### 5.1 Data Acquisition
- [ ] Download USGS NED 1/3 arc-second tiles for Belknap Range
  - Bounding box: ~43.4°N to 43.6°N, -71.5°W to -71.2°W
  - Source: https://apps.nationalmap.gov/downloader/
  - Format: Cloud Optimized GeoTIFF (COG)
  - Resolution: ~10m

#### 5.2 Processing Scripts ✅
- [x] Create `scripts/enrich-elevation.py` (local DEM processing)
  - Use rasterio to read NED GeoTIFF
  - Sample elevation at each trail coordinate
  - Calculate elevation gain/loss per trail
  - Support multiple tiles (auto-merge)
- [x] Create `scripts/enrich-elevation-api.py` (API fallback)
  - Use Open Topo Data API
  - Rate limiting (100 locations/req, 1 req/sec)
  - Multiple datasets (ned10m, srtm30m, etc.)
- [x] Create `scripts/requirements.txt` (Python dependencies)
- [x] Create `scripts/README.md` (documentation)

#### 5.3 Data Schema Update ✅
- [x] Update Trail type to include elevation per coordinate
  ```typescript
  interface Coordinate {
    lat: number
    lng: number
    elevation?: number  // feet
  }

  interface Trail {
    // ... existing fields
    elevationGain: number   // total feet gained
    elevationLoss: number   // total feet lost
    elevationMin: number    // lowest point in feet
    elevationMax: number    // highest point in feet
    coordinates: Coordinate[]
  }
  ```
- [x] Export Coordinate type from types/index.ts
- [x] Enrich trails.json with elevation data (all coordinates + summary stats)

#### 5.4 Elevation Profile Component ✅
- [x] Create `ElevationProfile` component (6 tests)
  - SVG-based chart showing elevation vs distance
  - Min/max elevation markers (red dot for min, green dot for max)
  - Gradient fill under line
  - Elevation gain/loss stats display
  - Graceful handling of missing elevation data
- [x] Add to TrailDetailPage
  - Show profile between stats grid and mini map
  - Stats grid already shows elevationGain

#### 5.5 Integration ✅
- [x] ElevationProfile integrated into TrailDetailPage
- [x] Create fix-missing-elevation.cjs script for API-based enrichment
- [ ] Add elevation to trail popup on map (optional)
- [ ] Add elevation filter to TrailsPage (optional)

**Estimated Data Impact:**
- Current trails.json: ~200KB
- With elevation: ~250KB (+25%)
- Acceptable for offline PWA

**Alternative: Runtime API (Not Recommended)**
If pre-processing isn't feasible, use Open Topo Data API:
```
GET https://api.opentopodata.org/v1/ned10m?locations=43.52,-71.34
```
Drawback: Requires network, breaks offline-first design.

---

### Phase 6: Future Enhancements
- [ ] Social features
- [ ] Photo attachments
- [ ] Weather integration
- [ ] Trail condition reports
- [ ] BRATTS patch application helper
- [ ] Track replay animation (playback recorded hikes on map)
- [ ] Side-by-side track comparison (compare multiple hikes)
- [ ] Export tracks to GPX format

---

### Phase 7: Capacitor Native Wrapper (Background GPS)

> **Design Doc:** `docs/design/capacitor-native-wrapper.md`
> **Branch:** `feature/capacitor-native`
> **Goal:** Enable GPS recording while phone is locked during hikes

#### 7.1 Capacitor Core Setup
- [ ] Install Capacitor core dependencies
  ```bash
  npm install @capacitor/core
  npm install -D @capacitor/cli
  ```
- [ ] Initialize Capacitor configuration
  ```bash
  npx cap init "Belknap Tracker" "com.belknaptracker.app"
  ```
- [ ] Configure `capacitor.config.ts`
  - Set `webDir: 'dist'`
  - Set `android.useLegacyBridge: true` (required for background plugin)
- [ ] Add Android platform
  ```bash
  npm install @capacitor/android
  npx cap add android
  ```
- [ ] Add iOS platform
  ```bash
  npm install @capacitor/ios
  npx cap add ios
  ```
- [ ] Verify web build works with Capacitor
  ```bash
  npm run build && npx cap sync
  ```

#### 7.2 Background Geolocation Plugin
- [ ] Install @capgo/background-geolocation plugin
  ```bash
  npm install @capgo/background-geolocation
  npx cap sync
  ```
- [ ] Configure iOS permissions (Info.plist)
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription`
  - `UIBackgroundModes` with `location`
- [ ] Configure Android permissions (AndroidManifest.xml)
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_COARSE_LOCATION`
  - `ACCESS_BACKGROUND_LOCATION`
  - `FOREGROUND_SERVICE`
  - `POST_NOTIFICATIONS` (Android 13+)
- [ ] Test plugin loads without errors

#### 7.3 Geolocation Abstraction Layer
- [ ] Create `src/services/geolocation/types.ts`
  - `GeoPosition` interface
  - `GeolocationProvider` interface
  - `GeolocationError` types
- [ ] Create `src/services/geolocation/webProvider.ts`
  - Wrap `navigator.geolocation.watchPosition`
  - Match provider interface
- [ ] Create `src/services/geolocation/nativeProvider.ts`
  - Wrap `@capgo/background-geolocation`
  - Match provider interface
  - Configure notification text/appearance
- [ ] Create `src/services/geolocation/index.ts`
  - Factory function using `Capacitor.isNativePlatform()`
  - Export unified interface
- [ ] Write tests for abstraction layer
  - Mock Capacitor platform detection
  - Test web provider
  - Test native provider interface

#### 7.4 Hook Integration
- [ ] Refactor `useGeolocation.ts` to use provider factory
  - Remove direct `navigator.geolocation` calls
  - Use async provider API
  - Preserve throttle/distance filtering logic
- [ ] Update `useTrackRecording.ts` if needed
  - Ensure works with async geolocation provider
- [ ] Verify existing tests still pass
- [ ] Add tests for native code path (mocked)

#### 7.5 App Assets & Branding
- [ ] Install capacitor-assets tool
  ```bash
  npm install -D @capacitor/assets
  ```
- [ ] Create source assets in `resources/`
  - `icon.png` (1024x1024 master icon)
  - `splash.png` (2732x2732 splash screen)
  - `icon-foreground.png` (adaptive icon, optional)
- [ ] Generate platform assets
  ```bash
  npx capacitor-assets generate --iconBackgroundColor '#3B82F6'
  ```
- [ ] Verify icons appear correctly in both platforms

#### 7.6 Privacy Policy & Compliance
- [ ] Create `docs/privacy-policy.md` with required content
  - Data collection (GPS during active recording)
  - Data storage (local only, no server)
  - Data deletion (Settings → Clear All Data)
  - Contact information
- [ ] Add `/privacy` route to app (optional, or host externally)
- [ ] Prepare background location justification text for App Store

#### 7.7 Build Scripts & Workflow
- [ ] Add npm scripts to package.json:
  ```json
  {
    "cap:sync": "npx cap sync",
    "cap:android": "npm run build && npx cap sync && npx cap open android",
    "cap:ios": "npm run build && npx cap sync && npx cap open ios",
    "cap:run:android": "npm run build && npx cap sync && npx cap run android",
    "cap:run:ios": "npm run build && npx cap sync && npx cap run ios"
  }
  ```
- [ ] Update `.gitignore` for native projects
  - `android/app/build/`
  - `ios/App/Pods/`
  - `ios/App/build/`
- [ ] Document build workflow in README or CONTRIBUTING.md

#### 7.8 Testing & Verification
- [ ] Test on Android device/emulator
  - Verify app launches
  - Test foreground GPS tracking
  - Test background GPS (lock screen)
  - Verify notification appears during background tracking
- [ ] Test on iOS device/simulator
  - Verify app launches
  - Test foreground GPS tracking
  - Test background GPS (lock screen)
  - Test "Always Allow" permission flow
- [ ] Test web PWA still works (regression)
- [ ] Battery usage testing (extended recording session)

#### 7.9 App Store Preparation (Optional)
- [ ] iOS App Store Connect
  - Create app listing
  - Upload screenshots
  - Write description, keywords
  - Configure privacy questions
  - TestFlight internal testing
- [ ] Google Play Console
  - Create app listing
  - Upload screenshots
  - Write description
  - Complete content rating questionnaire
  - Internal testing track
- [ ] Submit for review (when ready)

**Dependencies:**
- Capacitor v6+ (latest stable)
- @capgo/background-geolocation (latest)
- @capacitor/assets (dev dependency)

**Estimated Effort:**
- Phase 7.1-7.4: Core implementation (~1-2 days)
- Phase 7.5-7.6: Assets & compliance (~0.5 day)
- Phase 7.7-7.8: Build & testing (~1 day)
- Phase 7.9: App Store submission (~1-2 days, mostly waiting)

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
| 2025-12-20 | Created devcontainer config (Dockerfile, docker-compose, devcontainer.json) | Done |
| 2025-12-20 | Created PLAN.md with full implementation checklist | Done |
| 2025-12-20 | Created AGENTS.md with TDD/devcontainer rules | Done |
| 2025-12-20 | Added UI Prototyping section to PLAN.md | Done |
| 2025-12-20 | Added cross-references between docs for agent context | Done |
| 2025-12-20 | Verified devcontainer builds and runs correctly | Done |
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
| 2025-12-21 | Phase 2.0: Real trail coordinates from OSM (48/61 trails matched) | Done |
| 2025-12-21 | Phase 2.1-2.2: useGeolocation hook with live position display | Done |
| 2025-12-21 | Phase 2.3: Track recording with start/stop/cancel | Done |
| 2025-12-21 | Phase 2.4: Trail detection with Turf.js (11 tests) | Done |
| 2025-12-21 | Phase 2.5: Auto-completion with confirmation modal | Done |
| 2025-12-21 | Phase 2.6: Battery optimization (throttle + distance filter) | Done |
| 2025-12-21 | **Phase 2 GPS Tracking Complete** (59 tests passing) | Done |
| 2025-12-21 | Phase 3.1: PMTiles provider and offline mode toggle | Done |
| 2025-12-21 | Phase 3.1: PMTiles testing complete (67 tests total) | Done |
| 2025-12-21 | **Phase 3.1 PMTiles Complete** - fully offline maps working | Done |
| 2025-12-21 | Phase 3.2: Fix duplicate trails, improve coordinates from GPX | Done |
| 2025-12-21 | feat: Track History UI with list and detail views (72 tests) | Done |
| 2025-12-21 | feat: BRATTS Redline CSV export with progress display | Done |
| 2025-12-21 | feat: JSON import/export with validation and clear data (91 tests) | Done |
| 2025-12-21 | **Phase 3.3 Export/Import Complete** | Done |
| 2025-12-21 | feat: Area filter dropdown, progress chart, timeline view | Done |
| 2025-12-21 | **Phase 3.4 Enhanced Statistics Complete** | Done |
| 2025-12-21 | feat: Lazy loading routes, optimized vendor chunks | Done |
| 2025-12-21 | **Phase 3.5 Performance Complete** | Done |
| 2025-12-21 | **PHASE 3 COMPLETE** - Full offline + polish (91 tests) | Done |
| 2025-12-21 | Phase 4.1: Red-line colors, area badges | Done |
| 2025-12-21 | Phase 4.2: Trail popup, TrailDetailPage, Progress by Area | Done |
| 2025-12-21 | Phase 4.3: Loops data, LoopsPage, connected trails | Done |
| 2025-12-21 | **PHASE 4 COMPLETE** - User feedback implementation (91 tests) | Done |
| 2025-12-21 | Research: Elevation data sources (USGS NED, Open Topo Data) | Done |
| 2025-12-21 | Plan: Phase 5 Elevation Data Enhancement | Done |
| 2025-12-21 | Phase 5.2: Elevation enrichment scripts (local DEM + API fallback) | Done |
| 2025-12-22 | Phase 5.3: Data schema update (Coordinate type, Trail elevation fields) | Done |
| 2025-12-22 | Phase 5.4: ElevationProfile component with SVG chart (6 tests) | Done |
| 2025-12-22 | Phase 5.5: Integrate ElevationProfile into TrailDetailPage | Done |
| 2025-12-22 | Enrich trails.json with elevation data for all coordinates | Done |
| 2025-12-22 | **PHASE 5 CORE COMPLETE** - Elevation profile integrated (97 tests) | Done |
| 2026-01-04 | Phase 7: Created design doc for Capacitor native wrapper | Done |
| 2026-01-04 | Phase 7: Added detailed checklist to PLAN.md | Done |
| 2026-01-04 | Phase 7: Created `feature/capacitor-native` branch | In Progress |

<!-- Update this log after each work session -->
