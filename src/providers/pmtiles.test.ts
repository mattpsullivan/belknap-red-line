import { describe, it, expect } from 'vitest'
import { PMTiles } from 'pmtiles'
import {
  createInMemorySource,
  createOfflineStyle,
  loadPmtilesArchive,
  PMTILES_ARCHIVE,
} from './pmtiles'

describe('createInMemorySource', () => {
  it('slices the requested byte window out of the buffer', async () => {
    const buf = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer
    const src = createInMemorySource(buf, 'k')
    expect(src.getKey()).toBe('k')
    const { data } = await src.getBytes(2, 3)
    expect(Array.from(new Uint8Array(data))).toEqual([2, 3, 4])
  })

  it('defaults the key to the archive name', () => {
    expect(createInMemorySource(new ArrayBuffer(8)).getKey()).toBe(PMTILES_ARCHIVE)
  })
})

describe('createOfflineStyle', () => {
  it('is a v8 style backed by the in-memory pmtiles archive', () => {
    const style = createOfflineStyle()
    expect(style.version).toBe(8)
    expect(style.sources.protomaps.type).toBe('vector')
    // Must reference the registered archive name, NOT an http URL - an http URL
    // is what triggered the range requests the Capacitor server won't serve.
    expect(style.sources.protomaps.url).toBe(`pmtiles://${PMTILES_ARCHIVE}`)
    expect(style.sources.protomaps.url).not.toContain('http')
    expect(style.layers.length).toBeGreaterThan(0)
    expect(
      style.layers.some((l) => 'source-layer' in l && l['source-layer'] === 'earth')
    ).toBe(true)
  })
})

describe('loadPmtilesArchive', () => {
  it('throws when the archive cannot be fetched', async () => {
    const badFetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch
    await expect(loadPmtilesArchive('/tiles/x.pmtiles', badFetch)).rejects.toThrow()
  })

  it('wraps a fetched archive in an in-memory PMTiles instance (one GET, no range requests)', async () => {
    let calls = 0
    const fetchFn = (async () => {
      calls += 1
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }
    }) as unknown as typeof fetch

    const archive = await loadPmtilesArchive('/tiles/belknap-range.pmtiles', fetchFn)
    expect(archive).toBeInstanceOf(PMTiles)
    expect(calls).toBe(1) // single GET for the whole file
  })
})
