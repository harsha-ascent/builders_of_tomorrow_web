import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { BridgeTestRecord } from '../../../shared/types'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { StatTile } from '../../components/ui/StatTile'
import { useTestLog } from '../../lib/useTestLog'
import { MATERIALS, analyzeBridge, describeLoadMode, layersOf, memberLengthCm } from '../../sim/bridge'
import { BRIDGE_ACCURACY_NOTE, BRIDGE_ASSUMPTIONS } from '../../sim/bridgeAssumptions'
import { newDesignId } from '../../sim/presets'
import { WORKSHOP_BRIDGE, useBridgeStore } from '../../store/bridgeStore'
import type { RigState } from '../../three/bridge/Bridge3D'
import { TestRigScene } from '../../three/bridge/TestRigScene'

type Phase = 'idle' | 'loading' | 'broken'

const ADVICE: Record<string, string> = {
  buckling: 'It bowed sideways. Make that piece thicker (×2 or ×3 layers) or shorter by adding a joint in the middle.',
  tension: 'The glue joint pulled apart. Add a second piece alongside it, or switch to a material with stronger joints.',
  crush: 'It was crushed end-on. That is rare: try a stronger material.',
  'self-weight': 'It cannot even hold itself up. Use fewer or lighter pieces, or a stronger material.',
}

function weightComparison(kg: number) {
  if (kg < 0.5) return 'about a cup of water'
  if (kg < 1.5) return 'about a bag of sugar'
  if (kg < 3) return 'about a big bottle of cola'
  if (kg < 6) return 'about a house cat'
  if (kg < 12) return 'about a bicycle'
  if (kg < 25) return 'about a full suitcase'
  if (kg < 45) return 'about a ten-year-old'
  if (kg < 80) return 'about a grown-up'
  return 'more than a grown-up!'
}

export default function BridgeTestPage() {
  const design = useBridgeStore((s) => s.design)
  const analysis = useMemo(() => analyzeBridge(design), [design])
  const { records, addRecord, deleteRecord, clearAll } = useTestLog<BridgeTestRecord>(WORKSHOP_BRIDGE)

  const [phase, setPhase] = useState<Phase>('idle')
  const [speed, setSpeed] = useState(1)
  const [colorMode, setColorMode] = useState<'forces' | 'material'>('forces')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hud, setHud] = useState({ kg: 0, pct: 0 })
  const rig = useRef<RigState>({ load: 0, brokenId: null, sagScale: 1 })
  const loadKg = useRef(0)
  const raf = useRef<number | null>(null)
  const startedAt = useRef(0)
  const lastHud = useRef(0)

  useEffect(() => {
    rig.current.sagScale = analysis.ok ? Math.min(60, 12 / Math.max(analysis.maxDeflectionMm, 0.2)) : 0
  }, [analysis])

  const reset = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
    rig.current.load = 0
    rig.current.brokenId = null
    loadKg.current = 0
    setHud({ kg: 0, pct: 0 })
    setPhase('idle')
    setSaveState('idle')
  }, [])

  useEffect(() => {
    reset()
  }, [design, reset])
  useEffect(() => () => reset(), [reset])

  function start() {
    if (!analysis.ok || phase === 'loading') return
    reset()
    setPhase('loading')
    startedAt.current = performance.now()
    lastHud.current = 0
    const rampSeconds = 4 / speed
    const tick = (now: number) => {
      // Wall-clock based so the ramp takes the same time however fast the scene renders.
      rig.current.load = Math.min(1, (now - startedAt.current) / 1000 / rampSeconds)
      loadKg.current = rig.current.load * analysis.capacityKg
      if (now - lastHud.current > 100 || rig.current.load >= 1) {
        lastHud.current = now
        setHud({ kg: loadKg.current, pct: rig.current.load })
      }
      if (rig.current.load >= 1) {
        rig.current.brokenId = analysis.firstToBreak
        rig.current.load = 1.15
        setPhase('broken')
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  async function saveToLog() {
    if (!analysis.ok) return
    setSaveState('saving')
    const record: BridgeTestRecord = {
      id: newDesignId(),
      designId: design.id,
      designName: design.name,
      settings: { loadMode: design.loadMode, members: design.members.length, massG: analysis.massG, costCoins: analysis.costCoins },
      result: {
        ok: true,
        capacityKg: analysis.capacityKg,
        failureMode: analysis.failureMode,
        maxDeflectionMm: analysis.maxDeflectionMm,
        efficiency: analysis.efficiency,
        worstLoadX: analysis.worstLoadX,
        firstToBreak: analysis.firstToBreak,
      },
      createdAt: new Date().toISOString(),
    }
    try {
      await addRecord(record)
      setSaveState('saved')
    } catch {
      setSaveState('idle')
    }
  }

  const firstMember = analysis.firstToBreak ? design.members.find((m) => m.id === analysis.firstToBreak) : undefined
  const topMembers = useMemo(() => [...analysis.members].sort((a, b) => b.utilization - a.utilization).slice(0, 6), [analysis])

  return (
    <Page wide>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-blob shadow-float" style={{ height: 'min(65vh, 520px)' }}>
            <TestRigScene design={design} analysis={analysis} stateRef={rig} loadKgRef={loadKg} colorMode={colorMode} highlightId={phase === 'broken' ? analysis.firstToBreak : null} cameraMode="cinematic" />
            <div className="pointer-events-none absolute left-3 top-3 grid grid-cols-2 gap-2 text-white">
              <HudTile label="Load" value={`${hud.kg.toFixed(1)} kg`} />
              <HudTile label="Of breaking load" value={`${Math.round(Math.min(hud.pct, 1) * 100)}%`} />
              <HudTile label="Test" value={describeLoadMode(design.loadMode)} />
              <HudTile label="Status" value={phase === 'idle' ? '🛑 Ready' : phase === 'loading' ? '⏳ Loading…' : '💥 Broken!'} />
            </div>
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <div className="flex items-center gap-1 rounded-full bg-ink/60 p-1 text-xs backdrop-blur" role="radiogroup" aria-label="Colours">
                {(['forces', 'material'] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={colorMode === m} onClick={() => setColorMode(m)} className={`rounded-full px-3 py-1 font-display font-bold transition ${colorMode === m ? 'bg-white text-ink' : 'text-white hover:bg-white/20'}`}>
                    {m === 'forces' ? '🔴🔵 Forces' : '🪵 Materials'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-ink/60 p-1 text-xs backdrop-blur" role="radiogroup" aria-label="Speed">
                {[1, 0.3].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={speed === v} onClick={() => setSpeed(v)} className={`rounded-full px-3 py-1 font-display font-bold transition ${speed === v ? 'bg-white text-ink' : 'text-white hover:bg-white/20'}`}>
                    {v === 1 ? '▶️ Normal' : '🐢 Slow'}
                  </button>
                ))}
              </div>
            </div>
            {phase === 'broken' && (
              <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
                <div className="animate-pop rounded-full bg-white/90 px-5 py-2 font-display text-2xl font-bold text-ink shadow">💥 SNAP! It held {analysis.capacityKg.toFixed(1)} kg</div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-ink/70 to-transparent p-4">
              <div className="flex gap-2">
                {phase !== 'loading' && (
                  <button type="button" className="btn-primary text-lg" onClick={start} disabled={!analysis.ok}>
                    {phase === 'broken' ? '🔁 Test again' : '🏋️ Start the load test'}
                  </button>
                )}
                {phase === 'loading' && (
                  <button type="button" className="btn-ghost" onClick={reset}>
                    ⏹️ Stop
                  </button>
                )}
                <Link to="../build" className="btn-ghost">
                  🔧 Workbench
                </Link>
              </div>
              <div className="w-56">
                <div className="mb-1 flex justify-between text-xs font-extrabold text-white">
                  <span>Weight</span>
                  <span className="tabular-nums">{hud.kg.toFixed(1)} kg</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-grass via-sun to-rocket" style={{ width: `${Math.min(100, hud.pct * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {!analysis.ok && (
            <Callout emoji="⚠️" tone="rocket" title="This bridge is not ready to test">
              {analysis.message}{' '}
              <Link to="../build" className="font-bold underline">
                Fix it on the workbench.
              </Link>
            </Callout>
          )}

          {phase === 'broken' && analysis.ok && (
            <div className="card animate-pop">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl font-bold">
                    💥 It held {analysis.capacityKg.toFixed(1)} kg <span className="text-ink-soft">· {design.name}</span>
                  </h2>
                  <p className="prose-kid mt-1">
                    That is {weightComparison(analysis.capacityKg)} — <strong>{analysis.efficiency}×</strong> the bridge’s own weight of {analysis.massG.toFixed(1)} g.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-grass" onClick={saveToLog} disabled={saveState !== 'idle'}>
                    {saveState === 'saved' ? '✅ Saved to log' : saveState === 'saving' ? 'Saving…' : '📒 Save to test log'}
                  </button>
                  <Link to="../build" className="btn-ghost">
                    🔧 Improve it
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatTile emoji="🏋️" label="Breaking load" value={`${analysis.capacityKg.toFixed(1)} kg`} sub={`${analysis.capacityN.toFixed(0)} N`} tone="grass" />
                <StatTile emoji="📉" label="Sag" value={`${analysis.maxDeflectionMm.toFixed(1)} mm`} tone="sky" />
                <StatTile emoji="⚖️" label="Mass" value={`${analysis.massG.toFixed(1)} g`} />
                <StatTile emoji="💰" label="Cost" value={`${analysis.costCoins.toFixed(0)} coins`} tone="sun" />
                <StatTile emoji="🏆" label="Efficiency" value={`${analysis.efficiency}×`} tone="grape" />
              </div>
              {firstMember && analysis.failureMode && (
                <Callout emoji="🔍" tone="sun" className="mt-4" title={`Weakest link: a ${memberLengthCm(design, firstMember).toFixed(1)} cm ${MATERIALS[firstMember.material].name.toLowerCase()}${layersOf(firstMember) > 1 ? ` ×${layersOf(firstMember)}` : ''}`}>
                  {ADVICE[analysis.failureMode]} {design.loadMode === 'truck' && `The worst spot for the truck was ${analysis.worstLoadX} cm along the road.`}
                </Callout>
              )}
              <AssumptionsPanel className="mt-4" items={BRIDGE_ASSUMPTIONS} note={BRIDGE_ACCURACY_NOTE} moreTo="/workshops/bridge-builder/math" accuracy="joints decide" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <h2 className="font-display text-2xl font-bold">🔎 Hardest-working pieces</h2>
            <p className="text-sm text-ink-soft">At the breaking load. 100% = this piece fails.</p>
            {analysis.ok ? (
              <ul className="mt-3 space-y-2">
                {topMembers.map((r) => {
                  const m = design.members.find((x) => x.id === r.id)
                  if (!m) return null
                  const pulled = r.forceN >= 0
                  return (
                    <li key={r.id} className="rounded-xl bg-ink/5 p-2 text-sm">
                      <div className="flex justify-between font-bold">
                        <span>
                          {MATERIALS[m.material].emoji} {MATERIALS[m.material].name}
                          {layersOf(m) > 1 && ` ×${layersOf(m)}`} · {r.lengthCm} cm
                        </span>
                        <span className={pulled ? 'text-rocket-dark' : 'text-skyblue-dark'}>
                          {pulled ? '🔴 pulled' : '🔵 pushed'} {Math.abs(r.forceN).toFixed(1)} N
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                        <div className={`h-full rounded-full ${pulled ? 'bg-rocket' : 'bg-skyblue-dark'}`} style={{ width: `${Math.round(r.utilization * 100)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-2 text-ink-soft">Fix the bridge first.</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">📒 Test log</h2>
              {records.length > 0 && (
                <button
                  type="button"
                  className="text-sm font-bold text-ink-soft underline"
                  onClick={() => {
                    if (window.confirm('Clear the whole test log?')) void clearAll()
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {records.length === 0 ? (
              <p className="mt-1 text-ink-soft">Save a test to start comparing versions.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-extrabold uppercase text-ink-soft">
                      <th className="py-1 pr-2">Bridge</th>
                      <th className="py-1 pr-2">Test</th>
                      <th className="py-1 pr-2">⚖️ g</th>
                      <th className="py-1 pr-2">🏋️ kg</th>
                      <th className="py-1 pr-2">🏆</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 12).map((r) => (
                      <tr key={r.id} className="border-t border-ink/5 font-semibold tabular-nums">
                        <td className="max-w-[8rem] truncate py-1 pr-2" title={r.designName}>
                          {r.designName}
                        </td>
                        <td className="py-1 pr-2">{r.settings.loadMode === 'truck' ? '🚚' : '🪣'}</td>
                        <td className="py-1 pr-2">{Number(r.settings.massG).toFixed(1)}</td>
                        <td className="py-1 pr-2">{Number(r.result.capacityKg).toFixed(1)}</td>
                        <td className="py-1 pr-2">{r.result.efficiency}×</td>
                        <td className="py-1 text-right">
                          <button type="button" aria-label="Delete" className="text-ink-soft hover:text-rocket" onClick={() => void deleteRecord(r.id)}>
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

function HudTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink/60 px-3 py-1.5 backdrop-blur">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/70">{label}</div>
      <div className="font-display text-lg font-bold tabular-nums leading-tight">{value}</div>
    </div>
  )
}
