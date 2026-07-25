#!/usr/bin/env node

/**
 * Batch redensifier: improve SPARSE trail geometry from the AllTrails exports in
 * data/gpx, by matching a sub-segment of the right length near a trail's endpoint.
 *
 * Parsing moved to lib/gpx.mjs (a real XML parser). This script previously read
 * GPX with `/<trkpt lat="([^"]+)" lon="([^"]+)">/g`, which silently found zero
 * points for any file that swapped attribute order, self-closed the tag, used
 * single quotes, or added an attribute - and then reported "no improvement found".
 *
 * NOTE ON SCOPE: the `>= 40 coords` guard below means this script cannot touch
 * any Phase 8 walk-to-fix target (red-trail 112, blue-trail 71, boulder-trail
 * 177, mack-ridge-trail 213, yellow-trail-shannon 41). For replacing one known
 * trail's geometry from one recorded track, use replace-trail-geometry.mjs.
 *
 * Usage: node scripts/import-alltrails-gpx.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseGPXFile, checkGPX } from './lib/gpx.mjs'
import { assessTrack, formatAssessment } from './lib/trackQuality.mjs'
import { distance, METERS_PER_MILE } from './lib/geo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dryRun = process.argv.includes('--dry-run')

const trailsPath = path.join(__dirname, '../src/data/trails.json')
const trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'))

/**
 * Find a sub-segment of roughly targetLengthMeters starting near nearPoint.
 * Unchanged heuristics; now operates on a single trkseg's points, never across a
 * segment boundary.
 */
function findSegmentByLength(points, nearPoint, targetLengthMeters, tolerance = 0.3) {
  const candidates = []

  for (let startIdx = 0; startIdx < points.length; startIdx++) {
    const startDist = distance(nearPoint, points[startIdx])
    if (startDist > 150) continue

    let runningLength = 0
    for (let endIdx = startIdx + 1; endIdx < points.length; endIdx++) {
      runningLength += distance(points[endIdx - 1], points[endIdx])

      const ratio = runningLength / targetLengthMeters
      if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) {
        candidates.push({
          startIdx,
          endIdx,
          startDist,
          length: runningLength,
          ratio,
          points: points.slice(startIdx, endIdx + 1),
        })
      }

      if (ratio > 1 + tolerance) break
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const aScore = Math.abs(1 - a.ratio) * 100 + a.startDist
    const bScore = Math.abs(1 - b.ratio) * 100 + b.startDist
    return aScore - bScore
  })

  return candidates[0]
}

// --- load ------------------------------------------------------------------

const gpxDir = path.join(__dirname, '../data/gpx')
const gpxFiles = fs
  .readdirSync(gpxDir)
  .filter((f) => f.endsWith('.gpx') && !f.includes('(1)'))

console.log(`Loading GPX files${dryRun ? ' (dry run)' : ''}...\n`)

const gpxTracks = []
let failed = 0

for (const file of gpxFiles) {
  const full = path.join(gpxDir, file)
  let track
  try {
    track = parseGPXFile(full)
  } catch (err) {
    // Loud. The old version turned this into a silent zero-point track.
    console.error(`  ERROR ${file}: ${err.message}`)
    failed++
    continue
  }

  // Liberal accept: a schema-invalid file still gets parsed, but never silently.
  const { valid, errors } = await checkGPX(fs.readFileSync(full, 'utf8'))
  if (!valid) {
    console.warn(`  WARN  ${file}: not schema-valid, parsing anyway`)
    for (const e of errors.slice(0, 3)) console.warn(`          ${e}`)
  }

  const assessment = assessTrack(track, { allowBridge: true })
  const noteworthy = [...assessment.fatal, ...assessment.warnings]
  console.log(
    `  ${track.name}: ${track.points.length} points, ${track.segments.length} segment(s)`
  )
  if (noteworthy.length > 0) {
    console.log(
      formatAssessment({ ...assessment, info: [], skipped: [] })
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
    )
  }

  gpxTracks.push(track)
}

console.log(`\nTotal GPX tracks: ${gpxTracks.length}${failed ? ` (${failed} failed to parse)` : ''}\n`)

if (gpxTracks.length === 0) {
  console.error('No usable GPX tracks. Nothing to do.')
  process.exit(1)
}

// --- match -----------------------------------------------------------------

console.log('Matching sparse trails to GPX data...\n')

const improvements = []

trails.forEach((trail) => {
  const currentCoords = trail.coordinates.length

  // Sparse-only by design. See the scope note at the top of this file.
  if (currentCoords >= 40) return

  const targetLength = trail.distance * METERS_PER_MILE
  const trailStart = trail.coordinates[0]
  const trailEnd = trail.coordinates[trail.coordinates.length - 1]

  for (const gpx of gpxTracks) {
    // Per segment, never across a boundary: a gap between segments is missing
    // data, so a match spanning one would invent geometry.
    for (const seg of gpx.segments) {
      let segment = findSegmentByLength(seg, trailStart, targetLength, 0.25)
      if (!segment) segment = findSegmentByLength(seg, trailEnd, targetLength, 0.25)

      if (segment && segment.points.length > currentCoords * 1.3) {
        improvements.push({
          name: trail.name,
          id: trail.id,
          before: currentCoords,
          after: segment.points.length,
          expectedMiles: trail.distance,
          actualMiles: (segment.length / METERS_PER_MILE).toFixed(2),
          source: gpx.name,
          segment: segment.points.map((p) => ({ lat: p.lat, lng: p.lng })),
        })
        return
      }
    }
  }
})

// --- report ----------------------------------------------------------------

console.log('Potential improvements:\n')
improvements.sort((a, b) => b.after - b.before - (a.after - a.before))

improvements.forEach((imp) => {
  console.log(`  ${imp.name}:`)
  console.log(`    Points: ${imp.before} -> ${imp.after}`)
  console.log(`    Distance: ${imp.expectedMiles} mi expected, ${imp.actualMiles} mi actual`)
  console.log(`    Source: ${imp.source}\n`)
})

if (improvements.length === 0) {
  console.log('  No additional improvements found\n')
}

// --- apply -----------------------------------------------------------------

if (improvements.length > 0 && !dryRun) {
  console.log(`\nApplying ${improvements.length} improvements...`)

  improvements.forEach((imp) => {
    const trail = trails.find((t) => t.id === imp.id)
    if (trail) {
      trail.coordinates = imp.segment
      trail.trailhead = imp.segment[0]
    }
  })

  fs.writeFileSync(trailsPath, JSON.stringify(trails, null, 2))
  console.log('Saved updated trails.json')
  console.log(
    '\nElevation is now STALE on the replaced trails - the GPX import carries no\n' +
      'DEM elevation. Re-enrich before committing:\n' +
      '  python scripts/enrich-elevation-api.py --dataset ned10m --output /tmp/trails.json\n' +
      '  diff <(jq -S . src/data/trails.json) <(jq -S . /tmp/trails.json)'
  )
} else if (improvements.length > 0) {
  console.log(`\nDry run - not writing. ${improvements.length} improvement(s) would be applied.`)
}

// --- summary ---------------------------------------------------------------

const coordCounts = trails.map((t) => t.coordinates.length)
console.log('\nFinal stats:')
console.log(`  Total points: ${coordCounts.reduce((a, b) => a + b, 0)}`)
console.log(`  Min coords: ${Math.min(...coordCounts)}`)
console.log(`  Trails with <20 coords: ${coordCounts.filter((c) => c < 20).length}`)
console.log(`  Trails with <40 coords: ${coordCounts.filter((c) => c < 40).length}`)

if (failed > 0) process.exit(1)
