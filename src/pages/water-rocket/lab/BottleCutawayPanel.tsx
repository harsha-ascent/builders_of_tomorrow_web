import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { Dot, LabPanel, LabSlider, Readout, capturePointer, releasePointer } from '../../../components/lab'
import { labMath } from '../../../sim/labMath'
import { LIMITS, SAFETY, clamp, pressureZone, psiToPa } from '../../../sim/rocket'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore, type LabActive } from '../../../store/labStore'
import { ACCENT, isHot } from './labHooks'

const VB = { w: 520, h: 330 }
// Bottle, drawn nozzle-down as it sits on the pad.
const BOTTLE = { x0: 62, x1: 192, top: 46, shoulder: 72, bodyBottom: 252, neckBottom: 284, neckX0: 113, neckX1: 141 }
const GAUGE = { cx: 332, cy: 112, r: 62, sweep: 270, start: 225 }
const DIAL = { ox: 334, oy: 312, r: 82 }

/**
 * Side section of the top bottle: drag the water line for water fraction, the gauge needle for pressure
 * and the protractor for launch angle. Labels carry the real volumes, pressures and thrust.
 */
export function BottleCutawayPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const update = useDesignStore((s) => s.update)
  const active = useLabStore((s) => s.active)
  const setActive = useLabStore((s) => s.setActive)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<LabActive>(null)
  const m = labMath(design, flight)

  const V = design.bottleVolumeL
  const waterMl = Math.round(design.waterFraction * V * 1000)
  const airMl = Math.round((1 - design.waterFraction) * V * 1000)
  const kPa = psiToPa(design.pressurePsi) / 1000
  const bodyH = BOTTLE.bodyBottom - BOTTLE.shoulder
  const waterY = BOTTLE.bodyBottom - design.waterFraction * bodyH

  /** Pointer position in viewBox units. */
  function vbPoint(e: ReactPointerEvent<SVGElement>) {
    const el = svg.current!
    const r = el.getBoundingClientRect()
    const scale = Math.min(r.width / VB.w, r.height / VB.h)
    const ox = (r.width - VB.w * scale) / 2
    const oy = (r.height - VB.h * scale) / 2
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale }
  }
  function apply(kind: LabActive, pt: { x: number; y: number }) {
    if (kind === 'water') {
      const f = clamp((BOTTLE.bodyBottom - pt.y) / bodyH, LIMITS.waterFraction.min, LIMITS.waterFraction.max)
      update({ waterFraction: Math.round(f * 100) / 100 })
    } else if (kind === 'pressure') {
      let th = (Math.atan2(GAUGE.cy - pt.y, pt.x - GAUGE.cx) * 180) / Math.PI
      if (th < -135) th += 360
      if (th < -45 && th > -135) th = th > -90 ? -45 : 225
      const frac = clamp((GAUGE.start - th) / GAUGE.sweep, 0, 1)
      update({ pressurePsi: clamp(Math.round(frac * P_TOP), LIMITS.pressurePsi.min, LIMITS.pressurePsi.max) })
    } else if (kind === 'angle') {
      const deg = (Math.atan2(DIAL.oy - pt.y, pt.x - DIAL.ox) * 180) / Math.PI
      update({ launchAngleDeg: clamp(Math.round(deg), LIMITS.launchAngleDeg.min, LIMITS.launchAngleDeg.max) })
    }
  }
  const startDrag = (kind: LabActive) => (e: ReactPointerEvent<SVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    if (svg.current) capturePointer(svg.current, e.pointerId)
    drag.current = kind
    setActive(kind)
    apply(kind, vbPoint(e))
  }
  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return
    apply(drag.current, vbPoint(e))
  }
  function onUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return
    drag.current = null
    if (svg.current) releasePointer(svg.current, e.pointerId)
    setActive(null)
  }

  const needleAngle = GAUGE.start - (design.pressurePsi / P_TOP) * GAUGE.sweep
  const dialAngle = design.launchAngleDeg
  const thrustLen = clamp(m.F0 / 4, 6, 150)
  const hot = (k: LabActive) => active === k
  const zone = pressureZone(design.pressurePsi)

  return (
    <LabPanel
      title="Bottle & launcher"
      style={{ minHeight: 500 }}
      readout={
        <>
          <Readout label="water" value={`${Math.round(design.waterFraction * 100)} % (${waterMl} ml)`} hot={isHot(active, 'water')} />
          <Dot />
          <Readout label="pressure" value={`${design.pressurePsi} psi (${kPa.toFixed(0)} kPa)`} hot={isHot(active, 'pressure')} />
          <Dot />
          <Readout label="angle" value={design.launchAngleDeg} unit="° from the ground" hot={isHot(active, 'angle')} />
        </>
      }
      tools={
        <span className="lab-k">
          {V} L bottle · {design.nozzleDiameterMm} mm nozzle · {Math.round(m.mDry * 1000)} g empty
        </span>
      }
    >
      <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
      <svg
        ref={svg}
        className="lab-svg"
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="group"
        aria-label="Bottle cutaway with water line, pressure gauge and launch-angle dial"
      >
        <defs>
          <clipPath id="lab-bottle-clip">
            <path d={bottlePath()} />
          </clipPath>
        </defs>

        {/* ---- Bottle ---- */}
        <g clipPath="url(#lab-bottle-clip)">
          <rect x={BOTTLE.x0} y={BOTTLE.top} width={BOTTLE.x1 - BOTTLE.x0} height={BOTTLE.neckBottom - BOTTLE.top} fill="#0d1220" />
          {/* air: dots whose density follows the pressure */}
          <AirDots x0={BOTTLE.x0} x1={BOTTLE.x1} y0={BOTTLE.top} y1={waterY} psi={design.pressurePsi} />
          <rect x={BOTTLE.x0} y={waterY} width={BOTTLE.x1 - BOTTLE.x0} height={BOTTLE.neckBottom - waterY} fill="rgb(63 184 232 / 0.45)" />
          <rect x={BOTTLE.x0} y={waterY} width={BOTTLE.x1 - BOTTLE.x0} height={2} fill={ACCENT} />
        </g>
        <path d={bottlePath()} fill="none" stroke="var(--lab-muted)" strokeWidth={2} />
        {/* labels inside */}
        <text x={(BOTTLE.x0 + BOTTLE.x1) / 2} y={Math.max(BOTTLE.shoulder + 14, (BOTTLE.top + waterY) / 2 - 6)} textAnchor="middle" fill="var(--lab-text)" fontSize={11}>
          air {airMl} ml
        </text>
        <text x={(BOTTLE.x0 + BOTTLE.x1) / 2} y={Math.max(BOTTLE.shoulder + 28, (BOTTLE.top + waterY) / 2 + 8)} textAnchor="middle" fill="var(--lab-muted)" fontSize={11}>
          {kPa.toFixed(0)} kPa gauge
        </text>
        {design.waterFraction > 0.08 && (
          <text x={(BOTTLE.x0 + BOTTLE.x1) / 2} y={(waterY + BOTTLE.bodyBottom) / 2 + 4} textAnchor="middle" fill="var(--lab-text)" fontSize={11}>
            water {waterMl} ml
          </text>
        )}
        {/* water-line handle */}
        <g transform={`translate(${BOTTLE.x1 + 2} ${waterY})`} style={{ cursor: 'ns-resize' }}>
          <path d="M0 0 L10 -6 L10 6 Z" fill={ACCENT} />
          <rect x={10} y={-9} width={46} height={18} rx={3} fill={hot('water') ? ACCENT : '#0b0f17'} stroke={ACCENT} />
          <text x={33} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill={hot('water') ? '#140c00' : ACCENT}>
            {Math.round(design.waterFraction * 100)} %
          </text>
        </g>
        {/* drag area for the water line: the whole bottle */}
        <rect
          x={BOTTLE.x0 - 6}
          y={BOTTLE.top - 6}
          width={BOTTLE.x1 - BOTTLE.x0 + 70}
          height={BOTTLE.neckBottom - BOTTLE.top + 12}
          fill="transparent"
          style={{ cursor: 'ns-resize' }}
          onPointerDown={startDrag('water')}
          role="slider"
          aria-label="Water fraction"
          aria-valuenow={Math.round(design.waterFraction * 100)}
          aria-valuemin={0}
          aria-valuemax={80}
          tabIndex={0}
          onKeyDown={keyStep((d) => update({ waterFraction: Math.round(clamp(design.waterFraction + d * 0.01, 0, 0.8) * 100) / 100 }))}
        />
        {/* nozzle jet + thrust arrow */}
        <line x1={(BOTTLE.neckX0 + BOTTLE.neckX1) / 2} y1={BOTTLE.neckBottom} x2={(BOTTLE.neckX0 + BOTTLE.neckX1) / 2} y2={BOTTLE.neckBottom + 34} stroke="rgb(63 184 232 / 0.8)" strokeWidth={6} strokeDasharray="3 3" />
        <text x={(BOTTLE.neckX0 + BOTTLE.neckX1) / 2 + 8} y={BOTTLE.neckBottom + 24} fill="var(--lab-muted)" fontSize={11}>
          jet {m.ve0.toFixed(1)} m/s
        </text>
        <g transform={`translate(${BOTTLE.x0 - 22} ${BOTTLE.bodyBottom})`}>
          <line x1={0} y1={0} x2={0} y2={-thrustLen} stroke={ACCENT} strokeWidth={3} />
          <path d={`M-6 ${-thrustLen + 8} L0 ${-thrustLen} L6 ${-thrustLen + 8}`} fill="none" stroke={ACCENT} strokeWidth={3} />
          <text x={0} y={-thrustLen - 8} textAnchor="middle" fontSize={11} fill={ACCENT}>
            F₀ {m.F0.toFixed(0)} N
          </text>
        </g>
        <text x={BOTTLE.x0 - 22} y={BOTTLE.bodyBottom + 16} textAnchor="middle" fontSize={11} fill="var(--lab-muted)">
          thrust
        </text>

        {/* ---- Pressure gauge ---- */}
        <g>
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r={GAUGE.r + 6} fill="#0d1220" stroke="var(--lab-line)" strokeWidth={2} />
          <path d={arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r - 4, GAUGE.start, GAUGE.start - (SAFETY.schoolMaxPsi / P_TOP) * GAUGE.sweep)} stroke="#2f7d4f" strokeWidth={6} fill="none" />
          <path d={arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r - 4, GAUGE.start - (SAFETY.schoolMaxPsi / P_TOP) * GAUGE.sweep, GAUGE.start - (SAFETY.supervisedMaxPsi / P_TOP) * GAUGE.sweep)} stroke="#8a6d1f" strokeWidth={6} fill="none" />
          <path d={arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r - 4, GAUGE.start - (SAFETY.supervisedMaxPsi / P_TOP) * GAUGE.sweep, GAUGE.start - GAUGE.sweep)} stroke="#8a2f2f" strokeWidth={6} fill="none" />
          {Array.from({ length: P_TOP / 10 + 1 }, (_, i) => i * 10).map((psi) => {
            const a = ((GAUGE.start - (psi / P_TOP) * GAUGE.sweep) * Math.PI) / 180
            const r0 = GAUGE.r - 10
            const r1 = GAUGE.r - 16
            const rl = GAUGE.r - 26
            return (
              <g key={psi}>
                <line x1={GAUGE.cx + r0 * Math.cos(a)} y1={GAUGE.cy - r0 * Math.sin(a)} x2={GAUGE.cx + r1 * Math.cos(a)} y2={GAUGE.cy - r1 * Math.sin(a)} stroke="var(--lab-muted)" strokeWidth={1.5} />
                <text x={GAUGE.cx + rl * Math.cos(a)} y={GAUGE.cy - rl * Math.sin(a) + 4} textAnchor="middle" fontSize={10} fill="var(--lab-muted)">
                  {psi}
                </text>
              </g>
            )
          })}
          <g transform={`rotate(${-needleAngle} ${GAUGE.cx} ${GAUGE.cy})`}>
            <line x1={GAUGE.cx - 10} y1={GAUGE.cy} x2={GAUGE.cx + GAUGE.r - 12} y2={GAUGE.cy} stroke={ACCENT} strokeWidth={hot('pressure') ? 4 : 2.5} strokeLinecap="round" />
          </g>
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r={5} fill={ACCENT} />
          <text x={GAUGE.cx} y={GAUGE.cy + 32} textAnchor="middle" fontSize={13} fontWeight={700} fill={hot('pressure') ? ACCENT : 'var(--lab-text)'}>
            {design.pressurePsi} psi
          </text>
          <text x={GAUGE.cx} y={GAUGE.cy + 46} textAnchor="middle" fontSize={10} fill="var(--lab-muted)">
            {kPa.toFixed(0)} kPa · {(kPa / 100).toFixed(2)} bar
          </text>
          <text x={GAUGE.cx} y={GAUGE.cy - GAUGE.r - 12} textAnchor="middle" fontSize={11} fill="var(--lab-muted)" style={{ letterSpacing: '0.12em' }}>
            PRESSURE
          </text>
          <circle
            cx={GAUGE.cx}
            cy={GAUGE.cy}
            r={GAUGE.r + 8}
            fill="transparent"
            style={{ cursor: 'grab' }}
            onPointerDown={startDrag('pressure')}
            role="slider"
            aria-label="Pressure"
            aria-valuenow={design.pressurePsi}
            aria-valuemin={LIMITS.pressurePsi.min}
            aria-valuemax={LIMITS.pressurePsi.max}
            tabIndex={0}
            onKeyDown={keyStep((d) => update({ pressurePsi: clamp(design.pressurePsi + d, LIMITS.pressurePsi.min, LIMITS.pressurePsi.max) }))}
          />
        </g>

        {/* ---- Launch-angle dial ---- */}
        <g>
          <path d={arcPath(DIAL.ox, DIAL.oy, DIAL.r, 0, 90)} stroke="var(--lab-line)" strokeWidth={2} fill="none" />
          <line x1={DIAL.ox} y1={DIAL.oy} x2={DIAL.ox + DIAL.r} y2={DIAL.oy} stroke="var(--lab-line)" />
          <line x1={DIAL.ox} y1={DIAL.oy} x2={DIAL.ox} y2={DIAL.oy - DIAL.r} stroke="var(--lab-line)" />
          {[0, 15, 30, 45, 60, 75, 90].map((deg) => {
            const a = (deg * Math.PI) / 180
            const r0 = DIAL.r
            const r1 = DIAL.r - (deg % 30 === 0 ? 8 : 5)
            const rl = DIAL.r + 10
            return (
              <g key={deg}>
                <line x1={DIAL.ox + r0 * Math.cos(a)} y1={DIAL.oy - r0 * Math.sin(a)} x2={DIAL.ox + r1 * Math.cos(a)} y2={DIAL.oy - r1 * Math.sin(a)} stroke="var(--lab-muted)" />
                {deg % 30 === 0 && (
                  <text x={DIAL.ox + rl * Math.cos(a)} y={DIAL.oy - rl * Math.sin(a) + 4} textAnchor="middle" fontSize={10} fill="var(--lab-muted)">
                    {deg}°
                  </text>
                )}
              </g>
            )
          })}
          <g transform={`rotate(${-dialAngle} ${DIAL.ox} ${DIAL.oy})`}>
            <line x1={DIAL.ox} y1={DIAL.oy} x2={DIAL.ox + DIAL.r - 6} y2={DIAL.oy} stroke={ACCENT} strokeWidth={hot('angle') ? 4 : 2.5} strokeLinecap="round" />
            {/* tiny rocket on the launch tube */}
            <path d={`M${DIAL.ox + DIAL.r - 30} ${DIAL.oy - 4} h18 l7 4 l-7 4 h-18 z`} fill={ACCENT} />
          </g>
          <circle cx={DIAL.ox} cy={DIAL.oy} r={4} fill={ACCENT} />
          <text x={DIAL.ox + 10} y={DIAL.oy - DIAL.r - 14} textAnchor="start" fontSize={11} fill="var(--lab-muted)" style={{ letterSpacing: '0.12em' }}>
            LAUNCH ANGLE
          </text>
          <text x={DIAL.ox + 28} y={DIAL.oy - 10} fontSize={13} fontWeight={700} fill={hot('angle') ? ACCENT : 'var(--lab-text)'}>
            {design.launchAngleDeg}°
          </text>
          <rect
            x={DIAL.ox - 12}
            y={DIAL.oy - DIAL.r - 12}
            width={DIAL.r + 40}
            height={DIAL.r + 20}
            fill="transparent"
            style={{ cursor: 'grab' }}
            onPointerDown={startDrag('angle')}
            role="slider"
            aria-label="Launch angle"
            aria-valuenow={design.launchAngleDeg}
            aria-valuemin={LIMITS.launchAngleDeg.min}
            aria-valuemax={LIMITS.launchAngleDeg.max}
            tabIndex={0}
            onKeyDown={keyStep((d) => update({ launchAngleDeg: clamp(design.launchAngleDeg + d, LIMITS.launchAngleDeg.min, LIMITS.launchAngleDeg.max) }))}
          />
        </g>
      </svg>
      </div>
      <div className="grid gap-x-4 gap-y-1 border-t px-3 py-2 sm:grid-cols-3" style={{ borderColor: 'var(--lab-line)' }}>
        <LabSlider
          label="water"
          value={Math.round(design.waterFraction * 100)}
          min={LIMITS.waterFraction.min * 100}
          max={LIMITS.waterFraction.max * 100}
          step={1}
          unit="%"
          hot={isHot(active, 'water')}
          onChange={(v) => update({ waterFraction: v / 100 })}
          hint={`${waterMl} ml of ${V * 1000} ml`}
        />
        <LabSlider
          label="pump pressure"
          value={design.pressurePsi}
          min={LIMITS.pressurePsi.min}
          max={LIMITS.pressurePsi.max}
          step={1}
          unit="psi"
          hot={isHot(active, 'pressure')}
          onChange={(v) => update({ pressurePsi: v })}
          hint={`${zone.label}: ${zone.advice}`}
        />
        <LabSlider
          label="launch angle"
          value={design.launchAngleDeg}
          min={LIMITS.launchAngleDeg.min}
          max={LIMITS.launchAngleDeg.max}
          step={1}
          unit="°"
          hot={isHot(active, 'angle')}
          onChange={(v) => update({ launchAngleDeg: v })}
          hint="90° is straight up; about 40° throws farthest"
        />
      </div>
      </div>
    </LabPanel>
  )
}

/** Gauge face runs to the simulator's limit (80 psi); the dial is calibrated in real gauge psi. */
const P_TOP = LIMITS.pressurePsi.max

function bottlePath() {
  const { x0, x1, top, shoulder, bodyBottom, neckBottom, neckX0, neckX1 } = BOTTLE
  const r = 14
  return [
    `M${x0 + r} ${top}`,
    `H${x1 - r}`,
    `Q${x1} ${top} ${x1} ${top + r}`,
    `V${shoulder}`,
    `V${bodyBottom}`,
    `Q${x1} ${bodyBottom + 10} ${neckX1 + 10} ${bodyBottom + 16}`,
    `L${neckX1} ${bodyBottom + 22}`,
    `V${neckBottom}`,
    `H${neckX0}`,
    `V${bodyBottom + 22}`,
    `L${neckX0 - 10} ${bodyBottom + 16}`,
    `Q${x0} ${bodyBottom + 10} ${x0} ${bodyBottom}`,
    `V${top + r}`,
    `Q${x0} ${top} ${x0 + r} ${top}`,
    'Z',
  ].join(' ')
}

/** SVG arc from angle a0 to a1 (degrees, counter-clockwise positive, y up). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  const sweep = a1 < a0 ? 1 : 0
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

/** A sprinkle of dots in the air space, denser at higher pressure (a picture, not a count of molecules). */
function AirDots({ x0, x1, y0, y1, psi }: { x0: number; x1: number; y0: number; y1: number; psi: number }) {
  const n = Math.round(8 + psi * 1.1)
  const dots: { x: number; y: number }[] = []
  let seed = 11
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < n; i++) dots.push({ x: x0 + 6 + rnd() * (x1 - x0 - 12), y: y0 + 6 + rnd() * Math.max(y1 - y0 - 12, 1) })
  return (
    <g fill="rgb(215 221 232 / 0.35)">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.6} />
      ))}
    </g>
  )
}

function keyStep(fn: (delta: number) => void) {
  return (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    fn(d)
  }
}
