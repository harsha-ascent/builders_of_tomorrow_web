import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { useParameterMap } from '../../../lib/useParameterMap'
import { CELL, MAP_PRESSURES, MAP_WATERS, type MapPreset, type MapRows } from '../../../sim/paramMap'
import { LIMITS, SAFETY, clamp } from '../../../sim/rocket'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore, type LabMetric } from '../../../store/labStore'
import { ACCENT, accentFor, capturePointer, localPoint, releasePointer, useCanvas } from './labHooks'
import { LabPanel } from './LabPanel'

const PAD = { l: 40, r: 52, t: 12, b: 28 }
const W_MIN = LIMITS.waterFraction.min
const W_MAX = LIMITS.waterFraction.max
const P_MIN = LIMITS.pressurePsi.min
const P_MAX = LIMITS.pressurePsi.max

/** Dark → blue → teal → pale, leaving amber free for the marker. */
const RAMP = [
  [11, 19, 38],
  [23, 58, 107],
  [31, 127, 182],
  [94, 211, 208],
  [234, 247, 255],
]
function rampColor(f: number): string {
  const x = clamp(f, 0, 1) * (RAMP.length - 1)
  const i = Math.min(Math.floor(x), RAMP.length - 2)
  const k = x - i
  const a = RAMP[i]
  const b = RAMP[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)} ${Math.round(a[1] + (b[1] - a[1]) * k)} ${Math.round(a[2] + (b[2] - a[2]) * k)})`
}

/**
 * Water fraction × pressure map shaded by predicted apogee or range, with the presets the simulator
 * finds outlined faintly and a draggable marker for the current design.
 */
export function ParameterMapPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const update = useDesignStore((s) => s.update)
  const metric = useLabStore((s) => s.metric)
  const setMetric = useLabStore((s) => s.setMetric)
  const active = useLabStore((s) => s.active)
  const setActive = useLabStore((s) => s.setActive)
  const map = useParameterMap(design)
  const dragging = useRef(false)

  const { ref } = useCanvas((ctx, w, h) => drawMap(ctx, w, h, map.rows, map.presets, metric, design, active === 'map'))

  function toDesign(e: ReactPointerEvent<HTMLCanvasElement>) {
    const { x, y, w, h } = localPoint(e, e.currentTarget)
    const fx = clamp((x - PAD.l) / (w - PAD.l - PAD.r), 0, 1)
    const fy = clamp((y - PAD.t) / (h - PAD.t - PAD.b), 0, 1)
    return {
      waterFraction: Math.round((W_MIN + fx * (W_MAX - W_MIN)) * 100) / 100,
      pressurePsi: Math.round(P_MAX - fy * (P_MAX - P_MIN)),
    }
  }
  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    capturePointer(e.currentTarget, e.pointerId)
    dragging.current = true
    setActive('map')
    update(toDesign(e))
  }
  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    update(toDesign(e))
  }
  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    dragging.current = false
    releasePointer(e.currentTarget, e.pointerId)
    setActive(null)
  }

  const value = metric === 'height' ? flight.maxHeightM : flight.rangeM
  const matches = (p: MapPreset) => Math.abs(p.waterFraction - design.waterFraction) < 0.006 && Math.abs(p.pressurePsi - design.pressurePsi) < 0.6

  return (
    <LabPanel
      title="Parameter map"
      readout={
        <>
          <span className="lab-k">water</span> <b className={accentFor(active, 'water')}>{Math.round(design.waterFraction * 100)} %</b> ·{' '}
          <span className="lab-k">pressure</span> <b className={accentFor(active, 'pressure')}>{design.pressurePsi} psi</b> → <span className="lab-k">{metric === 'height' ? 'apogee' : 'range'}</span>{' '}
          <b>{flight.liftedOff ? `${value.toFixed(1)} m` : '— (no lift-off)'}</b>
        </>
      }
      tools={
        <>
          <div className="lab-seg" role="radiogroup" aria-label="Shade the map by">
            {(['height', 'range'] as LabMetric[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={metric === m} aria-pressed={metric === m} className="lab-btn" onClick={() => setMetric(m)}>
                {m === 'height' ? 'Apogee' : 'Range'}
              </button>
            ))}
          </div>
          {map.presets?.map((p) => (
            <button
              key={p.id}
              type="button"
              className="lab-btn"
              aria-pressed={matches(p)}
              title={`${p.rule} → ${p.heightM.toFixed(1)} m high, ${p.rangeM.toFixed(1)} m far, lands at ${p.landingMs.toFixed(0)} m/s`}
              onClick={() => update({ waterFraction: p.waterFraction, pressurePsi: p.pressurePsi })}
            >
              {p.label} <span className="lab-k">{Math.round(p.waterFraction * 100)} % · {p.pressurePsi} psi</span>
            </button>
          ))}
          {!map.done && (
            <span className="lab-k" aria-live="polite">
              computing {Math.round(map.progress * 100)} %
            </span>
          )}
        </>
      }
    >
      <canvas
        ref={ref}
        className="lab-canvas cursor-crosshair"
        role="slider"
        aria-label="Water fraction and pressure"
        aria-valuetext={`${Math.round(design.waterFraction * 100)} % water, ${design.pressurePsi} psi`}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          const step = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
          if (!step) return
          e.preventDefault()
          update({
            waterFraction: Math.round(clamp(design.waterFraction + step[0], W_MIN, W_MAX) * 100) / 100,
            pressurePsi: clamp(design.pressurePsi + step[1], P_MIN, P_MAX),
          })
        }}
      />
    </LabPanel>
  )
}

function drawMap(ctx: CanvasRenderingContext2D, w: number, h: number, rows: MapRows, presets: MapPreset[] | null, metric: LabMetric, design: RocketDesign, hot: boolean) {
  const pw = w - PAD.l - PAD.r
  const ph = h - PAD.t - PAD.b
  if (pw < 20 || ph < 20) return
  const X = (water: number) => PAD.l + ((water - W_MIN) / (W_MAX - W_MIN)) * pw
  const Y = (psi: number) => PAD.t + (1 - (psi - P_MIN) / (P_MAX - P_MIN)) * ph
  const field = metric === 'height' ? CELL.height : CELL.range
  const style = getComputedStyle(ctx.canvas)
  const text = style.getPropertyValue('--lab-text').trim() || '#d7dde8'
  const muted = style.getPropertyValue('--lab-muted').trim() || '#8b94a7'
  const dim = style.getPropertyValue('--lab-dim').trim() || '#5b6478'
  const font = style.getPropertyValue('--lab-mono').trim() || 'monospace'
  ctx.font = `11px ${font}`

  // Scale: the biggest value on the map, so the shading is comparable across pressures.
  let vmax = 1
  for (const row of rows) if (row) for (let i = 0; i < MAP_WATERS.length; i++) vmax = Math.max(vmax, row[i * CELL.SIZE + field])

  // Plot background and cells.
  ctx.fillStyle = '#0d1220'
  ctx.fillRect(PAD.l, PAD.t, pw, ph)
  const dw = W_MAX > W_MIN ? ((MAP_WATERS[1] - MAP_WATERS[0]) / (W_MAX - W_MIN)) * pw : pw
  const dh = ((MAP_PRESSURES[1] - MAP_PRESSURES[0]) / (P_MAX - P_MIN)) * ph
  rows.forEach((row, j) => {
    if (!row) return
    const yc = Y(MAP_PRESSURES[j])
    const y0 = Math.max(PAD.t, yc - dh / 2)
    const y1 = Math.min(PAD.t + ph, yc + dh / 2)
    MAP_WATERS.forEach((wf, i) => {
      const xc = X(wf)
      const x0 = Math.max(PAD.l, xc - dw / 2)
      const x1 = Math.min(PAD.l + pw, xc + dw / 2)
      const lifted = row[i * CELL.SIZE + CELL.lifted] > 0
      ctx.fillStyle = lifted ? rampColor(row[i * CELL.SIZE + field] / vmax) : '#141826'
      ctx.fillRect(x0, y0, x1 - x0 + 0.5, y1 - y0 + 0.5)
      if (!lifted) {
        ctx.strokeStyle = 'rgb(255 255 255 / 0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x0, y1)
        ctx.lineTo(x1, y0)
        ctx.stroke()
      }
    })
  })

  // Safety bands (real-world guidance, same numbers as the pressure slider).
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  for (const [psi, label] of [
    [SAFETY.schoolMaxPsi, 'school limit'],
    [SAFETY.supervisedMaxPsi, 'adult + cord'],
  ] as const) {
    const y = Y(psi)
    ctx.strokeStyle = 'rgb(215 221 232 / 0.35)'
    ctx.beginPath()
    ctx.moveTo(PAD.l, y)
    ctx.lineTo(PAD.l + pw, y)
    ctx.stroke()
    ctx.fillStyle = muted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${psi} psi ${label}`, PAD.l + 4, y - 2)
  }
  ctx.setLineDash([])

  // Axes.
  ctx.fillStyle = muted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let pct = 0; pct <= 80; pct += 20) ctx.fillText(`${pct}`, X(pct / 100), PAD.t + ph + 4)
  ctx.fillText('water %  →', PAD.l + pw / 2, PAD.t + ph + 15)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let psi = P_MIN; psi <= P_MAX; psi += 10) ctx.fillText(`${psi}`, PAD.l - 5, Y(psi))
  ctx.save()
  ctx.translate(10, PAD.t + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('psi  →', 0, 0)
  ctx.restore()

  // Colour legend.
  const lx = PAD.l + pw + 10
  const lh = ph * 0.7
  const ly = PAD.t + (ph - lh) / 2
  for (let k = 0; k < lh; k++) {
    ctx.fillStyle = rampColor(1 - k / lh)
    ctx.fillRect(lx, ly + k, 8, 1.5)
  }
  ctx.strokeStyle = dim
  ctx.strokeRect(lx + 0.5, ly + 0.5, 8, lh)
  ctx.fillStyle = muted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${Math.round(vmax)} m`, lx + 12, ly + 4)
  ctx.fillText('0', lx + 12, ly + lh - 4)
  ctx.save()
  ctx.translate(lx + 30, ly + lh / 2)
  ctx.rotate(Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText(metric === 'height' ? 'apogee' : 'range', 0, 0)
  ctx.restore()

  // Preset outlines: faint rings with a label, like the standard views on an angiography map.
  if (presets) {
    for (const p of presets) {
      const x = X(p.waterFraction)
      const y = Y(p.pressurePsi)
      ctx.strokeStyle = 'rgb(215 221 232 / 0.55)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(x - 14, y)
      ctx.lineTo(x - 10, y)
      ctx.moveTo(x + 10, y)
      ctx.lineTo(x + 14, y)
      ctx.moveTo(x, y - 14)
      ctx.lineTo(x, y - 10)
      ctx.moveTo(x, y + 10)
      ctx.lineTo(x, y + 14)
      ctx.stroke()
      // Fixed label slot per preset so neighbouring presets (often one cell apart) never overprint.
      ctx.fillStyle = text
      const slot = p.id === 'height' ? 'above-left' : p.id === 'range' ? 'above-right' : 'below'
      if (slot === 'below') {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(p.label, x, y + 12)
      } else {
        const left = slot === 'above-left' || x > PAD.l + pw * 0.8
        ctx.textAlign = left ? 'right' : 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText(p.label, x + (left ? -12 : 12), y - 4)
      }
    }
  }

  // Current design: amber marker with crosshair lines.
  const mx = X(clamp(design.waterFraction, W_MIN, W_MAX))
  const my = Y(clamp(design.pressurePsi, P_MIN, P_MAX))
  ctx.strokeStyle = hot ? ACCENT : 'rgb(245 166 35 / 0.45)'
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
  ctx.fillStyle = hot ? ACCENT : '#0b0f17'
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(mx, my, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = ACCENT
  ctx.textBaseline = 'top'
  const labelLeft = mx > PAD.l + pw * 0.7
  ctx.textAlign = labelLeft ? 'right' : 'left'
  ctx.fillText(`${Math.round(design.waterFraction * 100)} % · ${design.pressurePsi} psi`, mx + (labelLeft ? -11 : 11), my + 6)
}
