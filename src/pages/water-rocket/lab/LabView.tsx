import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { LaunchRecord, LaunchResult, RocketDesign } from '../../../../shared/types'
import { encodeLabHash, hashHasDesign, parseLabHash } from '../../../lib/designHash'
import { runLaunch } from '../../../lib/runSim'
import { useLaunchLog } from '../../../lib/useLaunchLog'
import { newDesignId } from '../../../sim/presets'
import { NOZZLES, pressureZone } from '../../../sim/rocket'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore } from '../../../store/labStore'
import { BottleCutawayPanel } from './BottleCutawayPanel'
import { EquationsStrip } from './EquationsStrip'
import { FlightPanel } from './FlightPanel'
import { GraphsPanel } from './GraphsPanel'
import { ParameterMapPanel } from './ParameterMapPanel'

/**
 * Lab view of the Launch page: one shared design (the workbench store, mirrored into the URL hash) drives
 * four linked instrument panels and an equations strip. Dragging in any panel changes the prediction
 * everywhere; LAUNCH plays the stored flight in the 3-D view and the graphs together.
 */
export default function LabView() {
  const design = useDesignStore((s) => s.design)
  const flight = useMemo(() => runLaunch(design), [design])
  useLabUrlSync()
  usePlayback(flight)

  return (
    <div className="lab p-2 md:p-3">
      <LabToolbar design={design} flight={flight} />
      <div className="lab-grid mt-2">
        <FlightPanel design={design} flight={flight} />
        <ParameterMapPanel design={design} flight={flight} />
        <BottleCutawayPanel design={design} flight={flight} />
        <GraphsPanel flight={flight} />
        <EquationsStrip design={design} flight={flight} className="lab-span" />
      </div>
    </div>
  )
}

/** Design readout, prediction summary, share link and flight-log save. */
function LabToolbar({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const done = useLabStore((s) => s.done)
  const setLastResult = useDesignStore((s) => s.setLastResult)
  const { addLaunch } = useLaunchLog()
  const [copied, setCopied] = useState(false)
  // Remembered per flight, so a new prediction re-enables the button without an effect.
  const [saveState, setSaveState] = useState<{ flight: LaunchResult; state: 'saving' | 'saved' } | null>(null)
  const saved = saveState?.flight === flight ? saveState.state : 'idle'
  const nozzle = NOZZLES.find((n) => n.diameterMm === design.nozzleDiameterMm)
  const zone = pressureZone(design.pressurePsi)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copy this link', window.location.href)
    }
  }

  async function saveToLog() {
    setSaveState({ flight, state: 'saving' })
    const { samples: _s, events: _e, ...summary } = flight
    void _s
    void _e
    const record: LaunchRecord = {
      id: newDesignId(),
      designId: design.id,
      designName: design.name,
      settings: {
        waterFraction: design.waterFraction,
        pressurePsi: design.pressurePsi,
        launchAngleDeg: design.launchAngleDeg,
        windMs: design.windMs,
        stages: design.boosters.length + 1,
        recovery: design.recovery,
      },
      result: summary,
      createdAt: new Date().toISOString(),
    }
    try {
      await addLaunch(record)
      setLastResult(flight)
      setSaveState({ flight, state: 'saved' })
    } catch {
      setSaveState(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
      <div className="lab-readout flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="lab-title">design</span>
        <span className="truncate">
          <b>{design.name}</b> · {design.bottleVolumeL} L · {design.dryMassG} g dry · nozzle {design.nozzleDiameterMm} mm{nozzle ? ` (${nozzle.label.split(' (')[0].toLowerCase()})` : ''} ·{' '}
          {design.noseShape} nose · {design.finCount} fins · {design.recovery === 'parachute' ? `${Math.round(design.parachuteDiameterM * 100)} cm chute` : 'no chute'}
          {design.boosters.length > 0 ? ` · ${design.boosters.length + 1} stages` : ''}
          {design.windMs ? ` · wind ${design.windMs} m/s` : ''}
        </span>
        <Link to="../build" className="lab-link">
          edit in Build
        </Link>
      </div>
      <div className="lab-readout flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="lab-title">prediction</span>
        {flight.liftedOff ? (
          <span>
            <span className="lab-k">apogee</span> <b className="lab-accent">{flight.maxHeightM.toFixed(1)} m</b> · <span className="lab-k">range</span> <b>{flight.rangeM.toFixed(1)} m</b> ·{' '}
            <span className="lab-k">flight</span> <b>{flight.flightTimeS.toFixed(1)} s</b> · <span className="lab-k">max</span> <b>{flight.maxSpeedMs.toFixed(0)} m/s</b> ·{' '}
            <span className="lab-k">landing</span> <b>{flight.landingSpeedMs.toFixed(0)} m/s {flight.safeLanding ? 'soft' : 'hard'}</b>
          </span>
        ) : (
          <b className="lab-accent">no lift-off</b>
        )}
        <span className="lab-k" title={zone.advice}>
          {zone.zone === 'green' ? '●' : zone.zone === 'amber' ? '▲' : '■'} {zone.label.toLowerCase()}
        </span>
        <button type="button" className="lab-btn" onClick={copyLink} title="Copy a link that opens this exact setup">
          {copied ? '✓ copied' : '⧉ copy link'}
        </button>
        <button type="button" className="lab-btn" onClick={saveToLog} disabled={!done || saved !== 'idle'} title={done ? 'Save this flight to the log' : 'Launch first, then save'}>
          {saved === 'saved' ? '✓ in flight log' : saved === 'saving' ? 'saving…' : '📒 save to log'}
        </button>
      </div>
    </div>
  )
}

/**
 * Keeps the URL hash equal to the live design (and the map metric) and applies a pasted or shared hash.
 * replaceState keeps the browser history clean while dragging.
 */
function useLabUrlSync() {
  const design = useDesignStore((s) => s.design)
  const update = useDesignStore((s) => s.update)
  const metric = useLabStore((s) => s.metric)
  const setMetric = useLabStore((s) => s.setMetric)

  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash
      if (!hashHasDesign(hash)) return
      const parsed = parseLabHash(hash)
      const current = useDesignStore.getState().design
      const patch: Partial<RocketDesign> = {}
      for (const [k, v] of Object.entries(parsed.design) as [keyof RocketDesign, unknown][]) {
        if (JSON.stringify(current[k]) !== JSON.stringify(v)) (patch as Record<string, unknown>)[k] = v
      }
      if (Object.keys(patch).length > 0) update(patch)
      if (parsed.metric) setMetric(parsed.metric)
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [update, setMetric])

  useEffect(() => {
    const next = `#${encodeLabHash(design, { metric })}`
    if (window.location.hash === next) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${next}`)
  }, [design, metric])
}

/** Advances the shared clock while playing; any change to the flight puts the rocket back on the pad. */
function usePlayback(flight: LaunchResult) {
  const playing = useLabStore((s) => s.playing)

  useEffect(() => {
    useLabStore.getState().reset()
  }, [flight])

  useEffect(() => () => useLabStore.getState().reset(), [])

  useEffect(() => {
    if (!playing) return
    const end = flight.samples[flight.samples.length - 1]?.t ?? 0
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const st = useLabStore.getState()
      // rAF timestamps can precede the performance.now() taken when the loop started; never step backwards.
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05))
      last = now
      const t = st.time + dt * st.speed
      if (t >= end) {
        st.setTime(end)
        st.finish()
        return
      }
      st.setTime(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, flight])
}
