import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { FlightPhase, LaunchResult } from '../../../../shared/types'
import { sampleAt } from '../../../sim/rocket'
import { useLabStore } from '../../../store/labStore'
import { ACCENT, accentFor, capturePointer, localPoint, releasePointer, useCanvas } from './labHooks'
import { LabPanel } from './LabPanel'

const PAD = { l: 44, r: 14, t: 10, b: 26, gap: 22 }

const PHASE_FILL: Partial<Record<FlightPhase, string>> = {
  thrust: 'rgb(79 140 255 / 0.18)',
  air: 'rgb(215 221 232 / 0.10)',
  parachute: 'rgb(53 200 192 / 0.12)',
}

/** Altitude and speed versus time from the precomputed flight, with a scrubbable cursor that moves the rocket. */
export function GraphsPanel({ flight }: { flight: LaunchResult }) {
  const scrub = useLabStore((s) => s.scrub)
  const setActive = useLabStore((s) => s.setActive)
  const active = useLabStore((s) => s.active)
  const dragging = useRef(false)

  const { ref, redraw } = useCanvas((ctx, w, h) => drawGraphs(ctx, w, h, flight, useLabStore.getState().time))

  // The cursor follows playback without a React render.
  useEffect(() => useLabStore.subscribe((s) => s.time, redraw), [redraw])

  const end = flight.samples[flight.samples.length - 1]?.t ?? 0
  function timeAt(e: ReactPointerEvent<HTMLCanvasElement>) {
    const { x, w } = localPoint(e, e.currentTarget)
    const f = Math.min(1, Math.max(0, (x - PAD.l) / (w - PAD.l - PAD.r)))
    return f * end
  }
  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (end <= 0) return
    capturePointer(e.currentTarget, e.pointerId)
    dragging.current = true
    setActive('time')
    scrub(timeAt(e))
  }
  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    scrub(timeAt(e))
  }
  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    dragging.current = false
    releasePointer(e.currentTarget, e.pointerId)
    setActive(null)
  }

  const chute = flight.parachuteDeployedAtS
  return (
    <LabPanel
      title="Altitude & speed"
      readout={
        flight.liftedOff ? (
          <>
            <span className="lab-k">apogee</span> <b className="lab-accent">{flight.maxHeightM.toFixed(1)} m</b> <span className="lab-k">@ {flight.apogeeTimeS.toFixed(1)} s</span> ·{' '}
            <span className="lab-k">max</span> <b>{flight.maxSpeedMs.toFixed(0)} m/s</b> · <span className="lab-k">burnout</span> <b>{(flight.thrustTimeS * 1000).toFixed(0)} ms</b> ·{' '}
            <span className="lab-k">landed</span> <b>{flight.rangeM.toFixed(1)} m @ {flight.flightTimeS.toFixed(1)} s</b>
            {chute != null && (
              <>
                {' '}
                · <span className="lab-k">chute</span> <b>{chute.toFixed(1)} s</b>
              </>
            )}
          </>
        ) : (
          <span className="lab-k">no lift-off</span>
        )
      }
      tools={<span className={`lab-k ${accentFor(active, 'time')}`}>drag to scrub the flight</span>}
    >
      <canvas
        ref={ref}
        className="lab-canvas cursor-ew-resize"
        role="slider"
        aria-label="Flight time"
        aria-valuemin={0}
        aria-valuemax={end}
        aria-valuenow={useLabStore.getState().time}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          const d = e.key === 'ArrowRight' ? 0.1 : e.key === 'ArrowLeft' ? -0.1 : 0
          if (!d) return
          e.preventDefault()
          scrub(Math.min(end, Math.max(0, useLabStore.getState().time + d)))
        }}
      />
    </LabPanel>
  )
}

function drawGraphs(ctx: CanvasRenderingContext2D, w: number, h: number, flight: LaunchResult, time: number) {
  const style = getComputedStyle(ctx.canvas)
  const text = style.getPropertyValue('--lab-text').trim() || '#d7dde8'
  const muted = style.getPropertyValue('--lab-muted').trim() || '#8b94a7'
  const line = style.getPropertyValue('--lab-line').trim() || '#273043'
  const teal = style.getPropertyValue('--lab-teal').trim() || '#35c8c0'
  const font = style.getPropertyValue('--lab-mono').trim() || 'monospace'
  ctx.font = `11px ${font}`

  const samples = flight.samples
  const T = Math.max(samples[samples.length - 1]?.t ?? 0, 0.5)
  // Altitude above the launch point, so the curve peaks at the apogee figure.
  const y0 = samples[0]?.y ?? 0
  const altOf = (y: number) => Math.max(y - y0, 0)
  const pw = w - PAD.l - PAD.r
  const plotH = (h - PAD.t - PAD.b - PAD.gap) / 2
  if (pw < 20 || plotH < 20) return
  const X = (t: number) => PAD.l + (t / T) * pw
  const hMax = niceMax(Math.max(flight.maxHeightM, 1) * 1.08)
  const vMax = niceMax(Math.max(flight.maxSpeedMs, 1) * 1.08)
  const top1 = PAD.t
  const top2 = PAD.t + plotH + PAD.gap
  const Y1 = (alt: number) => top1 + plotH * (1 - alt / hMax)
  const Y2 = (v: number) => top2 + plotH * (1 - v / vMax)

  // Phase bands (the same on both plots).
  let segStart = 0
  let segPhase: FlightPhase = samples[0]?.phase ?? 'ready'
  const band = (p: FlightPhase, t0: number, t1: number) => {
    const fill = PHASE_FILL[p]
    if (!fill) return
    ctx.fillStyle = fill
    ctx.fillRect(X(t0), top1, Math.max(X(t1) - X(t0), 1), plotH)
    ctx.fillRect(X(t0), top2, Math.max(X(t1) - X(t0), 1), plotH)
  }
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].phase !== segPhase) {
      band(segPhase, segStart, samples[i].t)
      segStart = samples[i].t
      segPhase = samples[i].phase
    }
  }
  band(segPhase, segStart, T)

  // Grid, axes.
  ctx.strokeStyle = line
  ctx.lineWidth = 1
  ctx.fillStyle = muted
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const [Y, max, top] of [
    [Y1, hMax, top1],
    [Y2, vMax, top2],
  ] as const) {
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4
      ctx.beginPath()
      ctx.moveTo(PAD.l, Y(v))
      ctx.lineTo(PAD.l + pw, Y(v))
      ctx.stroke()
      ctx.fillText(k === 0 ? '0' : `${Math.round(v)}`, PAD.l - 5, Y(v))
    }
    ctx.strokeStyle = muted
    ctx.beginPath()
    ctx.moveTo(PAD.l, top)
    ctx.lineTo(PAD.l, top + plotH)
    ctx.lineTo(PAD.l + pw, top + plotH)
    ctx.stroke()
    ctx.strokeStyle = line
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('altitude  m', PAD.l + 4, top1 + 2)
  ctx.fillText('speed  m/s', PAD.l + 4, top2 + 2)
  ctx.textAlign = 'center'
  const tickStep = T > 20 ? 5 : T > 8 ? 2 : T > 3 ? 1 : 0.5
  for (let t = 0; t <= T + 1e-6; t += tickStep) {
    ctx.fillText(`${Number(t.toFixed(1))}`, X(t), top2 + plotH + 4)
  }
  ctx.fillText('time  s  →', PAD.l + pw / 2, top2 + plotH + 14)

  if (samples.length < 2) return

  // Curves.
  const step = Math.max(1, Math.floor(samples.length / 600))
  ctx.lineWidth = 1.8
  ctx.strokeStyle = text
  ctx.beginPath()
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i]
    if (i === 0) ctx.moveTo(X(s.t), Y1(altOf(s.y)))
    else ctx.lineTo(X(s.t), Y1(altOf(s.y)))
  }
  ctx.stroke()
  ctx.strokeStyle = teal
  ctx.beginPath()
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i]
    const v = Math.hypot(s.vx, s.vy)
    if (i === 0) ctx.moveTo(X(s.t), Y2(v))
    else ctx.lineTo(X(s.t), Y2(v))
  }
  ctx.stroke()

  // Event ticks.
  ctx.fillStyle = muted
  ctx.textBaseline = 'bottom'
  for (const ev of flight.events) {
    if (ev.type === 'liftoff' || ev.type === 'landed') continue
    const x = X(ev.t)
    ctx.strokeStyle = 'rgb(215 221 232 / 0.35)'
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(x, top1)
    ctx.lineTo(x, top2 + plotH)
    ctx.stroke()
    ctx.setLineDash([])
    const label = ev.type === 'apogee' ? `apogee ${flight.maxHeightM.toFixed(1)} m` : ev.type === 'burnout' ? 'burnout' : ev.type === 'parachute' ? 'chute' : ev.type === 'stage-separation' ? `stage ${(ev.stage ?? 0) + 1} off` : ev.type
    const right = x > PAD.l + pw * 0.75
    ctx.textAlign = right ? 'right' : 'left'
    ctx.fillText(label, x + (right ? -3 : 3), ev.type === 'apogee' ? top1 + 12 : top1 + plotH - 2)
  }

  // Time cursor.
  const t = Math.min(Math.max(time, 0), T)
  const s = sampleAt(samples, t)
  const x = X(t)
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, top1)
  ctx.lineTo(x, top2 + plotH)
  ctx.stroke()
  const alt = altOf(s.y)
  const v = Math.hypot(s.vx, s.vy)
  ctx.fillStyle = ACCENT
  for (const [y] of [[Y1(alt)], [Y2(v)]] as const) {
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  const right = x > PAD.l + pw * 0.7
  ctx.textAlign = right ? 'right' : 'left'
  ctx.textBaseline = 'top'
  const lx = x + (right ? -6 : 6)
  // Readouts sit under the axis captions so they never overlap them at t = 0.
  ctx.fillText(`t ${t.toFixed(2)} s`, lx, top1 + 16)
  ctx.fillText(`${alt.toFixed(1)} m`, lx, top1 + 28)
  ctx.fillText(`${v.toFixed(0)} m/s`, lx, top2 + 16)
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return n * p
}
