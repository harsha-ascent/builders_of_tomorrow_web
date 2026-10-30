import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { BridgeTestRecord } from '../../../../shared/types'
import { Dot, LabShell, Readout, useHashState, useLatest } from '../../../components/lab'
import { useTestLog } from '../../../lib/useTestLog'
import { G, analysisAt, buildBridgeModel, describeLoadMode, responseAt } from '../../../sim/bridge'
import { columnResponses, loadRangeKg } from '../../../sim/bridgeMap'
import { useBridgeLabStore } from '../../../store/bridgeLabStore'
import { WORKSHOP_BRIDGE, useBridgeStore } from '../../../store/bridgeStore'
import { BridgeEquationsStrip } from './BridgeEquationsStrip'
import { LoadGraphPanel } from './LoadGraphPanel'
import { LoadMapPanel } from './LoadMapPanel'
import { MemberPanel } from './MemberPanel'
import { RigPanel } from './RigPanel'
import { TestLogPanel } from './TestLogPanel'
import { encodeBridgeHash, hashHasTest, parseBridgeHash } from './bridgeHash'
import { fmtKg, isHot, useLabLoad, type BridgeLab } from './labHooks'

/**
 * The Load Test page's lab: one shared test state (load, where it sits, the piece you are looking at),
 * mirrored into the URL hash, drives linked instrument panels over the real truss analysis. Dragging in
 * any panel changes the forces everywhere; Start plays the ramp to failure in the 3-D rig and the graph.
 */
export default function LabView() {
  const design = useBridgeStore((s) => s.design)
  const loadX = useBridgeLabStore((s) => s.loadX)
  const model = useMemo(() => buildBridgeModel(design), [design])
  const unit = useMemo(() => (model.ok ? model.unitAt(loadX) : null), [model, loadX])
  const analysis = useMemo(() => (model.ok && unit ? analysisAt(model, unit) : model.ok ? null : model.analysis), [model, unit])
  const resp = useMemo(() => (model.ok && unit ? responseAt(model, unit) : null), [model, unit])
  const rangeKg = useMemo(() => loadRangeKg(model), [model])
  const columns = useMemo(() => columnResponses(model), [model])
  const log = useTestLog<BridgeTestRecord>(WORKSHOP_BRIDGE)
  const lab: BridgeLab = useMemo(() => ({ design, model, analysis: analysis!, resp, rangeKg, columns }), [design, model, analysis, resp, rangeKg, columns])

  useBridgeUrlSync(design.id, rangeKg)
  useRamp(lab)
  useResetOnChange(design)

  return (
    <LabShell toolbar={<LabToolbar lab={lab} />}>
      <RigPanel lab={lab} log={log} />
      <LoadGraphPanel lab={lab} />
      <LoadMapPanel lab={lab} />
      <MemberPanel lab={lab} />
      <TestLogPanel log={log} />
      <BridgeEquationsStrip lab={lab} />
    </LabShell>
  )
}

/** Bridge readout, the prediction for the current load position and a share link. */
function LabToolbar({ lab }: { lab: BridgeLab }) {
  const { design, analysis } = lab
  const loadX = useBridgeLabStore((s) => s.loadX)
  const active = useBridgeLabStore((s) => s.active)
  const linked = useBridgeLabStore((s) => s.linkedDesignId)
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copy this link', window.location.href)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
      <div className="lab-readout flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="lab-title">bridge</span>
        <span className="truncate">
          <b>{design.name}</b> · {design.members.length} pieces · {analysis.massG.toFixed(1)} g · {analysis.costCoins.toFixed(0)} coins · {describeLoadMode(design.loadMode).toLowerCase()}
        </span>
        <Link to="../build" className="lab-link">
          change the bridge on the Workbench
        </Link>
        {linked && (
          <span className="lab-accent" title={linked}>
            this link was made for another bridge (open it from My Bridges)
          </span>
        )}
      </div>
      <div className="lab-readout flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="lab-title">prediction</span>
        {analysis.ok ? (
          <span>
            <Readout label="breaks at" value={fmtKg(analysis.capacityKg)} unit="kg" hot />
            <Dot />
            <Readout label="with the load" value={loadX} unit="cm along" hot={isHot(active, 'position')} />
            <Dot />
            <Readout label="sag at break" value={analysis.maxDeflectionMm.toFixed(1)} unit="mm" />
            <Dot />
            <Readout label="holds" value={analysis.efficiency} unit="× its own weight" />
          </span>
        ) : (
          <b className="lab-accent">not ready to test</b>
        )}
        <button type="button" className="lab-btn" onClick={copyLink} title="Copy a link that opens this exact setup">
          {copied ? '✓ link copied' : '⧉ copy link to this setup'}
        </button>
      </div>
    </div>
  )
}

/**
 * Keeps the URL hash equal to the live test state, and applies a pasted or shared hash. The load is
 * read from the store when the hash is written (never from a throttled copy, which can lag a frame);
 * the throttled hook only limits how often the ramp rewrites the hash.
 */
function useBridgeUrlSync(designId: string, rangeKg: number) {
  const loadTick = useLabLoad(5)
  const loadX = useBridgeLabStore((s) => s.loadX)
  const selectedId = useBridgeLabStore((s) => s.selectedId)
  const rangeRef = useLatest(rangeKg)
  const value = useMemo(() => ({ loadTick, loadX, designId, selectedId }), [loadTick, loadX, designId, selectedId])
  const encode = useCallback(
    (v: { loadX: number; designId: string; selectedId: string | null }) => encodeBridgeHash({ loadKg: useBridgeLabStore.getState().loadKg, loadX: v.loadX, designId: v.designId, selectedId: v.selectedId }),
    [],
  )
  const apply = useCallback(
    (hash: string) => {
      if (!hashHasTest(hash)) return
      const p = parseBridgeHash(hash, rangeRef.current)
      const st = useBridgeLabStore.getState()
      if (p.loadX !== null && p.loadX !== st.loadX) st.setLoadX(p.loadX)
      if (p.loadKg !== null && Math.abs(p.loadKg - st.loadKg) > 1e-9) st.setLoadKg(p.loadKg)
      if (p.selectedId !== null && p.selectedId !== st.selectedId) st.setSelected(p.selectedId)
      st.setLinkedDesignId(p.designId && p.designId !== designId ? p.designId : null)
    },
    [designId, rangeRef],
  )
  useHashState(value, encode, apply)
}

/** Start plays the load from zero up to the breaking load; the wall clock sets the pace, not the frame rate. */
function useRamp(lab: BridgeLab) {
  const phase = useBridgeLabStore((s) => s.phase)
  const speed = useBridgeLabStore((s) => s.speed)
  const { analysis } = lab
  useEffect(() => {
    if (phase !== 'loading') return
    const st = useBridgeLabStore.getState()
    const cap = analysis.ok ? analysis.capacityN / G : 0
    if (!analysis.ok || !Number.isFinite(cap)) {
      st.stop()
      return
    }
    if (cap <= 0) {
      st.tick(0)
      st.breakNow()
      return
    }
    const rampSeconds = 4 / speed
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const s = useBridgeLabStore.getState()
      if (s.phase !== 'loading') return
      const f = Math.min(1, Math.max(0, (now - start) / 1000 / rampSeconds))
      if (f >= 1) {
        s.tick(cap)
        s.breakNow()
        return
      }
      s.tick(f * cap)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, speed, analysis])
}

/** A changed bridge takes the load off and clears the selection; leaving the page does too. */
function useResetOnChange(design: BridgeLab['design']) {
  const prev = useRef(design)
  useEffect(() => {
    if (prev.current !== design) {
      prev.current = design
      useBridgeLabStore.getState().reset()
    }
  }, [design])
  useEffect(() => () => useBridgeLabStore.getState().reset(), [])
}
