import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { BridgeDesign, MaterialId } from '../../../shared/types'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { TrussEditor, type EditorTool } from '../../components/bridge/TrussEditor'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { LazyMount } from '../../components/ui/LazyMount'
import { Segmented } from '../../components/ui/Segmented'
import { Slider } from '../../components/ui/Slider'
import { StatTile } from '../../components/ui/StatTile'
import { useDesigns } from '../../lib/useDesigns'
import { MATERIALS, MATERIAL_LIST, TEMPLATES, analyzeBridge, layersOf, memberLengthCm, supportNodes } from '../../sim/bridge'
import { BRIDGE_ACCURACY_NOTE, BRIDGE_ASSUMPTIONS } from '../../sim/bridgeAssumptions'
import { WORKSHOP_BRIDGE, normalizeBridge, useBridgeStore } from '../../store/bridgeStore'
import type { RigState } from '../../three/bridge/Bridge3D'
import { TestRigScene } from '../../three/bridge/TestRigScene'

const FAILURE_LABEL = { tension: 'pulled apart at the joint', buckling: 'buckled sideways', crush: 'crushed', 'self-weight': 'collapsed under its own weight' } as const

export default function BridgeBuildPage() {
  const design = useBridgeStore((s) => s.design)
  const dirty = useBridgeStore((s) => s.dirty)
  const material = useBridgeStore((s) => s.material)
  const layers = useBridgeStore((s) => s.layers)
  const update = useBridgeStore((s) => s.update)
  const startFromTemplate = useBridgeStore((s) => s.startFromTemplate)
  const markSaved = useBridgeStore((s) => s.markSaved)
  const setMaterial = useBridgeStore((s) => s.setMaterial)
  const setLayers = useBridgeStore((s) => s.setLayers)
  const { saveDesign, remote } = useDesigns<BridgeDesign>(WORKSHOP_BRIDGE, normalizeBridge)
  const navigate = useNavigate()

  const [tool, setTool] = useState<EditorTool>('build')
  const [showForces, setShowForces] = useState(true)
  const [showSag, setShowSag] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const history = useRef<BridgeDesign[]>([])
  const noticeTimer = useRef<number | null>(null)

  const analysis = useMemo(() => analyzeBridge(design), [design])
  const rig = useRef<RigState>({ load: 1, brokenId: null, sagScale: 1 })
  const loadKg = useRef(0)
  useEffect(() => {
    rig.current.sagScale = analysis.ok ? Math.min(60, 12 / Math.max(analysis.maxDeflectionMm, 0.2)) : 0
    loadKg.current = analysis.ok ? analysis.capacityKg : 0
  }, [analysis])

  function flash(text: string) {
    setNotice(text)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3500)
  }

  function change(patch: Pick<BridgeDesign, 'nodes' | 'members'>) {
    history.current.push(design)
    if (history.current.length > 40) history.current.shift()
    update(patch)
  }
  function undo() {
    const prev = history.current.pop()
    if (prev) update({ nodes: prev.nodes, members: prev.members })
  }
  function clearAll() {
    change({ nodes: supportNodes(), members: [] })
    setSelected(null)
  }
  function applyTemplate(id: string) {
    history.current.push(design)
    startFromTemplate(id, material)
    setSelected(null)
  }

  const selectedMember = selected ? design.members.find((m) => m.id === selected) : undefined
  const selectedResult = selected ? analysis.members.find((m) => m.id === selected) : undefined

  function patchSelected(patch: Partial<Pick<BridgeDesign['members'][number], 'material' | 'layers'>>) {
    if (!selectedMember) return
    const len = memberLengthCm(design, selectedMember)
    const mat = MATERIALS[patch.material ?? selectedMember.material]
    if (len > mat.maxLengthCm + 1e-6) {
      flash(`A ${mat.name.toLowerCase()} is at most ${mat.maxLengthCm} cm; this piece is ${len.toFixed(1)} cm.`)
      return
    }
    change({ nodes: design.nodes, members: design.members.map((m) => (m.id === selectedMember.id ? { ...m, ...patch } : m)) })
  }

  async function onSave() {
    setSaveState('saving')
    try {
      markSaved(await saveDesign(design))
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  const overBudget = analysis.costCoins > design.budget
  const firstMember = analysis.firstToBreak ? design.members.find((m) => m.id === analysis.firstToBreak) : undefined

  return (
    <Page wide>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Editor */}
        <div className="flex flex-col gap-4">
          <div className="card p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-full bg-ink/5 p-1" role="radiogroup" aria-label="Tool">
                {(
                  [
                    ['build', '✏️ Build'],
                    ['move', '✋ Move'],
                    ['delete', '🗑️ Delete'],
                  ] as [EditorTool, string][]
                ).map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={tool === id} onClick={() => setTool(id)} className={`rounded-full px-3 py-1 font-display text-sm font-bold transition ${tool === id ? 'bg-ink text-white' : 'text-ink hover:bg-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-full bg-ink/5 p-1" role="radiogroup" aria-label="Material">
                {MATERIAL_LIST.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={material === m.id} onClick={() => setMaterial(m.id)} title={m.blurb} className={`rounded-full px-3 py-1 font-display text-sm font-bold transition ${material === m.id ? 'text-ink shadow-chunky-sm' : 'text-ink-soft hover:bg-white'}`} style={material === m.id ? { backgroundColor: m.color } : undefined}>
                    {m.emoji} {m.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-full bg-ink/5 p-1" role="radiogroup" aria-label="Layers">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={layers === n} onClick={() => setLayers(n)} className={`rounded-full px-3 py-1 font-display text-sm font-bold transition ${layers === n ? 'bg-ink text-white' : 'text-ink hover:bg-white'}`} title={`${n} piece${n > 1 ? 's glued face to face' : ''}`}>
                    {'▮'.repeat(n)} ×{n}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button type="button" className="btn-ghost !px-3 !py-1 text-sm" onClick={undo} disabled={history.current.length === 0}>
                  ↩️ Undo
                </button>
                <button type="button" className="btn-ghost !px-3 !py-1 text-sm" onClick={clearAll}>
                  🧹 Clear
                </button>
              </div>
            </div>
            <TrussEditor
              design={design}
              analysis={analysis}
              tool={tool}
              material={material}
              layers={layers}
              showForces={showForces}
              showSag={showSag}
              selectedMember={selected}
              onSelectMember={setSelected}
              onChange={change}
              onNotice={flash}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap gap-3 font-bold text-ink-soft">
                <label className="flex items-center gap-1">
                  <input type="checkbox" className="accent-rocket" checked={showForces} onChange={(e) => setShowForces(e.target.checked)} /> Colour by force (🔴 pulled, 🔵 pushed)
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" className="accent-skyblue" checked={showSag} onChange={(e) => setShowSag(e.target.checked)} /> Show sag (exaggerated)
                </label>
              </div>
              <span className="text-ink-soft">
                {tool === 'build' ? 'Click a grid dot to add a joint, then click the next joint to glue a piece.' : tool === 'move' ? 'Drag a joint to a new grid dot.' : 'Click a piece or a joint to remove it.'}
              </span>
            </div>
            {notice && (
              <div className="mt-2 animate-pop rounded-xl bg-sun/40 px-3 py-2 text-sm font-bold text-ink" role="status">
                ⚠️ {notice}
              </div>
            )}
          </div>

          <div className={`card ${analysis.ok ? (overBudget ? 'bg-sun/20' : 'bg-grass/15') : 'bg-rocket/10'}`}>
            {analysis.ok ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl">{overBudget ? '💸' : '✅'}</span>
                <div className="flex-1">
                  <div className="font-display text-xl font-bold">
                    Ready to test: holds about {analysis.capacityKg.toFixed(1)} kg
                    {overBudget && <span className="ml-2 text-base text-rocket-dark">· over budget by {(analysis.costCoins - design.budget).toFixed(0)} coins</span>}
                  </div>
                  <div className="text-sm text-ink">
                    First to fail: {firstMember ? `${MATERIALS[firstMember.material].name.toLowerCase()}${layersOf(firstMember) > 1 ? ` ×${layersOf(firstMember)}` : ''}` : 'a piece'} ({analysis.failureMode ? FAILURE_LABEL[analysis.failureMode] : '—'}). Sag at
                    breaking load: {analysis.maxDeflectionMm.toFixed(1)} mm.
                  </div>
                </div>
                <button type="button" className="btn-primary" onClick={() => navigate('../test')}>
                  🏋️ Load-test it
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <div className="font-display text-xl font-bold">Not ready yet</div>
                  <div className="text-ink">{analysis.message}</div>
                </div>
              </div>
            )}
          </div>

          {selectedMember && (
            <div className="card animate-pop border-4 border-sun">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Selected piece</div>
                  <div className="font-display text-xl font-bold">
                    {MATERIALS[selectedMember.material].emoji} {MATERIALS[selectedMember.material].name}
                    {layersOf(selectedMember) > 1 && ` ×${layersOf(selectedMember)}`} · {memberLengthCm(design, selectedMember).toFixed(1)} cm
                  </div>
                  {selectedResult && analysis.ok && (
                    <div className="text-sm text-ink">
                      {selectedResult.forceN >= 0 ? '🔴 Pulled' : '🔵 Pushed'} with {Math.abs(selectedResult.forceN).toFixed(1)} N at the breaking load — {Math.round(selectedResult.utilization * 100)}% of what it can take (
                      {selectedResult.forceN >= 0 ? `joint limit ${selectedResult.tensionLimitN} N` : `buckles at ${selectedResult.compressionLimitN} N`}).
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_LIST.map((m) => (
                    <button key={m.id} type="button" className="btn-ghost !px-3 !py-1 text-sm" disabled={m.id === selectedMember.material} onClick={() => patchSelected({ material: m.id })}>
                      {m.emoji}
                    </button>
                  ))}
                  {[1, 2, 3].map((n) => (
                    <button key={n} type="button" className="btn-ghost !px-3 !py-1 text-sm" disabled={layersOf(selectedMember) === n} onClick={() => patchSelected({ layers: n })}>
                      ×{n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1 text-sm text-rocket-dark"
                    onClick={() => {
                      change({ nodes: design.nodes, members: design.members.filter((m) => m.id !== selectedMember.id) })
                      setSelected(null)
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-display text-lg font-bold">🧊 3-D preview at the breaking load</div>
              <span className="text-xs font-bold text-ink-soft">Drag to spin · scroll to zoom</span>
            </div>
            <LazyMount className="h-[320px] overflow-hidden rounded-[1.2rem]">
              <TestRigScene design={design} analysis={analysis} stateRef={rig} loadKgRef={loadKg} colorMode={showForces ? 'forces' : 'material'} highlightId={selected} cameraMode="orbit" />
            </LazyMount>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <label className="label" htmlFor="bridge-name">
              Bridge name
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="bridge-name" className="input flex-1 font-display text-xl font-bold" value={design.name} maxLength={40} onChange={(e) => update({ name: e.target.value })} />
              <button type="button" className="btn-grass" onClick={onSave} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✅ Saved!' : '💾 Save bridge'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              {dirty && <span className="chip bg-sun/40 text-ink">Unsaved changes</span>}
              {saveState === 'error' && <span className="chip bg-rocket/20 text-rocket-dark">Could not save. Try again.</span>}
              <span>{remote ? 'Saved to your account.' : 'Saved in this browser (sign in to keep it anywhere).'}</span>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold">📊 Your bridge</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatTile emoji="🏋️" label="Holds" value={analysis.ok ? `${analysis.capacityKg.toFixed(1)} kg` : '—'} tone="grass" />
              <StatTile emoji="⚖️" label="Weighs" value={`${analysis.massG.toFixed(1)} g`} tone="sky" />
              <StatTile emoji="💰" label="Cost" value={`${analysis.costCoins.toFixed(0)} / ${design.budget}`} sub="coins" tone={overBudget ? 'rocket' : 'sun'} />
              <StatTile emoji="🏆" label="Efficiency" value={analysis.ok ? `${analysis.efficiency}×` : '—'} sub="its own weight" tone="grape" />
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10">
              <div className={`h-full rounded-full ${overBudget ? 'bg-rocket' : 'bg-sun'}`} style={{ width: `${Math.min(100, (analysis.costCoins / Math.max(design.budget, 1)) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs font-bold text-ink-soft">
              {design.members.length} pieces · {design.nodes.length - 2} joints
            </p>
            <AssumptionsPanel className="mt-4" items={BRIDGE_ASSUMPTIONS} note={BRIDGE_ACCURACY_NOTE} moreTo="/workshops/bridge-builder/math" accuracy="joints decide" />
          </div>

          <div className="card flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold">🧪 The test</h2>
            <Segmented
              label="How will it be loaded?"
              value={design.loadMode}
              options={[
                { value: 'center', label: 'Bucket', emoji: '🪣', hint: 'hangs from the middle' },
                { value: 'truck', label: 'Truck', emoji: '🚚', hint: 'drives across' },
              ]}
              onChange={(v) => update({ loadMode: v })}
            />
            <Slider label="Budget" emoji="💰" value={design.budget} min={20} max={200} step={10} display={`${design.budget} coins`} onChange={(v) => update({ budget: v })} hint="Craft sticks cost 2 coins each; straws and spaghetti are cheap but weak." />
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold">🧩 Start from a pattern</h2>
            <p className="text-sm text-ink-soft">Replaces the drawing (Undo brings it back). Uses the selected material.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="rounded-2xl border-2 border-ink/10 bg-white p-3 text-left transition hover:border-skyblue hover:bg-skyblue/5" onClick={() => applyTemplate(t.id)}>
                  <div className="font-display text-lg font-bold">
                    {t.emoji} {t.name}
                  </div>
                  <div className="text-sm text-ink-soft">{t.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <Callout emoji="📏" tone="sky" title="Material cheat-sheet">
            <ul className="mt-1 space-y-1 text-sm">
              {MATERIAL_LIST.map((m) => (
                <li key={m.id}>
                  <span className="font-bold">
                    {m.emoji} {m.name}
                  </span>{' '}
                  · max {m.maxLengthCm} cm · {m.costPerCm * 10} coins per 10 cm · {m.blurb}
                </li>
              ))}
            </ul>
          </Callout>
          <Link to="../hangar" className="btn-ghost">
            🏠 My bridges
          </Link>
        </div>
      </div>
    </Page>
  )
}

export type { MaterialId }
