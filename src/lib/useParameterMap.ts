import { useEffect, useState } from 'react'
import type { MapJob, MapMessage } from '../sim/paramMap.worker'
import type { MapKind, MapRows } from '../sim/paramMap'

export interface ParameterMap<P = null> {
  key: string
  rows: MapRows
  /** 0 … 1 while the rows are still arriving. */
  progress: number
  done: boolean
  presets: P | null
}

interface Entry extends ParameterMap<unknown> {
  rowCount: number
  finish: () => void
  listeners: Set<() => void>
}

const MAX_CACHE = 16
const cache = new Map<string, Entry>()
const jobs = new Map<number, string>()
let nextJob = 1
let worker: Worker | null | undefined

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = typeof Worker === 'undefined' ? null : new Worker(new URL('../sim/paramMap.worker.ts', import.meta.url), { type: 'module' })
    if (worker) {
      worker.onmessage = (e: MessageEvent<MapMessage>) => {
        const key = jobs.get(e.data.id)
        if (!key) return
        const entry = cache.get(key)
        if (!entry) return
        if ('done' in e.data) {
          jobs.delete(e.data.id)
          entry.finish()
        } else {
          entry.rows[e.data.j] = e.data.row
          entry.progress = entry.rows.filter(Boolean).length / entry.rowCount
          notify(entry)
        }
      }
      worker.onerror = () => {
        worker = null
      }
    }
  } catch {
    worker = null
  }
  return worker
}

function notify(entry: Entry) {
  for (const l of entry.listeners) l()
}

function start<D, P>(design: D, kind: MapKind<D, P>, key: string): Entry {
  const existing = cache.get(key)
  if (existing) return existing
  const entry: Entry = {
    key,
    rows: Array.from({ length: kind.rowCount }, () => null),
    rowCount: kind.rowCount,
    progress: 0,
    done: false,
    presets: null,
    listeners: new Set(),
    finish: () => {
      entry.done = true
      entry.progress = 1
      entry.presets = kind.presets(entry.rows)
      notify(entry)
    },
  }
  cache.set(key, entry)
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
  const w = getWorker()
  const id = nextJob++
  jobs.set(id, key)
  if (w) {
    const job: MapJob = { id, kind: kind.name, design }
    w.postMessage(job)
  } else {
    // No workers (tests, very old browsers): compute a row per tick on the main thread.
    const it = kind.rows(design)[Symbol.iterator]()
    let j = 0
    const tick = () => {
      if (!cache.has(key)) return
      const next = it.next()
      if (next.done || j >= kind.rowCount) {
        jobs.delete(id)
        entry.finish()
        return
      }
      entry.rows[j] = next.value
      j++
      entry.progress = j / kind.rowCount
      notify(entry)
      setTimeout(tick, 0)
    }
    setTimeout(tick, 0)
  }
  return entry
}

/**
 * The parameter map of `kind` for the current design, filling in progressively. Cached, so flipping
 * between designs is instant the second time; a short debounce keeps a drag on another control from
 * queueing dozens of jobs.
 */
export function useParameterMap<D, P>(design: D, kind: MapKind<D, P>): ParameterMap<P> {
  const key = `${kind.name}:${kind.key(design)}`
  const [snapshot, setSnapshot] = useState<ParameterMap<P>>(() => snapshotOf<P>(cache.get(key) ?? start(design, kind, key)))

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | null = null
    const subscribe = () => {
      if (cancelled) return
      const entry = cache.get(key) ?? start(design, kind, key)
      const onChange = () => setSnapshot(snapshotOf<P>(entry))
      entry.listeners.add(onChange)
      onChange()
      unsub = () => entry.listeners.delete(onChange)
    }
    const cached = cache.get(key)
    let timer: number | null = null
    if (cached) subscribe()
    else timer = window.setTimeout(subscribe, 120)
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      unsub?.()
    }
    // `design` and `kind` are only needed to start a job; the key captures every field the map depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return snapshot
}

function snapshotOf<P>(e: Entry): ParameterMap<P> {
  return { key: e.key, rows: e.rows.slice(), progress: e.progress, done: e.done, presets: e.presets as P | null }
}
