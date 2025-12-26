# Tooling Overview

## Purpose

This document describes the build-time tooling used to prepare trail data for the Belknap Red-Line Tracker application. These scripts and utilities process raw geographic data (GPX files, elevation data, OpenStreetMap) into the structured format used by the app.

## Tool Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    Raw Data Sources                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   GPX Files     │   BRATTS XLS    │   OpenStreetMap             │
│  (AllTrails)    │   Workbook      │   (Overpass API)            │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processing Scripts                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ import-alltrails│ match-osm-trails│   enrich-elevation          │
│   -gpx.js       │      .js        │      .py                    │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         └─────────────────┼───────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/data/trails.json                                │
│         (Enriched trail data for the app)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Scripts Directory

```
scripts/
├── README.md                    # Script documentation
├── requirements.txt             # Python dependencies
├── import-alltrails-gpx.js      # GPX track import
├── import-alltrails-gpx-v2.js   # GPX import (alternate version)
├── match-osm-trails.js          # OSM trail matching
├── match-osm-trails-v2.js       # OSM matching (alternate version)
├── enrich-elevation.py          # Elevation from local DEM
├── enrich-elevation-api.py      # Elevation from API
└── fix-missing-elevation.cjs    # Patch missing elevation data
```

## Data Pipeline

### Step 1: Initial Trail Geometry

**Source:** GPX files exported from AllTrails or recorded GPS tracks

**Script:** `import-alltrails-gpx.js`

**Process:**
1. Parse GPX XML files to extract track points
2. Match GPX tracks to trails by name and proximity
3. Extract trail segments from longer GPX tracks
4. Simplify coordinates (reduce point density)
5. Calculate trail distance from geometry

**Input:**
```
data/gpx/
├── belknap-east-trail.gpx
├── gunstock-mountain.gpx
└── ...
```

**Output:**
```json
{
  "id": "belknap-east",
  "name": "East Trail",
  "coordinates": [
    { "lat": 43.5123, "lng": -71.3456 },
    { "lat": 43.5134, "lng": -71.3445 }
  ],
  "distance": 1.2
}
```

### Step 2: OSM Enrichment (Optional)

**Source:** OpenStreetMap via Overpass API

**Script:** `match-osm-trails.js`

**Process:**
1. Query OSM for hiking trails in Belknap Range
2. Match OSM ways to BRATTS trail names
3. Use OSM geometry when more accurate
4. Extract additional metadata (surface, access)

### Step 3: Elevation Enrichment

**Source:** USGS National Elevation Dataset (NED) or Open Topo Data API

**Scripts:**
- `enrich-elevation.py` - Local DEM files (recommended)
- `enrich-elevation-api.py` - API fallback

**Process:**
1. Load trail coordinates
2. Query elevation for each point
3. Calculate derived statistics:
   - Elevation gain (total ascent)
   - Elevation loss (total descent)
   - Min/max elevation
4. Write enriched data

**Output:**
```json
{
  "id": "belknap-east",
  "name": "East Trail",
  "coordinates": [
    { "lat": 43.5123, "lng": -71.3456, "elevation": 1100 },
    { "lat": 43.5134, "lng": -71.3445, "elevation": 1200 }
  ],
  "distance": 1.2,
  "elevationGain": 850,
  "elevationLoss": 50,
  "elevationMin": 1100,
  "elevationMax": 1900
}
```

## Script Details

### import-alltrails-gpx.js

**Purpose:** Import GPS track data from AllTrails GPX exports.

**Usage:**
```bash
node scripts/import-alltrails-gpx.js
```

**How it works:**
1. Scans `data/gpx/` directory for GPX files
2. Parses GPX XML to extract track points
3. Matches tracks to existing trails by:
   - Name similarity
   - Start/end point proximity
   - Total distance comparison
4. Extracts matching segment from GPX
5. Updates `src/data/trails.json`

**Key functions:**
- `parseGPX(filePath)` - Extract points and name from GPX
- `findClosestPoint(point, gpxPoints)` - Spatial matching
- `extractTrailSegment(trail, gpxPoints)` - Segment extraction

### match-osm-trails.js

**Purpose:** Match and enhance trails with OpenStreetMap data.

**Usage:**
```bash
node scripts/match-osm-trails.js
```

**How it works:**
1. Fetches hiking trails from OSM via Overpass API
2. Matches OSM ways to BRATTS trail names
3. Uses OSM geometry when higher quality
4. Extracts tags (surface, difficulty, etc.)

### enrich-elevation.py

**Purpose:** Add elevation data using local DEM files.

**Prerequisites:**
```bash
pip install -r scripts/requirements.txt
# Required: rasterio, numpy
```

**Usage:**
```bash
# Single DEM file
python scripts/enrich-elevation.py --dem data/elevation/ned.tif

# Multiple tiles
python scripts/enrich-elevation.py --dem data/elevation/*.tif

# All options
python scripts/enrich-elevation.py \
    --dem data/elevation/ned.tif \
    --input src/data/trails.json \
    --output src/data/trails-enriched.json \
    --verbose
```

**Getting DEM Data:**
1. Visit [USGS National Map Downloader](https://apps.nationalmap.gov/downloader/)
2. Navigate to trail area
3. Select "Elevation Products (3DEP)" > "1/3 arc-second DEM"
4. Download GeoTIFF tiles
5. Place in `data/elevation/`

### enrich-elevation-api.py

**Purpose:** Add elevation data via Open Topo Data API.

**Usage:**
```bash
# Default (NED 10m, USA)
python scripts/enrich-elevation-api.py

# Different dataset
python scripts/enrich-elevation-api.py --dataset srtm30m

# Dry run (estimate API calls)
python scripts/enrich-elevation-api.py --dry-run
```

**Datasets:**
| Dataset | Coverage | Resolution |
|---------|----------|------------|
| ned10m | USA | 10m |
| srtm30m | 60°N-60°S | 30m |
| aster30m | Global | 30m |

**Rate Limits:**
- 100 locations per request
- 1 request per second
- 1,000 calls per day

## Data Format

### trails.json

Final output format consumed by the app:

```json
[
  {
    "id": "belknap-east",
    "name": "East Trail",
    "distance": 1.2,
    "difficulty": "moderate",
    "area": "Belknap Mountain",
    "coordinates": [
      { "lat": 43.5123, "lng": -71.3456, "elevation": 1100 },
      { "lat": 43.5134, "lng": -71.3445, "elevation": 1200 }
    ],
    "trailhead": { "lat": 43.5123, "lng": -71.3456 },
    "elevationGain": 850,
    "elevationLoss": 50,
    "elevationMin": 1100,
    "elevationMax": 1900
  }
]
```

### loops.json

Pre-built itineraries referencing trail IDs:

```json
[
  {
    "id": "belknap-summit-loop",
    "name": "Belknap Summit Loop",
    "description": "A classic loop over Belknap Mountain...",
    "trailIds": ["belknap-east", "belknap-summit", "belknap-carriage"],
    "difficulty": "moderate",
    "estimatedTime": "3-4 hours",
    "highlights": ["Fire tower views", "Historic carriage road"]
  }
]
```

## Applying to Other Trail Systems

These tools are designed to be reusable for other trail systems:

1. **Prepare base trail data** in JSON format with coordinates
2. **Download DEM data** for your region from USGS or other sources
3. **Run elevation enrichment:**
   ```bash
   python scripts/enrich-elevation.py \
       --dem your-region/*.tif \
       --input your-trails.json \
       --output your-trails-enriched.json
   ```
4. **Update app configuration** (map center, bounds, branding)

## See Also

- [GPX Parsing](./gpx-parsing.md) - Detailed GPX import documentation
- [Trail Data Generation](./trail-data-generation.md) - Full pipeline details
- [Loop Generation](./loop-generation.md) - Creating loop itineraries
- [scripts/README.md](/scripts/README.md) - Quick reference
