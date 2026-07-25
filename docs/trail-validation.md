# Trail data validation

The official **Belknap Range Trails** map (Weldon Bosworth, 2/8/2018; GPS'd by
R. Andrews, S. Zimmer & W. Bosworth) is the authoritative reference for trail
names, routing, and completeness. A photo of the trailhead banner at Mt. Major
is the working reference image.

## Automated checks (`src/services/trailValidation.ts`)

Pure, tested helpers that guard data quality and flag candidates for hand-check:

- `findSparseTrails` - trails with few GPS points (coarse polylines).
- `findTrailsMissingElevation` - missing per-point or summary elevation.
- `findDuplicateTrailIds` - id collisions.

**Current result (59 trails):** 0 sparse (all ≥10 points), 0 missing
elevation, 0 duplicate ids. These checks pass, but they do not look at the
coordinates themselves. The map-overlay pass below found duplicated and
mislocated geometry the automated helpers miss, so geometry is **not** clean.
`trailValidation.ts` should grow a duplicate-geometry check (see findings).

## Geometry cross-check via map overlay (`scripts/map-overlay.py`)

The photo turned out to be a usable oracle for geometry after all. It has no
lat/lng graticule, so it yields no coordinates, but projecting our polylines
onto it exposes shape and position errors.

**Method.** Georeference the cropped map
(`data/reference/belknap-range-trails-map-bosworth-2018.jpg`) from named summits
whose pixels are read by hand and whose lng/lat come from `trails.json`. Only
summits that are mutually self-consistent (~19,900 px/degree of longitude) are
trusted as anchors. Fit a least-squares affine on the trusted set (Rowe, Mack,
Major, Whiteface): **RMS ~30 px**. Then:

- `map-overlay.py` renders every trail onto the map for eyeball comparison.
- `map-overlay.py --check` reports the anomalies below.

Anchoring on `trails.json`'s own summit coords is circular, so a summit whose
coord disagrees with the trusted fit is reported as a **suspect coordinate**,
not trusted.

### Findings (2026-06-30)

**Duplicate geometry (identical endpoints + point count):**

1. `red-trail` ≡ `red-trail-anna-goat-pasture-hill-trail-south`
2. `mack-ridge-trail` ≡ `mack-ridge-trail-south`
3. `mack-anna-trail-belknap-range-trail` ≡ `anna-straightback-link-belknap-range-trail`
   ≡ `straightback-major-link-belknap-range-trail`

Group 3 is the whole eastern Belknap Range Trail spine collapsed onto one
polyline drawn three times. Those three ids are the segments used by the
`belknap-range-trail-mack-major` loop and the `belknap-12-full-traverse` entry
in `loops.json`, so both loops draw one stub thrice.

**Suspect summit coordinates (reprojection error vs the trusted fit):**
Klem ~413 px, Anna ~532 px, Straightback ~225 px. The eastern summit coords are
unreliable; the map shows Klem and Mack at the same longitude while the data
places Klem ~0.02° too far east.

**Mislocated / off-map:** `blue-trail` is the wrong Blue Trail (the 741 ft
eastern trail near Alton, not the Belknap summit trail it is used as in the
`belknap-summit-loop`). `boulder-trail` projects to the far NE (lat 43.58,
lng -71.23), wrong for a central Belknap trail. `yellow-trail-shannon` and
`lakeview-trail` fall outside the fitted anchor hull, so their flags are softer
and need the eastern anchors fixed before trusting.

### Source-file finding (2026-07-25)

The audit above checks *trails*. Running the new ingest gate
(`scripts/lib/trackQuality.mjs`) over the *input* files found a landmine the
trail-level audit could not see:

**`data/gpx/Whiteface_Mountain_Trail.gpx` is not a Belknap trail.** All 243 of its
points sit at lat 43.6502..43.6565, lng -71.1094..-71.1021 - roughly 25 km
northeast of the range, a different mountain that happens to share the name. The
correct file is `Whiteface_Mountain.gpx` (lat 43.4885..43.5026, lng
-71.3938..-71.3846), which agrees with the trusted Whiteface anchor
(43.48880, -71.38680).

`trails.json`'s `whiteface-mountain-trail` matches the **correct** file exactly, so
the dataset is clean. It escaped only because the right file matched first and the
importer's `>= 40 coords` guard skipped the trail anyway. This is the same failure
mode as `blue-trail` - a same-name-different-mountain AllTrails export - and it sat
in `data/gpx/` from December 2025 until the gate flagged it.

The gate's bounding box comes from the trusted anchor hull, **not** from
`trails.json`. Deriving it from the data under repair would be circular: the bbox
of all current coordinates is lat 43.4743..43.5808 / lng -71.4013..-71.2156, and
its eastern and northern edges are defined by the known-bad trails themselves.

## Field cleanup plan

The map is the authoritative roster of what exists; good GPS tracks are how we
fix the geometry. Prerequisite: reliable screen-off recording (PLAN Phase 7.10).

Walk-to-fix priority (not all 59; the western/central trails already align):

1. The three duplicated groups above - each needs its distinct segments
   re-recorded.
2. `blue-trail` (Belknap summit) and `boulder-trail` - re-record in place.
3. The eastern spine (Klem / Rand / West Quarry / Anna / Straightback) - the
   Rand and West Quarry ridge has no distinct trail in `trails.json` at all.

Then re-run `map-overlay.py --check` and confirm the flags clear.

## Manual cross-check (open)

The photo is authoritative for:

1. **Names + official status** - confirm every trail in `trails.json` matches a
   sanctioned BRATTS redline trail name on the map; flag anything off.
2. **Completeness / the 13 unmatched** - PLAN Phase 2 noted 48/61 OSM-matched
   with 13 unmatched. Identify which named trails on the map are absent from
   `trails.json` and add them.
3. **Belknap Range Trail spine** - the blue-triangle through-route is distinct
   from side trails on the map; confirm the data distinguishes it.

## Points of interest

The map's seven historical features are captured in `src/data/pois.json` with
their authoritative legend grid cells. Only **HR (Mt. Major hut ruins, E11)**
has a coordinate so far - anchored to the Mt. Major summit point in the trail
data. The other six (CK, IM, PW, QS, TB, TP) carry grid cells only and are
flagged `needsGeoreference` until the grid is georeferenced (establish the
map's corner lat/lng + cell size, then convert each cell) or the sites are
located in the field. Placed POIs render as amber markers on the map; unplaced
ones are intentionally not drawn.
