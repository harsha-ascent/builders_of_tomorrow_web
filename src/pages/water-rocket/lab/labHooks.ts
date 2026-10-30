import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLabStore, type LabActive } from '../../../store/labStore'

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

/**
 * A canvas that fills its box at device-pixel resolution. `draw` runs after every render and whenever the
 * box is resized; call `redraw()` for imperative updates (the time cursor) without a React render.
 */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  useLayoutEffect(() => {
    drawRef.current = draw
  })
  const size = useRef({ w: 0, h: 0 })

  const redraw = useCallback(() => {
    const c = ref.current
    if (!c) return
    const { w, h } = size.current
    if (w < 2 || h < 2) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pw = Math.round(w * dpr)
    const ph = Math.round(h * dpr)
    if (c.width !== pw || c.height !== ph) {
      c.width = pw
      c.height = ph
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    drawRef.current(ctx, w, h)
  }, [])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const measure = () => {
      const r = c.getBoundingClientRect()
      size.current = { w: r.width, h: r.height }
      redraw()
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(c)
    return () => ro.disconnect()
  }, [redraw])

  useEffect(() => {
    redraw()
  })

  return { ref, redraw }
}

/** Pointer capture that tolerates browsers (and synthetic events) without an active pointer of that id. */
export function capturePointer(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    /* not capturable: dragging still works while the pointer stays over the element */
  }
}
export function releasePointer(el: Element, pointerId: number) {
  try {
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
  } catch {
    /* nothing to release */
  }
}

/** Pointer position relative to an element, in CSS pixels. */
export function localPoint(e: ReactPointerEvent<Element>, el: Element) {
  const r = el.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
}

/** Class for a readout: amber while the instrument that sets it is being dragged. */
export function accentFor(active: LabActive, kind: 'water' | 'pressure' | 'angle' | 'time'): string {
  if (!active) return ''
  if (active === kind) return 'lab-accent'
  if (active === 'map' && (kind === 'water' || kind === 'pressure')) return 'lab-accent'
  return ''
}

export const ACCENT = '#f5a623'
