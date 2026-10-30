import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * A canvas that fills its box at device-pixel resolution. `draw` runs after every render and whenever the
 * box is resized; call `redraw()` for imperative updates (a time cursor) without a React render.
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

/** Theme colours of the nearest .lab container, read from its CSS variables. */
export function labTheme(el: Element) {
  const style = getComputedStyle(el)
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    text: v('--lab-text', '#d7dde8'),
    muted: v('--lab-muted', '#8b94a7'),
    dim: v('--lab-dim', '#5b6478'),
    line: v('--lab-line', '#273043'),
    accent: v('--lab-accent', '#f5a623'),
    teal: v('--lab-teal', '#35c8c0'),
    blue: v('--lab-blue', '#4f8cff'),
    font: `11px ${v('--lab-mono', 'monospace')}`,
  }
}

export const LAB_ACCENT = '#f5a623'

/** Dark → blue → teal → pale sequential ramp for shaded fields, leaving amber free for the marker. */
const RAMP = [
  [11, 19, 38],
  [23, 58, 107],
  [31, 127, 182],
  [94, 211, 208],
  [234, 247, 255],
]
export function rampColor(f: number): string {
  const x = clampNum(f, 0, 1) * (RAMP.length - 1)
  const i = Math.min(Math.floor(x), RAMP.length - 2)
  const k = x - i
  const a = RAMP[i]
  const b = RAMP[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)} ${Math.round(a[1] + (b[1] - a[1]) * k)} ${Math.round(a[2] + (b[2] - a[2]) * k)})`
}

/** Linear interpolation into a time-sorted series. */
export function valueAt(points: { t: number; v: number }[], t: number): number {
  if (points.length === 0) return 0
  if (t <= points[0].t) return points[0].v
  const last = points[points.length - 1]
  if (t >= last.t) return last.v
  let lo = 0
  let hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = points[lo]
  const b = points[hi]
  const f = (t - a.t) / Math.max(b.t - a.t, 1e-9)
  return a.v + (b.v - a.v) * f
}

/** Keeps a ref pointing at the latest value, assigned after render (for draw callbacks). */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export function clampNum(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Round to a step (e.g. 0.01, 1, 5); step 0 leaves the value alone. */
export function snap(v: number, step: number) {
  if (!step) return v
  const k = 1 / step
  return Math.round(v * k) / k
}
