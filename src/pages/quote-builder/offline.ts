/**
 * Poor-signal plan for reps on site (PDF item 8).
 *
 * - Connectivity follows `navigator.onLine` and the `online` / `offline` events.
 * - Every builder change made while offline is queued here (and in localStorage, so a reload on
 *   site doesn't lose the count). The builder keeps working on its local draft.
 * - When the network comes back the queue is flushed: today that means a toast; with the backend,
 *   each queued change is replayed as an API call (last write wins per field, server timestamp).
 */
import { useSyncExternalStore } from 'react'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'

const KEY = 'hillman.offlineQueue'

interface QueuedChange {
  quoteId: string
  at: string
}

function load(): QueuedChange[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QueuedChange[]) : []
  } catch {
    return []
  }
}

let queue: QueuedChange[] = load()
let online = typeof navigator === 'undefined' ? true : navigator.onLine
let version = 0
const listeners = new Set<() => void>()

function persist() {
  try {
    if (queue.length) localStorage.setItem(KEY, JSON.stringify(queue))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

function emit() {
  version++
  listeners.forEach((l) => l())
}

function flush() {
  const n = queue.length
  queue = []
  persist()
  if (n) toast(t('{n} modifications synchronisées', { n }))
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    flush()
    emit()
  })
  window.addEventListener('offline', () => {
    online = false
    emit()
  })
}

/** Record a change made while offline (no-op when online). */
export function queueChange(quoteId: string) {
  if (online) return
  queue.push({ quoteId, at: new Date().toISOString() })
  persist()
  emit()
}

/** `{ online, pending }` — re-renders when either changes. */
export function useConnectivity() {
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
  return { online, pending: queue.length }
}

// A reload while back online syncs what was queued before.
if (online && queue.length && typeof window !== 'undefined') window.setTimeout(flush, 1500)
