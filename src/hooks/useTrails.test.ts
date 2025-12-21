import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTrails } from './useTrails'

describe('useTrails', () => {
  it('returns all trails', () => {
    const { result } = renderHook(() => useTrails())

    expect(result.current.trails).toBeDefined()
    expect(result.current.trails.length).toBeGreaterThan(0)
  })

  it('returns trail by ID', () => {
    const { result } = renderHook(() => useTrails())

    const trail = result.current.getTrailById('quarry-trail')
    expect(trail).toBeDefined()
    expect(trail?.name).toBe('Quarry Trail')
  })

  it('returns undefined for unknown trail ID', () => {
    const { result } = renderHook(() => useTrails())

    const trail = result.current.getTrailById('unknown')
    expect(trail).toBeUndefined()
  })

  it('returns total distance', () => {
    const { result } = renderHook(() => useTrails())

    expect(result.current.totalDistance).toBeGreaterThan(0)
  })

  it('returns total trail count', () => {
    const { result } = renderHook(() => useTrails())

    expect(result.current.totalTrails).toBeGreaterThan(0)
    expect(result.current.totalTrails).toBe(result.current.trails.length)
  })
})
