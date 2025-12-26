# Belknap Range Red-Line Tracker - Research Document

## Purpose
This document tracks research questions, sources investigated, and findings related to the development of the Belknap Range red-line tracking application.

---

## Research Questions

### Q1: How to acquire GPS coordinates for Belknap Range trails?

**Date Researched**: 2025-10-24

**Search Queries Used**:
1. "Belknap Range NH trails GPS coordinates data sources"
2. "New Hampshire trail GPS GPX data download hiking"
3. "Belknap Range trail map GIS shapefile"

**Sources Investigated**:

#### Primary Sources (Belknap-Specific):

1. **Trailforks - Belknap Range Trails**
   - URL: https://www.trailforks.com/region/belknap-range-trails-50803/
   - Data Format: GPX & KML downloads available
   - Coverage: Belknap Range trails specifically mapped
   - Cost: Free (account required)
   - **Assessment**: ⭐ BEST OPTION - Direct trail GPS data in standard formats

2. **Belknap Range Trails Official Website**
   - URL: https://belknaprangetrails.org/belknap-range-trail-map/
   - Download: https://belknaprangetrails.org/wp-content/uploads/2023/05/Belknap-Range-2022-V5-two-sided.pdf
   - Data Format: Georeferenced PDF map (11" x 17")
   - Coverage: Complete Belknap Range trail system
   - Cost: Free download
   - **Assessment**: Official source, georeferenced PDF could be converted to coordinates

3. **Lakes Region Conservation Trust (LRCT)**
   - URL: https://lrct.org/shop
   - Product: 2024 Belknap Range Trail Hiking Map (waterproof)
   - Data Format: Physical map with color-coded trails, descriptions, distances, difficulties, elevations
   - Cost: Purchase required (~$10-15 typically)
   - **Assessment**: May have digital GIS data available if contacted directly; official map publisher

4. **TrailsNH - Belknap Mountain**
   - URL: https://trailsnh.com/hike/n/357717914/Belknap-Mountain-NH
   - Data Format: Maps based on OpenStreetMap data
   - Tools: References GAIA GPS Map, Google Maps, USGS topoView
   - Cost: Free
   - **Assessment**: Secondary source using OSM data

5. **TopoZone - Belknap Mountains**
   - URL: https://www.topozone.com/new-hampshire/belknap-nh/range/belknap-mountains/
   - Data: General coordinates for Belknap Mountains
   - Specific Waypoint: 43.5178556°N, -71.3692375°W, ~2,382 ft elevation
   - **Assessment**: Good for general area reference, not individual trail data

#### Secondary Sources (General NH Trails):

6. **ExpertGPS - NH Trails Database**
   - URL: https://www.expertgps.com/data/nh/trails.asp
   - Data Format: GPX files for 361 NH trails
   - Coverage: Statewide NH
   - Cost: Free with ExpertGPS software
   - **Assessment**: May include some Belknap trails; worth checking

7. **OpenStreetMap (OSM)**
   - Coverage: Varies by area; TrailsNH uses OSM as base data
   - Data Format: Multiple formats available (GeoJSON, XML, etc.)
   - Tools: Overpass API for querying specific trail data
   - Cost: Free and open source
   - **Assessment**: Good fallback/verification source; coverage quality varies

8. **White Mountains Trailhead GPS Data**
   - URL: https://bmhatfield.github.io/white-mountains/gps-trailheads.html
   - Data Format: GPX and KMZ formats
   - Coverage: White Mountains 4,000 footers and AT trailheads
   - **Assessment**: Likely doesn't cover Belknap Range (different area)

9. **Gaia GPS**
   - URL: https://blog.gaiagps.com/maps-and-tracks-appalachian-trail/
   - Data: Appalachian Trail Conservancy data (GPX/KML)
   - Last Updated: 2016 (may be outdated)
   - **Assessment**: Not relevant to Belknap Range

10. **New England Hiker App**
    - Platform: iPhone and Android
    - Coverage: AMC White Mountain Guide trails
    - **Assessment**: Likely doesn't cover Belknap Range

**Findings Summary**:

✅ **Available Data Formats**:
- GPX files (Trailforks, potentially ExpertGPS)
- KML files (Trailforks)
- Georeferenced PDF (Official Belknap Range Trails site)
- OpenStreetMap data (various formats)

✅ **Best Data Sources**:
1. **Primary**: Trailforks GPX/KML downloads
2. **Secondary**: Official georeferenced PDF from belknaprangetrails.org
3. **Verification**: OpenStreetMap data

❓ **Open Questions**:
- What is the completeness/accuracy of Trailforks data for Belknap Range?
- Can we contact LRCT for GIS shapefiles or raw trail data?
- How well does OSM coverage match official trail maps?
- Are there any NH state GIS databases with trail data?

**Recommended Approach**:

1. **Phase 1 - Data Acquisition**:
   - Download Trailforks GPX/KML data for Belknap Range
   - Download official PDF map from belknaprangetrails.org
   - Query OpenStreetMap for Belknap Range area trails

2. **Phase 2 - Data Validation**:
   - Compare Trailforks data against official PDF map
   - Cross-reference with OSM data
   - Identify any gaps or discrepancies

3. **Phase 3 - Data Processing**:
   - Convert all sources to standardized GeoJSON format
   - Merge and deduplicate trail data
   - Add metadata (trail names, distances, difficulty)

4. **Phase 4 - Data Enhancement** (if needed):
   - Contact LRCT for official GIS data
   - Manual GPS recording for any missing trails
   - Community contribution for trail condition updates

**Next Steps**:
- [ ] Create Trailforks account and download Belknap Range GPX data
- [ ] Download official PDF map and examine georeferencing
- [ ] Set up OSM Overpass query for Belknap Range bounding box
- [ ] Compare data sources for completeness and accuracy

---

## Future Research Questions

### Q2: What technology stack is best for this application?
**Status**: Not yet researched
**Priority**: High
**Notes**: Need to evaluate PWA vs React Native vs Native development

### Q3: What offline mapping solutions are available?
**Status**: Not yet researched
**Priority**: High
**Notes**: Need to research Leaflet, Mapbox, and open-source alternatives for offline tile caching

### Q4: What are the best practices for battery-efficient GPS tracking?
**Status**: Not yet researched
**Priority**: Medium
**Notes**: Need to research background location tracking on iOS/Android

### Q5: Are there existing red-line tracking apps we can learn from?
**Status**: Not yet researched
**Priority**: Medium
**Notes**: Study existing hiking apps like AllTrails, Gaia GPS, PeakVisor, etc.

---

### Q6: What are the best sources for trail elevation data?

**Date Researched**: 2025-12-21

**Context**:
The app needs elevation profile data for trail visualization. Current trail data has coordinates but no per-point elevation. Options include runtime API calls or pre-computing elevation data for offline support.

**Sources Investigated**:

#### Free Elevation APIs

1. **Open Topo Data** ⭐ RECOMMENDED
   - URL: https://www.opentopodata.org/
   - API Docs: https://www.opentopodata.org/api/
   - GitHub: https://github.com/ajnisbet/opentopodata
   - **Features**:
     - REST API compatible with Google Maps Elevation API
     - Multiple datasets: SRTM (90m), ASTER (30m), NED (10m for US), EU-DEM, etc.
     - Can self-host with Docker for unlimited requests
     - Public API: 100 locations/request, 1 req/sec, 1000 calls/day
   - **Data Quality**: 10m resolution for US via NED dataset
   - **Assessment**: Best option for pre-computing elevation - can self-host for batch processing

2. **Open-Elevation**
   - URL: https://open-elevation.com/
   - Wiki: https://wiki.openstreetmap.org/wiki/Open-Elevation
   - **Features**:
     - Free public API based on SRTM dataset
     - Open source (GPLv2), Docker image available
     - Simple REST API: POST array of lat/lng, get elevations
   - **Limits**: 1,000 requests/month on public API
   - **Assessment**: Good for small batch jobs; SRTM resolution (~30m) may be sufficient

3. **GPXZ Elevation API**
   - URL: https://www.gpxz.io/
   - **Features**:
     - High-resolution data (Copernicus 30m base + LiDAR where available)
     - Batch location queries and elevation profiles
     - Ocean depth from GEBCO 2023
   - **Pricing**: Free tier available, paid plans for higher volume
   - **Assessment**: Good quality, but may have usage limits

4. **OpenTopography**
   - URL: https://opentopography.org/developers
   - **Features**:
     - Access to global DEMs: SRTM, ALOS World 3D, Copernicus Global DSM
     - REST API with OpenAPI specification
     - High-resolution LiDAR data for some regions
   - **Limits**: API key required
   - **Assessment**: Academic/research focused; good data quality

#### Downloadable Elevation Datasets (For Pre-Processing)

5. **USGS 3DEP / National Elevation Dataset (NED)** ⭐ BEST FOR NH
   - Download: https://apps.nationalmap.gov/downloader/
   - **Features**:
     - 1/3 arc-second (~10m) resolution for continental US
     - 1/9 arc-second (~3m) in some areas
     - Cloud Optimized GeoTIFF (COG) format
     - Public domain, free to use
   - **Coverage**: Complete US coverage including New Hampshire
   - **Assessment**: Best resolution for Belknap Range; can download NH tiles and process locally

6. **Copernicus Global DEM**
   - URL: https://spacedata.copernicus.eu/
   - **Features**:
     - 30m resolution global coverage
     - Free for research and commercial use
   - **Assessment**: Good backup option; slightly lower resolution than NED for US

7. **SRTM (Shuttle Radar Topography Mission)**
   - **Features**:
     - 30m (1 arc-second) for US, 90m (3 arc-second) globally
     - Well-established, widely used dataset
     - ~18GB for complete US coverage
   - **Assessment**: Adequate resolution; very well-documented

**Findings Summary**:

✅ **For Offline-First App (Recommended)**:
Pre-compute elevation data and embed in trails.json:
1. Download USGS NED tiles for Belknap Range area (~43.4°N to 43.6°N, -71.5°W to -71.2°W)
2. Use GDAL or Python (rasterio) to sample elevation at each trail coordinate
3. Add `elevation` field to each coordinate in trails.json

✅ **For Runtime API (If Needed)**:
Use Open Topo Data public API or self-hosted instance:
```
GET https://api.opentopodata.org/v1/ned10m?locations=43.52,-71.34|43.53,-71.35
```

**Recommended Approach**:

1. **Phase 1 - Data Acquisition**:
   - Download NED 1/3 arc-second tiles for NH from USGS National Map
   - Tiles needed: Approximately 4 tiles covering Belknap Range

2. **Phase 2 - Processing Script**:
   ```python
   # Pseudocode for elevation enrichment
   import rasterio
   import json

   dem = rasterio.open('ned_nh.tif')
   trails = json.load('trails.json')

   for trail in trails:
       for coord in trail['coordinates']:
           coord['elevation'] = sample_elevation(dem, coord['lat'], coord['lng'])

       # Calculate elevation gain
       trail['elevationGain'] = calculate_gain(trail['coordinates'])
   ```

3. **Phase 3 - Data Enhancement**:
   - Add `elevation` (feet) to each coordinate point
   - Calculate and store `elevationGain` and `elevationLoss` per trail
   - Generate elevation profile data for visualization

**Data Size Estimate**:
- Current trails.json: ~200KB
- With elevation per point: ~250KB (+25%)
- Acceptable for offline PWA

**Next Steps**:
- [ ] Download NED tiles from USGS National Map Downloader
- [ ] Create Python script to sample elevation at trail coordinates
- [ ] Update trails.json schema to include elevation data
- [ ] Add elevation profile visualization component

---

## Research Log

| Date | Question | Status | Outcome |
|------|----------|--------|---------|
| 2025-10-24 | GPS coordinates acquisition | ✅ Complete | Found Trailforks, official PDF, and OSM sources |
| 2025-12-21 | Trail elevation data sources | ✅ Complete | Recommend USGS NED for pre-processing, Open Topo Data API for runtime |

---

## Resources & References

### Belknap Range Specific
- Belknap Range Trails Organization: https://belknaprangetrails.org/
- Lakes Region Conservation Trust: https://lrct.org/
- Trailforks Belknap Range: https://www.trailforks.com/region/belknap-range-trails-50803/

### NH Hiking Resources
- TrailsNH: https://trailsnh.com/
- ExpertGPS NH Data: https://www.expertgps.com/data/nh/trails.asp

### Mapping & GPS Tools
- OpenStreetMap: https://www.openstreetmap.org/
- Overpass Turbo (OSM Query): https://overpass-turbo.eu/
- QGIS (GIS Software): https://qgis.org/

### Technical Resources
- GeoJSON Specification: https://geojson.org/
- Leaflet.js Documentation: https://leafletjs.com/
- Mapbox Documentation: https://docs.mapbox.com/

### Elevation Data Sources
- Open Topo Data (API): https://www.opentopodata.org/
- Open-Elevation (API): https://open-elevation.com/
- USGS National Map Downloader: https://apps.nationalmap.gov/downloader/
- OpenTopography: https://opentopography.org/
- GPXZ Elevation API: https://www.gpxz.io/
- Copernicus DEM: https://spacedata.copernicus.eu/

---

## Notes & Observations

- The Belknap Range has active trail maintenance and mapping through official organizations (LRCT, Belknap Range Trails)
- Multiple data sources are available, which is good for validation
- Standard GPS data formats (GPX, KML, GeoJSON) are well-supported
- May need to reach out to LRCT for most authoritative data source
