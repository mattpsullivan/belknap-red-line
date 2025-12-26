#!/usr/bin/env node
/**
 * Re-enrich elevation data for trails with updated coordinates
 * Uses Open Topo Data API
 *
 * Usage: node scripts/enrich-updated-trails.cjs [trail-id-1] [trail-id-2] ...
 *        node scripts/enrich-updated-trails.cjs --all  (re-enrich all trails)
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.opentopodata.org/v1/ned10m';
const BATCH_SIZE = 100;
const DELAY_MS = 2000; // 2 seconds between requests to respect rate limits

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchElevations(coordinates) {
  const locations = coordinates.map(c => `${c.lat},${c.lng}`).join('|');
  const url = `${API_URL}?locations=${encodeURIComponent(locations)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(`API error: ${data.error || 'Unknown'}`);
  }

  return data.results.map(r => r.elevation);
}

function metersToFeet(m) {
  return Math.round(m * 3.28084);
}

function calculateStats(coordinates) {
  const elevations = coordinates
    .map(c => c.elevation)
    .filter(e => e != null);

  if (elevations.length < 2) {
    return { gain: 0, loss: 0, min: 0, max: 0 };
  }

  let gain = 0, loss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) gain += delta;
    else loss += Math.abs(delta);
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    min: Math.round(Math.min(...elevations)),
    max: Math.round(Math.max(...elevations))
  };
}

async function enrichTrail(trail) {
  const coords = trail.coordinates;
  const enrichedCoords = [];

  console.log(`  ${trail.name}: ${coords.length} points`);

  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(coords.length / BATCH_SIZE);

    console.log(`    Fetching batch ${batchNum}/${totalBatches}...`);

    try {
      const elevations = await fetchElevations(batch);

      for (let j = 0; j < batch.length; j++) {
        enrichedCoords.push({
          lat: batch[j].lat,
          lng: batch[j].lng,
          elevation: elevations[j] != null ? metersToFeet(elevations[j]) : null
        });
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
      // Push without elevation
      for (const coord of batch) {
        enrichedCoords.push({ lat: coord.lat, lng: coord.lng });
      }
    }

    // Rate limiting
    if (i + BATCH_SIZE < coords.length) {
      await sleep(DELAY_MS);
    }
  }

  const stats = calculateStats(enrichedCoords);
  console.log(`    Result: +${stats.gain}ft/-${stats.loss}ft, range ${stats.min}-${stats.max}ft`);

  return {
    ...trail,
    coordinates: enrichedCoords,
    elevationGain: stats.gain,
    elevationLoss: stats.loss,
    elevationMin: stats.min,
    elevationMax: stats.max
  };
}

async function main() {
  const args = process.argv.slice(2);
  const trailsPath = path.join(__dirname, '../src/data/trails.json');
  const trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'));

  let trailsToEnrich = [];

  if (args.includes('--all')) {
    trailsToEnrich = trails;
    console.log(`Re-enriching ALL ${trails.length} trails\n`);
  } else if (args.length > 0) {
    trailsToEnrich = trails.filter(t => args.includes(t.id));
    console.log(`Re-enriching ${trailsToEnrich.length} specified trails:\n`);
    trailsToEnrich.forEach(t => console.log(`  - ${t.name} (${t.id})`));
    console.log('');
  } else {
    // Default: find trails that might have stale elevation data
    // (coordinates without elevation or coord count != elevation count)
    trailsToEnrich = trails.filter(t => {
      const hasCoords = t.coordinates && t.coordinates.length > 0;
      const allHaveElevation = t.coordinates.every(c => c.elevation != null);
      return hasCoords && !allHaveElevation;
    });
    console.log(`Found ${trailsToEnrich.length} trails with missing elevation data\n`);
  }

  if (trailsToEnrich.length === 0) {
    console.log('No trails to process!');
    return;
  }

  // Process each trail
  const enriched = [];
  for (let i = 0; i < trailsToEnrich.length; i++) {
    const trail = trailsToEnrich[i];
    console.log(`\nProcessing ${i + 1}/${trailsToEnrich.length}: ${trail.name}`);

    const result = await enrichTrail(trail);
    enriched.push(result);

    // Extra delay between trails
    if (i < trailsToEnrich.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Merge enriched trails back into full list
  const enrichedIds = new Set(enriched.map(t => t.id));
  const updatedTrails = trails.map(t =>
    enrichedIds.has(t.id) ? enriched.find(f => f.id === t.id) : t
  );

  // Write output
  fs.writeFileSync(trailsPath, JSON.stringify(updatedTrails, null, 2));
  console.log(`\nUpdated ${trailsPath}`);

  // Summary
  const withElevation = updatedTrails.filter(t =>
    t.coordinates.every(c => c.elevation != null)
  );
  console.log(`\nSummary: ${withElevation.length}/${updatedTrails.length} trails with complete elevation data`);
}

main().catch(console.error);
