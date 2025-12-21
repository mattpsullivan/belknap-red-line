#!/usr/bin/env python3
"""
Elevation Enrichment Script (API-based)

Enriches trail coordinate data with elevation values from the Open Topo Data API.
Use this when you don't have local DEM files available.

Usage:
    python scripts/enrich-elevation-api.py
    python scripts/enrich-elevation-api.py --dataset ned10m --output src/data/trails-enriched.json

Requirements:
    pip install -r scripts/requirements.txt

API Documentation:
    https://www.opentopodata.org/api/

Rate Limits (Public API):
    - Max 100 locations per request
    - Max 1 request per second
    - Max 1000 calls per day

For heavy usage, consider self-hosting: https://github.com/ajnisbet/opentopodata
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    print("Error: requests package not installed.")
    print("Run: pip install -r scripts/requirements.txt")
    sys.exit(1)


# API configuration
API_BASE_URL = "https://api.opentopodata.org/v1"
MAX_LOCATIONS_PER_REQUEST = 100
REQUEST_DELAY_SECONDS = 1.1  # Slightly over 1 second to respect rate limits


# Available datasets on public API
DATASETS = {
    'ned10m': 'USGS NED 10m (USA only, best resolution)',
    'aster30m': 'ASTER Global 30m',
    'srtm30m': 'SRTM 30m (between 60°N and 60°S)',
    'srtm90m': 'SRTM 90m (between 60°N and 60°S)',
    'eudem25m': 'EU-DEM 25m (Europe only)',
    'mapzen': 'Mapzen Global (mix of sources)',
}


def fetch_elevations(
    coordinates: list[dict],
    dataset: str = 'ned10m',
    verbose: bool = False
) -> list[Optional[float]]:
    """
    Fetch elevations for a list of coordinates from Open Topo Data API.

    Args:
        coordinates: List of {'lat': float, 'lng': float} dicts
        dataset: Dataset name (e.g., 'ned10m', 'srtm30m')
        verbose: Print progress

    Returns:
        List of elevations in meters (None for failed lookups)
    """
    elevations = []

    # Process in batches
    for i in range(0, len(coordinates), MAX_LOCATIONS_PER_REQUEST):
        batch = coordinates[i:i + MAX_LOCATIONS_PER_REQUEST]

        # Build locations string
        locations = '|'.join(f"{c['lat']},{c['lng']}" for c in batch)

        url = f"{API_BASE_URL}/{dataset}"
        params = {'locations': locations}

        if verbose:
            print(f"    Fetching batch {i//MAX_LOCATIONS_PER_REQUEST + 1} "
                  f"({len(batch)} points)...")

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK':
                print(f"    Warning: API error - {data.get('error', 'Unknown error')}")
                elevations.extend([None] * len(batch))
            else:
                for result in data.get('results', []):
                    elev = result.get('elevation')
                    elevations.append(elev if elev is not None else None)

        except requests.exceptions.RequestException as e:
            print(f"    Warning: Request failed - {e}")
            elevations.extend([None] * len(batch))

        # Rate limiting
        if i + MAX_LOCATIONS_PER_REQUEST < len(coordinates):
            time.sleep(REQUEST_DELAY_SECONDS)

    return elevations


def meters_to_feet(meters: float) -> float:
    """Convert meters to feet."""
    return meters * 3.28084


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


def enrich_trail(
    trail: dict,
    dataset: str = 'ned10m',
    verbose: bool = False
) -> dict:
    """
    Enrich a single trail with elevation data from API.

    Args:
        trail: Trail dictionary with 'coordinates' array
        dataset: Open Topo Data dataset name
        verbose: Print progress

    Returns:
        Enriched trail dictionary
    """
    coordinates = trail.get('coordinates', [])
    if not coordinates:
        return trail

    if verbose:
        print(f"  {trail.get('name', 'Unknown')}: {len(coordinates)} points")

    # Fetch elevations
    elevations = fetch_elevations(coordinates, dataset, verbose)

    # Build enriched coordinates
    enriched_coords = []
    sampled_count = 0

    for coord, elev_m in zip(coordinates, elevations):
        new_coord = {'lat': coord['lat'], 'lng': coord['lng']}

        if elev_m is not None:
            new_coord['elevation'] = round(meters_to_feet(elev_m))
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
        print(f"    Result: {sampled_count}/{len(coordinates)} ({coverage:.0f}%), "
              f"+{gain}ft/-{loss}ft, range {min_elev}-{max_elev}ft")

    return enriched


def estimate_api_calls(trails: list[dict]) -> int:
    """Estimate number of API calls needed."""
    total_coords = sum(len(t.get('coordinates', [])) for t in trails)
    return (total_coords + MAX_LOCATIONS_PER_REQUEST - 1) // MAX_LOCATIONS_PER_REQUEST


def main():
    parser = argparse.ArgumentParser(
        description='Enrich trail data with elevation from Open Topo Data API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Available datasets:
{chr(10).join(f'  {k}: {v}' for k, v in DATASETS.items())}

Examples:
    # Use default NED 10m dataset (USA)
    python scripts/enrich-elevation-api.py

    # Use SRTM for global coverage
    python scripts/enrich-elevation-api.py --dataset srtm30m

    # Custom input/output
    python scripts/enrich-elevation-api.py --input my-trails.json --output enriched.json

Note: Public API has rate limits. For large datasets, consider:
    1. Using the local DEM script: enrich-elevation.py
    2. Self-hosting Open Topo Data: https://github.com/ajnisbet/opentopodata
        """
    )

    parser.add_argument(
        '--dataset', '-d',
        default='ned10m',
        choices=DATASETS.keys(),
        help='Elevation dataset to use (default: ned10m)'
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
        help='Estimate API calls without making requests'
    )

    args = parser.parse_args()

    # Load trails
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    print(f"Loading trails from {args.input}...")
    with open(input_path) as f:
        trails = json.load(f)

    print(f"Loaded {len(trails)} trails")

    # Estimate API usage
    total_coords = sum(len(t.get('coordinates', [])) for t in trails)
    estimated_calls = estimate_api_calls(trails)
    estimated_time = estimated_calls * REQUEST_DELAY_SECONDS

    print(f"\nDataset: {args.dataset} - {DATASETS[args.dataset]}")
    print(f"Total coordinates: {total_coords:,}")
    print(f"Estimated API calls: {estimated_calls}")
    print(f"Estimated time: {estimated_time/60:.1f} minutes")

    if args.dry_run:
        print("\nDry run - no API calls made")
        return

    if estimated_calls > 1000:
        print("\nWarning: This exceeds the daily API limit (1000 calls).")
        print("Consider using the local DEM script instead: enrich-elevation.py")
        response = input("Continue anyway? [y/N] ")
        if response.lower() != 'y':
            sys.exit(0)

    # Enrich trails
    print("\nEnriching trails with elevation data...")
    enriched = []

    for i, trail in enumerate(trails):
        print(f"\nProcessing trail {i+1}/{len(trails)}: {trail.get('name', 'Unknown')}")
        enriched.append(enrich_trail(trail, args.dataset, args.verbose))

    # Summary stats
    coords_with_elev = sum(
        sum(1 for c in t.get('coordinates', []) if c.get('elevation') is not None)
        for t in enriched
    )

    print(f"\n{'='*50}")
    print(f"Summary:")
    print(f"  Trails processed: {len(enriched)}")
    print(f"  Coordinates: {coords_with_elev}/{total_coords} with elevation "
          f"({coords_with_elev/total_coords*100:.1f}%)")

    # Calculate totals
    total_gain = sum(t.get('elevationGain', 0) for t in enriched)
    total_loss = sum(t.get('elevationLoss', 0) for t in enriched)
    print(f"  Total elevation gain: {total_gain:,} ft")
    print(f"  Total elevation loss: {total_loss:,} ft")

    # Write output
    output_path = Path(args.output) if args.output else input_path
    print(f"\nWriting to {output_path}...")

    with open(output_path, 'w') as f:
        json.dump(enriched, f, indent=2)

    print(f"Done! File size: {output_path.stat().st_size:,} bytes")


if __name__ == '__main__':
    main()
