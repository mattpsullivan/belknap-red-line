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

> "Clicking on the trails on the map is a little difficult - is it possible to expand the clickable width of the trail?"

> "The trail popup after clicking the map should link to the trail page for that trail."

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
   - Link to trail detail page from popup
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

// Option C: Invisible wider hit area layer for easier clicking
<Layer
  id="trails-hit-area"
  type="line"
  source="trails"
  paint={{
    'line-color': 'transparent',
    'line-width': 20,  // Much wider than visible trail (3px)
  }}
/>
// Click handler targets this invisible layer for easier interaction
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

### 7. Centralized Style Configuration

**User Feedback:**
> "The gray doesn't 'pop' - can we make the unfinished trail color be a brighter contrasting color?"

**Development Note:**
> "Let's make it configurable in the project - no UI, but let's get rid of the magic number colors and introduce a single place for style config - this will help with possible future white-labelling."

**Current State:**
- Colors are scattered across multiple files:
  - `src/index.css` - CSS custom properties for UI colors
  - `src/components/map/TrailMap.tsx` - Hardcoded hex values for map layers
  - `src/components/trails/ElevationProfile.tsx` - Hardcoded hex values
  - Various components use Tailwind color classes directly
- Incomplete trail color is `#9CA3AF` (gray-400) - doesn't stand out on map backgrounds
- No single source of truth for theming

**Requested Changes:**

1. **Brighter Incomplete Trail Color**
   - Current: `#9CA3AF` (gray-400) - low contrast, hard to see
   - Suggested alternatives:
     - `#0EA5E9` (sky-500) - bright blue, high visibility
     - `#8B5CF6` (purple-500) - distinct from red completed trails
     - `#06B6D4` (cyan-500) - bright, contrasts with land colors
     - `#F59E0B` (amber-500) - warm, visible on most backgrounds

2. **Centralized Style Config**
   ```typescript
   // src/config/styles.ts
   export const styleConfig = {
     trails: {
       completed: {
         color: '#EF4444',      // red-500
         width: 3,
       },
       incomplete: {
         color: '#0EA5E9',      // sky-500 (brighter than gray)
         width: 3,
       },
       recorded: {
         color: '#F97316',      // orange-500
         width: 4,
       },
     },
     map: {
       locationMarker: '#3B82F6',  // blue-500
       locationRadius: '#3B82F6',
     },
     elevation: {
       profile: '#22C55E',        // green-500
       minPoint: '#22C55E',
       maxPoint: '#EF4444',
     },
     difficulty: {
       easy: '#22C55E',
       moderate: '#EAB308',
       difficult: '#EF4444',
     },
   }
   ```

3. **Benefits for White-Labeling**
   - Single file to customize for different trail systems
   - Could be loaded from external config in future
   - Consistent theming across all components
   - Easier to maintain and update

**Implementation:**
- Create `src/config/styles.ts` with centralized color definitions
- Update `TrailMap.tsx` to import from config instead of hardcoded values
- Update `ElevationProfile.tsx` similarly
- Consider generating CSS custom properties from the config

**Priority:** Medium (improves maintainability, enables white-labeling)
**Complexity:** Low-Medium (refactoring, no new features)
**Related Files:**
- New: `src/config/styles.ts`
- `src/components/map/TrailMap.tsx:247, 260, 274, 289, 297`
- `src/components/trails/ElevationProfile.tsx:150-185`
- `src/index.css` (could generate from config)

---

### 8. "View on Map" Navigation Enhancement

**User Feedback:**
> "When I click on the 'View on Map' link from the trail page - it would be nice if the map view were zoomed in more and the trail itself were highlighted in a different color."

**Current State:**
- Trail detail page has a "View on Map" link that navigates to `/map`
- Navigation doesn't pass any trail context to the map
- Map opens at default view (full Belknap Range)
- Selected trail is not highlighted differently from other trails

**Requested Changes:**

1. **Zoom to Trail**
   - When navigating from trail detail, center map on the selected trail
   - Zoom level should fit the trail bounds with padding
   - Auto-open the trail popup/info card

2. **Highlight Selected Trail**
   - Show selected trail in a distinct highlight color (e.g., bright yellow, cyan)
   - Or increase line width / add glow effect
   - Other trails remain in normal completed/incomplete colors

**Implementation:**

1. **Pass trail ID via URL or state**
   ```typescript
   // Option A: Query parameter
   <Link to={`/map?trail=${trail.id}`}>View on Map</Link>

   // Option B: React Router state
   <Link to="/map" state={{ selectedTrail: trail.id }}>View on Map</Link>
   ```

2. **Map component reads selection**
   ```typescript
   // In TrailMap.tsx
   const location = useLocation()
   const searchParams = new URLSearchParams(location.search)
   const highlightTrailId = searchParams.get('trail')

   // Or from state
   const { selectedTrail } = location.state || {}
   ```

3. **Fit bounds to trail**
   ```typescript
   useEffect(() => {
     if (highlightTrailId && mapRef.current) {
       const trail = getTrailById(highlightTrailId)
       if (trail) {
         const bounds = getBoundsFromCoordinates(trail.coordinates)
         mapRef.current.fitBounds(bounds, { padding: 50 })
         setSelectedTrail({ trail, lat: trail.trailhead.lat, lng: trail.trailhead.lng })
       }
     }
   }, [highlightTrailId])
   ```

4. **Add highlight layer**
   ```typescript
   // New layer for highlighted trail (renders on top)
   {highlightTrailId && (
     <Layer
       id="highlighted-trail"
       type="line"
       source="trails"
       filter={['==', ['get', 'id'], highlightTrailId]}
       paint={{
         'line-color': '#FBBF24',  // amber-400 for highlight
         'line-width': 5,
         'line-opacity': 1,
       }}
     />
   )}
   ```

**Priority:** Medium (improves navigation UX)
**Complexity:** Low (URL params + fitBounds + highlight layer)
**Related Files:**
- `src/pages/TrailDetailPage.tsx` - Update "View on Map" link
- `src/components/map/TrailMap.tsx` - Read URL param, fitBounds, add highlight layer
- `src/App.tsx` - Ensure route handles query params

---

### 10. Trail Data Sync with Map Tiles

**User Feedback:**
> "When looking at the online map tiles I notice that some of the trails do not match what the tiles show, or that the tiles show additional trails and trail segments. Is there a way that we can ingest trail data from the tiles themselves?"

**Current State:**
- Trail coordinates in `trails.json` were fetched from OpenStreetMap Overpass API (December 2025)
- Map tiles come from OpenFreeMap, which renders OpenStreetMap data
- 48/61 trails have OSM-sourced coordinates; 13 use placeholder/estimated coordinates
- OSM data is constantly being updated by contributors, so tile rendering may have newer trail data than our bundled JSON
- Some discrepancies may exist between our snapshot and the live tile rendering

**Root Cause Analysis:**
1. **Stale data** - Our trails.json is a snapshot from when we queried OSM; tiles render current OSM data
2. **Missing trails** - Some BRATTS trails may not have been mapped in OSM at query time
3. **Coordinate drift** - Trail paths in OSM may have been refined/corrected since our export
4. **Additional trails** - Tiles may show trails not in the official BRATTS program

**Options to Consider:**

1. **Re-sync from OSM Overpass API** (Recommended)
   - Re-run the `scripts/match-osm-trails.js` script with updated queries
   - Most straightforward: same source as tiles, just fresher data
   - Maintains offline-first design (data bundled at build time)
   - Can be done periodically to stay in sync
   - Effort: Low (existing infrastructure)

2. **Vector Tile Parsing**
   - Parse MVT (Mapbox Vector Tile) data directly from tile responses
   - Extract trail geometries from the `transportation` or `path` layers
   - Technical: Would need to decode Protocol Buffer format
   - Challenge: Tiles are pre-simplified for display, may lose precision
   - Challenge: Would need to identify which features are BRATTS trails vs other paths
   - Effort: High (new parsing infrastructure)

3. **Runtime OSM Fetch**
   - Query OSM Overpass API at runtime for trail data
   - Always matches tiles (same data source)
   - Breaks offline-first design (requires network for trail data)
   - Could cache with long TTL
   - Effort: Medium

4. **Hybrid Approach**
   - Keep bundled data for offline use
   - Add "Sync Trail Data" button that fetches latest from OSM
   - Store updated data in IndexedDB
   - Falls back to bundled data when offline
   - Effort: Medium-High

5. **OSM Community Contribution**
   - If BRATTS trails are missing from OSM, add them
   - Benefits the wider community
   - Tiles would eventually render the additions
   - Effort: Variable (depends on how many trails need adding)

**Implementation Notes (Option 1):**
```bash
# Re-fetch OSM data for Belknap Range
node scripts/fetch-osm-trails.js --bbox 43.4,-71.5,43.6,-71.2 --output fresh-trails.geojson

# Match against BRATTS trail names
node scripts/match-osm-trails.js --input fresh-trails.geojson --bratts data/bratts-trails.json

# Enrich with elevation (already have this script)
python scripts/enrich-elevation-api.py
```

**Priority:** Medium-High (affects data accuracy)
**Complexity:** Low (Option 1) to High (Option 2)
**Related Files:**
- `scripts/match-osm-trails.js` - OSM matching script
- `src/data/trails.json` - Trail data to update
- `scripts/fetch-osm-trails.js` (new) - Direct Overpass API fetch

---

### 9. Loop Detail View Enhancements

**User Feedback:**
> "For the Loops - could we get a similar View on Map option that highlighted the trail sections that were part of the loop, and a similar elevation view for the combined trails?"

**Current State:**
- Loop detail page shows list of trails in the loop
- No "View on Map" option for loops
- No combined elevation profile for the entire loop
- Each trail's elevation must be viewed separately

**Requested Changes:**

1. **"View on Map" for Loops**
   - Add "View on Map" button to loop detail page
   - Navigate to map with all loop trails highlighted
   - Fit map bounds to encompass entire loop
   - Use distinct highlight color for loop trails (differentiate from single trail highlight)

2. **Combined Elevation Profile**
   - Show elevation profile for the entire loop as one continuous chart
   - Concatenate elevation data from all trails in sequence
   - Mark trail boundaries with vertical lines or labels
   - Show cumulative distance along x-axis
   - Display total elevation gain/loss for the loop

**Implementation:**

1. **Loop "View on Map" navigation**
   ```typescript
   // In LoopDetailPage.tsx
   <Link to={`/map?loop=${loop.id}`}>
     View Loop on Map
   </Link>
   ```

2. **Map reads loop param and highlights multiple trails**
   ```typescript
   // In TrailMap.tsx
   const loopId = searchParams.get('loop')
   const highlightedLoop = loopId ? getLoopById(loopId) : null
   const highlightTrailIds = highlightedLoop?.trails.map(t => t.id) || []

   // Highlight layer for loop trails
   {highlightTrailIds.length > 0 && (
     <Layer
       id="highlighted-loop-trails"
       type="line"
       source="trails"
       filter={['in', ['get', 'id'], ['literal', highlightTrailIds]]}
       paint={{
         'line-color': '#A855F7',  // purple-500 for loops (distinct from amber single-trail)
         'line-width': 5,
         'line-opacity': 1,
       }}
     />
   )}
   ```

3. **Combined elevation profile component**
   ```typescript
   // New component or extend ElevationProfile
   interface CombinedElevationProfileProps {
     trails: Trail[]  // ordered list of trails in the loop
   }

   function CombinedElevationProfile({ trails }: CombinedElevationProfileProps) {
     // Concatenate coordinates from all trails
     const combinedCoordinates = trails.flatMap((trail, index) => {
       // Mark first point of each trail with trail name for labeling
       return trail.coordinates.map((coord, i) => ({
         ...coord,
         trailName: i === 0 ? trail.name : undefined,
         trailIndex: index,
       }))
     })

     // Calculate cumulative distance for x-axis
     // Render single continuous elevation chart
     // Add trail boundary markers
   }
   ```

4. **Fit bounds to loop**
   ```typescript
   useEffect(() => {
     if (highlightedLoop && mapRef.current) {
       const allCoords = highlightedLoop.trails.flatMap(t => t.coordinates)
       const bounds = getBoundsFromCoordinates(allCoords)
       mapRef.current.fitBounds(bounds, { padding: 50 })
     }
   }, [highlightedLoop])
   ```

**Priority:** Medium (enhances loop feature)
**Complexity:** Medium (extends existing patterns from #8, elevation concat logic)
**Related Files:**
- `src/pages/LoopDetailPage.tsx` - Add "View on Map" link, combined elevation profile
- `src/components/map/TrailMap.tsx` - Handle `?loop=` param, multi-trail highlight
- `src/components/trails/ElevationProfile.tsx` - Extend or create combined version
- `src/hooks/useLoops.ts` - May need helper for combined coordinates

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
| Dec 2025 | User | Trail area/region organization | Done |
| Dec 2025 | User | Red-line color scheme for completed trails | Done |
| Dec 2025 | User | Trail info/labels on map | Done |
| Dec 2025 | User | Trail detail page with map, elevation, loops | Open |
| Dec 2025 | User | Multi-trail-system / white-label support | Open |
| Dec 2025 | User | Multi-trail trip planning & loops | Open |
| Dec 2025 | User | Brighter incomplete trail color, centralized style config | Done |
| Dec 2025 | User | "View on Map" zoom & highlight selected trail | Done |
| Dec 2025 | User | Loop "View on Map" & combined elevation profile | Done |
| Dec 2025 | User | Trail data sync with map tiles | Done |

---

## Suggested Implementation Roadmap

Based on complexity, user value, and dependencies:

### Phase 1: Quick Wins
| Feature | Effort | Impact |
|---------|--------|--------|
| #2 Red-line colors | 1 hour | High - fixes core identity issue |
| #7 Centralized style config | 2-3 hours | Medium - enables theming, improves maintainability |
| #1 Area tags on trail cards | 2-3 hours | Medium - improves discoverability |

### Phase 2: Core Enhancements
| Feature | Effort | Impact |
|---------|--------|--------|
| #8 "View on Map" zoom & highlight | 2-3 hours | Medium - better navigation flow |
| #3 Trail tap/click on map | 1-2 days | High - major UX improvement |
| #4 Trail detail page (basic) | 2-3 days | High - foundation for other features |
| #1 Progress by area | 1 day | Medium - motivational |

### Phase 3: Trip Planning
| Feature | Effort | Impact |
|---------|--------|--------|
| #6 Pre-built loops data | 1-2 days | Medium - quick value |
| #9 Loop view on map & elevation | 1 day | Medium - enhances loop experience |
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
#2 (colors) ───────┬──────────────────────────> standalone
                   │
#7 (style config) ─┴──────────────────────────> #5 (white-label)

#1 (areas) ───────────────────────────────────> standalone

#8 (view on map) ─────> depends on #4 existing (trail detail page)

#9 (loop view) ───────> depends on #6 (loops) + extends #8 pattern

#3 (map labels) ──────> #4 (detail page) ─────> #6 (trip planning)
                              │
                              └──────────────> #5 (white-label)
```

---

## Summary

**10 feature requests** captured from user feedback, ranging from quick color fixes to platform-level enhancements. The requests cluster around five themes:

1. **Better Trail Discovery** (#1, #3, #4, #8) - Help users understand and explore the trail network
2. **Trip Planning** (#6, #9) - Enable multi-trail hike planning with loops and itineraries
3. **Platform Expansion** (#5) - Make the app work for any trail system
4. **Developer Experience & Theming** (#2, #7) - Centralize styling for maintainability and future white-labeling
5. **Data Accuracy** (#10) - Keep trail data in sync with map tile rendering

The recommended approach is to start with quick wins (#2, #7, #1 enhancements) to show immediate progress, then build the trail detail page (#4) as a foundation for trip planning and map interactions.
