/**
 * App-wide tracking service singleton.
 *
 * Deliberately a module singleton rather than React context: it must outlive any
 * component, own the one provider subscription @capgo permits, and keep recording
 * while the WebView is backgrounded and React is not rendering.
 */

import { db } from '@/services/database/db'
import { logger } from '@/services/logger'
import { createTrackingService, type TrackStore } from './trackingService'

export {
  createTrackingService,
  type TrackingService,
  type TrackingSnapshot,
  type TrackStore,
} from './trackingService'

const dexieStore: TrackStore = {
  add: (track) => db.tracks.add(track) as Promise<number>,
  update: (id, changes) => db.tracks.update(id, changes),
  delete: async (id) => {
    await db.tracks.delete(id)
  },
}

export const trackingService = createTrackingService({ store: dexieStore })

let attached = false

/**
 * Persist pending points when the app is about to be backgrounded or torn down.
 *
 * This is the belt to the batching braces: `visibilitychange` still fires
 * reliably when the app is backgrounded, so it is the last guaranteed moment to
 * write before Chromium starts throttling. Call once at startup.
 */
export function attachTrackingLifecycle() {
  if (attached || typeof document === 'undefined') return
  attached = true

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      logger.event('track', 'flush.on-hidden')
      void trackingService.flush()
    }
  })
  window.addEventListener('pagehide', () => {
    logger.event('track', 'flush.on-pagehide')
    void trackingService.flush()
  })
}
