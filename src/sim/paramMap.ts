/**
 * The Lab view's parameter map: predicted apogee / range over a grid of water fraction × pressure,
 * computed with the real simulator (coarse sampling, no trajectory) and cached per design.
 */
import type { RocketDesign } from '../../shared/types'
import { simOptionsFor } from '../three/launcherGeometry'
import { LIMITS, SAFETY, simulateLaunch } from './rocket'

function range(min: number, max: number, step: number): number[] {
  const out: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

/** Grid columns: water fraction 0 … 0.8 in 0.05 steps (17). */
export const MAP_WATERS = range(LIMITS.waterFraction.min, LIMITS.waterFraction.max, LIMITS.waterFraction.step)
/** Grid rows: pressure 10 … 80 psi in 5 psi steps (15), lowest first. */
export const MAP_PRESSURES = range(LIMITS.pressurePsi.min, LIMITS.pressurePsi.max, LIMITS.pressurePsi.step)

/** Values stored per cell, in this order, in each row's Float32Array. */
export const CELL = { height: 0, range: 1, landing: 2, lifted: 3, SIZE: 4 } as const

export type MapRows = (Float32Array | null)[]

/** Everything that changes the map except the two axes (and cosmetics). */
export function mapKey(d: RocketDesign): string {
  return JSON.stringify([
    d.bottleVolumeL,
    d.dryMassG,
    d.nozzleDiameterMm,
    d.noseShape,
    d.finCount,
    d.launchAngleDeg,
    d.windMs ?? 0,
    d.recovery,
    d.recovery === 'parachute' ? d.parachuteDiameterM : 0,
    d.boosters.map((b) => [b.bottleVolumeL, b.waterFraction, b.nozzleDiameterMm, b.dryMassG]),
  ])
}

/** One row of the map (one pressure, every water fraction). Runs in the worker or on the main thread. */
export function computeMapRow(design: RocketDesign, pressurePsi: number, waters: number[] = MAP_WATERS): Float32Array {
  const row = new Float32Array(waters.length * CELL.SIZE)
  const opts = { ...simOptionsFor(design.launchAngleDeg), sampleIntervalS: 1 }
  waters.forEach((w, i) => {
    const r = simulateLaunch({ ...design, waterFraction: w, pressurePsi }, opts)
    row[i * CELL.SIZE + CELL.height] = r.maxHeightM
    row[i * CELL.SIZE + CELL.range] = r.rangeM
    row[i * CELL.SIZE + CELL.landing] = r.landingSpeedMs
    row[i * CELL.SIZE + CELL.lifted] = r.liftedOff ? 1 : 0
  })
  return row
}

export function cellValue(rows: MapRows, j: number, i: number, field: number): number | null {
  const row = rows[j]
  if (!row) return null
  return row[i * CELL.SIZE + field]
}

export interface MapPreset {
  id: 'height' | 'range' | 'gentle'
  label: string
  waterFraction: number
  pressurePsi: number
  heightM: number
  rangeM: number
  landingMs: number
  /** How this preset is chosen, for the legend. */
  rule: string
}

/** Lowest height a "gentle" flight must still reach, so it is a flight and not a hop. */
export const GENTLE_MIN_HEIGHT_M = 10

/**
 * Presets found by searching the map inside the school-safe pressure band (≤ 40 psi gauge), so the
 * suggestions a class sees are ones it may actually launch. Needs every row; returns null until then.
 */
export function mapPresets(rows: MapRows): MapPreset[] | null {
  if (rows.some((r) => !r)) return null
  let best: Record<MapPreset['id'], { j: number; i: number; score: number } | null> = { height: null, range: null, gentle: null }
  MAP_PRESSURES.forEach((p, j) => {
    if (p > SAFETY.schoolMaxPsi) return
    const row = rows[j]!
    MAP_WATERS.forEach((_, i) => {
      const lifted = row[i * CELL.SIZE + CELL.lifted] > 0
      if (!lifted) return
      const h = row[i * CELL.SIZE + CELL.height]
      const r = row[i * CELL.SIZE + CELL.range]
      const land = row[i * CELL.SIZE + CELL.landing]
      if (!best.height || h > best.height.score) best.height = { j, i, score: h }
      if (!best.range || r > best.range.score) best.range = { j, i, score: r }
      if (h >= GENTLE_MIN_HEIGHT_M) {
        // Softest landing; on a tie, the lower pressure.
        const score = -land - p * 1e-4
        if (!best.gentle || score > best.gentle.score) best.gentle = { j, i, score }
      }
    })
  })
  // No school-safe setting clears 10 m (a very heavy rocket): fall back to the softest landing of any flight.
  if (!best.gentle) {
    MAP_PRESSURES.forEach((p, j) => {
      if (p > SAFETY.schoolMaxPsi) return
      const row = rows[j]!
      MAP_WATERS.forEach((_, i) => {
        if (row[i * CELL.SIZE + CELL.lifted] <= 0) return
        const score = -row[i * CELL.SIZE + CELL.landing] - p * 1e-4
        if (!best.gentle || score > best.gentle.score) best.gentle = { j, i, score }
      })
    })
  }
  best = { ...best }
  const make = (id: MapPreset['id'], label: string, rule: string, hit: { j: number; i: number } | null): MapPreset | null => {
    if (!hit) return null
    const row = rows[hit.j]!
    return {
      id,
      label,
      rule,
      waterFraction: MAP_WATERS[hit.i],
      pressurePsi: MAP_PRESSURES[hit.j],
      heightM: row[hit.i * CELL.SIZE + CELL.height],
      rangeM: row[hit.i * CELL.SIZE + CELL.range],
      landingMs: row[hit.i * CELL.SIZE + CELL.landing],
    }
  }
  return [
    make('height', 'Max height', `highest apogee at ≤ ${SAFETY.schoolMaxPsi} psi`, best.height),
    make('range', 'Max range', `longest flight at ≤ ${SAFETY.schoolMaxPsi} psi`, best.range),
    make('gentle', 'Gentle', `softest landing that still clears ${GENTLE_MIN_HEIGHT_M} m, at ≤ ${SAFETY.schoolMaxPsi} psi`, best.gentle),
  ].filter((p): p is MapPreset => p !== null)
}
