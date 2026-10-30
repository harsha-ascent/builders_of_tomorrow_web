import { useEffect, useState } from 'react'
import type { BridgeAnalysis, BridgeDesign, BridgeTestRecord } from '../../../../shared/types'
import type { useTestLog } from '../../../lib/useTestLog'
import type { BridgeModelResult, LoadResponse } from '../../../sim/bridge'
import { useBridgeLabStore, type BridgeLabActive, type BridgeTestPhase } from '../../../store/bridgeLabStore'

export { LAB_ACCENT as ACCENT } from '../../../components/lab'

/** Everything the panels share for the current bridge and load position (computed once in LabView). */
export interface BridgeLab {
  design: BridgeDesign
  model: BridgeModelResult
  /** The analysis with the load at the current position (breaking load, forces at break, sag). */
  analysis: BridgeAnalysis
  /** The linear response at the current position, or null when the bridge is not ready. */
  resp: LoadResponse | null
  /** Top of the load axis, kg. */
  rangeKg: number
  /** The response at every map column (every centimetre along the road), or null. */
  columns: LoadResponse[] | null
}

export type TestLog = ReturnType<typeof useTestLog<BridgeTestRecord>>

/** The applied load, re-rendering at most `fps` times a second (the ramp itself ticks every frame). */
export function useLabLoad(fps = 15): number {
  const [kg, setKg] = useState(() => useBridgeLabStore.getState().loadKg)
  useEffect(() => {
    let last = 0
    let pending: number | null = null
    const unsub = useBridgeLabStore.subscribe(
      (s) => s.loadKg,
      (v) => {
        const now = performance.now()
        if (now - last >= 1000 / fps) {
          last = now
          setKg(v)
        } else if (pending === null) {
          pending = window.setTimeout(() => {
            pending = null
            last = performance.now()
            setKg(useBridgeLabStore.getState().loadKg)
          }, 1000 / fps)
        }
      },
    )
    return () => {
      unsub()
      if (pending !== null) window.clearTimeout(pending)
    }
  }, [fps])
  return kg
}

/** Lets the load graph's cursor follow the ramp without React renders. */
export function subscribeLabLoad(cb: (kg: number) => void) {
  return useBridgeLabStore.subscribe((s) => s.loadKg, cb)
}

/** True for a readout while the instrument that sets it is being dragged (it turns amber). */
export function isHot(active: BridgeLabActive, kind: 'load' | 'position'): boolean {
  if (!active) return false
  if (active === 'map') return true
  if (kind === 'load') return active === 'load' || active === 'graph'
  return active === 'position'
}

/** The member the panels show: the one picked anywhere, else the first piece to break. */
export function useSelectedMember(resp: LoadResponse | null): string | null {
  const selectedId = useBridgeLabStore((s) => s.selectedId)
  if (selectedId && resp?.ids.includes(selectedId)) return selectedId
  return resp?.firstToBreak ?? resp?.ids[0] ?? null
}

/** The bridge has broken: the ramp finished, or the applied load is at or past the breaking load. */
export function isBrokenAt(loadKg: number, capacityKg: number, phase: BridgeTestPhase): boolean {
  if (phase === 'broken') return true
  return Number.isFinite(capacityKg) && loadKg >= capacityKg - 1e-9
}

/** Load fraction for the 3-D rig (1.15 = snapped). */
export function rigLoadFraction(loadKg: number, capacityKg: number, phase: BridgeTestPhase): number {
  if (isBrokenAt(loadKg, capacityKg, phase)) return 1.15
  if (!Number.isFinite(capacityKg) || capacityKg <= 0) return 0
  return loadKg / capacityKg
}

export function fmtKg(kg: number) {
  if (!Number.isFinite(kg)) return '∞'
  return kg >= 100 ? kg.toFixed(0) : kg >= 10 ? kg.toFixed(1) : kg.toFixed(2)
}
