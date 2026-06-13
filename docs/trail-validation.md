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
elevation, 0 duplicate ids. Geometry and elevation are in good shape; the
remaining validation work is names/completeness, which needs the map roster.

## Manual cross-check (open)

The photo is a weak oracle for coordinate geometry (perspective distortion, no
recoverable GPS precision), but authoritative for:

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
