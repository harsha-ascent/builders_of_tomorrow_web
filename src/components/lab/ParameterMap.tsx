import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { LAB_ACCENT, capturePointer, clampNum, labTheme, localPoint, rampColor, releasePointer, snap, useCanvas, useLatest } from './canvasUtils'

export interface MapAxis {
  /** Plain-language name shown on the axis, e.g. "water in the bottle". */
  label: string
  unit?: string
  min: number
  max: number
  /** Grid positions along this axis, ascending. */
  values: number[]
  /** Snapping step for drags and arrow keys. */
  step: number
  format?: (v: number) => string
  /** Tick positions; defaults to the grid values thinned to about five. */
  ticks?: number[]
}

export interface MapPreset {
  id: string
  label: string
  x: number
  y: number
  /** Where the label goes relative to the ring. */
  slot?: 'above-left' | 'above-right' | 'below'
}

export interface MapGuide {
  axis: 'x' | 'y'
  at: number
  label: string
}

export interface ParameterMapProps {
  xAxis: MapAxis
  yAxis: MapAxis
  /**
   * Field value at grid cell (column i of xAxis.values, row j of yAxis.values).
   * `null` = not computed yet (left blank), `NaN` = invalid (hatched).
   */
  cell: (i: number, j: number) => number | null
  /** Legend caption and unit for the shaded field. */
  fieldLabel: string
  fieldUnit?: string
  /** Top of the colour scale; defaults to the largest value on the map. */
  fieldMax?: number
  /** Current marker. */
  x: number
  y: number
  markerLabel?: string
  onChange: (x: number, y: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  /** True while this map's marker is being dragged (brighter marker). */
  hot?: boolean
  presets?: MapPreset[]
  guides?: MapGuide[]
  ariaLabel: string
  className?: string
}

const PAD = { l: 42, r: 54, t: 12, b: 30 }

/**
 * A two-axis parameter map: a shaded field over a grid, faint outlines for named presets, guide lines,
 * and a draggable marker for the current setting. Works with mouse, touch and arrow keys.
 */
export function ParameterMap(props: ParameterMapProps) {
  const { xAxis, yAxis, x, y, onChange, onDragStart, onDragEnd, ariaLabel, className = '' } = props
  const dragging = useRef(false)
  const propsRef = useLatest(props)
  const { ref } = useCanvas((ctx, w, h) => draw(ctx, w, h, propsRef.current))

  function fromPointer(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = localPoint(e, e.currentTarget)
    const fx = clampNum((p.x - PAD.l) / (p.w - PAD.l - PAD.r), 0, 1)
    const fy = clampNum((p.y - PAD.t) / (p.h - PAD.t - PAD.b), 0, 1)
    return {
      x: clampNum(snap(xAxis.min + fx * (xAxis.max - xAxis.min), xAxis.step), xAxis.min, xAxis.max),
      y: clampNum(snap(yAxis.max - fy * (yAxis.max - yAxis.min), yAxis.step), yAxis.min, yAxis.max),
    }
  }
  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    capturePointer(e.currentTarget, e.pointerId)
    dragging.current = true
    onDragStart?.()
    const p = fromPointer(e)
    onChange(p.x, p.y)
  }
  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    const p = fromPointer(e)
    onChange(p.x, p.y)
  }
  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    dragging.current = false
    releasePointer(e.currentTarget, e.pointerId)
    onDragEnd?.()
  }
  const fx = xAxis.format ?? ((v: number) => `${v}`)
  const fy = yAxis.format ?? ((v: number) => `${v}`)

  return (
    <canvas
      ref={ref}
      className={`lab-canvas cursor-crosshair ${className}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuetext={`${xAxis.label} ${fx(x)}${xAxis.unit ? ` ${xAxis.unit}` : ''}, ${yAxis.label} ${fy(y)}${yAxis.unit ? ` ${yAxis.unit}` : ''}`}
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(e) => {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
        if (!d) return
        e.preventDefault()
        onChange(clampNum(snap(x + d[0] * xAxis.step, xAxis.step), xAxis.min, xAxis.max), clampNum(snap(y + d[1] * yAxis.step, yAxis.step), yAxis.min, yAxis.max))
      }}
    />
  )
}

function thin(values: number[], n = 5): number[] {
  if (values.length <= n) return values
  const step = Math.max(1, Math.round((values.length - 1) / (n - 1)))
  const out: number[] = []
  for (let i = 0; i < values.length; i += step) out.push(values[i])
  if (out[out.length - 1] !== values[values.length - 1]) out.push(values[values.length - 1])
  return out
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, p: ParameterMapProps) {
  const { xAxis, yAxis, cell, presets = [], guides = [], hot = false } = p
  const pw = w - PAD.l - PAD.r
  const ph = h - PAD.t - PAD.b
  if (pw < 20 || ph < 20) return
  const theme = labTheme(ctx.canvas)
  ctx.font = theme.font
  const X = (v: number) => PAD.l + ((v - xAxis.min) / (xAxis.max - xAxis.min)) * pw
  const Y = (v: number) => PAD.t + (1 - (v - yAxis.min) / (yAxis.max - yAxis.min)) * ph
  const fx = xAxis.format ?? ((v: number) => `${v}`)
  const fy = yAxis.format ?? ((v: number) => `${v}`)

  // Colour scale: the biggest value on the map unless told otherwise.
  let vmax = p.fieldMax ?? 0
  if (p.fieldMax === undefined) {
    for (let j = 0; j < yAxis.values.length; j++)
      for (let i = 0; i < xAxis.values.length; i++) {
        const v = cell(i, j)
        if (v !== null && Number.isFinite(v)) vmax = Math.max(vmax, v)
      }
  }
  vmax = Math.max(vmax, 1e-9)

  // Field.
  ctx.fillStyle = '#0d1220'
  ctx.fillRect(PAD.l, PAD.t, pw, ph)
  const dx = xAxis.values.length > 1 ? ((xAxis.values[1] - xAxis.values[0]) / (xAxis.max - xAxis.min)) * pw : pw
  const dy = yAxis.values.length > 1 ? ((yAxis.values[1] - yAxis.values[0]) / (yAxis.max - yAxis.min)) * ph : ph
  yAxis.values.forEach((yv, j) => {
    const yc = Y(yv)
    const y0 = Math.max(PAD.t, yc - dy / 2)
    const y1 = Math.min(PAD.t + ph, yc + dy / 2)
    xAxis.values.forEach((xv, i) => {
      const v = cell(i, j)
      if (v === null) return
      const xc = X(xv)
      const x0 = Math.max(PAD.l, xc - dx / 2)
      const x1 = Math.min(PAD.l + pw, xc + dx / 2)
      const valid = Number.isFinite(v)
      ctx.fillStyle = valid ? rampColor(v / vmax) : '#141826'
      ctx.fillRect(x0, y0, x1 - x0 + 0.5, y1 - y0 + 0.5)
      if (!valid) {
        ctx.strokeStyle = 'rgb(255 255 255 / 0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x0, y1)
        ctx.lineTo(x1, y0)
        ctx.stroke()
      }
    })
  })

  // Guide lines.
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgb(215 221 232 / 0.35)'
  ctx.fillStyle = theme.muted
  for (const g of guides) {
    ctx.beginPath()
    if (g.axis === 'y') {
      const yy = Y(g.at)
      ctx.moveTo(PAD.l, yy)
      ctx.lineTo(PAD.l + pw, yy)
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(g.label, PAD.l + 4, yy - 2)
    } else {
      const xx = X(g.at)
      ctx.moveTo(xx, PAD.t)
      ctx.lineTo(xx, PAD.t + ph)
      ctx.stroke()
      ctx.save()
      ctx.translate(xx - 3, PAD.t + 4)
      ctx.rotate(Math.PI / 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(g.label, 0, 0)
      ctx.restore()
    }
  }
  ctx.setLineDash([])

  // Axes.
  ctx.fillStyle = theme.muted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const t of xAxis.ticks ?? thin(xAxis.values)) ctx.fillText(fx(t), X(t), PAD.t + ph + 4)
  ctx.fillText(`${xAxis.label}${xAxis.unit ? ` (${xAxis.unit})` : ''}  →`, PAD.l + pw / 2, PAD.t + ph + 16)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const t of yAxis.ticks ?? thin(yAxis.values, 8)) ctx.fillText(fy(t), PAD.l - 5, Y(t))
  ctx.save()
  ctx.translate(10, PAD.t + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${yAxis.label}${yAxis.unit ? ` (${yAxis.unit})` : ''}  →`, 0, 0)
  ctx.restore()

  // Colour legend.
  const lx = PAD.l + pw + 10
  const lh = ph * 0.7
  const ly = PAD.t + (ph - lh) / 2
  for (let k = 0; k < lh; k++) {
    ctx.fillStyle = rampColor(1 - k / lh)
    ctx.fillRect(lx, ly + k, 8, 1.5)
  }
  ctx.strokeStyle = theme.dim
  ctx.strokeRect(lx + 0.5, ly + 0.5, 8, lh)
  ctx.fillStyle = theme.muted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${Math.round(vmax)}${p.fieldUnit ? ` ${p.fieldUnit}` : ''}`, lx + 12, ly + 4)
  ctx.fillText('0', lx + 12, ly + lh - 4)
  ctx.save()
  ctx.translate(lx + 30, ly + lh / 2)
  ctx.rotate(Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText(p.fieldLabel, 0, 0)
  ctx.restore()

  // Preset outlines: faint rings with a label, like the standard views on an angiography map.
  for (const pr of presets) {
    const xx = X(pr.x)
    const yy = Y(pr.y)
    ctx.strokeStyle = 'rgb(215 221 232 / 0.55)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(xx, yy, 9, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(xx - 14, yy)
    ctx.lineTo(xx - 10, yy)
    ctx.moveTo(xx + 10, yy)
    ctx.lineTo(xx + 14, yy)
    ctx.moveTo(xx, yy - 14)
    ctx.lineTo(xx, yy - 10)
    ctx.moveTo(xx, yy + 10)
    ctx.lineTo(xx, yy + 14)
    ctx.stroke()
    ctx.fillStyle = theme.text
    const slot = pr.slot ?? 'above-right'
    if (slot === 'below') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(pr.label, xx, yy + 12)
    } else {
      const left = slot === 'above-left' || xx > PAD.l + pw * 0.8
      ctx.textAlign = left ? 'right' : 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(pr.label, xx + (left ? -12 : 12), yy - 4)
    }
  }

  // Current setting: amber marker with crosshair lines.
  const mx = X(clampNum(p.x, xAxis.min, xAxis.max))
  const my = Y(clampNum(p.y, yAxis.min, yAxis.max))
  ctx.strokeStyle = hot ? LAB_ACCENT : 'rgb(245 166 35 / 0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD.l, my)
  ctx.lineTo(PAD.l + pw, my)
  ctx.moveTo(mx, PAD.t)
  ctx.lineTo(mx, PAD.t + ph)
  ctx.stroke()
  if (hot) {
    ctx.fillStyle = 'rgb(245 166 35 / 0.25)'
    ctx.beginPath()
    ctx.arc(mx, my, 16, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = hot ? LAB_ACCENT : '#0b0f17'
  ctx.strokeStyle = LAB_ACCENT
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(mx, my, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (p.markerLabel) {
    ctx.fillStyle = LAB_ACCENT
    ctx.textBaseline = 'top'
    const left = mx > PAD.l + pw * 0.7
    ctx.textAlign = left ? 'right' : 'left'
    ctx.fillText(p.markerLabel, mx + (left ? -11 : 11), my + 6)
  }
}
