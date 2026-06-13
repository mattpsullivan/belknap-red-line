import { describe, it, expect } from 'vitest'
import type { GPSTrack } from '@/types/trail'
import { trackToGPX, gpxFilename } from './gpxExport'

function track(): GPSTrack {
  return {
    id: 1,
    startedAt: new Date('2026-06-13T09:15:00.000Z'),
    endedAt: new Date('2026-06-13T11:00:00.000Z'),
    distance: 1234,
    points: [
      { lat: 43.5123, lng: -71.2937, accuracy: 5, timestamp: Date.parse('2026-06-13T09:15:00.000Z') },
      { lat: 43.5131, lng: -71.2925, accuracy: 6, timestamp: Date.parse('2026-06-13T09:16:00.000Z') },
      { lat: 43.5142, lng: -71.291, accuracy: 4, timestamp: Date.parse('2026-06-13T09:17:00.000Z') },
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
      { lat: 43.5131, lng: -71.2925 },
      { lat: 43.5142, lng: -71.291 },
    ])
    // and the importer's CDATA name regex finds the name
    expect(/<name><!\[CDATA\[(.*?)\]\]><\/name>/.exec(gpx)?.[1]).toBeTruthy()
  })

  it('honors a custom track name', () => {
    expect(trackToGPX(track(), 'Round Pond Trail')).toContain(
      '<name><![CDATA[Round Pond Trail]]></name>'
    )
  })
})

describe('gpxFilename', () => {
  it('builds a filesystem-safe name from the start time', () => {
    expect(gpxFilename(track())).toBe('belknap-track-2026-06-13-09-15-00.gpx')
  })
})
