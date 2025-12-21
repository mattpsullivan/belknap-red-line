import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PMTilesProvider, usePMTiles } from './PMTilesProvider'
import maplibregl from 'maplibre-gl'

// Mock maplibre-gl protocol methods
vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  },
}))

// Mock pmtiles Protocol
vi.mock('pmtiles', () => ({
  Protocol: class MockProtocol {
    tile = vi.fn()
  },
}))

// Test component that uses the hook
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

describe('PMTilesProvider', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn() as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers pmtiles protocol on mount', async () => {
    // Mock successful HEAD request
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )

    await waitFor(() => {
      expect(maplibregl.addProtocol).toHaveBeenCalledWith('pmtiles', expect.any(Function))
    })
  })

  it('sets isOfflineReady to true when PMTiles file is available', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

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

  it('sets error when PMTiles file is not available', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false })

    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Offline map tiles not available')
    })
    expect(screen.getByTestId('offline-ready')).toHaveTextContent('false')
  })

  it('sets error when fetch fails', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Could not load offline map tiles')
    })
  })

  it('toggles offline mode', async () => {
    const user = userEvent.setup()
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

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
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    render(
      <PMTilesProvider>
        <TestConsumer />
      </PMTilesProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('offline-mode')).toHaveTextContent('true')
    })
  })

  it('generates correct offline style', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    let capturedStyle: unknown = null
    function StyleCapture() {
      const { offlineStyle } = usePMTiles()
      capturedStyle = offlineStyle
      return null
    }

    render(
      <PMTilesProvider>
        <StyleCapture />
      </PMTilesProvider>
    )

    await waitFor(() => {
      expect(capturedStyle).not.toBeNull()
    })

    const style = capturedStyle as { version: number; sources: Record<string, { type: string; url: string }> }
    expect(style.version).toBe(8)
    expect(style.sources.protomaps.type).toBe('vector')
    expect(style.sources.protomaps.url).toContain('pmtiles://')
    expect(style.sources.protomaps.url).toContain('/tiles/belknap-range.pmtiles')
  })

  it('removes pmtiles protocol on unmount', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

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
