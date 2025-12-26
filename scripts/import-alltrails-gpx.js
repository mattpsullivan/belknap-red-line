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

  const nameMatch = content.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
  const name = nameMatch ? nameMatch[1] : path.basename(filePath, '.gpx');

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

// Calculate total length of a path in meters
function pathLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += distance(coords[i-1], coords[i]);
  }
  return total;
}

// Find segment of target length starting near a point
function findSegmentByLength(gpxPoints, nearPoint, targetLengthMeters, tolerance = 0.3) {
  // Find starting points near the given point
  const candidates = [];

  for (let startIdx = 0; startIdx < gpxPoints.length; startIdx++) {
    const startDist = distance(nearPoint, gpxPoints[startIdx]);
    if (startDist > 150) continue; // Start point must be within 150m

    // Try to find a segment of the right length
    let runningLength = 0;
    for (let endIdx = startIdx + 1; endIdx < gpxPoints.length; endIdx++) {
      runningLength += distance(gpxPoints[endIdx-1], gpxPoints[endIdx]);

      // Check if we're close to target length
      const ratio = runningLength / targetLengthMeters;
      if (ratio >= (1 - tolerance) && ratio <= (1 + tolerance)) {
        candidates.push({
          startIdx,
          endIdx,
          startDist,
          length: runningLength,
          ratio,
          points: gpxPoints.slice(startIdx, endIdx + 1)
        });
      }

      // Stop if we've gone too far
      if (ratio > (1 + tolerance)) break;
    }
  }

  // Return best candidate (closest start point with best length match)
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Prefer better length match, then closer start
    const aScore = Math.abs(1 - a.ratio) * 100 + a.startDist;
    const bScore = Math.abs(1 - b.ratio) * 100 + b.startDist;
    return aScore - bScore;
  });

  return candidates[0];
}

// Load GPX files
const gpxDir = path.join(__dirname, '../data/gpx');
const gpxFiles = fs.readdirSync(gpxDir).filter(f => f.endsWith('.gpx') && !f.includes('(1)'));

console.log('Loading GPX files...\n');

const gpxTracks = [];
gpxFiles.forEach(file => {
  const gpx = parseGPX(path.join(gpxDir, file));
  console.log(`  ${gpx.name}: ${gpx.points.length} points`);
  gpxTracks.push(gpx);
});

console.log(`\nTotal GPX tracks: ${gpxTracks.length}\n`);

// Find improvements for sparse trails
console.log('Matching sparse trails to GPX data...\n');

const improvements = [];

trails.forEach(trail => {
  const currentCoords = trail.coordinates.length;

  // Only try to improve trails with sparse data
  if (currentCoords >= 40) return;

  const targetLength = trail.distance * 1609.34; // miles to meters
  const trailStart = trail.coordinates[0];
  const trailEnd = trail.coordinates[trail.coordinates.length - 1];

  // Try each GPX track
  for (const gpx of gpxTracks) {
    // Try from start point
    let segment = findSegmentByLength(gpx.points, trailStart, targetLength, 0.25);

    // Also try from end point if no match
    if (!segment) {
      segment = findSegmentByLength(gpx.points, trailEnd, targetLength, 0.25);
    }

    if (segment && segment.points.length > currentCoords * 1.3) {
      improvements.push({
        name: trail.name,
        id: trail.id,
        before: currentCoords,
        after: segment.points.length,
        expectedMiles: trail.distance,
        actualMiles: (segment.length / 1609.34).toFixed(2),
        source: gpx.name,
        segment: segment.points
      });
      break;
    }
  }
});

// Show improvements
console.log('Potential improvements:\n');
improvements.sort((a, b) => (b.after - b.before) - (a.after - a.before));

improvements.forEach(imp => {
  console.log(`  ${imp.name}:`);
  console.log(`    Points: ${imp.before} → ${imp.after}`);
  console.log(`    Distance: ${imp.expectedMiles} mi expected, ${imp.actualMiles} mi actual`);
  console.log(`    Source: ${imp.source}\n`);
});

if (improvements.length === 0) {
  console.log('  No additional improvements found\n');
}

// Apply improvements
if (improvements.length > 0) {
  console.log(`\nApplying ${improvements.length} improvements...`);

  improvements.forEach(imp => {
    const trail = trails.find(t => t.id === imp.id);
    if (trail) {
      trail.coordinates = imp.segment;
      trail.trailhead = imp.segment[0];
    }
  });

  fs.writeFileSync(trailsPath, JSON.stringify(trails, null, 2));
  console.log('Saved updated trails.json');
}

// Summary
const coordCounts = trails.map(t => t.coordinates.length);
console.log('\nFinal stats:');
console.log(`  Total points: ${coordCounts.reduce((a, b) => a + b, 0)}`);
console.log(`  Min coords: ${Math.min(...coordCounts)}`);
console.log(`  Trails with <20 coords: ${coordCounts.filter(c => c < 20).length}`);
console.log(`  Trails with <40 coords: ${coordCounts.filter(c => c < 40).length}`);
