/**
 * Export a recorded GPS track to a GPX 1.1 file.
 *
 * The output is shaped to round-trip through scripts/import-alltrails-gpx.js,
 * which extracts points with /<trkpt lat="..." lon="...">/ and reads an optional
 * CDATA <name>. So a track exported here can feed the trail re-densification
 * pipeline directly.
 */

import type { GPSTrack } from '@/types/trail'
import { exportTextFile } from './fileExport'

/** Serialize a track to a GPX 1.1 document string. */
export function trackToGPX(track: GPSTrack, name?: string): string {
  const trackName =
    name ?? `Belknap track ${new Date(track.startedAt).toISOString()}`

  const trkpts = track.points
    .map((p) => {
      const time = new Date(p.timestamp).toISOString()
      return `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${time}</time></trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Belknap Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name><![CDATA[${trackName}]]></name>
    <trkseg>
${trkpts}
    </trkseg>
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
