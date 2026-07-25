/**
 * Regression tests against the real files in data/gpx.
 *
 * Two jobs:
 *   1. Prove the parser swap is behaviour-preserving - the parser must find
 *      exactly the points the old regex found on every existing file, so
 *      replacing it cannot silently change the dataset.
 *   2. Guard against alert fatigue - a good file must produce zero warnings. If
 *      a threshold cannot manage that, the check is noise and should be dropped
 *      rather than shipped.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseGPX } from './gpx.mjs'
import { assessTrack } from './trackQuality.mjs'

const GPX_DIR = path.join(import.meta.dirname, '../../data/gpx')
const files = readdirSync(GPX_DIR).filter((f) => f.endsWith('.gpx')).sort()

/** The regex the parser replaced, kept here solely as the migration oracle. */
const LEGACY_TRKPT = /<trkpt lat="([^"]+)" lon="([^"]+)">/g

/**
 * The one file in data/gpx that is NOT the Belknap trail its name implies: same
 * name as Whiteface_Mountain.gpx but ~25 km northeast, a different mountain.
 * trails.json took its geometry from the correct file, so the dataset is clean -
 * this is a landmine that never went off, and the gate is expected to flag it.
 */
const KNOWN_WRONG_MOUNTAIN = 'Whiteface_Mountain_Trail.gpx'

describe('data/gpx fixtures', () => {
  it('has files to test', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const f of files) {
    describe(f, () => {
      const xml = readFileSync(path.join(GPX_DIR, f), 'utf8')

      it('parses to the same point count the legacy regex found', () => {
        const legacy = (xml.match(LEGACY_TRKPT) ?? []).length
        expect(parseGPX(xml, { sourceLabel: f }).points).toHaveLength(legacy)
      })

      it('recovers the <ele> the regex discarded', () => {
        const g = parseGPX(xml, { sourceLabel: f })
        expect(g.points.every((p) => p.ele !== undefined)).toBe(true)
      })

      it('is a curated route, not a recording (these have no timestamps)', () => {
        expect(parseGPX(xml, { sourceLabel: f }).kind).toBe('route')
      })

      it(f === KNOWN_WRONG_MOUNTAIN ? 'is flagged as off-range' : 'produces no warnings', () => {
        const a = assessTrack(parseGPX(xml, { sourceLabel: f }))
        if (f === KNOWN_WRONG_MOUNTAIN) {
          expect(a.warnings.join(' ')).toMatch(/outside the Belknap Range box/)
        } else {
          expect(a.warnings).toEqual([])
          expect(a.fatal).toEqual([])
        }
      })
    })
  }
})
