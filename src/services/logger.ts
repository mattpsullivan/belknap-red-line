/**
 * On-device diagnostic log.
 *
 * Rebuilt 2026-07-25 after an 81-minute recording produced a two-line log, both
 * lines being "logger initialised". Nothing on the GPS path logged anything, so
 * the reason background recording died was undiagnosable from the artifact - the
 * only evidence was what the log did NOT contain.
 *
 * Design follows from what that day could not answer:
 *
 *   - **Structured, not prose.** Entries are objects with a category, an event
 *     name and typed fields, exported as JSONL so they can be filtered and
 *     analysed rather than read.
 *   - **Volume-capable.** A fix every 5s for two hours is ~1,400 entries. The old
 *     localStorage sink re-serialised the entire array on every write; this one
 *     batches into IndexedDB.
 *   - **Survives a kill.** Entries persist, so evidence outlives the process.
 *   - **Silence is evidence.** With a heartbeat running, a gap in entries is a
 *     positive signal that JS was frozen - the distinction between "location was
 *     revoked" and "the whole WebView was suspended".
 *
 * The sink is injected so tests drive an in-memory implementation with
 * state-based assertions - no mock framework.
 */

import { exportTextFile } from './fileExport'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Coarse grouping so a reader can filter a 2,000-line export down to one question. */
export type LogCategory =
  | 'app' // lifecycle: start, resume, pause, visibility
  | 'gps' // every fix arrival and what the filters did with it
  | 'health' // recording-health transitions, stall alerts, haptics
  | 'device' // permissions, battery optimisation, Doze - see deviceState.ts
  | 'track' // recording start/stop, point storage
  | 'error'

export interface LogEntry {
  id?: number
  ts: number
  level: LogLevel
  cat: LogCategory
  event: string
  /** Event-specific fields. Kept flat so JSONL stays greppable. */
  data?: Record<string, unknown>
}

/** Where entries go to be persisted. Async and batched. */
export interface LogSink {
  write(entries: LogEntry[]): Promise<void>
  readAll(): Promise<LogEntry[]>
  clear(): Promise<void>
}

export interface LoggerDeps {
  sink?: LogSink
  now?: () => number
  /** Entries buffered before a flush is triggered. */
  batchSize?: number
  /** Max entries held in memory for synchronous inspection. */
  memoryCapacity?: number
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`
  }
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/** Values that survive structuredClone into IndexedDB and JSON.stringify alike. */
function sanitise(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    out[k] =
      v === null || ['string', 'number', 'boolean'].includes(typeof v)
        ? v
        : stringifyArg(v)
  }
  return out
}

export interface Logger {
  /** Structured event - the primary API. */
  event(cat: LogCategory, event: string, data?: Record<string, unknown>, level?: LogLevel): void
  /** Console-style helpers, retained for error capture. */
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  /** In-memory tail, most recent last. */
  entries(): LogEntry[]
  /** Persist anything buffered. Safe to call often. */
  flush(): Promise<void>
  /** Everything persisted plus anything buffered, oldest first. */
  readAll(): Promise<LogEntry[]>
  clear(): Promise<void>
  /** JSONL: one entry per line, header first. */
  format(entries: LogEntry[], header?: Record<string, unknown>): string
}

export function createLogger(deps: LoggerDeps = {}): Logger {
  const { sink, batchSize = 25, memoryCapacity = 500 } = deps
  const now = deps.now ?? (() => Date.now())

  let memory: LogEntry[] = []
  let pending: LogEntry[] = []
  let flushing: Promise<void> = Promise.resolve()

  function record(entry: LogEntry) {
    memory.push(entry)
    if (memory.length > memoryCapacity) {
      memory.splice(0, memory.length - memoryCapacity)
    }
    if (!sink) return
    pending.push(entry)
    if (pending.length >= batchSize) void flush()
  }

  function flush(): Promise<void> {
    if (!sink || pending.length === 0) return flushing
    const batch = pending
    pending = []
    // Serialise flushes so batches land in order even under rapid calls.
    flushing = flushing
      .then(() => sink.write(batch))
      .catch(() => {
        /* a failed flush must never break recording; the memory tail remains */
      })
    return flushing
  }

  return {
    event(cat, event, data, level = 'info') {
      record({
        ts: now(),
        level,
        cat,
        event,
        ...(data && Object.keys(data).length ? { data: sanitise(data) } : {}),
      })
    },

    info: (...a) =>
      record({ ts: now(), level: 'info', cat: 'app', event: 'log', data: { message: a.map(stringifyArg).join(' ') } }),
    warn: (...a) =>
      record({ ts: now(), level: 'warn', cat: 'app', event: 'log', data: { message: a.map(stringifyArg).join(' ') } }),
    error: (...a) =>
      record({ ts: now(), level: 'error', cat: 'error', event: 'log', data: { message: a.map(stringifyArg).join(' ') } }),

    entries: () => memory.slice(),
    flush,

    async readAll() {
      await flush()
      if (!sink) return memory.slice()
      const stored = await sink.readAll()
      return stored.sort((a, b) => a.ts - b.ts)
    },

    async clear() {
      memory = []
      pending = []
      if (sink) await sink.clear()
    },

    format(entries, header = {}) {
      const lines = [JSON.stringify({ type: 'header', ...header })]
      for (const e of entries) {
        lines.push(
          JSON.stringify({
            t: new Date(e.ts).toISOString(),
            lvl: e.level,
            cat: e.cat,
            ev: e.event,
            ...(e.data ?? {}),
          })
        )
      }
      return lines.join('\n') + '\n'
    },
  }
}

// ---------------------------------------------------------------------------
// App wiring
// ---------------------------------------------------------------------------

/** Keep the log bounded: oldest entries are dropped past this many rows. */
const MAX_STORED_ENTRIES = 20_000

/**
 * IndexedDB sink. Imported lazily so the logger module stays usable in tests and
 * in any context where Dexie has not been initialised.
 */
const dexieSink: LogSink = {
  async write(entries) {
    const { db } = await import('./database/db')
    await db.logs.bulkAdd(entries)
    const count = await db.logs.count()
    if (count > MAX_STORED_ENTRIES) {
      const excess = await db.logs
        .orderBy('ts')
        .limit(count - MAX_STORED_ENTRIES)
        .primaryKeys()
      await db.logs.bulkDelete(excess)
    }
  },
  async readAll() {
    const { db } = await import('./database/db')
    return db.logs.orderBy('ts').toArray()
  },
  async clear() {
    const { db } = await import('./database/db')
    await db.logs.clear()
  },
}

/** App-wide singleton. */
export const logger = createLogger({
  sink: typeof indexedDB !== 'undefined' ? dexieSink : undefined,
})

let installed = false

/** Capture uncaught errors and console noise. Call once at startup. */
export function initLogger() {
  if (installed) return
  installed = true

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      logger.event('error', 'window.error', {
        message: e.message,
        source: `${e.filename}:${e.lineno}:${e.colno}`,
      }, 'error')
    })
    window.addEventListener('unhandledrejection', (e) => {
      logger.event('error', 'unhandledrejection', { reason: stringifyArg(e.reason) }, 'error')
    })

    // Lifecycle. A freeze shows up as a gap between entries; these bracket it,
    // which is how we tell "the OS suspended us" from "nothing happened".
    document.addEventListener('visibilitychange', () => {
      logger.event('app', 'visibilitychange', { state: document.visibilityState })
      if (document.visibilityState === 'hidden') void logger.flush()
    })
    window.addEventListener('pagehide', () => {
      logger.event('app', 'pagehide')
      void logger.flush()
    })
    window.addEventListener('freeze', () => {
      logger.event('app', 'freeze', {}, 'warn')
      void logger.flush()
    })
    window.addEventListener('resume', () => logger.event('app', 'resume'))
  }

  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      logger[level](...args)
      original(...args)
    }
  }

  logger.event('app', 'startup', {
    platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
  })
}

/**
 * Export the diagnostic log as JSONL via the native share sheet.
 *
 * JSONL rather than prose so it can be filtered and analysed - e.g.
 *   jq -c 'select(.cat=="gps")' log.jsonl
 *   jq -c 'select(.ev=="heartbeat") | .t' log.jsonl   # gaps here mean frozen JS
 */
export async function shareDebugLogs(
  share = exportTextFile,
  read: () => Promise<LogEntry[]> = () => logger.readAll()
): Promise<void> {
  const entries = await read()
  const span = entries.length
    ? {
        firstEntry: new Date(entries[0].ts).toISOString(),
        lastEntry: new Date(entries[entries.length - 1].ts).toISOString(),
      }
    : {}
  const body = logger.format(entries, {
    app: 'Belknap Tracker',
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    entries: entries.length,
    ...span,
  })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return share(`belknap-debug-${stamp}.jsonl`, body, 'application/x-ndjson')
}
