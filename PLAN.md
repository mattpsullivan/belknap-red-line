# Belknap Red-Line Tracker - Implementation Plan

> **Agents:** Read [`docs/developer/getting-started.md`](./docs/developer/getting-started.md) first for setup and workflow rules (TDD, plan tracking).

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
| Framework | React 19 + TypeScript + Vite | Fast dev, good PWA support |
| Routing | React Router v7 | URL-based navigation, browser back button |
| Maps | MapLibre GL JS + react-map-gl | Vector tiles (smaller), WebGL, open-source |
| Map Tiles | **OpenFreeMap** | Unlimited free, no API key needed |
| Offline Tiles | PMTiles (Phase 3) | Single-file format, native MapLibre support |
| Storage | Dexie.js (IndexedDB) | Async API, service worker compatible, reactive hooks |
| PWA | vite-plugin-pwa + Workbox | Zero-config, automatic caching |
| Geo Utils | Turf.js | Trail detection algorithm |
| Styling | Tailwind CSS v4 | Rapid UI development |
| Native | Capacitor (Android) | Background GPS + sideload/Obtainium distribution |
| Testing | Vitest + React Testing Library | State-based sociable tests, no mock framework (Nullables) |

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

### ✅ CURRENT STATE: native + branded; background-GPS fix awaiting device test

**Status:** Phases 1-5 complete. Phase 7 (Capacitor Native Wrapper) merged to
`main`, with brand identity (icon/theme/splash + consolidated palette) and the
background-GPS detect/prevent work (stall banner + buzz, setup gate) merged on
2026-06-13. The one remaining gate on the app's core value is a real screen-off
device walk to confirm background recording (Phase 7.10). Distribution pipeline
(GitHub Releases + Obtainium) in place; one-time manual setup remains (see
`docs/adr/001-private-release-distribution.md`). 161 tests pass, lint clean.

> **2026-06-30 data-quality audit:** a map-overlay pass against the Bosworth
> reference map found `trails.json` has duplicated and mislocated trail
> geometry (the automated checks only look at point counts and ids, not
> coordinates). Feature code is solid; the trail *data* needs cleanup. See
> Phase 8 and [`docs/trail-validation.md`](./docs/trail-validation.md).

> **2026-06-13 correction:** the original Phase 7 commit added a native
> geolocation provider written against an `@capgo/background-geolocation` API
> the installed v8 plugin does not expose (`addListener` / `checkPermissions` /
> invented `start()` options). It never compiled, so background GPS was dead.
> It has been ported to the real v8 callback API, with `@capacitor/geolocation`
> added for permission queries and a James-Shore-style Nullable infrastructure
> wrapper so the provider is tested without mocks. The boxes below were
> previously checked optimistically; they now reflect compiling, tested code.

**What's Working:**
- Progress Dashboard with animated progress ring
- Trail list with search, difficulty, and area filtering
- Map view with trail polylines (**red=complete "red-lined"**, gray=incomplete)
- **Trail tap/click popup** with info and mark complete button
- Completion modal with date picker and notes
- PWA configured with service worker and offline caching
- IndexedDB for persistent offline storage
- Real trail coordinates for 59 trails (OSM + GPX; geometry cleanup pending, see Phase 8)
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
- **Native background GPS** via @capgo/background-geolocation v8 (Nullable-tested provider)
- **Historical POI markers** from the Belknap Range Trails map (HR placed; six awaiting georeference)
- **Trail validation helpers** (sparse / missing-elevation / duplicate-id checks; data currently clean)
- **Release pipeline** - signed APK via GitHub Actions on a tag, for Obtainium
- **Brand identity** - SVG icon traced to the reference art, navy theme, branded
  splash; all colors consolidated into `src/config/palette.ts` (single source of
  truth) for white-labeling. SVG recolors from the palette (`scripts/recolor-icon.mjs`).
- **Safety tab** - the safety disclaimer promoted from an overlay to its own
  full-size bottom-nav tab
- **Recording-stall detection** - banner + 3-pulse haptic buzz when recording
  but GPS fixes stop (pocketed phone can't see a banner); pure logic tested
- **Background-tracking setup gate** - start-recording modal requiring "Allow all
  the time" + battery-opt off, with an "Open location settings" deep-link

**Next:**
- **[TOP PRIORITY] Validate background GPS on a real device** - see Phase 7.10.
  A real hike (2026-06-13) recorded only 19 points over 2h16m: updates came
  through only while the phone was foreground; every pocketed/screen-locked
  stretch (22/14/96 min gaps) recorded nothing. Root cause found: `@capgo`'s
  "location" alias never requests ACCESS_BACKGROUND_LOCATION. The DETECT side
  (stall banner + haptic buzz) and the PREVENT side (start-recording setup gate
  requiring "Allow all the time" + battery-opt off, with a settings deep-link)
  are now built and merged. **What remains is a real screen-off/pocket walk to
  confirm continuous capture**, then the optional native battery-opt intent and
  foreground-service notification if gaps persist. Emulator can't reproduce
  Doze/pocket, so this needs a device.
- One-time release setup: add GitHub remote, create + back up the release
  keystore, add the four `RELEASE_*` secrets, cut a test tag, install Obtainium
  (`docs/adr/001-private-release-distribution.md`).
- POI georeferencing for the six grid-cell-only features; trail-name cross-check
  against the authoritative map / the 13 unmatched trails (`docs/trail-validation.md`).
- Phase 6 Future Enhancements (optional: elevation in map popup, elevation filter)

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

#### 6.1 Trail Data & Discovery
- [ ] **Add new trails from GPS tracks** - Walk an unmapped trail, save track, create new trail entry
  - Leverage existing OSM way mapper tooling
  - Option to submit new trails back to OSM
  - Support "provisional" trails pending verification
- [ ] **Trail condition reports** - Mark trails as muddy, icy, blocked, etc.

#### 6.2 White Label / Multi-Network Support
- [ ] **White-label architecture** - Support other trail networks beyond Belknap Range
  - Configurable trail data source (JSON file or URL)
  - Customizable branding (colors, app name, icons)
  - Example use cases: other NH hiking areas, local community walking routes
- [ ] **Trail network selector** - Switch between multiple trail datasets
- [ ] **Community walking mode** - Track neighborhood walks, not just hiking trails

#### 6.3 Trail Fixup Tooling Improvements
- [ ] **Offline OSM data download** - Fetch all trails (marked + unmarked) once
  - Cache Overpass API results locally
  - Support incremental updates
- [ ] **Partial mapping persistence** - Save/load incomplete trail mappings
  - Do cleanup at home, continue after field verification
  - Export/import mapping progress
- [ ] **Batch processing mode** - Run tool without web UI for scripting

#### 6.4 Track & Media Features
- [ ] Track replay animation (playback recorded hikes on map)
- [ ] Side-by-side track comparison (compare multiple hikes)
- [ ] Export tracks to GPX format
- [ ] Photo attachments with geolocation
- [ ] BRATTS patch application helper

#### 6.5 Social & External
- [ ] Social features (share completions, leaderboards)
- [ ] Weather integration
- [ ] Trail popularity / recent activity indicators

---

### Phase 7: Capacitor Native Wrapper (Background GPS)

> **Design Doc:** `docs/design/capacitor-native-wrapper.md`
> **Branch:** merged to `main` (was `feature/capacitor-native`)
> **Goal:** Enable GPS recording while phone is locked during hikes

#### 7.1 Capacitor Core Setup
- [x] Install Capacitor core dependencies (`@capacitor/core`, `@capacitor/cli`)
- [x] Initialize Capacitor configuration
- [x] Configure `capacitor.config.ts` (`webDir: 'dist'`, `android.useLegacyBridge: true`)
- [x] Add Android platform
- [x] Add iOS platform
- [x] Web build works with Capacitor (`npm run build && npx cap sync`)

#### 7.2 Background Geolocation Plugin
- [x] Install @capgo/background-geolocation plugin (v8) + @capacitor/geolocation (permissions)
- [ ] Configure iOS permissions (Info.plist) - deferred until iOS build
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription`
  - `UIBackgroundModes` with `location`
- [x] Configure Android permissions (AndroidManifest.xml)
  - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`
- [x] Plugin compiles and APK builds (verified locally: assembleDebug + assembleRelease)

#### 7.3 Geolocation Abstraction Layer
- [x] Create `src/services/geolocation/types.ts`
  - `GeoPosition` / `GeolocationProvider` / `GeolocationError` (error codes as a
    const object, not an enum, for `erasableSyntaxOnly`)
- [x] Create `src/services/geolocation/webProvider.ts` (wraps `navigator.geolocation`)
- [x] Create `src/services/geolocation/nativeProvider.ts`
  - Maps the app interface onto @capgo v8's callback API via the infra wrapper
  - Configures background notification text
- [x] Create `src/services/geolocation/backgroundGeolocationClient.ts`
  - James Shore infrastructure wrapper: real client + `createNull()` with
    configurable responses and output tracking
- [x] Create `src/services/geolocation/index.ts` (factory via `Capacitor.isNativePlatform()`)
- [x] Tests for the abstraction layer - state-based, no mock framework; the
  provider is driven by the null client (nativeProvider.test.ts,
  backgroundGeolocationClient.test.ts)

#### 7.4 Hook Integration
- [x] `useGeolocation.ts` uses the provider factory (no direct `navigator.geolocation`)
  - Async provider API; throttle/distance filtering preserved
- [x] `useTrackRecording.ts` works with the async geolocation provider
- [x] Existing tests still pass
- [ ] De-mock the inherited useGeolocation.test.ts (still uses `vi.mock` for
  Capacitor) per Testing Without Mocks - follow-up

#### 7.5 App Assets & Branding ✅
- [x] `@capacitor/assets` installed
- [x] Source assets in `resources/` - `icon.svg` / `icon-foreground.svg` traced to
  the reference art; recolored from the palette via `scripts/recolor-icon.mjs`,
  rendered to PNG via `scripts/render-icon.mjs`
- [x] Platform icons + adaptive icon generated; navy (`#16314D`) background
- [x] Branded splash (navy + logo + title), no white flash on launch
- [x] All colors consolidated into `src/config/palette.ts` for white-labeling
  (see `docs/branding.md` for the swap-points)
- [x] Verified on the Android emulator

#### 7.6 Privacy Policy & Compliance
- [x] Create `docs/privacy-policy.md` with required content
- [ ] Add `/privacy` route to app (optional, or host externally)
- [ ] Prepare background location justification text (only if a store listing happens)

#### 7.7 Build Scripts & Workflow
- [x] Add `cap:*` npm scripts to package.json
- [x] `.gitignore` covers native build output (`android/app/build/`, `ios/App/build/`, Pods)
- [x] Document build workflow (`docs/adr/001-private-release-distribution.md`,
  `~/belknap-apk/INSTALL.md`)

#### 7.7b Distribution (GitHub Releases + Obtainium)
- [x] Release signing config in `android/app/build.gradle` (gitignored keystore.properties)
- [x] `.github/workflows/release.yml` - signed APK on tag/dispatch -> GitHub Release
- [x] ADR-001 with the manual setup checklist
- [x] Local debug APK staged for sideload testing (`~/belknap-apk/`)
- [ ] One-time: add remote, create + back up keystore, add 4 secrets, cut a test tag, Obtainium + PAT

#### 7.8 Testing & Verification
- [x] Local Android build (assembleDebug + assembleRelease) succeeds
- [ ] Test on Android device: launch, foreground GPS, background GPS (lock screen),
  notification during background tracking - **morning sideload test**
- [ ] Test on iOS device/simulator (deferred - no iOS build yet)
- [x] Web PWA still works (regression: 161 tests pass, lint clean, build green)
- [ ] Battery usage testing (extended recording session, real device)

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

#### 7.10 Fix background GPS tracking (TOP PRIORITY)

**Problem (observed on a real hike, 2026-06-13):** a 2h16m / ~2.7mi hike with
kids recorded only **19 points**. Timestamps cluster into short bursts (points
5-10s apart) separated by long gaps that match when the phone was
pocketed/screen-locked: 22 min, 14 min, then 96 min with nothing. It also kept
recording the drive home (forgot to stop). So updates only arrive while the app
is foreground; background recording does not work in practice. Sample GPX:
`docs/samples/belknap-track-2026-06-13-background-gps-bug.gpx`.

**Root cause (likely):** Android suspends location for the app when backgrounded
unless **ACCESS_BACKGROUND_LOCATION ("Allow all the time")** is granted. The app
only requests foreground location (`@capacitor/geolocation` = "while using"),
**never requests/checks background location**, and gives no indication it's
missing. First-run "While using the app" => frozen when pocketed. Secondary
suspects: Doze / OEM battery optimization; foreground-service not surfaced.

**Validate first (cheap):** set the app's Location to "Allow all the time" +
disable battery optimization, record a 5-min screen-off walk; confirm continuous
capture before building.

**Fix:**
- [x] **Stall detection** (commit b837bc9): warn "Tracking may be paused - no
      GPS fix for Ns" when recording but fixes stop, with a deep-link to the
      app's location settings. Catches the failure regardless of cause. Pure
      logic tested (`recordingHealth.ts`). This DETECTS + guides; the items below
      PREVENT it.
- [x] **Haptic alert**: buzz (3 pulses) on stall + every 20s while stalled - a
      pocketed phone can't show a banner (`@capacitor/haptics`, `haptics.ts`).
      Caveat: only fires while JS runs; deep OS suspension still needs the
      foreground-service/permission fixes below.
- [x] **Setup gate** (start-recording modal): "Keep tracking with your phone
      away" block - requires Location "Allow all the time" + battery optimization
      off, with an "Open location settings" deep-link.
      ROOT CAUSE FOUND: `@capgo`'s "location" permission alias is only
      ACCESS_COARSE/FINE_LOCATION - it NEVER requests ACCESS_BACKGROUND_LOCATION,
      so the app only ever got "While using" => suspended when pocketed. Android
      11+ can't grant background via a dialog (settings redirect only), so the
      gate guides + deep-links rather than prompting.
- [ ] Battery-optimization: direct REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent
      would need a small native plugin; for now the gate's deep-link reaches it
      via app settings.
- [ ] Request battery-optimization exemption (Doze throttles even granted bg).
- [ ] Surface the foreground-service / recording-active state (persistent
      notification) so it's obvious tracking is live with the screen off.
- [ ] Verify recording passes `enableBackground` (TrailMap calls `useGeolocation()`
      with no opts; the native provider forces background via `backgroundMessage`,
      but make the intent explicit).
- [x] **Capture GNSS altitude on recorded points** (2026-07-25, ahead of the
      device walk). Not a background-GPS fix - it makes the walk's track worth
      more, since altitude cannot be backfilled without re-walking. `GeoPosition`
      already carried `altitude`; it was dropped where `TrailMap` built the
      `TrackPoint`. Now stored as `TrackPoint.altitudeEllipsoidM`, raw metres
      above the WGS 84 ellipsoid. Deliberately NOT the same datum as
      `Coordinate.elevation` (feet orthometric, from the DEM), and deliberately
      not fed into `trails.json` - the DEM stays authoritative there, because it
      is ground-referenced and smoother than GNSS vertical. Recorded altitude's
      value is as an independent cross-check: DEM elevation is sampled at the
      coordinates you supply, so it inherits horizontal error amplified by slope,
      which is the very defect Phase 8 exists to fix.
      The geoid correction is applied only at the GPX boundary
      (`BELKNAP_GEOID_HEIGHT_M = -27.1`); see Phase 8.4 for why one constant.
- [x] **Split `<trkseg>` on recording gaps** (2026-07-25). A single `<trkseg>`
      asserts its points are connected, so every consumer draws a straight line
      across a stall and counts it as distance. The 2026-06-13 sample
      (`docs/samples/belknap-track-2026-06-13-background-gps-bug.gpx`) shows why
      that matters: 19 points in one segment, and its 2.68 mi straight-line
      length is close enough to the real ~2.7 mi hike to look fine, while 88.5%
      of that length sits in just two fabricated jumps (one of 1.85 mi across the
      96-minute hole). The export now breaks segments instead. Reference output:
      `docs/samples/belknap-track-export-reference-2026-07-25.gpx`.
- [ ] **Persist real stall intervals on the track** (proper fix for the above).
      `splitOnStall` currently *infers* gaps from stored-point timestamps plus
      displacement, because a gap between stored points is ambiguous:
      `useGeolocation` drops fixes under `minDistanceMeters` (default 5 m), so
      standing still records nothing even while fixes arrive fine. The recorder
      already distinguishes these - it tracks fix liveness separately from point
      storage, which is how the stall banner avoids firing on rest stops - but
      that knowledge is not saved. Persist it (stall intervals on `GPSTrack`, or a
      "first fix after a stall" marker on `TrackPoint`) and the exporter can split
      on fact instead of heuristic. Note the naive approach here is racy:
      `recordingHealth` flips back to 'tracking' as soon as the fix that ended the
      stall lands, so reading status at addPoint time can miss it.
- [ ] Re-test on a real device, screen off, in a pocket (emulator can't
      reproduce Doze/pocket behavior).
      **The 2026-06-13 failure was recorded on a build with NONE of the three
      fixes above.** Discovered 2026-07-25: the APK on the phone was a local
      *debug* build, `1b339b0` ("polish: bigger splash logo"), stamped
      2026-06-13 15:05 UTC - built ~1 hour before that hike started
      (16:06 UTC). Stall detection (b837bc9), haptic buzz (0ac9724) and the setup
      gate (181f4ba) all landed later, so the observed 19-point track says nothing
      about whether they work. The first genuine test of them is the next walk on
      a release build.
- [x] **Debug-signed builds block release updates** (2026-07-25). Obtainium
      reported `failureConflict` updating to v1.0.1. Not the release's fault:
      v1.0.0 and v1.0.1 share a signing cert
      (`fe7a2eef...40f6a63`), package (`com.belknaptracker.app`) and an increasing
      versionCode (127 -> 128). The installed app was the debug build above, signed
      with the *debug* key, so Android refuses an in-place update from a
      release-signed APK. v1.0.0 was therefore never actually installed, which is
      why "verify a future release updates over the top" stayed open.
      **Fix is uninstall then install the release.** Export completions first
      (Settings -> Export Raw Data JSON); there is no bulk track export, only
      per-track GPX. Diagnostic: debug builds SHOW the in-app build stamp,
      release builds hide it (`RELEASE_BUILD=1`, vite.config.ts). A visible stamp
      means it is not a release build. Applies to Kristin's phone too.

Note: robust Android background GPS is genuinely hard (Doze, OEM killers); expect
iteration. This blocks the app's core value (recording hikes to redline trails).

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

### Phase 8: Trail data cleanup (map audit + field re-survey)

The map-overlay audit (`scripts/map-overlay.py --check`) found the bundled
`trails.json` has duplicated and mislocated geometry. Full findings and the
georeference method are in
[`docs/trail-validation.md`](./docs/trail-validation.md). This phase turns those
findings into clean data. **Blocked on Phase 7.10** (reliable screen-off GPS)
for anything that needs new field tracks.

#### 8.1 Extract the trail roster from the map
- [ ] Read every trail name off the Bosworth reference map
  (`data/reference/belknap-range-trails-map-bosworth-2018.jpg`).
- [ ] Reconcile three sources into one roster: the map (names + routing), the
  redlining workbook (`data/Belknap_Range_Redlining_2023v1.xls`, authoritative
  sanctioned list + distances), and current `trails.json`.
- [ ] Resolve the count drift: PLAN history shows 61 → 59 trails; the audit
  shows some of the 59 are duplicate geometry, so the distinct-trail count is
  lower still. Establish the true number.
- [ ] List trails on the map but **missing** from `trails.json` (known gap: the
  Rand and West Quarry ridge has no trail geometry at all).
- [ ] List trails in `trails.json` that are **not** sanctioned redline trails.

#### 8.2 Fix known data bugs (no field work needed)
- [ ] Resolve the three duplicate-geometry groups (each is one polyline reused):
  `red-trail`/`red-trail-anna-goat-pasture-hill-trail-south`;
  `mack-ridge-trail`/`mack-ridge-trail-south`;
  `mack-anna-trail`/`anna-straightback-link`/`straightback-major-link`.
- [ ] Fix `blue-trail` (currently the 741 ft eastern Blue Trail, used wrongly as
  the Belknap summit trail in `belknap-summit-loop`).
- [ ] Add a duplicate-geometry check to `src/services/trailValidation.ts` so
  this class of bug is caught automatically going forward.
- [ ] After geometry is fixed, correct the `loops.json` entries that depend on
  it (`belknap-range-trail-mack-major`, `belknap-12-full-traverse`).
- [ ] Re-read the eastern summit anchors (Klem/Anna/Straightback) so
  `map-overlay.py` can georeference the east and validate those trails.

#### 8.3 Ordered walk list (once Phase 7.10 is done)
- [ ] Produce a prioritized, geographically ordered hike list to re-record the
  suspect trails (not all 59; western/central geometry already aligns). Priority
  today: the duplicate groups, `blue-trail`, `boulder-trail`, then the eastern
  spine (Klem / Rand / West Quarry / Anna / Straightback). Order by trailhead so
  each outing captures adjacent trails in one recording.
- [ ] Walk and re-record each, then replace the bad geometry with
  `scripts/replace-trail-geometry.mjs --trail <id> --gpx <file>` and re-run
  `map-overlay.py --check` until the flags clear.
  **Not** `import-alltrails-gpx.js`: its `>= 40 coords` sparse guard skips every
  target on this list (`red-trail` 112, `blue-trail` 71, `boulder-trail` 177,
  `mack-ridge-trail` 213, `yellow-trail-shannon` 41), and its length-matching
  heuristic guesses which sub-segment belongs to which trail. Phase 8 is not a
  guessing problem - you know which trail you walked.
- [ ] **Re-run elevation enrichment after every geometry replace.**
  `import-alltrails-gpx.js` sets `trail.coordinates = imp.segment` wholesale and
  its parser reads only lat/lon, so a re-imported trail loses per-point
  `elevation` AND all four summary fields (`elevationGain/Loss/Min/Max`).
  Nothing warns about this today: `findTrailsMissingElevation` would go from 0/59
  to non-zero, and the ElevationProfile on that trail's detail page would quietly
  render empty (it degrades gracefully, so there is no error to notice). Run
  `scripts/enrich-elevation-api.py --dataset ned10m` (needs network; rate-limited
  to 100 locations/req at 1 req/sec), or `enrich-elevation.py --dem <tiles>` if
  the NED tiles from 5.1 are on hand (5.1 is still open). Both scripts rewrite the
  whole file with no per-trail targeting, so use `--output` to a temp path and
  diff before overwriting `src/data/trails.json`. Confirm
  `findTrailsMissingElevation` returns 0 before committing. Do NOT shortcut this
  by letting GPX `<ele>` flow into `trails.json` - see 8.4.
- [ ] Add the missing Rand / West Quarry ridge trail(s) from field tracks
  (ties into Phase 6.1 "Add new trails from GPS tracks").

#### 8.4 Elevation datums (reference - decided 2026-07-25)

The project carries **two** elevation representations on purpose. Confusing them
is a ~89 ft error that looks plausible, so the rules are written down here.

| | Field | Units | Datum | Source |
|---|---|---|---|---|
| Trail geometry | `Coordinate.elevation` | feet | orthometric (MSL) | DEM, `scripts/enrich-elevation*.py` |
| Recorded track | `TrackPoint.altitudeEllipsoidM` | metres | WGS 84 ellipsoid | GNSS, raw |

Relation: `h = H + N`, where `h` is ellipsoidal, `H` orthometric, `N` the geoid
height. For the Belknap Range `N ≈ -27.1 m`, so **raw GNSS altitude reads ~27 m
(89 ft) lower than map elevation.** Recovering orthometric: `H = h - N`.

**One constant, not a geoid model.** Sampled from the NOAA NGS geoid API
(GEOID12B): SW corner (43.47, -71.42) -27.174; NE corner (43.58, -71.22) -27.154;
`white-trail` centroid -27.114; `red-trail` centroid -27.096. Total variation
across the whole range is **0.078 m** - two to three orders of magnitude below
GNSS vertical noise (VDOP typically runs 1.5-3x HDOP, so tens of metres under
canopy, because every satellite is above the horizon and none below). Per-point
geoid modelling would be false precision. The GEOID12B/GEOID18 difference here is
also a few cm, likewise below the noise floor.

Rules:

- **Store raw, convert at the boundary.** `TrackPoint` keeps uncorrected
  ellipsoidal metres. The correction lives only in `gpxExport.ts`. Never store a
  corrected copy beside the raw one - two representations drift.
- **Datum belongs in the field name.** `altitudeEllipsoidM`, not `altitude`.
  TypeScript cannot distinguish two `number`s, so the name is the only
  enforcement at each read site.
- **The DEM stays authoritative for `trails.json`.** It is ground-referenced
  (GNSS measures the antenna, in a pocket, under canopy) and smoother. Recorded
  altitude's job is cross-checking, not populating trail data. Caveat worth
  remembering: DEM elevation is sampled at whatever coordinates you supply, so it
  inherits horizontal error amplified by slope - ~10 m horizontal on a 30% grade
  is ~3 m of elevation error. That is the defect Phase 8 is fixing, which is why
  an independent vertical observation is worth having at all.
- **Exports are self-describing.** GPX carries orthometric `<ele>` plus the
  `<geoidheight>` actually applied, so `h = ele + geoidheight` recovers the raw
  value with no external knowledge. GPX 1.1 defines `<geoidheight>` as exactly
  this (geoid above WGS 84 ellipsoid, per the NMEA GGA message).

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
| 2026-01-04 | Phase 7: Created `feature/capacitor-native` branch | Done |
| 2026-01-04 | Phase 7: Capacitor scaffold, geolocation abstraction, privacy policy | Done |
| 2026-01-04 | Phase 6: Added future ideas (new trails, white-label, tooling improvements) | Planned |
| 2026-06-30 | Added Bosworth reference map (`data/reference/`) cropped from the trailhead-banner photo | Done |
| 2026-06-30 | Added `scripts/map-overlay.py` (georeference + trail overlay + `--check` geometry audit) | Done |
| 2026-06-30 | Audit found duplicate/mislocated geometry; documented in `docs/trail-validation.md` | Done |
| 2026-06-30 | Added AMC 12-summit traverse to `loops.json`; renamed old traverse stub to Mack-Major segment | Done |
| 2026-06-30 | Phase 8: Trail data cleanup (roster extraction, data-bug fixes, ordered walk list) | Planned |
| 2026-07-25 | Phase 7.10: capture GNSS altitude on track points (`TrackPoint.altitudeEllipsoidM`, raw ellipsoidal) ahead of the device walk; fixed a wrong "above sea level" datum comment | Done |
| 2026-07-25 | GPX export writes orthometric `<ele>` + `<geoidheight>`; `BELKNAP_GEOID_HEIGHT_M = -27.1` from NGS sampling (167 tests) | Done |
| 2026-07-25 | Phase 8.3: added the missing post-import elevation re-enrichment step (GPX import wipes `elevation` + summary fields) | Planned |
| 2026-07-25 | Phase 8.4: documented the two elevation datums and the store-raw/convert-at-boundary rule | Done |
| 2026-07-25 | Export hardened to strict GPX 1.1: `<metadata>` (name/desc/link/time/bounds), schemaLocation, xsd:decimal formatting, CDATA-terminator escaping, accuracy in a namespaced `<extensions>`; validates against gpx.xsd via xmllint | Done |
| 2026-07-25 | Phase 7.10: split `<trkseg>` on recording gaps so a stall reads as missing data, not a straight-line route (180 tests) | Done |
| 2026-07-25 | Replaced regex GPX parsing with `fast-xml-parser` in `scripts/lib/gpx.mjs`; XSD validation via `xmllint-wasm` against vendored `schema/gpx-1.1.xsd`. 15-file fixture regression proves the swap is behaviour-preserving | Done |
| 2026-07-25 | Added the ingest gate `scripts/lib/trackQuality.mjs` (bbox from the trusted anchor hull, speed, gaps, density, length, ele datum). All thresholds reused from the repo or calibrated, none invented | Done |
| 2026-07-25 | Gate's first run found `data/gpx/Whiteface_Mountain_Trail.gpx` is a different mountain ~25 km NE; dataset unaffected. See `docs/trail-validation.md` | Done |
| 2026-07-25 | Added `scripts/replace-trail-geometry.mjs` - the Phase 8 single-trail replacement tool, with refuse-on-warning and `data/import-log.jsonl` provenance (286 tests) | Done |

<!-- Update this log after each work session -->
