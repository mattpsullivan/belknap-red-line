/**
 * Lightweight on-device debug logger.
 *
 * Captures app logs, console errors/warnings, and uncaught errors into a capped
 * ring buffer persisted to localStorage (so logs survive a crash + the
 * reload-on-stale-chunk recovery). `shareDebugLogs()` exports them via the
 * native share sheet so they can be emailed.
 *
 * The core is a factory with injected storage/clock so it's tested without a
 * mock framework.
 */

import { Capacitor } from '@capacitor/core'
import { exportTextFile } from './fileExport'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: number
  level: LogLevel
  message: string
}

const STORAGE_KEY = 'belknap-debug-log'
const DEFAULT_CAPACITY = 300

type MinimalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface LoggerDeps {
  storage?: MinimalStorage
  now?: () => number
  capacity?: number
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

export interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  entries: () => LogEntry[]
  clear: () => void
  format: (header?: Record<string, string>) => string
}

export function createLogger(deps: LoggerDeps = {}): Logger {
  const { storage, capacity = DEFAULT_CAPACITY } = deps
  const now = deps.now ?? (() => Date.now())
  let entries: LogEntry[] = []

  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) entries = JSON.parse(raw)
    } catch {
      /* corrupt or unavailable; start fresh */
    }
  }

  function persist() {
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      /* quota / unavailable - keep going with the in-memory buffer */
    }
  }

  function record(level: LogLevel, args: unknown[]) {
    entries.push({ ts: now(), level, message: args.map(stringifyArg).join(' ') })
    if (entries.length > capacity) entries.splice(0, entries.length - capacity)
    persist()
  }

  return {
    log: (...a) => record('log', a),
    info: (...a) => record('info', a),
    warn: (...a) => record('warn', a),
    error: (...a) => record('error', a),
    entries: () => entries.slice(),
    clear: () => {
      entries = []
      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
    },
    format: (header = {}) => {
      const head = Object.entries(header)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
      const body = entries
        .map((e) => `${new Date(e.ts).toISOString()} [${e.level.toUpperCase()}] ${e.message}`)
        .join('\n')
      return `${head}\n\n${body}\n`
    },
  }
}

/** App-wide singleton, backed by localStorage when available. */
export const logger = createLogger({
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
})

let installed = false

/** Capture console errors/warnings and uncaught errors. Call once at startup. */
export function initLogger() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (e) => {
    logger.error('window.error', e.message, `${e.filename}:${e.lineno}:${e.colno}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('unhandledrejection', e.reason)
  })

  // Tee console.error/warn into the buffer while preserving normal output.
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      logger[level](...args)
      original(...args)
    }
  }

  logger.info('logger initialised', `platform=${Capacitor.getPlatform()}`)
}

/** Export the debug log via the native share sheet (or download on web). */
export function shareDebugLogs(share = exportTextFile): Promise<void> {
  const header: Record<string, string> = {
    app: 'Belknap Tracker',
    exportedAt: new Date().toISOString(),
    platform: Capacitor.getPlatform(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    entries: String(logger.entries().length),
  }
  return share('belknap-debug-log.txt', logger.format(header), 'text/plain')
}
