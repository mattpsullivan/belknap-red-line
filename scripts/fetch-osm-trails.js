#!/usr/bin/env node

/**
 * Fetch trail data from OpenStreetMap Overpass API
 *
 * This script fetches all paths, tracks, and footways in the Belknap Range area
 * and saves them to a JSON file for processing by match-osm-trails-v2.js
 *
 * Usage:
 *   node scripts/fetch-osm-trails.js
 *   node scripts/fetch-osm-trails.js --output /path/to/output.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Belknap Range bounding box (slightly expanded for complete coverage)
const BBOX = {
  south: 43.40,
  west: -71.55,
  north: 43.62,
  east: -71.20
};

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Build Overpass QL query
const query = `
[out:json][timeout:120];
(
  // Named paths and trails
  way["highway"="path"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["highway"="footway"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["highway"="track"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});

  // Named hiking routes
  relation["route"="hiking"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});

  // All paths (including unnamed) for completeness
  way["highway"="path"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["highway"="footway"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out body geom;
>;
out skel qt;
`;

async function fetchOsmData() {
  console.log('Fetching OSM trail data for Belknap Range...');
  console.log(`Bounding box: ${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`);
  console.log(`API: ${OVERPASS_API}`);
  console.log('');

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Count named vs unnamed trails
    const namedTrails = data.elements.filter(el => el.tags?.name);
    const unnamedTrails = data.elements.filter(el => el.type === 'way' && !el.tags?.name);

    console.log(`Fetched ${data.elements.length} total elements`);
    console.log(`  - Named trails/paths: ${namedTrails.length}`);
    console.log(`  - Unnamed paths: ${unnamedTrails.length}`);
    console.log('');

    // List named trails found
    console.log('Named trails found:');
    const trailNames = [...new Set(namedTrails.map(el => el.tags.name))].sort();
    trailNames.forEach(name => {
      const count = namedTrails.filter(el => el.tags.name === name).length;
      console.log(`  - ${name}${count > 1 ? ` (${count} segments)` : ''}`);
    });
    console.log('');

    return data;
  } catch (error) {
    console.error('Error fetching OSM data:', error.message);
    throw error;
  }
}

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  let outputPath = '/tmp/osm_trails_broad.json';

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = args[outputIndex + 1];
  }

  console.log('='.repeat(60));
  console.log('OSM Trail Data Fetcher');
  console.log('='.repeat(60));
  console.log('');

  const data = await fetchOsmData();

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Saved to: ${outputPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/match-osm-trails-v2.js');
  console.log('  2. Review the matching output');
  console.log('  3. Run elevation enrichment if needed');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
