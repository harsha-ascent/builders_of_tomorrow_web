/**
 * Computes a Lab view's parameter map off the main thread, one row at a time, so the UI stays smooth
 * while the map fills in. A newer job cancels the one in progress between rows.
 */
import { MAP_KINDS } from './mapKinds'

export interface MapJob {
  id: number
  /** A `MapKind.name`. */
  kind: string
  design: unknown
}
export type MapMessage = { id: number; j: number; row: Float32Array } | { id: number; done: true }

interface WorkerCtx {
  onmessage: ((e: MessageEvent<MapJob>) => void) | null
  postMessage: (msg: MapMessage, transfer?: Transferable[]) => void
}
const ctx = self as unknown as WorkerCtx

let latest = 0

ctx.onmessage = async (e) => {
  const { id, kind, design } = e.data
  latest = id
  const spec = MAP_KINDS[kind]
  if (!spec) {
    ctx.postMessage({ id, done: true })
    return
  }
  let j = 0
  for (const row of spec.rows(design as never)) {
    if (latest !== id) return
    ctx.postMessage({ id, j, row }, [row.buffer])
    j++
    // Let a newer job's message in before the next row.
    await new Promise((r) => setTimeout(r, 0))
  }
  if (latest === id) ctx.postMessage({ id, done: true })
}
