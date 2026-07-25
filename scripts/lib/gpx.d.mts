/**
 * Types for lib/gpx.mjs.
 *
 * The library is plain ESM JavaScript because it runs as build-time tooling under
 * bare `node scripts/...`, with no TypeScript build step. These declarations exist
 * so the app's tests (which do typecheck) can import it.
 */

export interface GPXPoint {
  lat: number
  lng: number
  /** Metres. Whatever datum the source file used - GPX <ele> is conventionally orthometric. */
  ele?: number
  /** Epoch milliseconds, absent when the source has no <time>. */
  timeMs?: number
  /** Horizontal accuracy in metres, from our own blk:accuracyMeters extension. */
  accuracyM?: number
}

export interface ParsedGPX {
  /** `recording` when any point carries a timestamp, otherwise a curated route. */
  kind: 'recording' | 'route'
  name: string
  creator?: string
  /** `<trkseg>` boundaries preserved. A boundary means missing data, not a straight line. */
  segments: GPXPoint[][]
  /** Flattened view of `segments`. */
  points: GPXPoint[]
}

export interface SchemaCheck {
  valid: boolean
  errors: string[]
}

/** Parse liberally. Throws on malformed XML, a missing `<gpx>` root, or zero points. */
export function parseGPX(xml: string, opts?: { sourceLabel?: string }): ParsedGPX

/** Read and parse a file, labelling errors with its basename. */
export function parseGPXFile(filePath: string): ParsedGPX

/** Validate against the vendored GPX 1.1 schema. Never throws on invalid input. */
export function checkGPX(xml: string): Promise<SchemaCheck>

/** Assert schema validity. Throws - use for output we generate, not input we read. */
export function validateGPX(xml: string, opts?: { sourceLabel?: string }): Promise<void>
