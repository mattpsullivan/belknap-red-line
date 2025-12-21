#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load current trails
const trailsPath = path.join(__dirname, '../src/data/trails.json');
const trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'));

// Parse GPX file and extract track points
function parseGPX(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const points = [];

  // Extract track name
  const nameMatch = content.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
  const name = nameMatch ? nameMatch[1] : path.basename(filePath, '.gpx');

  // Extract all track points
  const trkptRegex = /<trkpt lat="([^"]+)" lon="([^"]+)">/g;
  let match;
  while ((match = trkptRegex.exec(content)) !== null) {
    points.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2])
    });
  }

  return { name, points };
}

// Calculate distance between two points in meters (Haversine)
function distance(p1, p2) {
  const R = 6371000;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calculate total length of a trail in meters
function trailLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += distance(coords[i-1], coords[i]);
  }
  return total;
}

// Find the closest point on the GPX track to a given point
function findClosestPoint(point, gpxPoints) {
  let minDist = Infinity;
  let closestIdx = -1;
  for (let i = 0; i < gpxPoints.length; i++) {
    const d = distance(point, gpxPoints[i]);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }
  return { index: closestIdx, distance: minDist };
}

// Extract segment from GPX that matches a trail
function extractTrailSegment(trail, gpxPoints, bufferMeters = 50) {
  const trailStart = trail.coordinates[0];
  const trailEnd = trail.coordinates[trail.coordinates.length - 1];
  const expectedLength = trail.distance * 1609.34; // miles to meters

  // Find closest points to trail start and end
  const startMatch = findClosestPoint(trailStart, gpxPoints);
  const endMatch = findClosestPoint(trailEnd, gpxPoints);

  // Check if we found good matches (within buffer)
  if (startMatch.distance > bufferMeters || endMatch.distance > bufferMeters) {
    return null;
  }

  // Extract segment (handle both directions)
  let startIdx = startMatch.index;
  let endIdx = endMatch.index;

  if (startIdx > endIdx) {
    [startIdx, endIdx] = [endIdx, startIdx];
  }

  const segment = gpxPoints.slice(startIdx, endIdx + 1);

  // Validate segment length - should be within 50% of expected
  const segmentLength = trailLength(segment);
  const lengthRatio = segmentLength / expectedLength;

  if (lengthRatio < 0.5 || lengthRatio > 1.5) {
    return null; // Segment doesn't match expected trail length
  }

  return segment;
}

// Load and parse all GPX files
const gpxDir = path.join(__dirname, '../gpx');
const gpxFiles = fs.readdirSync(gpxDir).filter(f => f.endsWith('.gpx') && !f.includes('(1)'));

console.log('Loading GPX files...\n');

const gpxTracks = [];
gpxFiles.forEach(file => {
  const gpx = parseGPX(path.join(gpxDir, file));
  console.log(`  ${gpx.name}: ${gpx.points.length} points`);
  gpxTracks.push(gpx);
});

console.log(`\nTotal GPX tracks: ${gpxTracks.length}\n`);

// Try to improve each trail
console.log('Matching trails to GPX data...\n');

let improved = 0;
const improvements = [];

trails.forEach(trail => {
  const currentCoords = trail.coordinates.length;

  // Skip if already has good data (more than 50 points)
  if (currentCoords >= 50) {
    return;
  }

  // Try each GPX track
  for (const gpx of gpxTracks) {
    const segment = extractTrailSegment(trail, gpx.points, 75);

    if (segment && segment.length > currentCoords * 1.5) {
      improvements.push({
        name: trail.name,
        before: currentCoords,
        after: segment.length,
        expectedMiles: trail.distance,
        actualMiles: (trailLength(segment) / 1609.34).toFixed(2),
        source: gpx.name,
        segment
      });
      break; // Use first good match
    }
  }
});

// Show potential improvements
console.log('Potential improvements:\n');
improvements.sort((a, b) => (b.after - b.before) - (a.after - a.before));
improvements.forEach(imp => {
  console.log(`  ${imp.name}:`);
  console.log(`    Points: ${imp.before} → ${imp.after}`);
  console.log(`    Distance: ${imp.expectedMiles} mi expected, ${imp.actualMiles} mi actual`);
  console.log(`    Source: ${imp.source}\n`);
});

if (improvements.length === 0) {
  console.log('  No improvements found (trails already have good data or no matches)\n');
}

// Apply improvements interactively
if (improvements.length > 0) {
  console.log(`\nApplying ${improvements.length} improvements...`);

  improvements.forEach(imp => {
    const trail = trails.find(t => t.name === imp.name);
    if (trail) {
      trail.coordinates = imp.segment;
      trail.trailhead = imp.segment[0];
    }
  });

  fs.writeFileSync(trailsPath, JSON.stringify(trails, null, 2));
  console.log('Saved updated trails.json');
}

// Summary stats
const coordCounts = trails.map(t => t.coordinates.length);
console.log('\nFinal stats:');
console.log(`  Total points: ${coordCounts.reduce((a, b) => a + b, 0)}`);
console.log(`  Min coords: ${Math.min(...coordCounts)}`);
console.log(`  Max coords: ${Math.max(...coordCounts)}`);
console.log(`  Trails with <20 coords: ${coordCounts.filter(c => c < 20).length}`);
console.log(`  Trails with <50 coords: ${coordCounts.filter(c => c < 50).length}`);
