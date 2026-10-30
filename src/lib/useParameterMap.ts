import { useEffect, useState } from 'react'
import type { RocketDesign } from '../../shared/types'
import type { MapJob, MapMessage } from '../sim/paramMap.worker'
import { MAP_PRESSURES, computeMapRow, mapKey, mapPresets, type MapPreset, type MapRows } from '../sim/paramMap'

export interface ParameterMap {
  key: string
  rows: MapRows
  /** 0 … 1 while the rows are still arriving. */
  progress: number
  done: boolean
  presets: MapPreset[] | null
}

interface Entry extends ParameterMap {
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
          finish(entry)
        } else {
          entry.rows[e.data.j] = e.data.row
          entry.progress = entry.rows.filter(Boolean).length / MAP_PRESSURES.length
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

function finish(entry: Entry) {
  entry.done = true
  entry.progress = 1
  entry.presets = mapPresets(entry.rows)
  notify(entry)
}

function notify(entry: Entry) {
  for (const l of entry.listeners) l()
}

function start(design: RocketDesign, key: string): Entry {
  const existing = cache.get(key)
  if (existing) return existing
  const entry: Entry = { key, rows: MAP_PRESSURES.map(() => null), progress: 0, done: false, presets: null, listeners: new Set() }
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
    const job: MapJob = { id, design }
    w.postMessage(job)
  } else {
    // No workers (tests, very old browsers): compute a row per tick on the main thread.
    let j = 0
    const tick = () => {
      if (!cache.has(key)) return
      entry.rows[j] = computeMapRow(design, MAP_PRESSURES[j])
      j++
      entry.progress = j / MAP_PRESSURES.length
      if (j < MAP_PRESSURES.length) {
        notify(entry)
        setTimeout(tick, 0)
      } else {
        jobs.delete(id)
        finish(entry)
      }
    }
    setTimeout(tick, 0)
  }
  return entry
}

/**
 * The parameter map for the current design, filling in progressively. Cached, so flipping between
 * designs is instant the second time; a short debounce keeps a drag on the angle dial from queueing
 * dozens of jobs.
 */
export function useParameterMap(design: RocketDesign): ParameterMap {
  const key = mapKey(design)
  const [snapshot, setSnapshot] = useState<ParameterMap>(() => snapshotOf(cache.get(key) ?? start(design, key)))

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | null = null
    const subscribe = () => {
      if (cancelled) return
      const entry = cache.get(key) ?? start(design, key)
      const onChange = () => setSnapshot(snapshotOf(entry))
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
    // `design` is only needed to start a job; the key captures every field the map depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return snapshot
}

function snapshotOf(e: Entry): ParameterMap {
  return { key: e.key, rows: e.rows.slice(), progress: e.progress, done: e.done, presets: e.presets }
}
