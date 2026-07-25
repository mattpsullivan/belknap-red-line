#!/usr/bin/env node

/**
 * Replace ONE trail's geometry from ONE recorded track. The Phase 8 tool.
 *
 * import-alltrails-gpx.js cannot do this job: its `>= 40 coords` sparse guard
 * skips every walk-to-fix target (red-trail 112, blue-trail 71, boulder-trail
 * 177, mack-ridge-trail 213, yellow-trail-shannon 41), and its length-matching
 * heuristic guesses which sub-segment belongs to which trail. Phase 8 is not a
 * guessing problem - you walked a specific trail and you know which one.
 *
 * Parsing is liberal (lib/gpx.mjs); ingest is strict (lib/trackQuality.mjs).
 * Nothing is written on a fatal finding, and warnings need --accept-warnings.
 * Every write appends its decision to data/import-log.jsonl so geometry repaired
 * over months carries its own provenance.
 *
 * Usage:
 *   node scripts/replace-trail-geometry.mjs --trail <id> --gpx <file> [options]
 *
 *   --segment N        use trkseg N (1-based) from a multi-segment recording
 *   --range A:B        use only points A..B (1-based, inclusive) of that segment
 *   --reverse          reverse point order (recorded the trail downhill)
 *   --accept-warnings  proceed despite warnings; recorded in the import log
 *   --allow-bridge     treat a multi-segment file as one; fabricates geometry
 *   --dry-run          report only, write nothing
 *   --output <path>    write elsewhere than src/data/trails.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseGPXFile, checkGPX } from './lib/gpx.mjs'
import { assessTrack, formatAssessment } from './lib/trackQuality.mjs'
import { distance, pathLength, METERS_PER_MILE } from './lib/geo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const flag = (name) => process.argv.includes(`--${name}`)

const trailId = arg('trail')
const gpxPath = arg('gpx')
const dryRun = flag('dry-run')
const acceptWarnings = flag('accept-warnings')
const allowBridge = flag('allow-bridge')
const reverse = flag('reverse')
const segmentArg = arg('segment')
const rangeArg = arg('range')

if (!trailId || !gpxPath) {
  console.error('Usage: node scripts/replace-trail-geometry.mjs --trail <id> --gpx <file> [--dry-run]')
  console.error('       see the header of this file for all options')
  process.exit(2)
}

const trailsPath = path.join(__dirname, '../src/data/trails.json')
const outputPath = arg('output', trailsPath)
const trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'))

const trail = trails.find((t) => t.id === trailId)
if (!trail) {
  console.error(`No trail with id "${trailId}". Closest ids:`)
  for (const t of trails.filter((t) => t.id.includes(trailId.split('-')[0])).slice(0, 8)) {
    console.error(`  ${t.id}`)
  }
  process.exit(2)
}

// --- parse (liberal) -------------------------------------------------------

let track
try {
  track = parseGPXFile(gpxPath)
} catch (err) {
  console.error(`FATAL ${err.message}`)
  process.exit(1)
}

const { valid, errors } = await checkGPX(fs.readFileSync(gpxPath, 'utf8'))
console.log(`Source: ${path.basename(gpxPath)}`)
console.log(`  name       ${track.name}`)
console.log(`  creator    ${track.creator ?? '(unset)'}`)
console.log(`  kind       ${track.kind}`)
console.log(`  schema     ${valid ? 'valid' : 'INVALID (parsing anyway)'}`)
if (!valid) for (const e of errors.slice(0, 3)) console.log(`             ${e}`)
console.log(`  segments   ${track.segments.map((s) => s.length).join(', ')}`)

// --- select the points to use ---------------------------------------------

let chosen = track.segments
if (segmentArg !== undefined) {
  const n = Number(segmentArg)
  if (!Number.isInteger(n) || n < 1 || n > track.segments.length) {
    console.error(`--segment must be 1..${track.segments.length}`)
    process.exit(2)
  }
  chosen = [track.segments[n - 1]]
  console.log(`  using     segment ${n} of ${track.segments.length}`)
}

// --range and --reverse are applied BEFORE the gate runs, so the assessment - and
// the warnings recorded in the import log - describe exactly the points that get
// written, not a superset of them.
let points = chosen.flat()
let rangedSegments = chosen
if (rangeArg) {
  const [a, b] = rangeArg.split(':').map(Number)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > points.length || a >= b) {
    console.error(`--range must be A:B with 1 <= A < B <= ${points.length}`)
    process.exit(2)
  }
  if (chosen.length > 1) {
    console.error('--range needs a single segment; pass --segment N as well')
    process.exit(2)
  }
  points = points.slice(a - 1, b)
  rangedSegments = [points]
  console.log(`  using     --range ${a}:${b}, ${points.length} points`)
}
if (reverse) {
  points = [...points].reverse()
  rangedSegments = rangedSegments.map((s) => [...s].reverse())
}

// --- ingest gate (strict) -------------------------------------------------

const assessment = assessTrack(
  { ...track, segments: rangedSegments, points },
  { trail, allowBridge }
)
console.log('\nQuality gate:')
console.log(formatAssessment(assessment))

// --- comparison ----------------------------------------------------------

const recordedM = pathLength(points)
const expectedM = trail.distance * METERS_PER_MILE
const oldFirst = trail.coordinates[0]
const oldLast = trail.coordinates[trail.coordinates.length - 1]

console.log(`\nProposed change to ${trail.id} (${trail.name}):`)
console.log(`  points        ${trail.coordinates.length} -> ${points.length}`)
console.log(
  `  length        ${(pathLength(trail.coordinates) / METERS_PER_MILE).toFixed(2)} mi -> ` +
    `${(recordedM / METERS_PER_MILE).toFixed(2)} mi ` +
    `(workbook says ${trail.distance} mi, ratio ${(recordedM / expectedM).toFixed(2)})`
)
console.log(
  `  start moves   ${distance(oldFirst, points[0]).toFixed(0)} m ` +
    `(${oldFirst.lat.toFixed(5)},${oldFirst.lng.toFixed(5)} -> ${points[0].lat.toFixed(5)},${points[0].lng.toFixed(5)})`
)
console.log(
  `  end moves     ${distance(oldLast, points[points.length - 1]).toFixed(0)} m`
)

// --- decide --------------------------------------------------------------

if (assessment.fatal.length > 0) {
  console.error('\nREFUSING to write: fatal findings above. Nothing changed.')
  process.exit(1)
}
if (assessment.warnings.length > 0 && !acceptWarnings) {
  console.error(
    `\nREFUSING to write: ${assessment.warnings.length} warning(s) above. ` +
      'Review them, then re-run with --accept-warnings to proceed on the record.'
  )
  process.exit(1)
}
if (dryRun) {
  console.log('\nDry run - nothing written.')
  process.exit(0)
}

// --- write ---------------------------------------------------------------

const pointsBefore = trail.coordinates.length
trail.coordinates = points.map((p) => ({ lat: p.lat, lng: p.lng }))
trail.trailhead = { lat: points[0].lat, lng: points[0].lng }
// The four elevation* summary fields describe geometry that no longer exists.
for (const k of ['elevationGain', 'elevationLoss', 'elevationMin', 'elevationMax']) {
  delete trail[k]
}

fs.writeFileSync(outputPath, JSON.stringify(trails, null, 2))
console.log(`\nWrote ${outputPath}`)

const logPath = path.join(__dirname, '../data/import-log.jsonl')
fs.appendFileSync(
  logPath,
  JSON.stringify({
    trailId: trail.id,
    source: path.basename(gpxPath),
    sourceName: track.name,
    pointsBefore,
    pointsAfter: points.length,
    recordedMiles: Number((recordedM / METERS_PER_MILE).toFixed(3)),
    schemaValid: valid,
    warningsAccepted: assessment.warnings,
    options: { segment: segmentArg, range: rangeArg, reverse, allowBridge },
  }) + '\n'
)
console.log(`Logged the decision to ${path.relative(process.cwd(), logPath)}`)

console.log(
  '\nELEVATION IS NOW STALE for this trail. Per-point `elevation` is gone and the\n' +
    'four elevation* summary fields were removed. trails.json elevation comes from\n' +
    'the DEM, not from GPX <ele>. Re-enrich before committing:\n' +
    '  python scripts/enrich-elevation-api.py --dataset ned10m --output /tmp/trails.json\n' +
    '  diff <(jq -S . src/data/trails.json) <(jq -S . /tmp/trails.json)\n' +
    'Then confirm findTrailsMissingElevation returns 0, and re-run:\n' +
    '  python scripts/map-overlay.py --check'
)
