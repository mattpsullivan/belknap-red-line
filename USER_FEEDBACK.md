# User Feedback & Feature Requests

This document tracks user feedback and translates it into actionable feature requests.

---

## Feature Requests

### 1. Trail Region/Area Organization

**User Feedback:**
> "The trails are organized in the spreadsheet according to areas: 'Lockes', 'Rowe-Gunstock' etc. It would be nice to include this as a tag or something and be able to sort trails by what 'region' they are in."

**Current State:**
- Trails already have an `area` field in the data model
- TrailsPage has an area filter dropdown (top-right of search bar)
- Areas are used in the CSV export grouped by BRATTS workbook sections

**Requested Enhancements:**
1. **Visual area tags** - Display the area as a colored tag/badge on each trail card in the list view
2. **Group by area view** - Option to view trails grouped by area with section headers (instead of flat list)
3. **Area filter visibility** - Make the area filter more prominent/discoverable (currently a dropdown that may be overlooked)
4. **Map area highlighting** - Show area boundaries or color-code trails by area on the map view
5. **Progress by area** - Show completion progress broken down by area on the Progress page

**Priority:** Medium
**Complexity:** Low-Medium
**Related Files:**
- `src/pages/TrailsPage.tsx` - Add area tags, grouping option
- `src/pages/ProgressPage.tsx` - Add area breakdown
- `src/components/map/TrailMap.tsx` - Color trails by area
- `src/types/trail.ts` - Consider adding `TrailArea` union type

---

### 2. "Red-Line" Trail Colors on Map

**User Feedback:**
> "Can we change the color of the map lines - completed trail sections should be red - 'red-lined' as it were, then we can visually inspect the trails left to complete."

**Current State:**
- Completed trails are shown in **green** (`#22C55E`)
- Incomplete trails are shown in **red** (`#EF4444`)
- This is backwards from the "red-lining" concept the app is named after

**Requested Change:**
Swap the color scheme to match traditional red-lining:
- **Completed trails → Red** (the "red line" you've drawn across the map)
- **Incomplete trails → Gray or muted color** (trails yet to be hiked)

**Implementation:**
```typescript
// In TrailMap.tsx, swap the colors:
// Completed trails (red - "red-lined")
'line-color': '#EF4444'  // or a slightly different red

// Incomplete trails (gray/muted)
'line-color': '#9CA3AF'  // gray-400, or '#6B7280' gray-500
```

**Priority:** High (aligns with core app concept)
**Complexity:** Low (simple color value change)
**Related Files:**
- `src/components/map/TrailMap.tsx:214, 226` - Trail layer paint properties

---

### 3. Trail Information on Map

**User Feedback:**
> "Looking at the map view - can we add a way to see for each trail line an inline description of what each segment is?"

**Current State:**
- Trail lines are displayed on the map with no labels or interactivity
- No way to identify which trail is which without cross-referencing the Trails list
- Trail properties (name, distance, difficulty) exist in the data but aren't shown on map

**Requested Enhancements:**

1. **Trail labels** - Display trail names along or near each trail line
   - Could use MapLibre symbol layers with text labels
   - Challenge: Label placement on winding trails without overlap

2. **Tap/click interaction** - Show trail info when user taps a trail line
   - Popup/tooltip with: Trail name, distance, difficulty, completion status
   - Option to mark complete directly from popup

3. **Hover tooltips** (desktop) - Quick preview on mouse hover
   - Show trail name and basic stats

**Implementation Options:**

```typescript
// Option A: Symbol layer with labels
<Layer
  id="trail-labels"
  type="symbol"
  layout={{
    'symbol-placement': 'line',
    'text-field': ['get', 'name'],
    'text-size': 12,
  }}
/>

// Option B: Click handler for popups
const handleMapClick = (e) => {
  const features = e.target.queryRenderedFeatures(e.point, {
    layers: ['completed-trails-layer', 'incomplete-trails-layer']
  })
  if (features.length > 0) {
    setSelectedTrail(features[0].properties)
  }
}
```

**Priority:** Medium
**Complexity:** Medium (requires map interaction handling)
**Related Files:**
- `src/components/map/TrailMap.tsx` - Add labels layer, click handlers, popup component

---

### 4. Trail Detail Page

**User Feedback:**
> "It would be nice to be able to click on a trail in the trails list and see more info about it - a detail map, elevation profile, maybe some notes if there is a trail description we can find, nearby trails, if it is part of a larger loop etc."

**Current State:**
- Trails list shows basic info: name, distance, difficulty, elevation gain, completion status
- Clicking a trail only opens the "Mark Complete" modal
- No dedicated trail detail view exists
- Trail data includes coordinates but no elevation data per point

**Requested Features:**

1. **Trail Detail Page** (`/trails/:id`)
   - Dedicated page for each trail with comprehensive information
   - Navigate to it by tapping trail name (not the Complete button)

2. **Detail Map**
   - Zoomed map centered on the selected trail
   - Highlight this trail prominently
   - Show trailhead marker with directions link

3. **Elevation Profile**
   - Visual chart showing elevation change along the trail
   - Requires elevation data per coordinate point (not currently in data)
   - Could fetch from elevation API or embed in trail data

4. **Trail Description/Notes**
   - Static descriptions for each trail (would need content)
   - User's personal notes from completions
   - Trail conditions or seasonal info

5. **Nearby Trails**
   - List trails that share trailheads or connect
   - "Combine with..." suggestions for longer hikes

6. **Loop Information**
   - Flag if trail is part of a loop
   - Show connected trails that form loops
   - Total loop distance/time estimates

**Data Requirements:**
```typescript
// Enhanced Trail type
interface Trail {
  // ... existing fields
  elevationProfile?: { distance: number; elevation: number }[]
  description?: string
  connectedTrails?: string[]  // trail IDs
  isLoop?: boolean
  loopTrails?: string[]  // trail IDs that form a loop together
}
```

**Implementation:**
- New page: `src/pages/TrailDetailPage.tsx`
- New route: `/trails/:id`
- Update TrailsPage to link trail names to detail page
- Elevation chart component (could use simple SVG or chart library)

**Priority:** Medium
**Complexity:** High (new page, data enrichment needed)
**Related Files:**
- `src/pages/TrailDetailPage.tsx` (new)
- `src/pages/TrailsPage.tsx` - Add navigation to detail
- `src/App.tsx` - Add route
- `src/data/trails.json` - Enrich with new data
- `src/types/trail.ts` - Extend Trail interface

---

### 5. Multi-Trail-System / White-Label Support

**User Feedback:**
> "I love this idea! I would love to use this as a 'scavenger hunt' to gamify exploring other trail systems. How hard would it be to ingest tracks for another trail network or set of paths in a local area and 'rebrand' it?"

**Current State:**
- App is hardcoded for Belknap Range trails
- Trail data lives in `src/data/trails.json`
- Branding (name, colors, BRATTS references) scattered throughout
- Map center coordinates hardcoded to Belknap area
- Export format tied to BRATTS workbook structure

**Feasibility Assessment: MEDIUM-HIGH**

The app architecture is actually fairly well-suited for this with some refactoring:

**What Would Need to Change:**

1. **Configuration Layer** (New)
   ```typescript
   // src/config/trailSystem.ts
   interface TrailSystemConfig {
     id: string
     name: string                    // "Belknap Range" | "White Mountains" | etc
     shortName: string               // "Belknap" | "Whites"
     description: string
     mapCenter: { lat: number; lng: number; zoom: number }
     bounds?: [[number, number], [number, number]]
     branding: {
       primaryColor: string
       accentColor: string
       logo?: string
     }
     trails: Trail[]
     areas: { id: string; name: string; displayName: string }[]
     externalLinks?: { label: string; url: string }[]
   }
   ```

2. **Trail Data Import** (Enhancement)
   - Accept GPX/GeoJSON file upload for trail definitions
   - Parse and validate trail coordinates
   - Auto-generate trail IDs
   - UI for adding trail metadata (name, difficulty, area)

3. **Branding/Theming**
   - Move hardcoded strings to config
   - CSS custom properties for colors
   - Dynamic app title/header

4. **Map Configuration**
   - Dynamic center/bounds from config
   - Offline tiles per trail system (or online-only option)

5. **Data Isolation**
   - Separate IndexedDB databases per trail system
   - Or: add `trailSystemId` to completions/tracks tables

**Implementation Approaches:**

**Option A: Config File Swap (Simplest)**
- User provides a JSON config file
- Rebuild/redeploy for each trail system
- Good for: personal use, few systems

**Option B: Runtime Configuration (Medium)**
- Trail system selector in settings
- Multiple configs bundled or fetched
- Switch between systems in-app
- Good for: regional hiking clubs

**Option C: Full Multi-Tenant (Complex)**
- Backend service for trail system management
- User accounts, shared systems
- Community-contributed trail data
- Good for: public app/platform

**Quick Win - GPX Import:**
```typescript
// Parse GPX to Trail format
function gpxToTrail(gpxString: string): Partial<Trail> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxString, 'text/xml')
  const track = doc.querySelector('trk')
  const points = doc.querySelectorAll('trkpt')

  return {
    name: track?.querySelector('name')?.textContent || 'Unnamed Trail',
    coordinates: Array.from(points).map(pt => ({
      lat: parseFloat(pt.getAttribute('lat')!),
      lng: parseFloat(pt.getAttribute('lon')!),
    })),
    // User fills in: distance, difficulty, area, trailhead
  }
}
```

**Files That Would Need Changes:**
| File | Change Type | Effort |
|------|-------------|--------|
| `src/data/trails.ts` | Load from config | Low |
| `src/components/map/TrailMap.tsx` | Dynamic center/bounds | Low |
| `src/components/layout/Layout.tsx` | Dynamic branding | Low |
| `src/services/redlineExport.ts` | Generic export format | Medium |
| `src/providers/PMTilesProvider.tsx` | Per-system tiles | Medium |
| `src/App.tsx` | Config provider wrapper | Low |
| New: `src/config/` | Config types & loader | Medium |
| New: `src/services/gpxImport.ts` | GPX parser | Medium |
| New: Trail system settings UI | Config management | High |

**Priority:** Low (future enhancement)
**Complexity:** Medium-High (significant refactor, but doable)
**Potential:** This could turn the app into a general-purpose "trail red-lining" platform!

---

### 6. Multi-Trail Trip Planning

**User Feedback:**
> "Trip planning is a little weak, particularly if a user is trying to plan a trip that encompasses multiple trails and segments - there were some 'loop' itineraries in the original source data - is there a way that we can help user build a hike that ticks off multiple segments?"

**Current State:**
- No trip planning functionality
- Trails are treated as isolated segments
- No way to combine trails into a route
- Original BRATTS data may have had loop/itinerary info (not currently used)
- Users must manually figure out which trails connect

**Requested Features:**

1. **Trip Builder**
   - Select multiple trails to combine into a planned hike
   - Drag to reorder segments
   - Show total distance, elevation, estimated time
   - Validate connectivity (warn if trails don't connect)

2. **Pre-Built Loops/Itineraries**
   - Import loop data from BRATTS source
   - Curated "popular loops" or "suggested hikes"
   - Difficulty ratings for combined routes
   - Example: "Belknap Summit Loop" = East Trail + Summit Trail + Carriage Road

3. **Route Visualization**
   - Show planned route on map with numbered waypoints
   - Highlight start/end trailheads
   - Combined elevation profile for entire route

4. **Trip Saving & Sharing**
   - Save planned trips for later
   - Share trip via link or export
   - Track which planned trips you've completed

5. **Smart Suggestions**
   - "Complete these 3 nearby trails in one hike"
   - Suggest efficient routes to maximize trail completion
   - "You're 2 trails away from completing this area"

**Data Model:**
```typescript
interface PlannedTrip {
  id?: number
  name: string
  trailIds: string[]  // ordered list of trails
  createdAt: Date
  completedAt?: Date
  notes?: string
}

interface LoopItinerary {
  id: string
  name: string
  description: string
  trailIds: string[]
  totalDistance: number
  totalElevation: number
  difficulty: 'easy' | 'moderate' | 'difficult' | 'strenuous'
  estimatedTime: string  // "3-4 hours"
}

// Add to trails.json or separate file
interface TrailConnection {
  trailId: string
  connectsTo: string[]  // trail IDs that share an endpoint
}
```

**Implementation:**

1. **Phase 1: Pre-Built Loops**
   - Add `loops.json` with curated itineraries from BRATTS data
   - New "Loops" tab or section in Trails page
   - Loop detail view showing component trails

2. **Phase 2: Trip Builder**
   - New page: `/trips/new`
   - Trail picker with connectivity hints
   - Route preview on map
   - Save to IndexedDB

3. **Phase 3: Smart Routing**
   - Build connectivity graph from trail coordinates
   - Pathfinding for "efficient completion" suggestions
   - Integration with Progress page

**Trail Connectivity Detection:**
```typescript
// Auto-detect connected trails by endpoint proximity
function findConnectedTrails(trails: Trail[], thresholdMeters = 100): Map<string, string[]> {
  const connections = new Map<string, string[]>()

  for (const trail of trails) {
    const start = trail.coordinates[0]
    const end = trail.coordinates[trail.coordinates.length - 1]

    const connected = trails
      .filter(t => t.id !== trail.id)
      .filter(t => {
        const tStart = t.coordinates[0]
        const tEnd = t.coordinates[t.coordinates.length - 1]
        return (
          distance(start, tStart) < thresholdMeters ||
          distance(start, tEnd) < thresholdMeters ||
          distance(end, tStart) < thresholdMeters ||
          distance(end, tEnd) < thresholdMeters
        )
      })
      .map(t => t.id)

    connections.set(trail.id, connected)
  }

  return connections
}
```

**Priority:** Medium-High
**Complexity:** High (new feature area, data enrichment)
**Related Files:**
- New: `src/pages/TripsPage.tsx`
- New: `src/pages/TripBuilderPage.tsx`
- New: `src/data/loops.json`
- New: `src/hooks/useTrips.ts`
- New: `src/services/routePlanner.ts`
- `src/services/database/db.ts` - Add trips table
- `src/types/trail.ts` - Add PlannedTrip, LoopItinerary types

---

## Cross-Cutting Observations & Ideas

These insights emerged from the feedback discussion and connect multiple feature requests:

### Feature Synergies

1. **Trail Detail + Trip Planning (#4 + #6)**
   - The trail detail page should show "Connects to..." with linked trails
   - Display "Part of these loops..." when trail is in pre-built itineraries
   - "Combine with nearby trails" suggestions on each detail page
   - This creates natural navigation between individual trails and trip planning

2. **Area Organization + Progress (#1 + existing)**
   - Progress page could show completion breakdown by area
   - "You're 2 trails away from completing Belknap Mountain area!"
   - Area-based achievements (see Gamification below)

3. **Map Labels + Trail Detail (#3 + #4)**
   - Tapping a trail on the map could navigate to trail detail page
   - Or show a popup with "View Details" button
   - Mobile: tap interaction preferred (labels get cluttered on small screens)
   - Desktop: hover for quick preview, click for detail page

4. **Trip Planning + White-Label (#6 + #5)**
   - Pre-built loops should be part of the trail system config
   - Different trail systems could have their own curated itineraries
   - Trip builder works generically across any trail system

### Gamification Ideas

Building on the "scavenger hunt" concept from feedback #5:

1. **Achievements/Badges**
   - "Area Master" - Complete all trails in an area
   - "Century Club" - Hike 100 miles total
   - "Loop Legend" - Complete 5 pre-built loops
   - "Peak Bagger" - Summit all mountains in the range
   - "Early Bird" - Log a hike before 7am
   - "Streak" - Hike 7 days in a row

2. **Progress Milestones**
   - 25%, 50%, 75%, 100% completion celebrations
   - "Halfway there!" notifications
   - Shareable milestone cards for social media

3. **Leaderboards** (if multi-user)
   - Monthly miles leaderboard
   - Fastest to complete all trails
   - Most trails in a single day

4. **Challenges**
   - "Complete the Belknap Loop this month"
   - Seasonal challenges
   - Community challenges

### Technical Notes

1. **Elevation Data Options**
   - Free APIs: Open-Elevation, Open-Topo-Data
   - Pre-compute and embed in `trails.json` (recommended for offline)
   - ~500 bytes per trail for elevation profile data

2. **Trail Connectivity**
   - Can be auto-computed from coordinate endpoints
   - No manual data entry needed
   - Run once at build time, store in config

3. **Existing Partial Implementations**
   - Area filter already exists in TrailsPage (dropdown next to search)
   - Could be made more prominent/discoverable
   - Trail data already has `area` field populated

### UX Recommendations

1. **Red-Line Colors (#2)**
   - This is a quick win with high impact
   - Aligns with the app's core identity
   - Should be prioritized as it's low effort, high value

2. **Progressive Disclosure**
   - Start with pre-built loops before custom trip builder
   - Add features incrementally based on usage
   - Don't overwhelm new users

3. **Offline-First Considerations**
   - Pre-compute everything possible (connectivity, loops)
   - Cache elevation data in IndexedDB
   - Trip plans should work fully offline

---

## Feedback Log

| Date | Source | Summary | Status |
|------|--------|---------|--------|
| Dec 2024 | User | Trail area/region organization | Open |
| Dec 2024 | User | Red-line color scheme for completed trails | Open |
| Dec 2024 | User | Trail info/labels on map | Open |
| Dec 2024 | User | Trail detail page with map, elevation, loops | Open |
| Dec 2024 | User | Multi-trail-system / white-label support | Open |
| Dec 2024 | User | Multi-trail trip planning & loops | Open |

---

## Suggested Implementation Roadmap

Based on complexity, user value, and dependencies:

### Phase 1: Quick Wins
| Feature | Effort | Impact |
|---------|--------|--------|
| #2 Red-line colors | 1 hour | High - fixes core identity issue |
| #1 Area tags on trail cards | 2-3 hours | Medium - improves discoverability |

### Phase 2: Core Enhancements
| Feature | Effort | Impact |
|---------|--------|--------|
| #3 Trail tap/click on map | 1-2 days | High - major UX improvement |
| #4 Trail detail page (basic) | 2-3 days | High - foundation for other features |
| #1 Progress by area | 1 day | Medium - motivational |

### Phase 3: Trip Planning
| Feature | Effort | Impact |
|---------|--------|--------|
| #6 Pre-built loops data | 1-2 days | Medium - quick value |
| #6 Loops UI in trails list | 1-2 days | Medium |
| #4 Elevation profiles | 2-3 days | Medium - data enrichment needed |
| #4 Connected trails | 1 day | Medium - auto-computed |

### Phase 4: Platform Features
| Feature | Effort | Impact |
|---------|--------|--------|
| #6 Custom trip builder | 1 week | High - power user feature |
| #5 White-label config | 1-2 weeks | High - enables new use cases |
| Gamification/badges | 1 week | Medium - engagement |

### Dependencies
```
#2 (colors) ──────────────────────────────────> standalone

#1 (areas) ───────────────────────────────────> standalone

#3 (map labels) ──────> #4 (detail page) ─────> #6 (trip planning)
                              │
                              └──────────────> #5 (white-label)
```

---

## Summary

**6 feature requests** captured from user feedback, ranging from quick color fixes to platform-level enhancements. The requests cluster around three themes:

1. **Better Trail Discovery** (#1, #3, #4) - Help users understand and explore the trail network
2. **Trip Planning** (#6) - Enable multi-trail hike planning with loops and itineraries
3. **Platform Expansion** (#5) - Make the app work for any trail system

The recommended approach is to start with quick wins (#2, #1 enhancements) to show immediate progress, then build the trail detail page (#4) as a foundation for trip planning and map interactions.
