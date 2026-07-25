import { describe, it, expect } from 'vitest'
import { parseGPX, checkGPX, validateGPX } from './gpx.mjs'

/** Build a GPX document with a caller-supplied trkpt body. */
const doc = (trkpts, extra = '') => `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
${extra}  <trk><name>Test Track</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`

describe('parseGPX - shapes the old regex could not read', () => {
  // Each of these produced zero points and NO error under
  // /<trkpt lat="([^"]+)" lon="([^"]+)">/g
  const cases = {
    'swapped attribute order': '<trkpt lon="-71.37" lat="43.51"><ele>500</ele></trkpt>',
    'self-closing tag': '<trkpt lat="43.51" lon="-71.37"/>',
    'single-quoted attributes': "<trkpt lat='43.51' lon='-71.37'></trkpt>",
    'extra whitespace': '<trkpt   lat="43.51"    lon="-71.37" ></trkpt>',
    'an extra attribute': '<trkpt lat="43.51" lon="-71.37" foo="bar"></trkpt>',
    'newline inside the tag': '<trkpt\n    lat="43.51"\n    lon="-71.37"></trkpt>',
  }

  for (const [label, trkpt] of Object.entries(cases)) {
    it(`reads ${label}`, () => {
      const g = parseGPX(doc(trkpt))
      expect(g.points).toHaveLength(1)
      expect(g.points[0].lat).toBeCloseTo(43.51, 5)
      expect(g.points[0].lng).toBeCloseTo(-71.37, 5)
    })
  }

  it('reads namespace-prefixed documents', () => {
    const g = parseGPX(`<?xml version="1.0"?>
<g:gpx version="1.1" creator="t" xmlns:g="http://www.topografix.com/GPX/1/1">
  <g:trk><g:name>Prefixed</g:name><g:trkseg>
    <g:trkpt lat="43.51" lon="-71.37"><g:ele>500</g:ele></g:trkpt>
  </g:trkseg></g:trk>
</g:gpx>`)
    expect(g.points).toHaveLength(1)
    expect(g.name).toBe('Prefixed')
  })
})

describe('parseGPX - failing loudly', () => {
  it('throws on a file with no track points instead of returning empty', () => {
    // The silent-zero bug: the old parser reported "no improvement found".
    expect(() => parseGPX(doc(''), { sourceLabel: 'empty.gpx' })).toThrow(
      /empty\.gpx: no track points found/
    )
  })

  it('throws on malformed XML, naming the source', () => {
    expect(() =>
      parseGPX('<gpx><trk><trkseg></trk></gpx>', { sourceLabel: 'broken.gpx' })
    ).toThrow(/broken\.gpx: not well-formed XML/)
  })

  it('throws when there is no gpx root', () => {
    expect(() => parseGPX('<notgpx></notgpx>')).toThrow(/no <gpx> root/)
  })
})

describe('parseGPX - segments', () => {
  const twoSegments = `<?xml version="1.0"?>
<gpx version="1.1" creator="t" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Split</name>
    <trkseg><trkpt lat="43.51" lon="-71.37"/><trkpt lat="43.512" lon="-71.371"/></trkseg>
    <trkseg><trkpt lat="43.52" lon="-71.38"/></trkseg>
  </trk>
</gpx>`

  it('preserves trkseg boundaries rather than concatenating', () => {
    const g = parseGPX(twoSegments)
    expect(g.segments).toHaveLength(2)
    expect(g.segments[0]).toHaveLength(2)
    expect(g.segments[1]).toHaveLength(1)
  })

  it('still offers a flattened view', () => {
    expect(parseGPX(twoSegments).points).toHaveLength(3)
  })

  it('does not collapse a single trkseg into an object', () => {
    // fast-xml-parser would return an object, not an array, without isArray hints
    const g = parseGPX(doc('<trkpt lat="43.51" lon="-71.37"/>'))
    expect(Array.isArray(g.segments)).toBe(true)
    expect(g.segments).toHaveLength(1)
  })
})

describe('parseGPX - fields', () => {
  it('extracts ele, time and our accuracy extension', () => {
    const g = parseGPX(
      doc(
        '<trkpt lat="43.51" lon="-71.37"><ele>512.5</ele>' +
          '<time>2026-07-25T17:05:00.000Z</time>' +
          '<extensions><blk:accuracyMeters>4.5</blk:accuracyMeters></extensions></trkpt>'
      ).replace('<gpx ', '<gpx xmlns:blk="https://example.invalid/blk" ')
    )
    const p = g.points[0]
    expect(p.ele).toBe(512.5)
    expect(p.timeMs).toBe(Date.parse('2026-07-25T17:05:00.000Z'))
    expect(p.accuracyM).toBe(4.5)
  })

  it('classifies a timestamped file as a recording and an untimed one as a route', () => {
    expect(
      parseGPX(doc('<trkpt lat="43.51" lon="-71.37"><time>2026-07-25T17:05:00Z</time></trkpt>')).kind
    ).toBe('recording')
    expect(parseGPX(doc('<trkpt lat="43.51" lon="-71.37"/>')).kind).toBe('route')
  })

  it('prefers the trk name over the metadata name', () => {
    // The old regex took the document's FIRST CDATA <name>, which in AllTrails
    // files is the metadata name - so it never read the track name at all.
    const g = parseGPX(
      doc('<trkpt lat="43.51" lon="-71.37"/>', '  <metadata><name><![CDATA[Doc Name]]></name></metadata>\n')
    )
    expect(g.name).toBe('Test Track')
  })

  it('falls back to the metadata name when the track has none', () => {
    const g = parseGPX(`<?xml version="1.0"?>
<gpx version="1.1" creator="t" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name><![CDATA[Only Doc Name]]></name></metadata>
  <trk><trkseg><trkpt lat="43.51" lon="-71.37"/></trkseg></trk>
</gpx>`)
    expect(g.name).toBe('Only Doc Name')
  })

  it('reads a CDATA-wrapped name', () => {
    const g = parseGPX(`<?xml version="1.0"?>
<gpx version="1.1" creator="t" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name><![CDATA[Bracketed]]></name><trkseg><trkpt lat="43.51" lon="-71.37"/></trkseg></trk>
</gpx>`)
    expect(g.name).toBe('Bracketed')
  })

  it('skips points with unusable coordinates rather than emitting NaN', () => {
    const g = parseGPX(
      doc('<trkpt lat="43.51" lon="-71.37"/>\n<trkpt lat="nope" lon="-71.37"/>')
    )
    expect(g.points).toHaveLength(1)
  })
})

describe('schema validation', () => {
  it('accepts a valid document', async () => {
    const r = await checkGPX(doc('<trkpt lat="43.51" lon="-71.37"><ele>500</ele></trkpt>'))
    expect(r.valid).toBe(true)
  })

  it('rejects wrong element order and says which element', async () => {
    const r = await checkGPX(
      doc('<trkpt lat="43.51" lon="-71.37"><time>2026-07-25T17:05:00Z</time><ele>500</ele></trkpt>')
    )
    expect(r.valid).toBe(false)
    expect(r.errors.join(' ')).toMatch(/ele/)
  })

  it('checkGPX reports without throwing - the liberal-accept path', async () => {
    await expect(checkGPX('<gpx></gpx>')).resolves.toHaveProperty('valid', false)
  })

  it('validateGPX throws - the strict-send path', async () => {
    await expect(
      validateGPX('<gpx></gpx>', { sourceLabel: 'ours.gpx' })
    ).rejects.toThrow(/ours\.gpx: GPX failed schema validation/)
  })
})
