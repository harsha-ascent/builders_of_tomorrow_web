import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { BridgeAnalysis, BridgeTestRecord } from '../../../../shared/types'
import { Dot, LabPanel, LabSeg, Readout } from '../../../components/lab'
import { MATERIALS, layersOf } from '../../../sim/bridge'
import { newDesignId } from '../../../sim/presets'
import { labLoad, useBridgeLabStore } from '../../../store/bridgeLabStore'
import type { RigState } from '../../../three/bridge/Bridge3D'
import { TestRigScene } from '../../../three/bridge/TestRigScene'
import { FAIL_LABEL, weightComparison } from '../testCopy'
import { ACCENT, fmtKg, isBrokenAt, isHot, rigLoadFraction, useLabLoad, useSelectedMember, type BridgeLab, type TestLog } from './labHooks'

/**
 * The 3-D test rig with an orbit camera. The selected piece is drawn in amber; clicking a piece selects
 * it everywhere. Start ramps the load to failure; the load and where it sits come from the shared state.
 */
export function RigPanel({ lab, log }: { lab: BridgeLab; log: TestLog }) {
  const { design, analysis } = lab
  const loadKg = useLabLoad(15)
  const loadX = useBridgeLabStore((s) => s.loadX)
  const phase = useBridgeLabStore((s) => s.phase)
  const speed = useBridgeLabStore((s) => s.speed)
  const colorMode = useBridgeLabStore((s) => s.colorMode)
  const active = useBridgeLabStore((s) => s.active)
  const hoverId = useBridgeLabStore((s) => s.hoverId)
  const setSpeed = useBridgeLabStore((s) => s.setSpeed)
  const setColorMode = useBridgeLabStore((s) => s.setColorMode)
  const setSelected = useBridgeLabStore((s) => s.setSelected)
  const setHover = useBridgeLabStore((s) => s.setHover)
  const start = useBridgeLabStore((s) => s.start)
  const stop = useBridgeLabStore((s) => s.stop)
  const selectedId = useSelectedMember(lab.resp)

  const rig = useRef<RigState>({ load: 0, brokenId: null, sagScale: 1 })
  const loadXRef = useRef(loadX)

  useEffect(() => {
    rig.current.sagScale = analysis.ok ? Math.min(60, 12 / Math.max(analysis.maxDeflectionMm, 0.2)) : 0
  }, [analysis])

  // The rig reads load fraction, broken piece and load position every frame; keep them in step with the store.
  useEffect(() => {
    const apply = () => {
      const s = useBridgeLabStore.getState()
      const cap = analysis.ok ? analysis.capacityKg : 0
      const broken = analysis.ok && isBrokenAt(s.loadKg, cap, s.phase)
      rig.current.load = analysis.ok ? rigLoadFraction(s.loadKg, cap, s.phase) : 0
      rig.current.brokenId = broken ? analysis.firstToBreak : null
      loadXRef.current = s.loadX
    }
    apply()
    return useBridgeLabStore.subscribe(apply)
  }, [analysis])

  const cap = analysis.ok ? analysis.capacityKg : 0
  const broken = analysis.ok && isBrokenAt(loadKg, cap, phase)
  const pct = analysis.ok && Number.isFinite(cap) && cap > 0 ? Math.min(loadKg / cap, 1) : 0
  const status = !analysis.ok ? 'not ready' : phase === 'loading' ? 'loading…' : broken ? 'SNAP' : loadKg > 0 ? 'holding' : 'ready'
  const canStart = analysis.ok && Number.isFinite(cap)
  const first = analysis.firstToBreak ? design.members.find((m) => m.id === analysis.firstToBreak) : undefined

  return (
    <LabPanel
      title="3-D test rig"
      readout={
        <>
          <Readout label="load" value={fmtKg(loadKg)} unit="kg" hot={isHot(active, 'load') || phase === 'loading'} />
          <Dot />
          <Readout label="of breaking load" value={Math.round(pct * 100)} unit="%" />
          <Dot />
          <span className={broken ? 'lab-accent' : 'lab-k'}>{status}</span>
        </>
      }
      tools={
        <>
          {phase === 'loading' ? (
            <button type="button" className="lab-btn" onClick={stop}>
              ⏹ Stop
            </button>
          ) : (
            <button type="button" className="lab-btn lab-btn-primary" onClick={start} disabled={!canStart} title={canStart ? 'Add weight until the first piece fails' : 'Fix the bridge, or move the load off the support'}>
              {broken ? '🔁 Test again' : '🏋️ Start the load test'}
            </button>
          )}
          <SaveButton lab={lab} log={log} enabled={broken} />
          <LabSeg
            label="Speed"
            value={speed}
            options={[
              { value: 1, label: 'Normal' },
              { value: 0.3, label: 'Slow' },
            ]}
            onChange={setSpeed}
          />
          <LabSeg
            label="Colours"
            value={colorMode}
            options={[
              { value: 'forces', label: 'Forces', title: 'Red = pulled, blue = pushed; deeper = harder-working' },
              { value: 'material', label: 'Materials' },
            ]}
            onChange={setColorMode}
          />
          <Link to="../build" className="lab-btn">
            🔧 Workbench
          </Link>
        </>
      }
    >
      <div className="absolute inset-0">
        <TestRigScene
          design={design}
          analysis={analysis.ok ? analysis : null}
          stateRef={rig}
          loadKgRef={labLoad}
          loadXRef={loadXRef}
          colorMode={colorMode}
          highlightId={selectedId}
          hoverId={hoverId}
          accent={ACCENT}
          onSelectMember={setSelected}
          onHoverMember={setHover}
          cameraMode="orbit"
          dark
        />
      </div>
      {broken && analysis.ok && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-2">
          <div className="animate-pop rounded-md px-3 py-1.5 text-center font-display text-base font-bold" style={{ background: ACCENT, color: '#140c00' }}>
            💥 SNAP! It held {fmtKg(cap)} kg ({weightComparison(cap)})
            {first && analysis.failureMode && (
              <span className="block text-xs font-semibold">
                the {first.id === selectedId ? 'amber' : 'dark'} piece: {MATERIALS[first.material].name.toLowerCase()}
                {layersOf(first) > 1 ? ` ×${layersOf(first)}` : ''} · {FAIL_LABEL[analysis.failureMode]}
              </span>
            )}
          </div>
        </div>
      )}
      {!analysis.ok && (
        <div className="pointer-events-auto absolute inset-x-0 top-2 flex justify-center px-2">
          <div className="rounded-md border px-3 py-1.5 text-center" style={{ borderColor: ACCENT, background: 'rgb(10 14 22 / 0.85)', color: ACCENT }}>
            {analysis.message}{' '}
            <Link to="../build" className="lab-link">
              fix it on the Workbench
            </Link>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1.5 left-2 max-w-[55%] text-[11px]" style={{ color: 'var(--lab-dim)' }}>
        drag to spin · scroll or pinch to zoom · click or tap a piece to select it
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-2 w-44 rounded-md px-2 py-1 text-[11px] lab-readout" style={{ background: 'rgb(10 14 22 / 0.7)' }}>
        <div className="flex justify-between">
          <span className="lab-k">load</span>
          <span>
            <b>{fmtKg(loadKg)}</b> / {fmtKg(cap)} kg
          </span>
        </div>
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--lab-line)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: broken ? '#ff5a5a' : ACCENT }} />
        </div>
      </div>
    </LabPanel>
  )
}

/** Saves the breaking load to the test log; remembered per analysis so a new setup re-enables it. */
function SaveButton({ lab, log, enabled }: { lab: BridgeLab; log: TestLog; enabled: boolean }) {
  const { design, analysis } = lab
  const [saveState, setSaveState] = useState<{ analysis: BridgeAnalysis; state: 'saving' | 'saved' } | null>(null)
  const saved = saveState?.analysis === analysis ? saveState.state : 'idle'

  async function save() {
    if (!analysis.ok) return
    setSaveState({ analysis, state: 'saving' })
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
      await log.addRecord(record)
      setSaveState({ analysis, state: 'saved' })
    } catch {
      setSaveState(null)
    }
  }

  return (
    <button type="button" className="lab-btn" onClick={save} disabled={!enabled || saved !== 'idle'} title={enabled ? 'Keep this result in the test log' : 'Break the bridge first'}>
      {saved === 'saved' ? '✓ saved to log' : saved === 'saving' ? 'saving…' : '📒 Save to test log'}
    </button>
  )
}
