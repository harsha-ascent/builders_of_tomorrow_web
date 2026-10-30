/**
 * The Bridge Lab's parameter map: the hardest-working piece's utilisation (fraction of its breaking
 * force) and the mid-span sag over a grid of load position × test load, from the real truss analysis.
 * One factorisation per design; one back-substitution per column; every row is then arithmetic.
 */
import type { BridgeDesign } from '../../shared/types'
import { G, SPAN_CM, buildBridgeModel, forcesAt, responseAt, sagAt, type BridgeModel, type LoadResponse } from './bridge'
import type { MapKind } from './paramMap'

/** Grid columns: load position 0 … 40 cm in 1 cm steps (41). */
export const BRIDGE_MAP_POSITIONS: number[] = Array.from({ length: SPAN_CM + 1 }, (_, i) => i)
/** Grid rows: test loads, centred in `BRIDGE_MAP_ROWS` equal bands from 0 to `loadRangeKg`. */
export const BRIDGE_MAP_ROWS = 24

/** Values stored per cell, in this order, in each row's Float32Array. */
export const BRIDGE_CELL = { util: 0, sag: 1, SIZE: 2 } as const

/** Everything that changes the map: the geometry and every member's material and thickness. */
export function bridgeMapKey(d: BridgeDesign): string {
  return JSON.stringify([d.nodes.map((n) => [n.id, n.x, n.y]), d.members.map((m) => [m.a, m.b, m.material, m.layers ?? 1])])
}

/** Top of the load axis: a round number comfortably above the mid-span breaking load. */
export function loadRangeKg(model: BridgeModel | { ok: false }): number {
  if (!model.ok) return 10
  const r = model.unitAt(SPAN_CM / 2)
  const cap = Number.isFinite(r.lambda) ? r.lambda / G : 0
  return niceCeil(Math.max(cap * 1.6, 0.5))
}

/** Row values: the centre of each load band. */
export function bridgeMapLoads(rangeKg: number): number[] {
  return Array.from({ length: BRIDGE_MAP_ROWS }, (_, j) => ((j + 0.5) * rangeKg) / BRIDGE_MAP_ROWS)
}

/** Round ticks for a 0 … `rangeKg` axis. */
export function loadTicks(rangeKg: number): number[] {
  const step = niceCeil(rangeKg / 5)
  const out: number[] = []
  for (let v = 0; v <= rangeKg + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

function niceCeil(v: number): number {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  const n = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10
  return n * p
}

/** The load response at every grid column (null when the bridge is not ready). */
export function columnResponses(model: ReturnType<typeof buildBridgeModel>): LoadResponse[] | null {
  if (!model.ok) return null
  return BRIDGE_MAP_POSITIONS.map((x) => responseAt(model, model.unitAt(x)))
}

export const BRIDGE_MAP: MapKind<BridgeDesign, null> = {
  name: 'bridge',
  key: bridgeMapKey,
  rowCount: BRIDGE_MAP_ROWS,
  *rows(design) {
    const model = buildBridgeModel(design)
    const resps = columnResponses(model)
    const loads = bridgeMapLoads(loadRangeKg(model))
    for (const kg of loads) {
      const row = new Float32Array(BRIDGE_MAP_POSITIONS.length * BRIDGE_CELL.SIZE)
      BRIDGE_MAP_POSITIONS.forEach((_, i) => {
        if (!resps) {
          row[i * BRIDGE_CELL.SIZE + BRIDGE_CELL.util] = NaN
          row[i * BRIDGE_CELL.SIZE + BRIDGE_CELL.sag] = NaN
          return
        }
        const loadN = kg * G
        row[i * BRIDGE_CELL.SIZE + BRIDGE_CELL.util] = forcesAt(resps[i], loadN).worst
        row[i * BRIDGE_CELL.SIZE + BRIDGE_CELL.sag] = sagAt(resps[i], loadN)
      })
      yield row
    }
  },
  presets: () => null,
}
