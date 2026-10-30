import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { LAB_ACCENT, capturePointer, clampNum, labTheme, localPoint, releasePointer, useCanvas, useLatest, valueAt } from './canvasUtils'

export interface GraphSeries {
  /** Plain-language caption, e.g. "height". */
  label: string
  unit: string
  /** Samples in time order. */
  points: { t: number; v: number }[]
  color?: string
  /** Top of this row's axis; defaults to a rounded value above the maximum. */
  max?: number
  digits?: number
}

export interface GraphBand {
  from: number
  to: number
  color: string
}

export interface GraphMarker {
  t: number
  label: string
  /** Which row's top the label sits in (default 0); 'bottom' puts it at the row's base. */
  row?: number
  position?: 'top' | 'bottom'
}

export interface TimeSeriesGraphProps {
  series: GraphSeries[]
  bands?: GraphBand[]
  markers?: GraphMarker[]
  /** End of the time axis; defaults to the last sample. */
  tMax?: number
  /** Unit of the horizontal axis (seconds for a flight, kilograms for a load test). */
  timeUnit?: string
  /** Name of the horizontal axis; defaults to "time". */
  xLabel?: string
  /** Decimals for the cursor's horizontal reading (default 2). */
  xDigits?: number
  /** Cursor position; `subscribeCursor` lets playback move it every frame without a React render. */
  cursor: number
  subscribeCursor?: (cb: (t: number) => void) => () => void
  onScrub?: (t: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  ariaLabel: string
  className?: string
}

const PAD = { l: 44, r: 14, t: 10, b: 26, gap: 22 }

/** Stacked time-series plots sharing one time axis, with a scrubbable cursor that reads every row. */
export function TimeSeriesGraph(props: TimeSeriesGraphProps) {
  const { onScrub, onScrubStart, onScrubEnd, ariaLabel, className = '' } = props
  const propsRef = useLatest(props)
  const cursorRef = useRef(props.cursor)
  useLayoutEffect(() => {
    cursorRef.current = props.cursor
  }, [props.cursor])
  const dragging = useRef(false)
  const { ref, redraw } = useCanvas((ctx, w, h) => draw(ctx, w, h, propsRef.current, cursorRef.current))

  const subscribe = props.subscribeCursor
  useEffect(() => {
    if (!subscribe) return
    return subscribe((t) => {
      cursorRef.current = t
      redraw()
    })
  }, [subscribe, redraw])

  const end = tMaxOf(props)
  function timeAt(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = localPoint(e, e.currentTarget)
    return clampNum((p.x - PAD.l) / (p.w - PAD.l - PAD.r), 0, 1) * end
  }
  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!onScrub || end <= 0) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    capturePointer(e.currentTarget, e.pointerId)
    dragging.current = true
    onScrubStart?.()
    onScrub(timeAt(e))
  }
  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current || !onScrub) return
    onScrub(timeAt(e))
  }
  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    dragging.current = false
    releasePointer(e.currentTarget, e.pointerId)
    onScrubEnd?.()
  }

  return (
    <canvas
      ref={ref}
      className={`lab-canvas ${onScrub ? 'cursor-ew-resize' : ''} ${className}`}
      role={onScrub ? 'slider' : 'img'}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={end}
      aria-valuenow={props.cursor}
      tabIndex={onScrub ? 0 : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(e) => {
        if (!onScrub) return
        const d = e.key === 'ArrowRight' ? 0.1 : e.key === 'ArrowLeft' ? -0.1 : 0
        if (!d) return
        e.preventDefault()
        onScrub(clampNum(cursorRef.current + d * Math.max(end / 10, 0.1), 0, end))
      }}
    />
  )
}

function tMaxOf(p: TimeSeriesGraphProps) {
  if (p.tMax !== undefined) return p.tMax
  let t = 0
  for (const s of p.series) if (s.points.length) t = Math.max(t, s.points[s.points.length - 1].t)
  return t
}

/** A round tick spacing (1, 2 or 5 × a power of ten) near `v`. */
function niceStep(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return n * p
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, p: TimeSeriesGraphProps, cursor: number) {
  const theme = labTheme(ctx.canvas)
  ctx.font = theme.font
  const rows = p.series
  if (rows.length === 0) return
  const T = Math.max(tMaxOf(p), 1e-6)
  const pw = w - PAD.l - PAD.r
  const plotH = (h - PAD.t - PAD.b - PAD.gap * (rows.length - 1)) / rows.length
  if (pw < 20 || plotH < 20) return
  const X = (t: number) => PAD.l + (t / T) * pw
  const tops = rows.map((_, i) => PAD.t + i * (plotH + PAD.gap))
  const maxes = rows.map((s) => s.max ?? niceMax(Math.max(...s.points.map((q) => q.v), 1e-9) * 1.08))
  const Y = (i: number, v: number) => tops[i] + plotH * (1 - clampNum(v / maxes[i], 0, 1))
  const palette = [theme.text, theme.teal, theme.blue, theme.accent]

  // Bands across every row.
  for (const b of p.bands ?? []) {
    ctx.fillStyle = b.color
    rows.forEach((_, i) => ctx.fillRect(X(b.from), tops[i], Math.max(X(b.to) - X(b.from), 1), plotH))
  }

  // Grid and axes.
  ctx.lineWidth = 1
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  rows.forEach((s, i) => {
    for (let k = 0; k <= 4; k++) {
      const v = (maxes[i] * k) / 4
      ctx.strokeStyle = theme.line
      ctx.beginPath()
      ctx.moveTo(PAD.l, Y(i, v))
      ctx.lineTo(PAD.l + pw, Y(i, v))
      ctx.stroke()
      ctx.fillStyle = theme.muted
      ctx.fillText(k === 0 ? '0' : fmt(v, s.digits ?? (maxes[i] < 5 ? 1 : 0)), PAD.l - 5, Y(i, v))
    }
    ctx.strokeStyle = theme.muted
    ctx.beginPath()
    ctx.moveTo(PAD.l, tops[i])
    ctx.lineTo(PAD.l, tops[i] + plotH)
    ctx.lineTo(PAD.l + pw, tops[i] + plotH)
    ctx.stroke()
  })
  ctx.fillStyle = theme.muted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  rows.forEach((s, i) => ctx.fillText(`${s.label}  ${s.unit}`, PAD.l + 4, tops[i] + 2))
  ctx.textAlign = 'center'
  const tickStep = niceStep(T / 6)
  const bottom = tops[rows.length - 1] + plotH
  for (let t = 0; t <= T + 1e-6; t += tickStep) ctx.fillText(`${Number(t.toFixed(2))}`, X(t), bottom + 4)
  ctx.fillText(`${p.xLabel ?? 'time'}  ${p.timeUnit ?? 's'}  →`, PAD.l + pw / 2, bottom + 14)

  // Curves.
  ctx.lineWidth = 1.8
  rows.forEach((s, i) => {
    if (s.points.length < 2) return
    const step = Math.max(1, Math.floor(s.points.length / 600))
    ctx.strokeStyle = s.color ?? palette[i % palette.length]
    ctx.beginPath()
    for (let k = 0; k < s.points.length; k += step) {
      const q = s.points[k]
      if (k === 0) ctx.moveTo(X(q.t), Y(i, q.v))
      else ctx.lineTo(X(q.t), Y(i, q.v))
    }
    const lastPt = s.points[s.points.length - 1]
    ctx.lineTo(X(lastPt.t), Y(i, lastPt.v))
    ctx.stroke()
  })

  // Markers.
  ctx.fillStyle = theme.muted
  for (const m of p.markers ?? []) {
    const xx = X(m.t)
    ctx.strokeStyle = 'rgb(215 221 232 / 0.35)'
    ctx.setLineDash([2, 3])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(xx, tops[0])
    ctx.lineTo(xx, bottom)
    ctx.stroke()
    ctx.setLineDash([])
    const row = clampNum(m.row ?? 0, 0, rows.length - 1)
    const right = xx > PAD.l + pw * 0.75
    ctx.textAlign = right ? 'right' : 'left'
    ctx.textBaseline = m.position === 'bottom' ? 'bottom' : 'top'
    ctx.fillText(m.label, xx + (right ? -3 : 3), m.position === 'bottom' ? tops[row] + plotH - 2 : tops[row] + 2)
  }

  // Cursor.
  const t = clampNum(cursor, 0, T)
  const xx = X(t)
  ctx.strokeStyle = LAB_ACCENT
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(xx, tops[0])
  ctx.lineTo(xx, bottom)
  ctx.stroke()
  ctx.fillStyle = LAB_ACCENT
  const right = xx > PAD.l + pw * 0.7
  ctx.textAlign = right ? 'right' : 'left'
  ctx.textBaseline = 'top'
  const lx = xx + (right ? -6 : 6)
  rows.forEach((s, i) => {
    const v = valueAt(s.points, t)
    ctx.beginPath()
    ctx.arc(xx, Y(i, v), 4, 0, Math.PI * 2)
    ctx.fill()
    if (i === 0) ctx.fillText(`${p.xLabel ?? 'time'} ${t.toFixed(p.xDigits ?? 2)} ${p.timeUnit ?? 's'}`, lx, tops[i] + 16)
    ctx.fillText(`${s.label} ${fmt(v, s.digits ?? (maxes[i] < 5 ? 1 : 0))} ${s.unit}`, lx, tops[i] + (i === 0 ? 28 : 16))
  })
}

function fmt(v: number, digits: number) {
  return v.toFixed(digits)
}
