/**
 * Offline basemap (PMTiles) support.
 *
 * Why in-memory: MapLibre's pmtiles protocol reads tiles via HTTP Range
 * requests against the archive URL. In a Capacitor WebView the bundled file is
 * served by the local asset server, which does not reliably honor Range
 * requests - so the reader gets no tile data and the basemap renders as a bare
 * background color. We instead fetch the whole archive once with a normal GET
 * (which Capacitor supports) and slice tiles from the in-memory buffer, so no
 * range requests are ever made. The file is ~1.8 MB, fine to hold in memory.
 */

import { PMTiles, type Source } from 'pmtiles'
import { layers, LIGHT } from '@protomaps/basemaps'

/** Bundled archive path (served from public/). */
export const PMTILES_URL = '/tiles/belknap-range.pmtiles'

/** Name the in-memory archive is registered under; referenced by the style. */
export const PMTILES_ARCHIVE = 'belknap'

/**
 * MapLibre style backed by the in-memory PMTiles archive. Uses the protomaps
 * LIGHT theme. The basemaps `layers()` set has no symbol/text layers, so no
 * glyphs URL is needed.
 */
export function createOfflineStyle() {
  return {
    version: 8 as const,
    sources: {
      protomaps: {
        type: 'vector' as const,
        url: `pmtiles://${PMTILES_ARCHIVE}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> | <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: layers('protomaps', LIGHT),
  }
}

/**
 * A pmtiles Source that serves bytes from an in-memory buffer (no network,
 * no range requests). `getBytes` slices the requested window out of the buffer.
 */
export function createInMemorySource(
  buffer: ArrayBuffer,
  key = PMTILES_ARCHIVE
): Source {
  return {
    getKey: () => key,
    getBytes: async (offset: number, length: number) => ({
      data: buffer.slice(offset, offset + length),
    }),
  }
}

/**
 * Fetch the whole archive with a single GET and wrap it in a PMTiles instance
 * backed by the in-memory source. Throws if the archive can't be fetched.
 */
export async function loadPmtilesArchive(
  url: string = PMTILES_URL,
  fetchFn: typeof fetch = fetch
): Promise<PMTiles> {
  const res = await fetchFn(url)
  if (!res.ok) {
    throw new Error(`PMTiles archive fetch failed: ${res.status}`)
  }
  const buffer = await res.arrayBuffer()
  return new PMTiles(createInMemorySource(buffer))
}
