import { describe, it, expect } from 'vitest'
import { exportTextFile, type FileExporter } from './fileExport'

/** In-memory exporter that records what it was asked to do (no mocks). */
function recordingExporter(isNative: boolean) {
  const shared: { filename: string; data: string }[] = []
  const downloaded: { filename: string; data: string; mimeType: string }[] = []
  const exporter: FileExporter = {
    isNative: () => isNative,
    writeAndShare: async (filename, data) => void shared.push({ filename, data }),
    browserDownload: (filename, data, mimeType) =>
      void downloaded.push({ filename, data, mimeType }),
  }
  return { exporter, shared, downloaded }
}

describe('exportTextFile', () => {
  it('writes + shares on native, never touches the browser download path', async () => {
    const { exporter, shared, downloaded } = recordingExporter(true)
    await exportTextFile('track.gpx', '<gpx/>', 'application/gpx+xml', exporter)
    expect(shared).toEqual([{ filename: 'track.gpx', data: '<gpx/>' }])
    expect(downloaded).toEqual([])
  })

  it('uses the blob download on web, never the native path', async () => {
    const { exporter, shared, downloaded } = recordingExporter(false)
    await exportTextFile('track.gpx', '<gpx/>', 'application/gpx+xml', exporter)
    expect(downloaded).toEqual([
      { filename: 'track.gpx', data: '<gpx/>', mimeType: 'application/gpx+xml' },
    ])
    expect(shared).toEqual([])
  })
})
