/**
 * The ingest gate: decide whether a parsed track is fit to enter trails.json.
 *
 * This is the "strict" half of the three-stage rule. Parsing is liberal about
 * SYNTAX (see lib/gpx.mjs); this module is strict about DATA. Being tolerant of
 * a Garmin file's quirks is good practice; being tolerant of coordinates on the
 * wrong mountain is how `blue-trail` ended up in the dataset pointing at a
 * 741 ft hill near Alton, 15 km east, where it sat until a photo-georeferencing
 * audit found it months later. A bounding-box check would have refused it on day
 * one.
 *
 * Deliberately separate from src/services/trailValidation.ts: that ships in the
 * app and validates trails ALREADY in the dataset. This is build-time tooling
 * validating tracks BEFORE they enter it. Different subject, different lifecycle.
 *
 * Every threshold below is either reused from elsewhere in the repo or
 * calibrated against an independent source. None are invented, because an
 * invented number encodes false confidence.
 */

import { distance, pathLength, METERS_PER_MILE } from './geo.mjs'

/**
 * Trusted-anchor hull, from scripts/map-overlay.py ANCHORS with trust=True:
 * Rowe, Mack, Major, Whiteface - the four summits whose coordinates are mutually
 * self-consistent and which the affine map fit relies on.
 *
 * NOT derived from trails.json. Doing that would be circular: the bbox of all
 * current coords is lat 43.4743..43.5808 / lng -71.4013..-71.2156, and its
 * eastern and northern edges are *defined by the known-bad trails*
 * (blue-trail, yellow-trail-shannon, boulder-trail). A gate derived from the
 * data under repair would bless exactly what it exists to catch - the same
 * circularity docs/trail-validation.md flags for summit anchors.
 */
const TRUSTED_HULL = { minLat: 43.4888, maxLat: 43.54134, minLng: -71.3868, maxLng: -71.28728 }

/**
 * Margin in degrees. Trails run well past summits to lower trailheads, so the
 * hull needs padding. Calibrated against the audit's independently-derived
 * suspect list {blue-trail, boulder-trail, lakeview-trail, yellow-trail-shannon}:
 *
 *   0.02 -> flags 5, false positive on mary-jane-morse-greenwood-trail
 *   0.03 -> flags exactly those 4. Zero false positives, zero misses.
 *   0.04 -> misses lakeview-trail
 *
 * That a bounding box reproduces a suspect set derived by photo georeferencing is
 * real corroboration. But it is tuned on 4 samples, so this stays a WARNING.
 */
const BBOX_MARGIN_DEG = 0.03

export const RANGE_BBOX = {
  minLat: TRUSTED_HULL.minLat - BBOX_MARGIN_DEG,
  maxLat: TRUSTED_HULL.maxLat + BBOX_MARGIN_DEG,
  minLng: TRUSTED_HULL.minLng - BBOX_MARGIN_DEG,
  maxLng: TRUSTED_HULL.maxLng + BBOX_MARGIN_DEG,
}

/**
 * Metres per second. From the 2026-06-13 track, which recorded the drive home:
 * hiking median 0.84 m/s, maximum 25.58 m/s on the drive. 10 m/s (36 km/h) sits
 * clear of anything on foot and well below vehicle speed, so the separation does
 * not depend on a tight threshold.
 */
const MAX_PLAUSIBLE_SPEED_MS = 10

/** Metres. Same threshold map-overlay.py:166 uses for its gap report. */
const MAX_POINT_GAP_M = 250

/** src/services/trailValidation.ts:34 findSparseTrails minPoints. */
const MIN_POINTS = 10

/** The existing importer's length-match tolerance (findSegmentByLength, 0.25). */
const LENGTH_TOLERANCE = 0.25

/** From gpxExport.ts BELKNAP_GEOID_HEIGHT_M. */
const GEOID_HEIGHT_M = -27.1

const outside = (p) =>
  p.lat < RANGE_BBOX.minLat ||
  p.lat > RANGE_BBOX.maxLat ||
  p.lng < RANGE_BBOX.minLng ||
  p.lng > RANGE_BBOX.maxLng

function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : undefined
}

/**
 * Assess a parsed track (from lib/gpx.mjs parseGPX).
 *
 * @param track parsed GPX
 * @param opts.trail optional trails.json entry, enables the length comparison
 * @param opts.allowBridge permit a multi-segment track to be treated as one
 * @returns {{fatal: string[], warnings: string[], info: string[], skipped: string[]}}
 *   `skipped` is not decoration - a check that could not run must say so, or a
 *   reader assumes it passed.
 */
export function assessTrack(track, { trail, allowBridge = false } = {}) {
  const fatal = []
  const warnings = []
  const info = []
  const skipped = []
  const pts = track.points

  // --- fatal -------------------------------------------------------------
  if (pts.length === 0) fatal.push('no track points')

  if (track.segments.length > 1 && !allowBridge) {
    fatal.push(
      `${track.segments.length} <trkseg> segments (sizes ${track.segments
        .map((s) => s.length)
        .join(', ')}). A gap between segments is missing data, not a route - ` +
        `joining them would fabricate a straight line. Select one with --segment N, ` +
        `or pass --allow-bridge if you are certain the gap is not real.`
    )
  }

  // --- location ----------------------------------------------------------
  const strays = pts.filter(outside)
  if (strays.length > 0) {
    const s = strays[0]
    warnings.push(
      `${strays.length}/${pts.length} points outside the Belknap Range box ` +
        `(lat ${RANGE_BBOX.minLat.toFixed(4)}..${RANGE_BBOX.maxLat.toFixed(4)}, ` +
        `lng ${RANGE_BBOX.minLng.toFixed(4)}..${RANGE_BBOX.maxLng.toFixed(4)}); ` +
        `first at ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`
    )
  }

  // --- density -----------------------------------------------------------
  if (pts.length < MIN_POINTS) {
    warnings.push(`only ${pts.length} points (a coarse polyline; want >= ${MIN_POINTS})`)
  }

  // --- gaps, within each segment only ------------------------------------
  // Checking across a segment boundary would re-measure the gap we split on.
  let worstGap = 0
  for (const seg of track.segments) {
    for (let i = 1; i < seg.length; i++) {
      worstGap = Math.max(worstGap, distance(seg[i - 1], seg[i]))
    }
  }
  if (worstGap > MAX_POINT_GAP_M) {
    warnings.push(
      `largest gap between consecutive points is ${worstGap.toFixed(0)} m ` +
        `(> ${MAX_POINT_GAP_M} m); geometry between them is interpolated, not recorded`
    )
  }

  // --- speed, needs timestamps -------------------------------------------
  const timed = pts.filter((p) => p.timeMs !== undefined).length
  if (timed < 2) {
    skipped.push('speed: no timestamps in this file (curated route, not a recording)')
  } else {
    let worst = 0
    for (const seg of track.segments) {
      for (let i = 1; i < seg.length; i++) {
        const dt = (seg[i].timeMs - seg[i - 1].timeMs) / 1000
        if (!Number.isFinite(dt) || dt <= 0) continue
        worst = Math.max(worst, distance(seg[i - 1], seg[i]) / dt)
      }
    }
    if (worst > MAX_PLAUSIBLE_SPEED_MS) {
      warnings.push(
        `implausible speed ${worst.toFixed(1)} m/s (${(worst * 3.6).toFixed(0)} km/h) ` +
          `between consecutive points - a bad fix, or the recording includes driving`
      )
    }
  }

  // --- length vs the authoritative workbook distance ---------------------
  // Warning only, never fatal: Phase 8 exists because current trail data is
  // wrong, so a good track must not be rejected by a bad reference distance.
  const recordedM = track.segments.reduce((sum, s) => sum + pathLength(s), 0)
  if (trail?.distance) {
    const expectedM = trail.distance * METERS_PER_MILE
    const ratio = recordedM / expectedM
    if (ratio < 1 - LENGTH_TOLERANCE || ratio > 1 + LENGTH_TOLERANCE) {
      warnings.push(
        `recorded ${(recordedM / METERS_PER_MILE).toFixed(2)} mi vs ` +
          `${trail.distance} mi expected for ${trail.id} (ratio ${ratio.toFixed(2)}); ` +
          `the workbook distance may be right and this track wrong, or vice versa`
      )
    }
  } else {
    skipped.push('length comparison: no reference trail supplied')
  }

  // --- elevation datum ---------------------------------------------------
  const eles = pts.map((p) => p.ele).filter((e) => e !== undefined)
  if (eles.length === 0) {
    skipped.push('elevation datum: no <ele> in this file')
  } else {
    info.push(
      `<ele> present on ${eles.length}/${pts.length} points, median ` +
        `${median(eles).toFixed(1)} m. Discarded on ingest - trails.json elevation ` +
        `comes from the DEM. If these look ~${Math.abs(GEOID_HEIGHT_M).toFixed(0)} m ` +
        `low against the DEM, the file is ellipsoidal-referenced.`
    )
  }

  return { fatal, warnings, info, skipped }
}

/** Render an assessment for a terminal. */
export function formatAssessment({ fatal, warnings, info, skipped }) {
  const lines = []
  for (const f of fatal) lines.push(`  FATAL   ${f}`)
  for (const w of warnings) lines.push(`  WARN    ${w}`)
  for (const i of info) lines.push(`  info    ${i}`)
  for (const s of skipped) lines.push(`  skipped ${s}`)
  if (lines.length === 0) lines.push('  all checks passed')
  return lines.join('\n')
}
