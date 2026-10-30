import { useMemo, useState } from 'react'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { psiToPa, sampleAt } from '../../../sim/rocket'
import { labClock, useLabStore } from '../../../store/labStore'
import { LaunchScene } from '../../../three/LaunchScene'
import { ACCENT, accentFor, useLabTime } from './labHooks'
import { LabPanel } from './LabPanel'

const PHASE: Record<string, string> = {
  ready: 'on pad',
  thrust: 'thrust',
  air: 'air burst',
  coast: 'coasting',
  parachute: 'parachute',
  landed: 'landed',
}

/** 3-D flight view: orbit camera, predicted path and apogee in amber, playback controls in the header. */
export function FlightPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const playing = useLabStore((s) => s.playing)
  const done = useLabStore((s) => s.done)
  const speed = useLabStore((s) => s.speed)
  const active = useLabStore((s) => s.active)
  const play = useLabStore((s) => s.play)
  const pause = useLabStore((s) => s.pause)
  const reset = useLabStore((s) => s.reset)
  const setSpeed = useLabStore((s) => s.setSpeed)
  const [camera, setCamera] = useState<'orbit' | 'follow'>('orbit')
  const [fitKey, setFitKey] = useState(0)
  const t = useLabTime(15)
  const s = useMemo(() => sampleAt(flight.samples, t), [flight, t])
  const onPad = t <= 0 && !playing
  // Altitude above the launch point, like the apogee figure (the clamp sits 0.4 m up the launcher).
  const alt = onPad ? 0 : Math.max(0, s.y - (flight.samples[0]?.y ?? 0))
  const spd = onPad ? 0 : Math.hypot(s.vx, s.vy)
  const phase = onPad ? 'ready' : done ? 'landed' : s.phase
  const canLaunch = !playing && (t <= 0 || done)

  return (
    <LabPanel
      title="3-D flight"
      readout={
        <>
          <span className="lab-k">t</span> <b className={accentFor(active, 'time')}>{t.toFixed(2)} s</b> · <span className="lab-k">alt</span>{' '}
          <b>{alt.toFixed(1)} m</b> · <span className="lab-k">v</span> <b>{spd.toFixed(0)} m/s</b> · <span className="lab-k">{PHASE[phase] ?? phase}</span>
        </>
      }
      tools={
        <>
          {canLaunch ? (
            <button type="button" className="lab-btn lab-btn-primary" onClick={play} disabled={!flight.liftedOff}>
              ▶ LAUNCH
            </button>
          ) : playing ? (
            <button type="button" className="lab-btn" onClick={pause}>
              ❚❚ Pause
            </button>
          ) : (
            <button type="button" className="lab-btn lab-btn-primary" onClick={play}>
              ▶ Resume
            </button>
          )}
          <button type="button" className="lab-btn" onClick={reset} disabled={onPad}>
            ⟲ Pad
          </button>
          <div className="lab-seg" role="radiogroup" aria-label="Playback speed">
            {[1, 0.25].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={speed === v} aria-pressed={speed === v} className="lab-btn" onClick={() => setSpeed(v)}>
                {v === 1 ? '1×' : '¼×'}
              </button>
            ))}
          </div>
          <div className="lab-seg" role="radiogroup" aria-label="Camera">
            {(['orbit', 'follow'] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={camera === v} aria-pressed={camera === v} className="lab-btn" onClick={() => setCamera(v)}>
                {v === 'orbit' ? 'Orbit' : 'Follow'}
              </button>
            ))}
          </div>
          <button type="button" className="lab-btn" onClick={() => setFitKey((k) => k + 1)} title="Frame the whole flight">
            ⛶ Fit
          </button>
        </>
      }
    >
      <div className="absolute inset-0">
        <LaunchScene
          design={design}
          result={flight}
          playing={playing}
          speed={speed}
          cameraMode={camera}
          padPressureKPa={psiToPa(design.pressurePsi) / 1000}
          resetKey={0}
          timeRef={labClock}
          accent={ACCENT}
          night
          fitKey={fitKey}
        />
      </div>
      <div className="pointer-events-none absolute bottom-1.5 left-2 text-[11px]" style={{ color: 'var(--lab-dim)' }}>
        drag to orbit · scroll or pinch to zoom · right-drag to pan
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-2 text-[11px] lab-readout">
        <span className="lab-k">apogee</span> <b className="lab-accent">{flight.maxHeightM.toFixed(1)} m</b> · <span className="lab-k">range</span> <b>{flight.rangeM.toFixed(1)} m</b>
      </div>
      {!flight.liftedOff && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <div className="rounded-md border px-3 py-1.5" style={{ borderColor: 'var(--lab-accent)', background: 'rgb(10 14 22 / 0.85)', color: 'var(--lab-accent)' }}>
            no lift-off: thrust is less than weight — less water, more pressure or a lighter rocket
          </div>
        </div>
      )}
    </LabPanel>
  )
}
