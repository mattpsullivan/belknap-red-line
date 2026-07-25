import { describe, it, expect } from 'vitest'
import { assessTrack, RANGE_BBOX } from './trackQuality.mjs'
import { METERS_PER_MILE } from './geo.mjs'

const T0 = Date.parse('2026-07-25T17:00:00.000Z')

/** A point on Belknap Mountain, offset by whole metres-ish in latitude. */
const pt = (i, over = {}) => ({
  lat: 43.513 + i * 0.00009, // ~10 m per step
  lng: -71.373,
  ele: 500 + i,
  timeMs: T0 + i * 10_000, // 10 s apart -> ~1 m/s, normal walking
  ...over,
})

/** A clean single-segment recording of n points. */
const track = (n = 20, over = {}) => {
  const points = Array.from({ length: n }, (_, i) => pt(i))
  return { kind: 'recording', name: 'T', segments: [points], points, ...over }
}

const labels = (a) => [...a.fatal, ...a.warnings].join(' | ')

describe('a clean track', () => {
  it('produces no fatals and no warnings', () => {
    const a = assessTrack(track())
    expect(a.fatal).toEqual([])
    expect(a.warnings).toEqual([])
  })

  it('still reports what it could not check', () => {
    // A check that cannot run must say so, or a reader assumes it passed.
    const a = assessTrack(track())
    expect(a.skipped.join(' ')).toMatch(/length comparison/)
  })
})

describe('segments', () => {
  const split = () => {
    const a = [pt(0), pt(1)]
    const b = [pt(50), pt(51)]
    return { kind: 'recording', name: 'T', segments: [a, b], points: [...a, ...b] }
  }

  it('is fatal, because joining segments fabricates geometry', () => {
    expect(assessTrack(split()).fatal.join(' ')).toMatch(/2 <trkseg> segments/)
  })

  it('can be overridden deliberately', () => {
    expect(assessTrack(split(), { allowBridge: true }).fatal).toEqual([])
  })

  it('does not measure the gap across a segment boundary', () => {
    // Otherwise we would re-flag the very gap we split on.
    expect(labels(assessTrack(split(), { allowBridge: true }))).not.toMatch(/largest gap/)
  })
})

describe('bounding box', () => {
  it('accepts points inside the range', () => {
    expect(labels(assessTrack(track()))).not.toMatch(/outside/)
  })

  it('flags a track on a different mountain', () => {
    // Whiteface_Mountain_Trail.gpx in data/gpx is exactly this: same name,
    // ~25 km northeast, a different mountain.
    const points = Array.from({ length: 20 }, (_, i) => pt(i, { lat: 43.6565, lng: -71.1021 }))
    expect(labels(assessTrack({ kind: 'recording', name: 'T', segments: [points], points })))
      .toMatch(/20\/20 points outside the Belknap Range box/)
  })

  it('brackets the trusted-anchor hull rather than trails.json', () => {
    // Regression on the calibration: trails.json's own bbox reaches lng -71.2156
    // because the known-bad trails define its edge. The gate must be tighter.
    expect(RANGE_BBOX.maxLng).toBeLessThan(-71.2156)
    expect(RANGE_BBOX.minLat).toBeLessThan(43.4888)
    expect(RANGE_BBOX.maxLat).toBeGreaterThan(43.54134)
  })
})

describe('point density', () => {
  it('accepts 10 points', () => {
    expect(labels(assessTrack(track(10)))).not.toMatch(/only \d+ points/)
  })

  it('warns at 9 points', () => {
    expect(labels(assessTrack(track(9)))).toMatch(/only 9 points/)
  })
})

describe('gaps between consecutive points', () => {
  it('warns when a gap exceeds 250 m', () => {
    const points = [pt(0), { ...pt(0), lat: 43.513 + 0.005 }] // ~550 m
    const a = assessTrack({ kind: 'recording', name: 'T', segments: [points], points })
    expect(labels(a)).toMatch(/largest gap between consecutive points is \d+ m/)
  })

  it('stays quiet for ordinary spacing', () => {
    expect(labels(assessTrack(track()))).not.toMatch(/largest gap/)
  })
})

describe('speed', () => {
  it('warns on vehicle-like speed', () => {
    // ~550 m in 10 s = 55 m/s
    const points = [pt(0), { ...pt(1), lat: 43.513 + 0.005 }]
    const a = assessTrack({ kind: 'recording', name: 'T', segments: [points], points })
    expect(labels(a)).toMatch(/implausible speed/)
  })

  it('is skipped, not passed, when the file has no timestamps', () => {
    const points = Array.from({ length: 20 }, (_, i) => pt(i, { timeMs: undefined }))
    const a = assessTrack({ kind: 'route', name: 'T', segments: [points], points })
    expect(labels(a)).not.toMatch(/implausible speed/)
    expect(a.skipped.join(' ')).toMatch(/speed: no timestamps/)
  })
})

describe('length against the workbook distance', () => {
  const trailOf = (miles) => ({ id: 'x', distance: miles })

  it('accepts a length within tolerance', () => {
    const t = track(20) // ~190 m
    const miles = 190 / METERS_PER_MILE
    expect(labels(assessTrack(t, { trail: trailOf(miles) }))).not.toMatch(/recorded/)
  })

  it('warns when the recorded length is far off', () => {
    const a = assessTrack(track(20), { trail: trailOf(5) })
    expect(labels(a)).toMatch(/recorded .* vs 5 mi expected/)
  })

  it('is never fatal - the reference distance may be the wrong one', () => {
    // Phase 8 exists because current trail data is wrong; a good track must not
    // be rejected outright by a bad expected distance.
    expect(assessTrack(track(20), { trail: trailOf(5) }).fatal).toEqual([])
  })
})

describe('elevation datum', () => {
  it('reports ele as info and states it is discarded', () => {
    const a = assessTrack(track())
    expect(a.info.join(' ')).toMatch(/<ele> present on 20\/20 points/)
    expect(a.info.join(' ')).toMatch(/Discarded on ingest/)
  })

  it('is skipped when there is no ele', () => {
    const points = Array.from({ length: 20 }, (_, i) => pt(i, { ele: undefined }))
    const a = assessTrack({ kind: 'recording', name: 'T', segments: [points], points })
    expect(a.skipped.join(' ')).toMatch(/elevation datum: no <ele>/)
  })
})
