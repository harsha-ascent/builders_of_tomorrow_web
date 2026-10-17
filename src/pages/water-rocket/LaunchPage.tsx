import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { LaunchRecord, LaunchResult, TrajectorySample } from '../../../shared/types'
import { Page } from '../../components/layout/Page'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { PressureZoneHint } from '../../components/PressureZoneHint'
import { Callout } from '../../components/ui/Callout'
import { Slider } from '../../components/ui/Slider'
import { StatTile } from '../../components/ui/StatTile'
import { fmt, heightComparison, speedComparison } from '../../lib/format'
import { predict, runLaunch } from '../../lib/runSim'
import { useLaunchLog } from '../../lib/useLaunchLog'
import { newDesignId } from '../../sim/presets'
import { LIMITS, paToPsi, psiToPa } from '../../sim/rocket'
import { useDesignStore } from '../../store/designStore'
import { LaunchScene, type CameraMode } from '../../three/LaunchScene'

const TARGET_TOLERANCE_M = 3

export default function LaunchPage() {
  const design = useDesignStore((s) => s.design)
  const update = useDesignStore((s) => s.update)
  const setLastResult = useDesignStore((s) => s.setLastResult)
  const { launches, addLaunch, deleteLaunch, clearAll } = useLaunchLog()

  const [result, setResult] = useState<LaunchResult | null>(null)
  const [playing, setPlaying] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow')
  const [pump, setPump] = useState(0)
  const [pumping, setPumping] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [target, setTarget] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const hudRef = useRef<TrajectorySample | null>(null)
  const timers = useRef<number[]>([])
  const raf = useRef<number | null>(null)

  const pumped = pump >= 1
  const prediction = useMemo(() => predict(design), [design])
  const padPressureKPa = (psiToPa(design.pressurePsi) / 1000) * pump

  const clearTimers = () => {
    for (const id of timers.current) window.clearInterval(id)
    timers.current = []
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
  }

  const resetPad = useCallback(() => {
    clearTimers()
    setPlaying(false)
    setResult(null)
    setDone(false)
    setPump(0)
    setPumping(false)
    setCountdown(null)
    setSaveState('idle')
    hudRef.current = null
    setResetKey((k) => k + 1)
  }, [])

  // Any change to the design puts a fresh rocket on the pad.
  useEffect(() => {
    resetPad()
  }, [design, resetPad])

  useEffect(() => clearTimers, [])

  function startPump() {
    if (pumping || pumped || playing) return
    setPumping(true)
    const start = performance.now()
    const duration = 1500
    const tick = () => {
      const f = Math.min(1, (performance.now() - start) / duration)
      setPump(f)
      if (f < 1) raf.current = requestAnimationFrame(tick)
      else setPumping(false)
    }
    raf.current = requestAnimationFrame(tick)
  }

  function fire() {
    if (playing || countdown !== null) return
    setCountdown(3)
    let n = 3
    const id = window.setInterval(() => {
      n -= 1
      if (n > 0) {
        setCountdown(n)
        return
      }
      window.clearInterval(id)
      setCountdown(null)
      const r = runLaunch(design)
      setResult(r)
      setLastResult(r)
      setDone(false)
      setResetKey((k) => k + 1)
      setPlaying(true)
    }, 800)
    timers.current.push(id)
  }

  function launch() {
    if (!pumped) return
    fire()
  }

  function launchAgain() {
    clearTimers()
    setPlaying(false)
    setResult(null)
    setDone(false)
    setSaveState('idle')
    hudRef.current = null
    setPump(1)
    setResetKey((k) => k + 1)
    fire()
  }

  const onTick = useCallback((s: TrajectorySample, isDone: boolean) => {
    hudRef.current = s
    if (isDone) setDone(true)
  }, [])

  function newTarget() {
    setTarget(5 * Math.round((15 + Math.random() * 45) / 5))
  }

  async function saveToLog() {
    if (!result) return
    setSaveState('saving')
    const { samples: _samples, ...summary } = result
    void _samples
    const record: LaunchRecord = {
      id: newDesignId(),
      designId: design.id,
      designName: design.name,
      settings: { waterFraction: design.waterFraction, pressurePsi: design.pressurePsi, launchAngleDeg: design.launchAngleDeg },
      result: summary,
      createdAt: new Date().toISOString(),
    }
    try {
      await addLaunch(record)
      setSaveState('saved')
    } catch {
      setSaveState('idle')
    }
  }

  const verdict = result && target != null ? Math.abs(result.rangeM - target) : null

  return (
    <Page wide>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-blob shadow-float" style={{ height: 'min(70vh, 560px)' }}>
            <LaunchScene
              design={design}
              result={result}
              playing={playing}
              speed={speed}
              cameraMode={cameraMode}
              targetDistance={target}
              padPressureKPa={padPressureKPa}
              onTick={onTick}
              resetKey={resetKey}
            />
            <Hud hudRef={hudRef} playing={playing} padPressurePsi={paToPsi(padPressureKPa * 1000)} />
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <ToggleGroup
                label="Camera"
                value={cameraMode}
                options={[
                  { value: 'follow', label: '🎥 Follow' },
                  { value: 'wide', label: '🌄 Wide' },
                ]}
                onChange={(v) => setCameraMode(v)}
              />
              <ToggleGroup
                label="Speed"
                value={speed}
                options={[
                  { value: 1, label: '▶️ Normal' },
                  { value: 0.25, label: '🐢 Slow-mo' },
                ]}
                onChange={(v) => setSpeed(v)}
              />
            </div>
            {countdown !== null && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div key={countdown} className="animate-pop font-display text-[9rem] font-bold text-white drop-shadow-[0_6px_0_rgba(30,42,74,0.6)]">
                  {countdown}
                </div>
              </div>
            )}
            {playing && !done && countdown === null && result && (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <div className="animate-pop rounded-full bg-white/90 px-4 py-1 font-display text-lg font-bold text-ink shadow">
                  {result.liftedOff ? '🚀 LIFT OFF!' : '🪨 Hmm… it did not lift off.'}
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-ink/70 to-transparent p-4">
              <div className="flex flex-wrap gap-2">
                {!playing && (
                  <>
                    <button type="button" className="btn-sky" onClick={startPump} disabled={pumping || pumped}>
                      {pumped ? '✅ Pumped up' : pumping ? 'Pumping…' : '🫧 Pump it up'}
                    </button>
                    <button type="button" className="btn-primary text-lg" onClick={launch} disabled={!pumped || countdown !== null}>
                      🚀 LAUNCH!
                    </button>
                  </>
                )}
                {playing && (
                  <>
                    <button type="button" className="btn-sun" onClick={launchAgain}>
                      🔁 Launch again
                    </button>
                    <button type="button" className="btn-ghost" onClick={resetPad}>
                      ↩️ Back to pad
                    </button>
                  </>
                )}
              </div>
              <div className="w-48">
                <div className="mb-1 flex justify-between text-xs font-extrabold text-white">
                  <span>Pressure</span>
                  <span className="tabular-nums">{Math.round(paToPsi(padPressureKPa * 1000))} / {design.pressurePsi} psi</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-skyblue to-rocket" style={{ width: `${pump * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {done && result && (
            <div className="card animate-pop">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl font-bold">
                    {result.liftedOff ? '🎉 Touchdown!' : '🪨 No lift-off'}{' '}
                    <span className="text-ink-soft">· {design.name}</span>
                  </h2>
                  {result.liftedOff && (
                    <p className="prose-kid mt-1">
                      Your rocket flew <strong>{fmt.m(result.maxHeightM)}</strong> high — {heightComparison(result.maxHeightM)} — and hit{' '}
                      <strong>{fmt.kmh(result.maxSpeedMs)}</strong>, {speedComparison(result.maxSpeedMs)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-grass" onClick={saveToLog} disabled={saveState !== 'idle'}>
                    {saveState === 'saved' ? '✅ Saved to log' : saveState === 'saving' ? 'Saving…' : '📒 Save to flight log'}
                  </button>
                  <Link to="../build" className="btn-ghost">
                    🔧 Improve my design
                  </Link>
                </div>
              </div>
              {result.liftedOff ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                  <StatTile emoji="⬆️" label="Max height" value={fmt.m(result.maxHeightM)} tone="sky" />
                  <StatTile emoji="➡️" label="Distance" value={fmt.m(result.rangeM)} tone="grass" />
                  <StatTile emoji="⏱️" label="Flight time" value={fmt.s(result.flightTimeS)} tone="sun" />
                  <StatTile emoji="💨" label="Top speed" value={fmt.ms(result.maxSpeedMs)} sub={fmt.kmh(result.maxSpeedMs)} tone="rocket" />
                  <StatTile emoji="🔥" label="Thrust lasted" value={`${(result.thrustTimeS * 1000).toFixed(0)} ms`} tone="grape" />
                  <StatTile emoji="🏔️" label="Apogee at" value={fmt.s(result.apogeeTimeS)} />
                  <StatTile emoji="🎢" label="Max g-force" value={`${result.maxGs} g`} />
                </div>
              ) : (
                <Callout emoji="💡" tone="sun" className="mt-4" title="Engineer’s tip">
                  The push from the nozzle was weaker than the rocket’s weight. Try less water, more pressure, a wider nozzle or a lighter rocket.
                </Callout>
              )}
              <AssumptionsPanel className="mt-4" />
              {target != null && verdict != null && (
                <Callout emoji={verdict <= TARGET_TOLERANCE_M ? '🎯' : '📏'} tone={verdict <= TARGET_TOLERANCE_M ? 'grass' : 'sun'} className="mt-4" title={verdict <= TARGET_TOLERANCE_M ? 'BULLSEYE! You hit the target!' : `Missed by ${fmt.m(verdict)}`}>
                  {verdict <= TARGET_TOLERANCE_M
                    ? 'That is real engineering: you tuned your design to do a job. Try a new target!'
                    : result.rangeM < target
                      ? 'Too short. Could you add pressure, lower the angle a little, or try a different amount of water?'
                      : 'Too far! Try less pressure, a steeper angle, or more water to make it heavier.'}
                </Callout>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <h2 className="font-display text-2xl font-bold">🎯 Your mission</h2>
            {target == null ? (
              <>
                <p className="mt-1 text-ink">Fly as high or as far as you can — or take the target challenge!</p>
                <button type="button" className="btn-sun mt-3" onClick={newTarget}>
                  🎯 Target challenge
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-ink">
                  Land your rocket inside the ring <strong>{target} m</strong> away (within {TARGET_TOLERANCE_M} m). Adjust and launch until you hit it!
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-ghost !py-2" onClick={newTarget}>
                    🔀 New target
                  </button>
                  <button type="button" className="btn-ghost !py-2" onClick={() => setTarget(null)}>
                    ✖️ Free flight
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="card flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">⚡ Quick adjust</h2>
              <p className="text-sm text-ink-soft">Change one thing, then launch again. Changing resets the pad.</p>
            </div>
            <Slider
              label="Water"
              emoji="💧"
              value={design.waterFraction}
              min={LIMITS.waterFraction.min}
              max={LIMITS.waterFraction.max}
              step={LIMITS.waterFraction.step}
              display={fmt.pct(design.waterFraction)}
              onChange={(v) => update({ waterFraction: v })}
            />
            <Slider
              label="Pressure"
              emoji="🫧"
              value={design.pressurePsi}
              min={LIMITS.pressurePsi.min}
              max={LIMITS.pressurePsi.max}
              step={LIMITS.pressurePsi.step}
              display={fmt.psi(design.pressurePsi)}
              onChange={(v) => update({ pressurePsi: v })}
              hint={<PressureZoneHint psi={design.pressurePsi} />}
            />
            <Slider
              label="Angle"
              emoji="📐"
              value={design.launchAngleDeg}
              min={LIMITS.launchAngleDeg.min}
              max={LIMITS.launchAngleDeg.max}
              step={LIMITS.launchAngleDeg.step}
              display={fmt.deg(design.launchAngleDeg)}
              onChange={(v) => update({ launchAngleDeg: v })}
            />
            <div className="rounded-2xl bg-ink/5 p-3 text-sm">
              <div className="font-display font-bold">🔮 Prediction</div>
              {prediction.liftedOff ? (
                <div className="mt-1 grid grid-cols-3 gap-2 font-display text-lg font-bold tabular-nums">
                  <div>
                    ⬆️ {fmt.m(prediction.maxHeightM, 0)}
                  </div>
                  <div>➡️ {fmt.m(prediction.rangeM, 0)}</div>
                  <div>⏱️ {fmt.s(prediction.flightTimeS)}</div>
                </div>
              ) : (
                <div className="mt-1 font-bold text-rocket-dark">Too heavy to lift off with these settings.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">📒 Flight log</h2>
              {launches.length > 0 && (
                <button
                  type="button"
                  className="text-sm font-bold text-ink-soft underline"
                  onClick={() => {
                    if (window.confirm('Clear the whole flight log?')) void clearAll()
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {launches.length === 0 ? (
              <p className="mt-1 text-ink-soft">Save a launch to start comparing. Engineers always keep records!</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-extrabold uppercase text-ink-soft">
                      <th className="py-1 pr-2">Rocket</th>
                      <th className="py-1 pr-2">💧</th>
                      <th className="py-1 pr-2">🫧</th>
                      <th className="py-1 pr-2">📐</th>
                      <th className="py-1 pr-2">⬆️</th>
                      <th className="py-1 pr-2">➡️</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {launches.slice(0, 12).map((l) => (
                      <tr key={l.id} className="border-t border-ink/5 font-semibold tabular-nums">
                        <td className="max-w-[8rem] truncate py-1 pr-2" title={l.designName}>
                          {l.designName}
                        </td>
                        <td className="py-1 pr-2">{fmt.pct(l.settings.waterFraction)}</td>
                        <td className="py-1 pr-2">{l.settings.pressurePsi}</td>
                        <td className="py-1 pr-2">{l.settings.launchAngleDeg}°</td>
                        <td className="py-1 pr-2">{l.result.maxHeightM.toFixed(1)}</td>
                        <td className="py-1 pr-2">{l.result.rangeM.toFixed(1)}</td>
                        <td className="py-1 text-right">
                          <button type="button" aria-label="Delete" className="text-ink-soft hover:text-rocket" onClick={() => void deleteLaunch(l.id)}>
                            ✖
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}

function Hud({ hudRef, playing, padPressurePsi }: { hudRef: React.RefObject<TrajectorySample | null>; playing: boolean; padPressurePsi: number }) {
  const [s, setS] = useState<TrajectorySample | null>(null)
  useEffect(() => {
    const id = window.setInterval(() => setS(hudRef.current ? { ...hudRef.current } : null), 80)
    return () => window.clearInterval(id)
  }, [hudRef])
  const alt = playing && s ? Math.max(0, s.y) : 0
  const spd = playing && s ? Math.hypot(s.vx, s.vy) : 0
  const t = playing && s ? s.t : 0
  const psi = playing && s ? paToPsi(s.pressureKPa * 1000) : padPressurePsi
  const water = playing && s ? s.water : null
  return (
    <div className="pointer-events-none absolute left-3 top-3 grid grid-cols-1 gap-1.5 text-white sm:grid-cols-2 sm:gap-2">
      <HudTile label="Altitude" value={`${alt.toFixed(1)} m`} />
      <HudTile label="Speed" value={`${spd.toFixed(0)} m/s`} />
      <HudTile label="Time" value={`${t.toFixed(2)} s`} />
      <HudTile label="Pressure" value={`${Math.round(psi)} psi`} />
      {water != null && <HudTile label="Water left" value={fmt.pct(water)} />}
      {playing && s && <HudTile label="Phase" value={s.phase === 'thrust' ? '💦 Thrust' : s.phase === 'air' ? '💨 Air burst' : s.phase === 'coast' ? '🪂 Coasting' : s.phase === 'landed' ? '🏁 Landed' : '🛑 Ready'} />}
    </div>
  )
}

function HudTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-28 rounded-xl bg-ink/60 px-2.5 py-1 backdrop-blur sm:w-auto sm:px-3 sm:py-1.5">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/70">{label}</div>
      <div className="font-display text-lg font-bold tabular-nums leading-tight">{value}</div>
    </div>
  )
}

function ToggleGroup<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-ink/60 p-1 text-xs backdrop-blur" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 font-display font-bold transition ${o.value === value ? 'bg-white text-ink' : 'text-white hover:bg-white/20'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
