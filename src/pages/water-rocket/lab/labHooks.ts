import { useEffect, useState } from 'react'
import { useLabStore, type LabActive } from '../../../store/labStore'

export { LAB_ACCENT as ACCENT } from '../../../components/lab'

/** The playback time, re-rendering at most `fps` times a second (the clock itself ticks every frame). */
export function useLabTime(fps = 15): number {
  const [t, setT] = useState(() => useLabStore.getState().time)
  useEffect(() => {
    let last = 0
    let pending: number | null = null
    const unsub = useLabStore.subscribe(
      (s) => s.time,
      (time) => {
        const now = performance.now()
        if (now - last >= 1000 / fps) {
          last = now
          setT(time)
        } else if (pending === null) {
          pending = window.setTimeout(() => {
            pending = null
            last = performance.now()
            setT(useLabStore.getState().time)
          }, 1000 / fps)
        }
      },
    )
    return () => {
      unsub()
      if (pending !== null) window.clearTimeout(pending)
    }
  }, [fps])
  return t
}

/** True for a readout while the instrument that sets it is being dragged (it turns amber). */
export function isHot(active: LabActive, kind: 'water' | 'pressure' | 'angle' | 'time'): boolean {
  if (!active) return false
  if (active === kind) return true
  return active === 'map' && (kind === 'water' || kind === 'pressure')
}

/** Plain-language flight phase for readouts. */
export const PHASE_LABEL: Record<string, string> = {
  ready: 'on the pad',
  thrust: 'pushing water out',
  air: 'air burst',
  coast: 'coasting',
  parachute: 'under the parachute',
  landed: 'landed',
}

/** Lets the time-series graph follow the playback clock without React renders. */
export function subscribeLabTime(cb: (t: number) => void) {
  return useLabStore.subscribe((s) => s.time, cb)
}
