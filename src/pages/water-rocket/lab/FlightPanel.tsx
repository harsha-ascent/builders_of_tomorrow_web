import { useMemo, useState } from 'react'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { Dot, LabPanel, LabSeg, Readout } from '../../../components/lab'
import { psiToPa, sampleAt } from '../../../sim/rocket'
import { labClock, useLabStore } from '../../../store/labStore'
import { LaunchScene, type CameraMode } from '../../../three/LaunchScene'
import { ACCENT, PHASE_LABEL, isHot, useLabTime } from './labHooks'

/**
 * 3-D flight view: pump, count down and launch from the header; orbit, follow or wide camera; the
 * predicted path and top of the flight drawn in amber on a night range.
 */
export function FlightPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const playing = useLabStore((s) => s.playing)
  const done = useLabStore((s) => s.done)
  const speed = useLabStore((s) => s.speed)
  const active = useLabStore((s) => s.active)
  const pump = useLabStore((s) => s.pump)
  const pumping = useLabStore((s) => s.pumping)
  const countdown = useLabStore((s) => s.countdown)
  const target = useLabStore((s) => s.target)
  const play = useLabStore((s) => s.play)
  const pause = useLabStore((s) => s.pause)
  const reset = useLabStore((s) => s.reset)
  const rewind = useLabStore((s) => s.rewind)
  const setSpeed = useLabStore((s) => s.setSpeed)
  const setPumping = useLabStore((s) => s.setPumping)
  const setCountdown = useLabStore((s) => s.setCountdown)
  const [camera, setCamera] = useState<Extract<CameraMode, 'orbit' | 'follow' | 'wide'>>('orbit')
  const [fitKey, setFitKey] = useState(0)
  const t = useLabTime(15)
  const s = useMemo(() => sampleAt(flight.samples, t), [flight, t])
  const onPad = t <= 0 && !playing
  // Height above the launch point, like the "top" figure (the clamp sits 0.4 m up the launcher).
  const height = onPad ? 0 : Math.max(0, s.y - (flight.samples[0]?.y ?? 0))
  const spd = onPad ? 0 : Math.hypot(s.vx, s.vy)
  const phase = onPad ? 'ready' : done ? 'landed' : s.phase
  const pumped = pump >= 1
  const busy = pumping || countdown !== null
  const padPsi = Math.round(design.pressurePsi * pump)

  function fire() {
    if (busy || playing) return
    setCountdown(3)
  }
  function launchAgain() {
    rewind()
    setCountdown(3)
  }

  return (
    <LabPanel
      title="3-D flight"
      readout={
        <>
          <Readout label="time" value={t.toFixed(2)} unit="s" hot={isHot(active, 'time')} />
          <Dot />
          <Readout label="height" value={height.toFixed(1)} unit="m" />
          <Dot />
          <Readout label="speed" value={spd.toFixed(0)} unit="m/s" />
          <Dot />
          <span className="lab-k">{PHASE_LABEL[phase] ?? phase}</span>
        </>
      }
      tools={
        <>
          {countdown !== null ? (
            <button type="button" className="lab-btn lab-btn-primary" disabled>
              {countdown}…
            </button>
          ) : playing ? (
            <>
              <button type="button" className="lab-btn" onClick={pause}>
                ❚❚ Pause
              </button>
              <button type="button" className="lab-btn" onClick={reset}>
                ⟲ Back to pad
              </button>
            </>
          ) : done ? (
            <>
              <button type="button" className="lab-btn lab-btn-primary" onClick={launchAgain}>
                🔁 Launch again
              </button>
              <button type="button" className="lab-btn" onClick={reset}>
                ⟲ Back to pad
              </button>
            </>
          ) : t > 0 ? (
            <>
              <button type="button" className="lab-btn lab-btn-primary" onClick={play}>
                ▶ Resume
              </button>
              <button type="button" className="lab-btn" onClick={reset}>
                ⟲ Back to pad
              </button>
            </>
          ) : (
            <>
              <button type="button" className="lab-btn" onClick={() => setPumping(true)} disabled={pumping || pumped} aria-pressed={pumped}>
                {pumped ? '✓ Pumped' : pumping ? 'Pumping…' : '🫧 Pump'}
              </button>
              <button type="button" className="lab-btn lab-btn-primary" onClick={fire} disabled={!pumped || busy || !flight.liftedOff} title={pumped ? 'Count down and launch' : 'Pump first'}>
                🚀 LAUNCH
              </button>
            </>
          )}
          <LabSeg
            label="Playback speed"
            value={speed}
            options={[
              { value: 1, label: 'Normal' },
              { value: 0.25, label: 'Slow-mo' },
            ]}
            onChange={setSpeed}
          />
          <LabSeg
            label="Camera"
            value={camera}
            options={[
              { value: 'orbit', label: 'Orbit', title: 'Drag to spin, scroll to zoom' },
              { value: 'follow', label: 'Follow', title: 'Stay with the rocket' },
              { value: 'wide', label: 'Wide', title: 'Always show the whole flight' },
            ]}
            onChange={setCamera}
          />
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
          targetDistance={target}
          padPressureKPa={(psiToPa(design.pressurePsi) / 1000) * pump}
          resetKey={0}
          timeRef={labClock}
          accent={ACCENT}
          night
          fitKey={fitKey}
        />
      </div>
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div key={countdown} className="animate-pop font-display text-[8rem] font-bold" style={{ color: ACCENT, textShadow: '0 4px 0 rgb(0 0 0 / 0.5)' }}>
            {countdown}
          </div>
        </div>
      )}
      {playing && t < 1.2 && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <div className="animate-pop rounded-md px-3 py-1 font-display text-base font-bold" style={{ background: ACCENT, color: '#140c00' }}>
            LIFT OFF!
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1.5 left-2 text-[11px]" style={{ color: 'var(--lab-dim)' }}>
        drag to spin · scroll or pinch to zoom · right-drag to pan
      </div>
      <div className="pointer-events-none absolute right-2 top-2 w-44 rounded-md px-2 py-1 text-[11px] lab-readout" style={{ background: 'rgb(10 14 22 / 0.7)' }}>
        <div className="flex justify-between">
          <span className="lab-k">pad pressure</span>
          <span>
            <b>{padPsi}</b> / {design.pressurePsi} psi
          </span>
        </div>
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--lab-line)' }}>
          <div className="h-full rounded-full" style={{ width: `${pump * 100}%`, background: ACCENT }} />
        </div>
      </div>
      {!flight.liftedOff && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <div className="rounded-md border px-3 py-1.5 text-center" style={{ borderColor: ACCENT, background: 'rgb(10 14 22 / 0.85)', color: ACCENT }}>
            no lift-off: the push is weaker than the rocket's weight — try less water, more pressure or a lighter rocket
          </div>
        </div>
      )}
    </LabPanel>
  )
}
