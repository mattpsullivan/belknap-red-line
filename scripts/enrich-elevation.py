#!/usr/bin/env python3
"""
Elevation Enrichment Script

Enriches trail coordinate data with elevation values from a Digital Elevation Model (DEM).
Designed to work with USGS NED GeoTIFF files or other raster elevation sources.

Usage:
    python scripts/enrich-elevation.py --dem data/elevation/ned_belknap.tif
    python scripts/enrich-elevation.py --dem data/elevation/*.tif --output src/data/trails-enriched.json

Requirements:
    pip install -r scripts/requirements.txt

Data Sources:
    - USGS NED: https://apps.nationalmap.gov/downloader/
    - Download 1/3 arc-second (~10m) tiles for your area
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

try:
    import numpy as np
    import rasterio
    from rasterio.merge import merge
    from rasterio.io import MemoryFile
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install -r scripts/requirements.txt")
    sys.exit(1)


def load_dem(dem_paths: list[str]) -> rasterio.DatasetReader:
    """
    Load one or more DEM files. If multiple files provided, merge them.

    Args:
        dem_paths: List of paths to GeoTIFF DEM files

    Returns:
        rasterio dataset reader
    """
    if len(dem_paths) == 1:
        return rasterio.open(dem_paths[0])

    # Multiple files - merge them
    print(f"Merging {len(dem_paths)} DEM tiles...")
    datasets = [rasterio.open(p) for p in dem_paths]
    mosaic, transform = merge(datasets)

    # Create in-memory dataset
    profile = datasets[0].profile.copy()
    profile.update(
        height=mosaic.shape[1],
        width=mosaic.shape[2],
        transform=transform
    )

    memfile = MemoryFile()
    with memfile.open(**profile) as mem_dataset:
        mem_dataset.write(mosaic)

    # Close source datasets
    for ds in datasets:
        ds.close()

    return memfile.open()


def sample_elevation(dem: rasterio.DatasetReader, lat: float, lng: float) -> Optional[float]:
    """
    Sample elevation at a given coordinate.

    Args:
        dem: Rasterio dataset
        lat: Latitude in degrees
        lng: Longitude in degrees

    Returns:
        Elevation in meters, or None if outside DEM bounds
    """
    try:
        # Convert lat/lng to pixel coordinates
        # Note: rasterio uses (x, y) = (lng, lat)
        row, col = dem.index(lng, lat)

        # Check bounds
        if row < 0 or row >= dem.height or col < 0 or col >= dem.width:
            return None

        # Read elevation value
        elevation = dem.read(1)[row, col]

        # Handle nodata values
        if dem.nodata is not None and elevation == dem.nodata:
            return None

        return float(elevation)
    except Exception:
        return None


def meters_to_feet(meters: float) -> float:
    """Convert meters to feet."""
    return meters * 3.28084


def calculate_distance(coord1: dict, coord2: dict) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.

    Returns:
        Distance in meters
    """
    from math import radians, sin, cos, sqrt, atan2

    R = 6371000  # Earth's radius in meters

    lat1, lng1 = radians(coord1['lat']), radians(coord1['lng'])
    lat2, lng2 = radians(coord2['lat']), radians(coord2['lng'])

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    return R * c


def calculate_elevation_stats(coordinates: list[dict]) -> tuple[int, int, int, int]:
    """
    Calculate elevation statistics from enriched coordinates.

    Args:
        coordinates: List of coordinate dicts with 'elevation' field (in feet)

    Returns:
        Tuple of (elevation_gain, elevation_loss, min_elevation, max_elevation)
    """
    elevations = [c.get('elevation') for c in coordinates if c.get('elevation') is not None]

    if len(elevations) < 2:
        return 0, 0, 0, 0

    gain = 0
    loss = 0

    for i in range(1, len(elevations)):
        delta = elevations[i] - elevations[i-1]
        if delta > 0:
            gain += delta
        else:
            loss += abs(delta)

    return (
        round(gain),
        round(loss),
        round(min(elevations)),
        round(max(elevations))
    )


def enrich_trail(trail: dict, dem: rasterio.DatasetReader, verbose: bool = False) -> dict:
    """
    Enrich a single trail with elevation data.

    Args:
        trail: Trail dictionary with 'coordinates' array
        dem: Rasterio dataset
        verbose: Print progress

    Returns:
        Enriched trail dictionary
    """
    coordinates = trail.get('coordinates', [])
    if not coordinates:
        return trail

    enriched_coords = []
    sampled_count = 0

    for coord in coordinates:
        lat, lng = coord['lat'], coord['lng']
        elevation_m = sample_elevation(dem, lat, lng)

        new_coord = {'lat': lat, 'lng': lng}

        if elevation_m is not None:
            new_coord['elevation'] = round(meters_to_feet(elevation_m))
            sampled_count += 1

        enriched_coords.append(new_coord)

    # Calculate stats
    gain, loss, min_elev, max_elev = calculate_elevation_stats(enriched_coords)

    # Build enriched trail
    enriched = trail.copy()
    enriched['coordinates'] = enriched_coords
    enriched['elevationGain'] = gain
    enriched['elevationLoss'] = loss
    enriched['elevationMin'] = min_elev
    enriched['elevationMax'] = max_elev

    if verbose:
        coverage = (sampled_count / len(coordinates) * 100) if coordinates else 0
        print(f"  {trail['name']}: {sampled_count}/{len(coordinates)} points ({coverage:.0f}%), "
              f"+{gain}ft/-{loss}ft, range {min_elev}-{max_elev}ft")

    return enriched


def enrich_trails(
    trails: list[dict],
    dem: rasterio.DatasetReader,
    verbose: bool = False
) -> list[dict]:
    """
    Enrich all trails with elevation data.

    Args:
        trails: List of trail dictionaries
        dem: Rasterio dataset
        verbose: Print progress

    Returns:
        List of enriched trail dictionaries
    """
    enriched = []

    for i, trail in enumerate(trails):
        if verbose:
            print(f"Processing trail {i+1}/{len(trails)}: {trail.get('name', 'Unknown')}")

        enriched.append(enrich_trail(trail, dem, verbose))

    return enriched


def main():
    parser = argparse.ArgumentParser(
        description='Enrich trail data with elevation from DEM files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Single DEM file
    python scripts/enrich-elevation.py --dem data/elevation/ned.tif

    # Multiple DEM tiles (merged automatically)
    python scripts/enrich-elevation.py --dem data/elevation/*.tif

    # Custom input/output
    python scripts/enrich-elevation.py \\
        --dem data/elevation/ned.tif \\
        --input my-trails.json \\
        --output my-trails-enriched.json

Data Sources:
    Download USGS NED tiles from: https://apps.nationalmap.gov/downloader/
    Select "Elevation Products (3DEP)" > "1/3 arc-second DEM"
        """
    )

    parser.add_argument(
        '--dem', '-d',
        nargs='+',
        required=True,
        help='Path(s) to DEM GeoTIFF file(s). Multiple files will be merged.'
    )

    parser.add_argument(
        '--input', '-i',
        default='src/data/trails.json',
        help='Input trails JSON file (default: src/data/trails.json)'
    )

    parser.add_argument(
        '--output', '-o',
        default=None,
        help='Output trails JSON file (default: overwrites input)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Print detailed progress'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Process but do not write output'
    )

    args = parser.parse_args()

    # Validate DEM files exist
    dem_paths = []
    for pattern in args.dem:
        path = Path(pattern)
        if path.exists():
            dem_paths.append(str(path))
        else:
            # Try glob
            matches = list(Path('.').glob(pattern))
            if not matches:
                print(f"Error: DEM file not found: {pattern}")
                sys.exit(1)
            dem_paths.extend(str(m) for m in matches)

    if not dem_paths:
        print("Error: No DEM files found")
        sys.exit(1)

    print(f"Loading {len(dem_paths)} DEM file(s)...")
    for p in dem_paths:
        print(f"  - {p}")

    # Load DEM
    dem = load_dem(dem_paths)
    print(f"DEM loaded: {dem.width}x{dem.height} pixels, CRS: {dem.crs}")
    print(f"Bounds: {dem.bounds}")

    # Load trails
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    print(f"\nLoading trails from {args.input}...")
    with open(input_path) as f:
        trails = json.load(f)

    print(f"Loaded {len(trails)} trails")

    # Enrich trails
    print("\nEnriching trails with elevation data...")
    enriched = enrich_trails(trails, dem, verbose=args.verbose)

    # Summary stats
    total_coords = sum(len(t.get('coordinates', [])) for t in enriched)
    coords_with_elev = sum(
        sum(1 for c in t.get('coordinates', []) if c.get('elevation') is not None)
        for t in enriched
    )

    print(f"\nSummary:")
    print(f"  Trails processed: {len(enriched)}")
    print(f"  Coordinates: {coords_with_elev}/{total_coords} with elevation ({coords_with_elev/total_coords*100:.1f}%)")

    # Calculate totals
    total_gain = sum(t.get('elevationGain', 0) for t in enriched)
    total_loss = sum(t.get('elevationLoss', 0) for t in enriched)
    print(f"  Total elevation gain: {total_gain:,} ft")
    print(f"  Total elevation loss: {total_loss:,} ft")

    # Write output
    if args.dry_run:
        print("\nDry run - no files written")
    else:
        output_path = Path(args.output) if args.output else input_path
        print(f"\nWriting to {output_path}...")

        with open(output_path, 'w') as f:
            json.dump(enriched, f, indent=2)

        print(f"Done! File size: {output_path.stat().st_size:,} bytes")

    dem.close()


if __name__ == '__main__':
    main()
