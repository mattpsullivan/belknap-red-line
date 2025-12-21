# Scripts

Utility scripts for processing and enriching trail data.

## Setup

Install Python dependencies:

```bash
pip install -r scripts/requirements.txt
```

## Elevation Enrichment

Two scripts are available for adding elevation data to trails:

### Option 1: Local DEM Files (Recommended)

Uses local GeoTIFF elevation files for fast, unlimited processing.

```bash
# Single DEM file
python scripts/enrich-elevation.py --dem data/elevation/ned_belknap.tif

# Multiple tiles (auto-merged)
python scripts/enrich-elevation.py --dem data/elevation/*.tif

# With options
python scripts/enrich-elevation.py \
    --dem data/elevation/ned.tif \
    --input src/data/trails.json \
    --output src/data/trails-enriched.json \
    --verbose
```

**Getting DEM Data:**

1. Go to [USGS National Map Downloader](https://apps.nationalmap.gov/downloader/)
2. Navigate to your trail area
3. Select "Elevation Products (3DEP)" > "1/3 arc-second DEM"
4. Download the GeoTIFF tiles covering your area
5. Place in `data/elevation/` directory

For Belknap Range (NH):
- Bounding box: ~43.4°N to 43.6°N, -71.5°W to -71.2°W
- Resolution: 1/3 arc-second (~10m)
- Approximate download size: 50-100MB per tile

### Option 2: API-Based (Fallback)

Uses [Open Topo Data](https://www.opentopodata.org/) API. Slower but requires no local data.

```bash
# Default: NED 10m dataset (USA)
python scripts/enrich-elevation-api.py

# SRTM for global coverage
python scripts/enrich-elevation-api.py --dataset srtm30m

# Estimate API calls without making requests
python scripts/enrich-elevation-api.py --dry-run
```

**Available Datasets:**
| Dataset | Coverage | Resolution |
|---------|----------|------------|
| `ned10m` | USA | 10m |
| `srtm30m` | 60°N to 60°S | 30m |
| `srtm90m` | 60°N to 60°S | 90m |
| `aster30m` | Global | 30m |
| `eudem25m` | Europe | 25m |

**API Rate Limits:**
- 100 locations per request
- 1 request per second
- 1,000 calls per day

For large datasets, use the local DEM script or [self-host Open Topo Data](https://github.com/ajnisbet/opentopodata).

## Output Format

Both scripts add the following fields to each trail:

```json
{
  "name": "Blue Trail",
  "coordinates": [
    { "lat": 43.52, "lng": -71.34, "elevation": 1420 },
    { "lat": 43.521, "lng": -71.341, "elevation": 1485 }
  ],
  "elevationGain": 842,
  "elevationLoss": 312,
  "elevationMin": 1180,
  "elevationMax": 2382
}
```

- `elevation`: Feet above sea level (per coordinate)
- `elevationGain`: Total feet climbed
- `elevationLoss`: Total feet descended
- `elevationMin`: Lowest point on trail
- `elevationMax`: Highest point on trail

## Other Scripts

### match-osm-trails.js

Matches trails from BRATTS workbook with OpenStreetMap data.

```bash
node scripts/match-osm-trails.js
```

### import-alltrails-gpx.js

Imports GPX tracks from AllTrails to improve trail coordinate data.

```bash
node scripts/import-alltrails-gpx.js
```

## Data Directory Structure

```
data/
├── elevation/           # DEM GeoTIFF files (gitignored)
│   ├── ned_belknap.tif
│   └── ...
├── gpx/                 # GPX track files
└── Belknap_Range_Redlining_2023v1.xls  # BRATTS workbook
```

## Applying to Other Trail Systems

These scripts are designed to work with any trail dataset in the same JSON format:

```json
[
  {
    "id": "trail-id",
    "name": "Trail Name",
    "coordinates": [
      { "lat": 43.0, "lng": -71.0 },
      { "lat": 43.1, "lng": -71.1 }
    ]
  }
]
```

To use with a different trail system:

1. Prepare your trails in the above JSON format
2. Download DEM data for your region from USGS or other sources
3. Run the enrichment script:
   ```bash
   python scripts/enrich-elevation.py \
       --dem your-dem-tiles/*.tif \
       --input your-trails.json \
       --output your-trails-enriched.json
   ```
