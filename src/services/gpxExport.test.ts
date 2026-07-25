import { describe, it, expect } from 'vitest'
import type { GPSTrack } from '@/types/trail'
import {
  trackToGPX,
  gpxFilename,
  splitOnStall,
  BELKNAP_GEOID_HEIGHT_M,
} from './gpxExport'

const T0 = Date.parse('2026-06-13T09:15:00.000Z')

/** Three points ~10 m and 5 s apart - normal walking cadence, one segment. */
function track(): GPSTrack {
  return {
    id: 1,
    startedAt: new Date('2026-06-13T09:15:00.000Z'),
    endedAt: new Date('2026-06-13T11:00:00.000Z'),
    distance: 1234,
    points: [
      { lat: 43.5123, lng: -71.2937, accuracy: 5, timestamp: T0 },
      { lat: 43.51239, lng: -71.29369, accuracy: 6, timestamp: T0 + 5_000 },
      { lat: 43.51248, lng: -71.29368, accuracy: 4, timestamp: T0 + 10_000 },
    ],
  }
}

describe('trackToGPX', () => {
  it('produces a GPX 1.1 document with one trkpt per point', () => {
    const gpx = trackToGPX(track())
    expect(gpx).toContain('<gpx version="1.1"')
    expect(gpx).toContain('<trkseg>')
    expect((gpx.match(/<trkpt /g) ?? []).length).toBe(3)
    expect(gpx).toContain('<time>2026-06-13T09:15:00.000Z</time>')
  })

  it('round-trips through the import pipeline parser', () => {
    const gpx = trackToGPX(track())
    // Exact regex used by scripts/import-alltrails-gpx.js
    const re = /<trkpt lat="([^"]+)" lon="([^"]+)">/g
    const parsed: { lat: number; lng: number }[] = []
    let m
    while ((m = re.exec(gpx)) !== null) {
      parsed.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) })
    }
    expect(parsed).toEqual([
      { lat: 43.5123, lng: -71.2937 },
      { lat: 43.51239, lng: -71.29369 },
      { lat: 43.51248, lng: -71.29368 },
    ])
    // and the importer's CDATA name regex finds the name
    expect(/<name><!\[CDATA\[(.*?)\]\]><\/name>/.exec(gpx)?.[1]).toBeTruthy()
  })

  it('gives the importer the TRACK name, not the metadata name', () => {
    // The importer takes the FIRST CDATA <name> in the document, so metadata's
    // name must not be CDATA or it would win.
    const gpx = trackToGPX(track(), 'White Trail ascent')
    expect(/<name><!\[CDATA\[(.*?)\]\]><\/name>/.exec(gpx)?.[1]).toBe(
      'White Trail ascent'
    )
  })

  it('honors a custom track name', () => {
    expect(trackToGPX(track(), 'Round Pond Trail')).toContain(
      '<name><![CDATA[Round Pond Trail]]></name>'
    )
  })

  it('omits <ele> entirely when a point has no vertical fix', () => {
    const gpx = trackToGPX(track())
    expect(gpx).not.toContain('<ele>')
    expect(gpx).not.toContain('<geoidheight>')
  })

  it('converts raw ellipsoidal altitude to orthometric <ele>', () => {
    const t = track()
    // 700 m ellipsoidal at a geoid height of -27.1 is 727.1 m orthometric.
    t.points[0].altitudeEllipsoidM = 700
    const gpx = trackToGPX(t)
    expect(gpx).toContain('<ele>727.1</ele>')
    // Sanity: the correction raises the value, since the geoid is below the
    // ellipsoid here. Getting this backwards is the failure mode that matters.
    expect(700 - BELKNAP_GEOID_HEIGHT_M).toBeGreaterThan(700)
  })

  it('records the geoid height applied so the raw value is recoverable', () => {
    const t = track()
    t.points[0].altitudeEllipsoidM = 512.34
    const gpx = trackToGPX(t)

    const ele = parseFloat(/<ele>([^<]+)<\/ele>/.exec(gpx)![1])
    const geoid = parseFloat(/<geoidheight>([^<]+)<\/geoidheight>/.exec(gpx)![1])
    // h = ele + geoidheight, exactly reversible
    expect(ele + geoid).toBeCloseTo(512.34, 3)
  })

  it('emits <ele> per point, skipping only the points that lack altitude', () => {
    const t = track()
    t.points[0].altitudeEllipsoidM = 300
    t.points[2].altitudeEllipsoidM = 400
    const gpx = trackToGPX(t)
    expect((gpx.match(/<ele>/g) ?? []).length).toBe(2)
    expect((gpx.match(/<trkpt /g) ?? []).length).toBe(3)
  })

  it('keeps the importer regex matching once <ele> is present', () => {
    const t = track()
    t.points.forEach((p, i) => (p.altitudeEllipsoidM = 300 + i))
    const gpx = trackToGPX(t)
    // Exact regex used by scripts/import-alltrails-gpx.js - adding child
    // elements must not disturb the opening tag it matches on.
    const re = /<trkpt lat="([^"]+)" lon="([^"]+)">/g
    const parsed: { lat: number; lng: number }[] = []
    let m
    while ((m = re.exec(gpx)) !== null) {
      parsed.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) })
    }
    expect(parsed).toEqual([
      { lat: 43.5123, lng: -71.2937 },
      { lat: 43.51239, lng: -71.29369 },
      { lat: 43.51248, lng: -71.29368 },
    ])
  })

  it('treats a zero-altitude reading as real data, not a missing fix', () => {
    const t = track()
    t.points[0].altitudeEllipsoidM = 0
    expect(trackToGPX(t)).toContain('<ele>27.1</ele>')
  })

  it('exports horizontal accuracy in a namespaced extension, never as <hdop>', () => {
    const gpx = trackToGPX(track())
    expect(gpx).toContain('<blk:accuracyMeters>5</blk:accuracyMeters>')
    expect(gpx).not.toContain('<hdop>')
    // the namespace the extension uses must be declared on the root
    expect(gpx).toContain('xmlns:blk=')
  })
})

describe('trackToGPX metadata', () => {
  it('emits a metadata block in schema order with bounds over all points', () => {
    const gpx = trackToGPX(track())
    const meta = /<metadata>([\s\S]*?)<\/metadata>/.exec(gpx)?.[1] ?? ''
    // metadataType sequence: name, desc, author, copyright, link, time, keywords, bounds
    const order = ['<name>', '<desc>', '<link ', '<time>', '<bounds '].map((t) =>
      meta.indexOf(t)
    )
    expect(order.every((i) => i >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))

    expect(meta).toContain('minlat="43.5123"')
    expect(meta).toContain('minlon="-71.2937"')
    expect(meta).toContain('maxlat="43.51248"')
    expect(meta).toContain('maxlon="-71.29368"')
  })

  it('declares the schema location so a validator can find gpx.xsd', () => {
    const gpx = trackToGPX(track())
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"')
    expect(gpx).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
    expect(gpx).toContain('gpx.xsd')
    expect(gpx).toContain('creator="Belknap Tracker"')
  })

  it('escapes metadata text rather than emitting raw markup', () => {
    const gpx = trackToGPX(track(), 'Ben & Jerry <ascent>')
    expect(gpx).toContain('<name>Ben &amp; Jerry &lt;ascent&gt;</name>')
  })

  it('keeps CDATA well-formed when the name contains a CDATA terminator', () => {
    const gpx = trackToGPX(track(), 'weird]]>name')
    // must not leave a bare ]]> inside the section
    expect(gpx).toContain(']]]]><![CDATA[>')
    // and the document still parses
    expect(
      new DOMParser().parseFromString(gpx, 'application/xml')
        .getElementsByTagName('parsererror').length
    ).toBe(0)
  })

  it('produces a well-formed XML document', () => {
    const t = track()
    t.points[0].altitudeEllipsoidM = 700
    const doc = new DOMParser().parseFromString(
      trackToGPX(t),
      'application/xml'
    )
    expect(doc.getElementsByTagName('parsererror').length).toBe(0)
    expect(doc.documentElement.tagName).toBe('gpx')
  })
})

describe('schema compliance', () => {
  // Strict in what we send. This is the half that must hard-fail: a silent pass
  // would let an element-order bug ship with the suite green.
  it('validates against the vendored GPX 1.1 schema', async () => {
    const { checkGPX } = await import('../../scripts/lib/gpx.mjs')
    const t = track()
    t.points[0].altitudeEllipsoidM = 700
    t.points[2].altitudeEllipsoidM = 0
    const { valid, errors } = await checkGPX(trackToGPX(t, 'Ben & Jerry <ascent>'))
    expect(errors).toEqual([])
    expect(valid).toBe(true)
  })

  it('validates a multi-segment export too', async () => {
    const { checkGPX } = await import('../../scripts/lib/gpx.mjs')
    const t = track()
    t.points = [
      { lat: 43.5123, lng: -71.2937, accuracy: 5, timestamp: T0, altitudeEllipsoidM: 500 },
      { lat: 43.5124, lng: -71.2937, accuracy: 5, timestamp: T0 + 5_000 },
      { lat: 43.5231, lng: -71.2937, accuracy: 5, timestamp: T0 + 96 * 60_000 },
    ]
    const gpx = trackToGPX(t)
    expect((gpx.match(/<trkseg>/g) ?? []).length).toBe(2)
    expect((await checkGPX(gpx)).valid).toBe(true)
  })

  it('round-trips through the real parser with segments intact', async () => {
    const { parseGPX } = await import('../../scripts/lib/gpx.mjs')
    const t = track()
    t.points = [
      { lat: 43.5123, lng: -71.2937, accuracy: 4.5, timestamp: T0, altitudeEllipsoidM: 700 },
      { lat: 43.5124, lng: -71.2937, accuracy: 4.5, timestamp: T0 + 5_000, altitudeEllipsoidM: 701 },
      { lat: 43.5231, lng: -71.2937, accuracy: 4.5, timestamp: T0 + 96 * 60_000, altitudeEllipsoidM: 720 },
    ]
    const parsed = parseGPX(trackToGPX(t, 'Round trip'))
    expect(parsed.name).toBe('Round trip')
    expect(parsed.kind).toBe('recording')
    expect(parsed.segments.map((s: unknown[]) => s.length)).toEqual([2, 1])
    // <ele> is orthometric, so it comes back geoid-shifted from what we stored.
    expect(parsed.points[0].ele).toBeCloseTo(700 - BELKNAP_GEOID_HEIGHT_M, 3)
    expect(parsed.points[0].accuracyM).toBe(4.5)
  })
})

describe('splitOnStall', () => {
  const at = (lat: number, lng: number, ms: number) => ({
    lat,
    lng,
    accuracy: 5,
    timestamp: T0 + ms,
  })

  it('keeps normal walking cadence in a single segment', () => {
    expect(splitOnStall(track().points)).toHaveLength(1)
  })

  it('returns no segments for an empty track', () => {
    expect(splitOnStall([])).toEqual([])
  })

  it('splits when fixes stop for a long time AND the hiker moved', () => {
    // ~1.2 km apart, 96 minutes apart - the 2026-06-13 failure shape
    const pts = [at(43.5123, -71.2937, 0), at(43.5231, -71.2937, 96 * 60_000)]
    const segs = splitOnStall(pts)
    expect(segs).toHaveLength(2)
    expect(segs[0]).toHaveLength(1)
    expect(segs[1]).toHaveLength(1)
  })

  it('does NOT split a long pause with no movement (a rest stop)', () => {
    // 30 minutes standing still: the distance filter suppressed points, but
    // connecting them fabricates nothing.
    const pts = [at(43.5123, -71.2937, 0), at(43.51231, -71.29371, 30 * 60_000)]
    expect(splitOnStall(pts)).toHaveLength(1)
  })

  it('does NOT split a large jump that happened quickly', () => {
    // Fixes never stopped, so this is movement (or a bad fix), not a gap.
    const pts = [at(43.5123, -71.2937, 0), at(43.5231, -71.2937, 5_000)]
    expect(splitOnStall(pts)).toHaveLength(1)
  })

  it('renders each run as its own trkseg', () => {
    const t = track()
    t.points = [
      at(43.5123, -71.2937, 0),
      at(43.5124, -71.2937, 5_000),
      at(43.5231, -71.2937, 96 * 60_000),
    ]
    const gpx = trackToGPX(t)
    expect((gpx.match(/<trkseg>/g) ?? []).length).toBe(2)
    expect((gpx.match(/<trkpt /g) ?? []).length).toBe(3)
  })
})

describe('gpxFilename', () => {
  it('builds a filesystem-safe name from the start time', () => {
    expect(gpxFilename(track())).toBe('belknap-track-2026-06-13-09-15-00.gpx')
  })
})
