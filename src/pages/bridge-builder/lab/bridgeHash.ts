import { SPAN_CM } from '../../../sim/bridge'

/**
 * The Bridge Lab keeps the test setup in the URL hash, so a link reproduces it:
 *   #view=lab&load=12.5&x=20&d=<design id>&sel=<member id>
 * `load` is the applied load in kg, `x` where it sits along the road in cm.
 */
export interface BridgeHashState {
  view: 'lab' | 'simple' | null
  loadKg: number | null
  loadX: number | null
  designId: string | null
  selectedId: string | null
}

export function encodeBridgeHash(s: { loadKg: number; loadX: number; designId: string; selectedId: string | null }): string {
  const parts = ['view=lab', `load=${num(s.loadKg, 2)}`, `x=${num(s.loadX, 1)}`, `d=${encodeURIComponent(s.designId)}`]
  if (s.selectedId) parts.push(`sel=${encodeURIComponent(s.selectedId)}`)
  return parts.join('&')
}

/** Parses a hash; `maxLoadKg` clamps the load to the current bridge's axis. */
export function parseBridgeHash(hash: string, maxLoadKg = Infinity): BridgeHashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const out: BridgeHashState = { view: null, loadKg: null, loadX: null, designId: null, selectedId: null }
  if (!raw) return out
  const q = new URLSearchParams(raw)
  const view = q.get('view')
  if (view === 'lab' || view === 'simple') out.view = view
  const load = numParam(q, 'load')
  if (load !== null) out.loadKg = round(Math.min(Math.max(load, 0), maxLoadKg), 2)
  const x = numParam(q, 'x')
  if (x !== null) out.loadX = round(Math.min(Math.max(x, 0), SPAN_CM), 1)
  const d = q.get('d')
  if (d) out.designId = d
  const sel = q.get('sel')
  if (sel) out.selectedId = sel
  return out
}

/** True when the hash carries a test setup (not just a view choice). */
export function hashHasTest(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return false
  const q = new URLSearchParams(raw)
  return q.has('load') || q.has('x')
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
