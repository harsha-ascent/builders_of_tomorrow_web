/**
 * Computes the Lab view's parameter map off the main thread, one pressure row at a time, so the UI
 * stays smooth while the map fills in. A newer job cancels the one in progress between rows.
 */
import type { RocketDesign } from '../../shared/types'
import { MAP_PRESSURES, computeMapRow } from './paramMap'

export interface MapJob {
  id: number
  design: RocketDesign
}
export type MapMessage = { id: number; j: number; row: Float32Array } | { id: number; done: true }

interface WorkerCtx {
  onmessage: ((e: MessageEvent<MapJob>) => void) | null
  postMessage: (msg: MapMessage, transfer?: Transferable[]) => void
}
const ctx = self as unknown as WorkerCtx

let latest = 0

ctx.onmessage = async (e) => {
  const { id, design } = e.data
  latest = id
  for (let j = 0; j < MAP_PRESSURES.length; j++) {
    if (latest !== id) return
    const row = computeMapRow(design, MAP_PRESSURES[j])
    ctx.postMessage({ id, j, row }, [row.buffer])
    // Let a newer job's message in before the next row.
    await new Promise((r) => setTimeout(r, 0))
  }
  if (latest === id) ctx.postMessage({ id, done: true })
}
