import { describe, it, expect } from 'vitest'
import { createRetryLoader } from './lazyWithRetry'

/** In-memory Storage stand-in (no mock framework). */
function memStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

const mod = { default: 'PAGE' as const }

describe('createRetryLoader', () => {
  it('returns the module and clears the reload flag on success', async () => {
    const storage = memStorage()
    storage.setItem('lazy-retry-reloaded', '1') // simulate a prior reload
    let reloads = 0
    const load = createRetryLoader(async () => mod, storage, () => reloads++)

    expect(await load()).toBe(mod)
    expect(reloads).toBe(0)
    expect(storage.getItem('lazy-retry-reloaded')).toBeNull()
  })

  it('reloads once on a failed import and does not resolve', async () => {
    const storage = memStorage()
    let reloads = 0
    const load = createRetryLoader(
      async () => {
        throw new Error('Failed to fetch dynamically imported module')
      },
      storage,
      () => reloads++
    )

    let settled = false
    void load().then(
      () => (settled = true),
      () => (settled = true)
    )
    // let microtasks flush
    await Promise.resolve()
    await Promise.resolve()

    expect(reloads).toBe(1)
    expect(storage.getItem('lazy-retry-reloaded')).toBe('1')
    expect(settled).toBe(false) // pending while the reload happens
  })

  it('rethrows on a second failure instead of reloading again', async () => {
    const storage = memStorage()
    storage.setItem('lazy-retry-reloaded', '1') // already reloaded once
    let reloads = 0
    const load = createRetryLoader(
      async () => {
        throw new Error('still missing')
      },
      storage,
      () => reloads++
    )

    await expect(load()).rejects.toThrow('still missing')
    expect(reloads).toBe(0)
  })
})
