/**
 * GPX parsing and schema validation.
 *
 * Replaces the regex parsing this repo used to do. The old approach
 * (`/<trkpt lat="([^"]+)" lon="([^"]+)">/g`) worked only because AllTrails emits
 * `lat` before `lon` with exactly one space; swapped attribute order, a
 * self-closing `<trkpt/>`, single quotes, or an extra attribute each yielded zero
 * points and NO error - a silent empty import.
 *
 * Postel's law, split across three stages. "Liberal in what you accept" governs
 * SYNTAX, not data quality - conflating the two is how bad geometry lands in an
 * authoritative dataset:
 *
 *   parse   - liberal. Any well-formed GPX shape. Schema-invalid input warns but
 *             still parses. Only unparseable XML or zero points are fatal.
 *   ingest  - strict. See lib/trackQuality.mjs; nothing reaches trails.json
 *             without passing, and overrides are recorded.
 *   export  - strict. validateGPX() hard-fails on our own output.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { validateXML } from 'xmllint-wasm'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.join(__dirname, '../schema/gpx-1.1.xsd')

let schemaCache = null
function schema() {
  schemaCache ??= readFileSync(SCHEMA_PATH, 'utf8')
  return schemaCache
}

/**
 * `removeNSPrefix` normalises `<gpx:trk>` and `<blk:accuracyMeters>` to bare
 * names, so namespace-prefixed documents parse identically to unprefixed ones.
 * `parseTagValue: false` keeps values as strings - we coerce deliberately, so a
 * timestamp is never silently turned into a number.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (_name, jpath) =>
    [
      'gpx.trk',
      'gpx.trk.trkseg',
      'gpx.trk.trkseg.trkpt',
      'gpx.metadata.link',
    ].includes(jpath),
})

/** Text content of a node that may be a string, a CDATA wrapper, or absent. */
function text(node) {
  if (node == null) return undefined
  if (typeof node === 'string') return node || undefined
  if (typeof node === 'object' && '#text' in node) {
    const t = node['#text']
    return t === '' ? undefined : String(t)
  }
  return undefined
}

function num(v) {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse a GPX document.
 *
 * @returns {{kind: 'recording'|'route', name: string, creator?: string,
 *            segments: Array<Array<object>>, points: Array<object>}}
 *   `segments` preserves `<trkseg>` boundaries - a boundary means "no data
 *   between these points", NOT a straight line. `points` is the flattened view
 *   for callers that genuinely do not care.
 * @throws if the XML is not well-formed, or if no track points are present.
 */
export function parseGPX(xml, { sourceLabel = 'gpx' } = {}) {
  const wellFormed = XMLValidator.validate(xml)
  if (wellFormed !== true) {
    const e = wellFormed.err ?? {}
    throw new Error(
      `${sourceLabel}: not well-formed XML - ${e.msg ?? 'unknown'}` +
        (e.line ? ` (line ${e.line})` : '')
    )
  }

  const doc = parser.parse(xml)
  const gpx = doc?.gpx
  if (!gpx) throw new Error(`${sourceLabel}: no <gpx> root element`)

  const trks = gpx.trk ?? []
  const segments = []
  for (const trk of trks) {
    for (const seg of trk.trkseg ?? []) {
      const pts = []
      for (const p of seg.trkpt ?? []) {
        const lat = num(p['@lat'])
        const lng = num(p['@lon'])
        // A point without usable coordinates is dropped rather than kept as NaN;
        // the zero-point check below still catches a file that is all garbage.
        if (lat === undefined || lng === undefined) continue
        const t = text(p.time)
        const parsed = t ? Date.parse(t) : NaN
        pts.push({
          lat,
          lng,
          ele: num(text(p.ele)),
          timeMs: Number.isNaN(parsed) ? undefined : parsed,
          accuracyM: num(text(p.extensions?.accuracyMeters)),
        })
      }
      if (pts.length > 0) segments.push(pts)
    }
  }

  const points = segments.flat()
  if (points.length === 0) {
    // The failure the regex version made silent. Loud, and it names the file.
    throw new Error(
      `${sourceLabel}: no track points found. ` +
        `Checked <gpx><trk><trkseg><trkpt lat= lon=>. ` +
        `If this file has <rte> route points instead of a <trk>, it is not supported.`
    )
  }

  // Name precedence deliberately prefers the track over the document. The old
  // regex took the first CDATA <name> anywhere, which in AllTrails files is the
  // <metadata> name - so it never read <trk><name> at all.
  const name =
    text(trks[0]?.name) ?? text(gpx.metadata?.name) ?? sourceLabel

  return {
    kind: points.some((p) => p.timeMs !== undefined) ? 'recording' : 'route',
    name,
    creator: gpx['@creator'] ? String(gpx['@creator']) : undefined,
    segments,
    points,
  }
}

/** Read and parse a GPX file, labelling errors with its basename. */
export function parseGPXFile(filePath) {
  return parseGPX(readFileSync(filePath, 'utf8'), {
    sourceLabel: path.basename(filePath),
  })
}

/**
 * Validate against the vendored GPX 1.1 schema.
 * @returns {Promise<{valid: boolean, errors: string[]}>} never throws on invalid.
 */
export async function checkGPX(xml) {
  const res = await validateXML({
    xml: [{ fileName: 'input.gpx', contents: xml }],
    schema: [schema()],
  })
  return {
    valid: res.valid,
    errors: (res.errors ?? []).map((e) =>
      typeof e === 'string' ? e : (e.rawMessage ?? e.message ?? JSON.stringify(e))
    ),
  }
}

/**
 * Assert our own output is schema-valid. Hard-fails - this is the "strict in
 * what you send" half, and a silent pass here would let an element-order bug
 * ship with tests green.
 */
export async function validateGPX(xml, { sourceLabel = 'output' } = {}) {
  const { valid, errors } = await checkGPX(xml)
  if (!valid) {
    throw new Error(
      `${sourceLabel}: GPX failed schema validation:\n  ${errors.join('\n  ')}`
    )
  }
}
