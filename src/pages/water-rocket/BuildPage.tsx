import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page } from '../../components/layout/Page'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { PressureZoneHint } from '../../components/PressureZoneHint'
import { Callout } from '../../components/ui/Callout'
import { ColorSwatches } from '../../components/ui/ColorSwatches'
import { LazyMount } from '../../components/ui/LazyMount'
import { Segmented } from '../../components/ui/Segmented'
import { Slider } from '../../components/ui/Slider'
import { StatTile } from '../../components/ui/StatTile'
import { fmt } from '../../lib/format'
import { predict } from '../../lib/runSim'
import { useDesigns } from '../../lib/useDesigns'
import type { RocketDesign } from '../../../shared/types'
import { DEFAULT_BOOSTER, SAMPLE_DESIGNS, WORKSHOP_WATER_ROCKET, makeDesign, normalizeDesign } from '../../sim/presets'
import { BOTTLES, LIMITS, NOZZLES, SAFE_LANDING_MS, bottleSpec, psiToPa, terminalVelocity, totalDryMassG } from '../../sim/rocket'
import { rocketDims } from '../../three/Rocket3D'
import { useDesignStore } from '../../store/designStore'
import { WorkbenchScene } from '../../three/WorkbenchScene'

export default function BuildPage() {
  const design = useDesignStore((s) => s.design)
  const dirty = useDesignStore((s) => s.dirty)
  const update = useDesignStore((s) => s.update)
  const load = useDesignStore((s) => s.load)
  const startNew = useDesignStore((s) => s.startNew)
  const markSaved = useDesignStore((s) => s.markSaved)
  const { saveDesign, remote } = useDesigns<RocketDesign>(WORKSHOP_WATER_ROCKET, normalizeDesign)
  const navigate = useNavigate()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const prediction = useMemo(() => predict(design), [design])
  const spec = bottleSpec(design.bottleVolumeL)
  const pressureKPa = psiToPa(design.pressurePsi) / 1000
  const vTerminal = useMemo(() => terminalVelocity(design), [design])
  const dims = useMemo(() => rocketDims(design), [design])
  const stageCount = design.boosters.length + 1

  function setStageCount(n: number) {
    const boosters = design.boosters.slice(0, Math.max(0, n - 1))
    while (boosters.length < n - 1) boosters.unshift({ ...DEFAULT_BOOSTER })
    update({ boosters })
  }
  function updateBooster(i: number, patch: Partial<(typeof design.boosters)[number]>) {
    update({ boosters: design.boosters.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
  }

  async function onSave() {
    setSaveState('saving')
    try {
      const saved = await saveDesign(design)
      markSaved(saved)
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  return (
    <Page wide>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Left: 3-D preview + name */}
        <div className="flex flex-col gap-4">
          <div className="card p-3">
            <LazyMount className="h-[420px] overflow-hidden rounded-[1.4rem]">
              <WorkbenchScene design={design} pressureKPa={pressureKPa} />
            </LazyMount>
            <p className="mt-2 text-center text-xs font-bold text-ink-soft">Drag to spin · scroll to zoom</p>
          </div>

          <div className="card">
            <label className="label" htmlFor="rocket-name">
              Rocket name
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="rocket-name"
                className="input flex-1 font-display text-xl font-bold"
                value={design.name}
                maxLength={40}
                onChange={(e) => update({ name: e.target.value })}
              />
              <button type="button" className="btn-grass" onClick={onSave} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✅ Saved!' : '💾 Save rocket'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              {dirty && <span className="chip bg-sun/40 text-ink">Unsaved changes</span>}
              {saveState === 'error' && <span className="chip bg-rocket/20 text-rocket-dark">Could not save. Try again.</span>}
              <span>{remote ? 'Saved to your account.' : 'Saved in this browser (sign in to keep it anywhere).'}</span>
            </div>
          </div>

          <div className="card">
            <div className="font-display text-lg font-bold">Start from a ready-made rocket</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_DESIGNS.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="btn-ghost !py-2 text-sm"
                  onClick={() => load(makeDesign({ ...s, name: s.name }))}
                >
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.bodyColor }} />
                  {s.name}
                </button>
              ))}
              <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => startNew()}>
                ✨ Blank rocket
              </button>
            </div>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-5">
            <h2 className="font-display text-2xl font-bold">🧴 The rocket</h2>
            <Segmented
              label="Bottle size"
              value={design.bottleVolumeL}
              options={BOTTLES.map((b) => ({ value: b.volumeL, label: `${b.volumeL} L`, emoji: b.volumeL >= 2 ? '🧴' : b.volumeL >= 1 ? '🍶' : '🥤' }))}
              onChange={(v) => update({ bottleVolumeL: v })}
            />
            <Segmented
              label="Nose cone"
              value={design.noseShape}
              options={[
                { value: 'pointy', label: 'Pointy', emoji: '🔺', hint: 'least drag' },
                { value: 'round', label: 'Round', emoji: '🔴', hint: 'medium drag' },
                { value: 'flat', label: 'Flat', emoji: '⬛', hint: 'most drag' },
              ]}
              onChange={(v) => update({ noseShape: v })}
            />
            <Segmented
              label="Fins"
              value={design.finCount}
              options={[
                { value: 3, label: '3 fins', emoji: '🪽' },
                { value: 4, label: '4 fins', emoji: '🪽🪽' },
              ]}
              onChange={(v) => update({ finCount: v })}
            />
            <Segmented
              label="Nozzle"
              value={design.nozzleDiameterMm}
              options={NOZZLES.map((n) => ({ value: n.diameterMm, label: `${n.diameterMm} mm`, hint: n.hint }))}
              onChange={(v) => update({ nozzleDiameterMm: v })}
            />
            <Slider
              label="Rocket weight (empty)"
              emoji="⚖️"
              value={design.dryMassG}
              min={LIMITS.dryMassG.min}
              max={LIMITS.dryMassG.max}
              step={LIMITS.dryMassG.step}
              display={fmt.g(design.dryMassG)}
              onChange={(v) => update({ dryMassG: v })}
              hint={`A bare ${design.bottleVolumeL} L bottle is about ${spec.bottleMassG} g. Nose, fins and tape add more. Heavier is steadier, but harder to push!`}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <ColorSwatches label="Body" value={design.bodyColor} onChange={(c) => update({ bodyColor: c })} />
              <ColorSwatches label="Nose" value={design.noseColor} onChange={(c) => update({ noseColor: c })} />
              <ColorSwatches label="Fins" value={design.finColor} onChange={(c) => update({ finColor: c })} />
            </div>
          </div>

          <div className="card flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl font-bold">🚀🚀 Stages</h2>
              <p className="text-sm text-ink-soft">
                A booster bottle underneath fires first, then drops away so the lighter top stage keeps going. Real two-stage water rockets are
                an expert build!
              </p>
            </div>
            <Segmented
              label="How many stages?"
              value={stageCount}
              options={[
                { value: 1, label: 'Single', emoji: '🚀' },
                { value: 2, label: 'Two-stage', emoji: '🚀🚀', hint: 'booster + top' },
                { value: 3, label: 'Three-stage', emoji: '🚀🚀🚀', hint: 'expert' },
              ]}
              onChange={(v) => setStageCount(v)}
            />
            {design.boosters.map((b, i) => (
              <div key={i} className="rounded-2xl border-2 border-grape/30 bg-grape/5 p-4">
                <div className="mb-3 font-display text-lg font-bold text-grape-dark">
                  Stage {i + 1} · {i === 0 ? 'bottom booster (fires first)' : 'middle booster'}
                </div>
                <div className="grid gap-4">
                  <Segmented
                    label="Booster bottle"
                    value={b.bottleVolumeL}
                    options={BOTTLES.map((bt) => ({ value: bt.volumeL, label: `${bt.volumeL} L` }))}
                    onChange={(v) => updateBooster(i, { bottleVolumeL: v })}
                  />
                  <Slider
                    label="Booster water"
                    emoji="💧"
                    value={b.waterFraction}
                    min={LIMITS.waterFraction.min}
                    max={LIMITS.waterFraction.max}
                    step={LIMITS.waterFraction.step}
                    display={`${fmt.pct(b.waterFraction)} · ${fmt.litres(b.bottleVolumeL, b.waterFraction)}`}
                    onChange={(v) => updateBooster(i, { waterFraction: v })}
                  />
                  <Segmented
                    label="Booster nozzle"
                    value={b.nozzleDiameterMm}
                    options={NOZZLES.map((n) => ({ value: n.diameterMm, label: `${n.diameterMm} mm` }))}
                    onChange={(v) => updateBooster(i, { nozzleDiameterMm: v })}
                  />
                  <Slider
                    label="Booster weight (empty, with coupler)"
                    emoji="⚖️"
                    value={b.dryMassG}
                    min={LIMITS.dryMassG.min}
                    max={LIMITS.dryMassG.max}
                    step={LIMITS.dryMassG.step}
                    display={fmt.g(b.dryMassG)}
                    onChange={(v) => updateBooster(i, { dryMassG: v })}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="chip">📏 Stack height {(dims.total * 100).toFixed(0)} cm</span>
              <span className="chip">⚖️ Empty stack {fmt.g(totalDryMassG(design))}</span>
              {design.pressurePsi > 0 && stageCount > 1 && <span className="chip">🫧 All stages pumped to {design.pressurePsi} psi</span>}
            </div>
          </div>

          <div className="card flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl font-bold">🪂 Coming back down</h2>
              <p className="text-sm text-ink-soft">A soft landing means your rocket can fly again (and nobody gets bonked).</p>
            </div>
            <Segmented
              label="Recovery"
              value={design.recovery}
              options={[
                { value: 'none', label: 'Free fall', emoji: '💥', hint: 'simple, hard landing' },
                { value: 'parachute', label: 'Parachute', emoji: '🪂', hint: 'nose pops off at the top' },
              ]}
              onChange={(v) => update({ recovery: v })}
            />
            {design.recovery === 'parachute' && (
              <Slider
                label="Canopy size"
                emoji="🪂"
                value={design.parachuteDiameterM}
                min={0.3}
                max={1.0}
                step={0.05}
                display={`${Math.round(design.parachuteDiameterM * 100)} cm across`}
                ends={['Hanky', 'Bin bag']}
                onChange={(v) => update({ parachuteDiameterM: v })}
                hint="A thin plastic bag cut into a circle, 8 strings and a swivel. Bigger lands softer, but weighs more and drifts further in wind."
              />
            )}
            <div className={`rounded-2xl p-3 text-sm ${vTerminal <= SAFE_LANDING_MS ? 'bg-grass/20' : 'bg-rocket/10'}`}>
              <span className="font-display text-base font-bold">
                {vTerminal <= SAFE_LANDING_MS ? '✅ Soft landing' : '💥 Hard landing'}
              </span>{' '}
              · falls at about <strong>{vTerminal.toFixed(1)} m/s</strong> ({fmt.kmh(vTerminal)}).{' '}
              {vTerminal <= SAFE_LANDING_MS ? 'Gentle enough to fly again.' : `Anything over ${SAFE_LANDING_MS} m/s can crack a bottle or dent a nose.`}
            </div>
          </div>

          <div className="card flex flex-col gap-5">
            <h2 className="font-display text-2xl font-bold">🛠️ Launcher setup</h2>
            <Slider
              label="Water"
              emoji="💧"
              value={design.waterFraction}
              min={LIMITS.waterFraction.min}
              max={LIMITS.waterFraction.max}
              step={LIMITS.waterFraction.step}
              display={`${fmt.pct(design.waterFraction)} · ${fmt.litres(design.bottleVolumeL, design.waterFraction)}`}
              ends={['Empty', 'Nearly full']}
              onChange={(v) => update({ waterFraction: v })}
            />
            <Slider
              label="Pump pressure"
              emoji="🫧"
              value={design.pressurePsi}
              min={LIMITS.pressurePsi.min}
              max={LIMITS.pressurePsi.max}
              step={LIMITS.pressurePsi.step}
              display={`${fmt.psi(design.pressurePsi)} · ${fmt.kpa(pressureKPa)}`}
              ends={['Gentle', 'Maximum']}
              onChange={(v) => update({ pressurePsi: v })}
              hint={<PressureZoneHint psi={design.pressurePsi} />}
            />
            <Slider
              label="Launch angle"
              emoji="📐"
              value={design.launchAngleDeg}
              min={LIMITS.launchAngleDeg.min}
              max={LIMITS.launchAngleDeg.max}
              step={LIMITS.launchAngleDeg.step}
              display={fmt.deg(design.launchAngleDeg)}
              ends={['Low & far', 'Straight up']}
              onChange={(v) => update({ launchAngleDeg: v })}
            />
            <Slider
              label="Wind"
              emoji="🌬️"
              value={design.windMs}
              min={0}
              max={6}
              step={0.5}
              display={design.windMs === 0 ? 'Calm' : `${design.windMs} m/s tailwind (${fmt.kmh(design.windMs)})`}
              ends={['Calm', 'Windy']}
              onChange={(v) => update({ windMs: v })}
              hint="Wind pushes the rocket (and especially a parachute) downrange. Real launches should wait for less than about 4 m/s."
            />
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold">🔮 Prediction</h2>
            <p className="text-sm text-ink-soft">The simulator’s best guess for this setup (real flights land within about ±25 %). Launch to see it fly!</p>
            {prediction.liftedOff ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatTile emoji="⬆️" label="Height" value={fmt.m(prediction.maxHeightM, 0)} tone="sky" />
                <StatTile emoji="➡️" label="Distance" value={fmt.m(prediction.rangeM, 0)} tone="grass" />
                <StatTile emoji="⏱️" label="Flight" value={fmt.s(prediction.flightTimeS)} tone="sun" />
                <StatTile emoji="💨" label="Top speed" value={fmt.kmh(prediction.maxSpeedMs)} tone="rocket" />
                <StatTile emoji={prediction.safeLanding ? '✅' : '💥'} label="Landing" value={fmt.ms(prediction.landingSpeedMs)} sub={prediction.safeLanding ? 'soft' : 'hard'} tone={prediction.safeLanding ? 'grass' : 'rocket'} />
              </div>
            ) : (
              <Callout emoji="🪨" tone="rocket" className="mt-3" title="Too heavy to lift off!">
                The push from the nozzle is weaker than the rocket’s weight. Try less water, more pressure, a wider nozzle or a lighter rocket.
              </Callout>
            )}
            <AssumptionsPanel className="mt-4" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-primary flex-1 text-lg" onClick={() => navigate('../launch')}>
                🚀 Take it to the launch pad
              </button>
              <Link to="../hangar" className="btn-ghost">
                🏠 My rockets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
