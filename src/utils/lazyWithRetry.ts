import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Lazy-loading that survives a deploy/update.
 *
 * After an app update the running page still references old chunk hashes; once
 * the new build replaces them, `import()` rejects with "Failed to fetch
 * dynamically imported module". We reload once (so the page picks up the fresh
 * index + service worker), guarded by a one-shot flag so a genuinely missing
 * chunk surfaces to the ErrorBoundary instead of reloading forever.
 */

const RELOAD_FLAG = 'lazy-retry-reloaded'

type Loader<T> = () => Promise<{ default: T }>

/**
 * The retrying loader, separated from React.lazy so it can be tested directly.
 * `storage` and `reload` are injected for tests (real in-memory stand-ins, no
 * mock framework).
 */
export function createRetryLoader<T>(
  factory: Loader<T>,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  reload: () => void
): Loader<T> {
  return async () => {
    try {
      const mod = await factory()
      storage.removeItem(RELOAD_FLAG) // loaded cleanly; reset the one-shot
      return mod
    } catch (err) {
      if (!storage.getItem(RELOAD_FLAG)) {
        storage.setItem(RELOAD_FLAG, '1')
        reload()
        // Reload is in flight; never resolve so nothing renders meanwhile.
        return new Promise<{ default: T }>(() => {})
      }
      throw err // already reloaded once - let the ErrorBoundary handle it
    }
  }
}

/** React.lazy with reload-once-on-stale-chunk behaviour. */
export function lazyWithRetry<T extends ComponentType>(
  factory: Loader<T>
): LazyExoticComponent<T> {
  return lazy(
    createRetryLoader(factory, sessionStorage, () => window.location.reload())
  )
}
