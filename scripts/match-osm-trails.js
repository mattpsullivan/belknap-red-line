#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load data
const osmData = JSON.parse(fs.readFileSync('/tmp/osm_trails_broad.json', 'utf8'));
const brattsTrails = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/trails.json'), 'utf8'));

// Manual mappings for tricky names
const manualMappings = {
  'lakeview-trail': 'Lakeview Trail',
  'mt-rowe-trail': 'Mt. Rowe Trail',
  'benjamin-weeks-trail': 'Benjamin Weeks Trail',
  'piper-round-pond-link': ['Round Pond / Piper Link', 'Round Pond-Piper Link', 'Round Pond and RP/Piper Link Trail'],
  'whiteface-mountain-trail': ['Whiteface Trail', 'Whiteface Trail (Blue)'],
  'klem-mack-loop': 'Mt Klem - Mt Mack Loop (Red Trail)',
  'anna-old-stage-road-link': 'Old Stage Road to Mt. Anna (Blue)',
  'anna-goat-pasture-hill-trail': 'Anna-Goat (Red)',
  'mt-major-trail': 'Mount Major Trail (blue)',
  'arlene-frances-morse-trail': 'Arlene Frances Morse Trail',
  'robert-a-greenwood-sr-loop': 'Robert A. Greenwood, Sr. Loop',
  'green-trail-wardens-trail': "Warden's Trail",
  'boulder-trail': 'Boulder Trail',
  'blue-trail': 'Blue Trail',
  'red-trail': 'Red Trail',
  'white-trail': 'White Trail',
  'yellow-trail': 'Yellow Trail',
  'brook-trail': 'Brook Trail',
  'round-pond-trail': 'Round Pond Trail',
  'ridge-trail': 'Ridge Trail',
  'ridge-trail-road-bypass': 'Ridge Trail Road Bypass',
  'overlook-trail': ['Overlook Trail', 'Overlook Trail (orange)'],
  'gunstock-mountain-trail': 'Gunstock Mountain Trail',
  'gunstock-winter-short-cut': 'Winter Shortcut',
  'piper-mountain-trail': 'Piper Mountain Trail',
  'old-piper-trail': 'Old Piper Trail',
  'piper-whiteface-link': 'Piper-Whiteface Link',
  'vista-trail': ['Vista Trail', 'Vista Trail (yellow)'],
  'mack-ridge-trail': 'Mack Ridge Trail (Orange)',
  'mack-ridge-trail-south': 'Mack Ridge Trail (Orange)',
  'round-pond-trail-south': 'Round Pond South (Red) Trail',
  'round-pond-mt-mack-trail': 'Round Pond - Mt Mack Trail (Red Trail)',
  'quarry-trail': 'Quarry Trail',
  'quarry-spur-trail': 'Quarry Spur Trail (Orange)',
  'blueberry-pasture-trail': 'Blueberry Pasture Trail (MMSC Trail-E)',
  'dave-roberts-quarry-trail': ["Dave Roberts Quarry Trail (White)", "Dave Roberts' Quarry Tr (White)"],
  'precipice-path': ['Precipice Path East (Purple)', 'Precipice Path West (Purple)'],
  'marsh-crossing': 'Marsh Crossing (Yellow)',
  'north-straightback-link': 'North Straightback Link (Green)',
  'straightback-mountain-trail': 'Straightback Mountain Trail',
  'anna-straightback-link-belknap-range-trail': 'Belknap Range Trail',
  'straightback-major-link-belknap-range-trail': 'Belknap Range Trail',
  'mack-anna-trail-belknap-range-trail': 'Belknap Range Trail',
  'reed-road-trail': 'Reed Road Trail',
  'east-gilford-trail': 'East Gilford Trail',
  'east-gilford-fire-road': 'Gilford Fire Road',
  'boulder-loop-trail': ['Boulder Loop Trail', 'Boulder Loop Trail (orange)'],
  'jesus-valley-beaver-pond-trail': ['Jesus Valley - Beaver Pond Trail', 'Jesus Valley - Beaver Pond Trail (red)'],
  'ledges-iron-mine-trail': 'Ledges-Iron Mine Trail',
  'marges-trail': "Marge's Trail",
  'ges-nature-trail': 'GES Nature Trail',
  'saddle-trail': 'Saddle Trail',
  'north-spur-trail': ['North Spur Trail', 'North Spur Trail (Orange)'],
  'rowes-revenge': "Rowe's Revenge",
  'waynes-way': "Wayne's Way",
  'mary-jane-morse-greenwood-trail': 'Mary Jane Morse Greenwood Trail',
};

// Build OSM lookup by exact name
const osmByName = {};
osmData.elements.forEach(el => {
  if (el.tags && el.tags.name && el.geometry && el.geometry.length > 1) {
    const name = el.tags.name;
    if (!osmByName[name]) {
      osmByName[name] = [];
    }
    osmByName[name].push({
      geometry: el.geometry.map(p => ({ lat: p.lat, lng: p.lon }))
    });
  }
});

console.log('OSM named trails:', Object.keys(osmByName).length);
console.log('\nMatching with BRATTS trails...\n');

let matched = 0;
let improved = 0;
const unmatched = [];
const updatedTrails = [];

brattsTrails.forEach(trail => {
  const trailId = trail.id;
  let osmMatch = null;
  let matchName = null;

  // Check manual mappings first
  if (manualMappings[trailId]) {
    const mapping = manualMappings[trailId];
    const names = Array.isArray(mapping) ? mapping : [mapping];

    for (const name of names) {
      if (osmByName[name]) {
        osmMatch = osmByName[name];
        matchName = name;
        break;
      }
    }
  }

  // Fallback: try normalized name matching
  if (!osmMatch) {
    const normalizedTrail = trail.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [osmName, data] of Object.entries(osmByName)) {
      const normalizedOsm = osmName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedOsm === normalizedTrail ||
          normalizedOsm.includes(normalizedTrail) ||
          normalizedTrail.includes(normalizedOsm)) {
        osmMatch = data;
        matchName = osmName;
        break;
      }
    }
  }

  if (osmMatch) {
    // Find the match with the most points
    const bestMatch = osmMatch.reduce((a, b) =>
      a.geometry.length > b.geometry.length ? a : b
    );

    const oldCoords = trail.coordinates.length;
    const newCoords = bestMatch.geometry.length;

    if (newCoords > oldCoords) {
      improved++;
      console.log('↑', trail.name, '->', matchName, `(${oldCoords} → ${newCoords} pts)`);
    } else if (oldCoords <= 6) {
      console.log('=', trail.name, '->', matchName, `(${oldCoords} → ${newCoords} pts, keeping new)`);
      improved++;
    } else {
      console.log('✓', trail.name, `(${oldCoords} pts, already good)`);
    }

    matched++;

    // Only update if we're improving or the old data was placeholder
    if (newCoords > oldCoords || oldCoords <= 6) {
      updatedTrails.push({
        ...trail,
        coordinates: bestMatch.geometry,
        trailhead: bestMatch.geometry[0]
      });
    } else {
      updatedTrails.push(trail);
    }
  } else {
    unmatched.push({ name: trail.name, id: trail.id, coords: trail.coordinates.length });
    updatedTrails.push(trail);
  }
});

console.log('\n--- Summary ---');
console.log('Matched:', matched, '/', brattsTrails.length);
console.log('Improved:', improved);
console.log('\nUnmatched trails:');
unmatched.forEach(t => console.log('  -', t.name, `(${t.coords} coords)`));

// Write updated trails
const outputPath = path.join(__dirname, '../src/data/trails.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedTrails, null, 2));
console.log('\nUpdated trails.json');

// Summary stats
const coordCounts = updatedTrails.map(t => t.coordinates.length);
console.log('Coordinate stats:');
console.log('  Total points:', coordCounts.reduce((a, b) => a + b, 0));
console.log('  Min:', Math.min(...coordCounts));
console.log('  Max:', Math.max(...coordCounts));
console.log('  Trails with <10 coords:', coordCounts.filter(c => c < 10).length);
