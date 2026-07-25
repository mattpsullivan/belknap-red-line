/**
 * Export a recorded GPS track to a GPX 1.1 file.
 *
 * Postel's law, sending half: emit the strictest well-formed GPX we can, so any
 * consumer - ours or a stranger's - reads it correctly.
 *
 *   - Element order follows the gpx.xsd sequences exactly (see ORDERING below).
 *   - Numbers are written as xsd:decimal (never exponential notation).
 *   - Times are xsd:dateTime in UTC.
 *   - `<metadata>` carries name, desc, link, time and bounds.
 *   - Recording gaps become separate `<trkseg>` elements rather than an implied
 *     straight line across the gap. See splitOnStall.
 *
 * The output still round-trips through scripts/import-alltrails-gpx.js, which
 * matches points with /<trkpt lat="..." lon="...">/ and reads a CDATA <name>.
 * That regex is brittle (exact attribute order, exact single space), so the
 * `<trkpt>` opening tag and the `<trk><name>` CDATA form are load-bearing and
 * pinned by tests. Note the importer's <name> regex takes the FIRST CDATA name in
 * the document, which is why metadata's name/desc use escaped text instead of
 * CDATA - otherwise the importer would read the metadata name as the track name.
 *
 * Elevation: tracks store raw ellipsoidal altitude, GPX carries orthometric
 * <ele> plus the <geoidheight> used to get there, so the conversion is
 * self-describing and exactly reversible. See BELKNAP_GEOID_HEIGHT_M.
 *
 * ORDERING (GPX 1.1):
 *   gpxType      : metadata, wpt*, rte*, trk*, extensions
 *   metadataType : name, desc, author, copyright, link*, time, keywords, bounds
 *   trkType      : name, cmt, desc, src, link*, number, type, extensions, trkseg*
 *   wptType      : ele, time, magvar, geoidheight, name, ... , extensions
 */

import type { GPSTrack, TrackPoint } from '@/types/trail'
import { exportTextFile } from './fileExport'
import { STALL_THRESHOLD_MS } from './recordingHealth'
import { calculateDistance } from '@/services/geo'

const GPX_NS = 'http://www.topografix.com/GPX/1/1'
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'
const GPX_SCHEMA = 'http://www.topografix.com/GPX/1/1/gpx.xsd'
/** Namespace for our own <extensions> payload. Must not be the GPX namespace:
 *  gpx.xsd declares extensions as <xsd:any namespace="##other">. */
const BLK_NS = 'https://github.com/mattpsullivan/belknap-red-line/gpx/1'
const PROJECT_URL = 'https://github.com/mattpsullivan/belknap-red-line'

/**
 * Geoid height (geoid minus ellipsoid) for the Belknap Range, in metres.
 *
 * `TrackPoint.altitudeEllipsoidM` is height above the WGS 84 ellipsoid, but GPX
 * `<ele>` is conventionally orthometric (mean-sea-level) height, which is also
 * the datum `trails.json` elevations use. Converting: H = h - N.
 *
 * A single constant is used deliberately rather than a geoid model lookup.
 * Sampled from the NOAA NGS geoid API (GEOID12B) across the range:
 *
 *   43.47, -71.42 (SW)        -27.174 m
 *   43.58, -71.22 (NE)        -27.154 m
 *   43.5134, -71.3730 (white) -27.114 m
 *   43.5072, -71.3256 (red)   -27.096 m
 *
 * Total spatial variation is 0.078 m across the whole range, two to three
 * orders of magnitude below GNSS vertical noise (VDOP typically runs 1.5-3x
 * HDOP, so tens of metres under canopy). Modelling it per-point would be false
 * precision. The GEOID12B/GEOID18 model difference here is also a few cm.
 */
export const BELKNAP_GEOID_HEIGHT_M = -27.1

/** Trim float noise from the geoid arithmetic without losing real precision. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Format a number as xsd:decimal. `String(n)` switches to exponential notation
 * below 1e-6, which xsd:decimal does not allow; coordinates and elevations here
 * never go near that, but a validator would reject it if they did.
 */
function dec(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const s = String(n)
  return s.includes('e') || s.includes('E') ? n.toFixed(9).replace(/\.?0+$/, '') : s
}

/** Escape a string for use as XML character data or an attribute value. */
function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap a string in CDATA safely. A literal "]]>" would terminate the section
 * early and produce malformed XML, so it is split across two sections. Newlines
 * are collapsed because the importer's name regex is single-line.
 */
function cdata(s: string): string {
  const flat = s.replace(/[\r\n]+/g, ' ').trim()
  return `<![CDATA[${flat.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/**
 * Below this displacement, joining two points fabricates nothing worth flagging,
 * so the segment stays whole even after a long pause.
 */
export const SEGMENT_BREAK_MIN_DISPLACEMENT_M = 50

/**
 * Split points into contiguous runs, breaking where connecting two consecutive
 * points would fabricate geometry.
 *
 * Why this matters: GPX represents discontinuous recording as multiple <trkseg>
 * elements. A single segment asserts the points are connected, so a consumer
 * draws a straight line across any gap and counts it as distance. The
 * 2026-06-13 background-GPS bug produced exactly that - one segment, 19 points,
 * a 96-minute hole rendered as a 1.85 mi straight line, with a plausible total
 * distance that concealed it.
 *
 * Why it is a heuristic, not a fact: a gap between *stored* points is ambiguous.
 * `useGeolocation` drops fixes that move less than `minDistanceMeters` (default
 * 5 m), so standing still records nothing even while fixes arrive normally. Only
 * the recorder knows which happened - it tracks fix liveness separately from
 * point storage, which is how the stall banner avoids firing on rest stops. That
 * information is not persisted on the track today, so the exporter infers:
 *
 *   time gap > stallThresholdMs  AND  displacement > minDisplacementM
 *
 * The time gate reuses STALL_THRESHOLD_MS so "long enough to matter" means the
 * same thing here as it does to the stall banner. The displacement gate keeps a
 * summit break joined (you did not move, so the straight line spans ~nothing)
 * while splitting a gap you walked through unrecorded.
 *
 * Errors are deliberately biased toward showing a break that was really a rest:
 * a visible extra segment is a far cheaper mistake than a hidden fabricated
 * mile. Persisting real stall intervals at record time is the proper fix - see
 * PLAN Phase 7.10.
 */
export function splitOnStall(
  points: TrackPoint[],
  stallThresholdMs: number = STALL_THRESHOLD_MS,
  minDisplacementM: number = SEGMENT_BREAK_MIN_DISPLACEMENT_M
): TrackPoint[][] {
  if (points.length === 0) return []
  const segments: TrackPoint[][] = [[points[0]]]
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const gap = cur.timestamp - prev.timestamp
    const moved = calculateDistance(prev.lat, prev.lng, cur.lat, cur.lng)
    if (gap > stallThresholdMs && moved > minDisplacementM) {
      segments.push([cur])
    } else {
      segments[segments.length - 1].push(cur)
    }
  }
  return segments
}

function trkptXML(p: TrackPoint): string {
  const hasAlt = p.altitudeEllipsoidM !== undefined
  // wptType order: ele, time, magvar, geoidheight, ..., extensions (last).
  const ele = hasAlt
    ? `<ele>${dec(round3(p.altitudeEllipsoidM! - BELKNAP_GEOID_HEIGHT_M))}</ele>`
    : ''
  const time = `<time>${new Date(p.timestamp).toISOString()}</time>`
  // Records the separation actually applied, so the raw ellipsoidal value is
  // exactly recoverable: h = ele + geoidheight.
  const geoid = hasAlt
    ? `<geoidheight>${dec(BELKNAP_GEOID_HEIGHT_M)}</geoidheight>`
    : ''
  // Horizontal accuracy in metres. Deliberately NOT <hdop>: HDOP is a
  // dimensionless geometry factor, not a distance, so putting metres there would
  // be a lie a consumer might act on.
  const ext = Number.isFinite(p.accuracy)
    ? `<extensions><blk:accuracyMeters>${dec(round3(p.accuracy))}</blk:accuracyMeters></extensions>`
    : ''
  // Opening tag is byte-pinned for import-alltrails-gpx.js - do not reformat.
  return `        <trkpt lat="${dec(p.lat)}" lon="${dec(p.lng)}">${ele}${time}${geoid}${ext}</trkpt>`
}

function boundsXML(points: TrackPoint[]): string {
  if (points.length === 0) return ''
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lng)
  return (
    `    <bounds minlat="${dec(Math.min(...lats))}" minlon="${dec(Math.min(...lons))}"` +
    ` maxlat="${dec(Math.max(...lats))}" maxlon="${dec(Math.max(...lons))}"/>\n`
  )
}

/** Serialize a track to a GPX 1.1 document string. */
export function trackToGPX(track: GPSTrack, name?: string): string {
  const trackName =
    name ?? `Belknap track ${new Date(track.startedAt).toISOString()}`

  const segments = splitOnStall(track.points)
  const trksegs = segments
    .map((seg) => `    <trkseg>\n${seg.map(trkptXML).join('\n')}\n    </trkseg>`)
    .join('\n')

  const desc =
    `Elevation: <ele> is orthometric metres; <geoidheight> is the geoid ` +
    `separation applied, so raw WGS 84 ellipsoidal height = ele + geoidheight. ` +
    `Segments: a gap between <trkseg> elements is missing data, not a route - ` +
    `points were not recorded for more than ` +
    `${Math.round(STALL_THRESHOLD_MS / 1000)}s while moving more than ` +
    `${SEGMENT_BREAK_MIN_DISPLACEMENT_M} m. Do not interpolate across it. ` +
    `Accuracy is horizontal error in metres under blk:accuracyMeters; it is ` +
    `deliberately not reported as <hdop>, which is a dimensionless quantity.`

  // metadataType order: name, desc, author, copyright, link*, time, keywords,
  // bounds. Escaped text (not CDATA) on purpose - see the file header.
  const metadata =
    `  <metadata>\n` +
    `    <name>${xml(trackName)}</name>\n` +
    `    <desc>${xml(desc)}</desc>\n` +
    `    <link href="${xml(PROJECT_URL)}"><text>Belknap Tracker</text></link>\n` +
    `    <time>${new Date(track.startedAt).toISOString()}</time>\n` +
    boundsXML(track.points) +
    `  </metadata>\n`

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Belknap Tracker" xmlns="${GPX_NS}" xmlns:xsi="${XSI_NS}" xmlns:blk="${BLK_NS}" xsi:schemaLocation="${GPX_NS} ${GPX_SCHEMA}">
${metadata}  <trk>
    <name>${cdata(trackName)}</name>
    <src>Belknap Tracker (GNSS)</src>
${trksegs}
  </trk>
</gpx>
`
}

/** Default filename like belknap-track-2026-06-13-09-15-00.gpx */
export function gpxFilename(track: GPSTrack): string {
  const stamp = new Date(track.startedAt)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-')
  return `belknap-track-${stamp}.gpx`
}

/** Export the track as GPX (native share sheet on device, download on web). */
export function downloadTrackGPX(track: GPSTrack, filename?: string): Promise<void> {
  return exportTextFile(
    filename ?? gpxFilename(track),
    trackToGPX(track),
    'application/gpx+xml'
  )
}
