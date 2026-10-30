import type { NoseShape, RocketDesign, StageSpec } from '../../shared/types'
import type { LabMetric } from '../store/labStore'
import { BOTTLES, LIMITS, STAGING, clamp } from '../sim/rocket'

/**
 * The Lab view keeps the live design in the URL hash, so a link reproduces the exact setup:
 *   #view=lab&w=0.35&p=40&a=80&v=2&m=120&n=22&nose=pointy&fins=3&rec=none&chute=0.45&wind=0&map=h
 * Boosters (bottom first) are `b=<litres>_<water>_<nozzle mm>_<dry g>,...`.
 */

export interface LabHashState {
  view: 'lab' | 'simple' | null
  metric: LabMetric | null
  /** Only the keys present in the hash, already validated and clamped. */
  design: Partial<RocketDesign>
}

export const DESIGN_HASH_KEYS = ['w', 'p', 'a', 'v', 'm', 'n', 'nose', 'fins', 'rec', 'chute', 'wind', 'b'] as const

const NOSES: NoseShape[] = ['pointy', 'round', 'flat']

export function encodeLabHash(design: RocketDesign, opts: { metric?: LabMetric } = {}): string {
  const parts: string[] = ['view=lab']
  parts.push(`w=${num(design.waterFraction, 2)}`)
  parts.push(`p=${num(design.pressurePsi, 0)}`)
  parts.push(`a=${num(design.launchAngleDeg, 0)}`)
  parts.push(`v=${num(design.bottleVolumeL, 2)}`)
  parts.push(`m=${num(design.dryMassG, 0)}`)
  parts.push(`n=${num(design.nozzleDiameterMm, 1)}`)
  parts.push(`nose=${design.noseShape}`)
  parts.push(`fins=${design.finCount}`)
  parts.push(`rec=${design.recovery === 'parachute' ? 'chute' : 'none'}`)
  if (design.recovery === 'parachute') parts.push(`chute=${num(design.parachuteDiameterM, 2)}`)
  if (design.windMs) parts.push(`wind=${num(design.windMs, 1)}`)
  if (design.boosters.length > 0) {
    parts.push(
      `b=${design.boosters
        .map((s) => [num(s.bottleVolumeL, 2), num(s.waterFraction, 2), num(s.nozzleDiameterMm, 1), num(s.dryMassG, 0)].join('_'))
        .join(',')}`,
    )
  }
  if (opts.metric && opts.metric !== 'height') parts.push(`map=${opts.metric === 'range' ? 'r' : 'h'}`)
  return parts.join('&')
}

export function parseLabHash(hash: string): LabHashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const out: LabHashState = { view: null, metric: null, design: {} }
  if (!raw) return out
  const q = new URLSearchParams(raw)
  const view = q.get('view')
  if (view === 'lab' || view === 'simple') out.view = view
  const map = q.get('map')
  if (map === 'r') out.metric = 'range'
  else if (map === 'h') out.metric = 'height'

  const d = out.design
  const w = numParam(q, 'w')
  if (w !== null) d.waterFraction = round(clamp(w, LIMITS.waterFraction.min, LIMITS.waterFraction.max), 2)
  const p = numParam(q, 'p')
  if (p !== null) d.pressurePsi = round(clamp(p, LIMITS.pressurePsi.min, LIMITS.pressurePsi.max), 0)
  const a = numParam(q, 'a')
  if (a !== null) d.launchAngleDeg = round(clamp(a, LIMITS.launchAngleDeg.min, LIMITS.launchAngleDeg.max), 0)
  const v = numParam(q, 'v')
  if (v !== null) {
    const nearest = BOTTLES.reduce((best, b) => (Math.abs(b.volumeL - v) < Math.abs(best.volumeL - v) ? b : best), BOTTLES[0])
    d.bottleVolumeL = nearest.volumeL
  }
  const m = numParam(q, 'm')
  if (m !== null) d.dryMassG = round(clamp(m, LIMITS.dryMassG.min, LIMITS.dryMassG.max), 0)
  const n = numParam(q, 'n')
  if (n !== null) d.nozzleDiameterMm = round(clamp(n, 4, 30), 1)
  const nose = q.get('nose')
  if (nose && (NOSES as string[]).includes(nose)) d.noseShape = nose as NoseShape
  const fins = numParam(q, 'fins')
  if (fins === 3 || fins === 4) d.finCount = fins
  const rec = q.get('rec')
  if (rec === 'chute') d.recovery = 'parachute'
  else if (rec === 'none') d.recovery = 'none'
  const chute = numParam(q, 'chute')
  if (chute !== null) d.parachuteDiameterM = round(clamp(chute, 0.2, 1.5), 2)
  const wind = numParam(q, 'wind')
  if (wind !== null) d.windMs = round(clamp(wind, -15, 15), 1)
  const b = q.get('b')
  if (b !== null) {
    const boosters: StageSpec[] = []
    for (const token of b.split(',')) {
      if (boosters.length >= STAGING.maxBoosters) break
      const [bv, bw, bn, bm] = token.split('_').map(Number)
      if (![bv, bw, bn, bm].every(Number.isFinite)) continue
      boosters.push({
        bottleVolumeL: BOTTLES.reduce((best, x) => (Math.abs(x.volumeL - bv) < Math.abs(best.volumeL - bv) ? x : best), BOTTLES[0]).volumeL,
        waterFraction: round(clamp(bw, 0, 0.8), 2),
        nozzleDiameterMm: round(clamp(bn, 4, 30), 1),
        dryMassG: round(clamp(bm, 10, 1000), 0),
      })
    }
    d.boosters = boosters
  }
  return out
}

/** True when the hash carries at least one design parameter. */
export function hashHasDesign(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return false
  const q = new URLSearchParams(raw)
  return DESIGN_HASH_KEYS.some((k) => q.has(k))
}

function numParam(q: URLSearchParams, key: string): number | null {
  const s = q.get(key)
  if (s === null || s === '') return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

function num(v: number, digits: number): string {
  return Number(v.toFixed(digits)).toString()
}

function round(v: number, digits: number) {
  const k = 10 ** digits
  return Math.round(v * k) / k
}
