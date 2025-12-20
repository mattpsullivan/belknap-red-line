#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load data
const osmData = require('/tmp/osm_trails.json');
const brattsTrails = require('../src/data/trails.json');

// Create a map of OSM trail names (normalized) to their geometry
const osmTrails = {};
osmData.elements.forEach(el => {
  if (el.tags && el.tags.name && el.geometry) {
    const name = el.tags.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!osmTrails[name]) {
      osmTrails[name] = [];
    }
    osmTrails[name].push({
      originalName: el.tags.name,
      geometry: el.geometry.map(p => ({ lat: p.lat, lng: p.lon }))
    });
  }
});

console.log('OSM trails found:', Object.keys(osmTrails).length);
console.log('\nMatching with BRATTS trails...\n');

let matched = 0;
const unmatched = [];
const updatedTrails = [];

brattsTrails.forEach(trail => {
  const normalizedName = trail.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Try exact match first
  let osmMatch = osmTrails[normalizedName];

  // Try partial matches if no exact match
  if (!osmMatch) {
    for (const [osmName, data] of Object.entries(osmTrails)) {
      // Check if names overlap significantly
      if (osmName.includes(normalizedName) || normalizedName.includes(osmName)) {
        osmMatch = data;
        break;
      }
    }
  }

  // Try matching individual words
  if (!osmMatch) {
    const trailWords = normalizedName.match(/[a-z]+/g) || [];
    for (const [osmName, data] of Object.entries(osmTrails)) {
      const osmWords = osmName.match(/[a-z]+/g) || [];
      const matchingWords = trailWords.filter(w => osmWords.includes(w) && w.length > 3);
      if (matchingWords.length >= 2) {
        osmMatch = data;
        break;
      }
    }
  }

  if (osmMatch) {
    matched++;
    // Use the longest geometry if multiple matches
    const bestMatch = osmMatch.reduce((a, b) =>
      a.geometry.length > b.geometry.length ? a : b
    );
    console.log('✓', trail.name, '->', bestMatch.originalName, '(' + bestMatch.geometry.length + ' pts)');

    updatedTrails.push({
      ...trail,
      coordinates: bestMatch.geometry,
      trailhead: bestMatch.geometry[0]
    });
  } else {
    unmatched.push(trail.name);
    updatedTrails.push(trail); // Keep original placeholder coordinates
  }
});

console.log('\n--- Summary ---');
console.log('Matched:', matched, '/', brattsTrails.length);
console.log('\nUnmatched trails:');
unmatched.forEach(n => console.log('  -', n));

// Write updated trails
const outputPath = path.join(__dirname, '../src/data/trails.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedTrails, null, 2));
console.log('\nUpdated trails.json with', matched, 'real trail coordinates');
