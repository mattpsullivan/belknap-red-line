import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PMTilesProvider, usePMTiles } from './PMTilesProvider'
import maplibregl from 'maplibre-gl'

// Stub only the WebGL boundary (maplibre needs a GL canvas, unavailable in
// jsdom). The pmtiles library and protomaps style are exercised for real - the
// archive bytes are never parsed in the mount path (PMTiles is lazy), so a
// small dummy buffer stands in for the file without a mock framework.
vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  },
}))

const archiveBuffer = new ArrayBuffer(16)

function TestConsumer() {
  const { isOfflineReady, isOfflineMode, setOfflineMode, offlineStyle, error } = usePMTiles()
  return (
    <div>
      <span data-testid="offline-ready">{String(isOfflineReady)}</span>
      <span data-testid="offline-mode">{String(isOfflineMode)}</span>
      <span data-testid="has-style">{String(!!offlineStyle)}</span>
      <span data-testid="error">{error || 'none'}</span>
      <button onClick={() => setOfflineMode(!isOfflineMode)}>Toggle</button>
    </div>
  )
}

const okFetch = (async () => ({
  ok: true,
  arrayBuffer: async () => archiveBuffer,
})) as unknown as typeof fetch

describe('PMTilesProvider', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    globalThis.fetch = okFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('registers the pmtiles protocol on mount', async () => {
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(maplibregl.addProtocol).toHaveBeenCalledWith('pmtiles', expect.any(Function))
    })
  })

  it('becomes offline-ready with a style once the archive loads', async () => {
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('offline-ready')).toHaveTextContent('true')
    })
    expect(screen.getByTestId('has-style')).toHaveTextContent('true')
  })

  it('sets an error when the archive fetch is not ok', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Could not load offline map tiles')
    })
    expect(screen.getByTestId('offline-ready')).toHaveTextContent('false')
  })

  it('sets an error when the archive fetch rejects', async () => {
    globalThis.fetch = (async () => {
      throw new Error('Network error')
    }) as unknown as typeof fetch
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Could not load offline map tiles')
    })
  })

  it('toggles offline mode and persists it', async () => {
    const user = userEvent.setup()
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('offline-ready')).toHaveTextContent('true')
    })
    expect(screen.getByTestId('offline-mode')).toHaveTextContent('false')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Toggle' }))
    })

    expect(screen.getByTestId('offline-mode')).toHaveTextContent('true')
    expect(localStorage.getItem('offlineMode')).toBe('true')
  })

  it('restores offline mode from localStorage', async () => {
    localStorage.setItem('offlineMode', 'true')
    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('offline-mode')).toHaveTextContent('true')
    })
  })

  it('builds an offline style that references the in-memory archive', async () => {
    let captured: unknown = null
    function StyleCapture() {
      const { offlineStyle } = usePMTiles()
      captured = offlineStyle
      return null
    }
    render(
      <PMTilesProvider>
        <StyleCapture />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(captured).not.toBeNull()
    })
    const style = captured as { version: number; sources: Record<string, { type: string; url: string }> }
    expect(style.version).toBe(8)
    expect(style.sources.protomaps.type).toBe('vector')
    // pmtiles://<archive name>, not an http URL (which would force range requests)
    expect(style.sources.protomaps.url).toBe('pmtiles://belknap')
  })

  it('removes the pmtiles protocol on unmount', async () => {
    const { unmount } = render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('offline-ready')).toHaveTextContent('true')
    })
    unmount()
    expect(maplibregl.removeProtocol).toHaveBeenCalledWith('pmtiles')
  })
})
