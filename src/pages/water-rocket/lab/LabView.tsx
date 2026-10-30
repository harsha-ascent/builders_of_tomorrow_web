import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { Dot, LabShell, Readout, useHashState } from '../../../components/lab'
import { encodeLabHash, hashHasDesign, parseLabHash } from '../../../lib/designHash'
import { runLaunch } from '../../../lib/runSim'
import { NOZZLES, pressureZone } from '../../../sim/rocket'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore, type LabMetric } from '../../../store/labStore'
import { BottleCutawayPanel } from './BottleCutawayPanel'
import { EquationsStrip } from './EquationsStrip'
import { FlightLogPanel } from './FlightLogPanel'
import { FlightPanel } from './FlightPanel'
import { GraphsPanel } from './GraphsPanel'
import { MissionPanel } from './MissionPanel'
import { ParameterMapPanel } from './ParameterMapPanel'

/**
 * The Launch page's lab: one shared design (the workbench store, mirrored into the URL hash) drives
 * linked instrument panels. Dragging in any panel changes the prediction everywhere; pump, count down
 * and LAUNCH play the stored flight in the 3-D view and the graphs together.
 */
export default function LabView() {
  const design = useDesignStore((s) => s.design)
  const flight = useMemo(() => runLaunch(design), [design])
  useLabUrlSync()
  usePadAndPlayback(flight)

  return (
    <LabShell toolbar={<LabToolbar design={design} flight={flight} />}>
      <FlightPanel design={design} flight={flight} />
      <ParameterMapPanel design={design} flight={flight} />
      <BottleCutawayPanel design={design} flight={flight} />
      <GraphsPanel flight={flight} />
      <MissionPanel flight={flight} />
      <FlightLogPanel design={design} flight={flight} />
      <EquationsStrip design={design} flight={flight} />
    </LabShell>
  )
}

/** Design readout, prediction summary and a share link. */
function LabToolbar({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const [copied, setCopied] = useState(false)
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
      <div className="lab-readout flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="lab-title">rocket</span>
        <span className="truncate">
          <b>{design.name}</b> · {design.bottleVolumeL} L bottle · {design.dryMassG} g empty · {design.nozzleDiameterMm} mm nozzle{nozzle ? ` (${nozzle.label.split(' (')[0].toLowerCase()})` : ''} ·{' '}
          {design.noseShape} nose · {design.finCount} fins · {design.recovery === 'parachute' ? `${Math.round(design.parachuteDiameterM * 100)} cm parachute` : 'no parachute'}
          {design.boosters.length > 0 ? ` · ${design.boosters.length + 1} stages` : ''}
          {design.windMs ? ` · wind ${design.windMs} m/s` : ''}
        </span>
        <Link to="../build" className="lab-link">
          change the rocket in Build
        </Link>
      </div>
      <div className="lab-readout flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="lab-title">prediction</span>
        {flight.liftedOff ? (
          <span>
            <Readout label="height" value={flight.maxHeightM.toFixed(1)} unit="m" hot />
            <Dot />
            <Readout label="distance" value={flight.rangeM.toFixed(1)} unit="m" />
            <Dot />
            <Readout label="in the air" value={flight.flightTimeS.toFixed(1)} unit="s" />
          </span>
        ) : (
          <b className="lab-accent">no lift-off</b>
        )}
        <span className="lab-k" title={zone.advice}>
          {zone.zone === 'green' ? '●' : zone.zone === 'amber' ? '▲' : '■'} {zone.label.toLowerCase()}
        </span>
        <button type="button" className="lab-btn" onClick={copyLink} title="Copy a link that opens this exact setup">
          {copied ? '✓ link copied' : '⧉ copy link to this setup'}
        </button>
      </div>
    </div>
  )
}

/** Keeps the URL hash equal to the live design and map metric, and applies a pasted or shared hash. */
function useLabUrlSync() {
  const design = useDesignStore((s) => s.design)
  const update = useDesignStore((s) => s.update)
  const metric = useLabStore((s) => s.metric)
  const setMetric = useLabStore((s) => s.setMetric)
  const value = useMemo(() => ({ design, metric }), [design, metric])
  const encode = useCallback((v: { design: RocketDesign; metric: LabMetric }) => encodeLabHash(v.design, { metric: v.metric }), [])
  const apply = useCallback(
    (hash: string) => {
      if (!hashHasDesign(hash)) return
      const parsed = parseLabHash(hash)
      const current = useDesignStore.getState().design
      const patch: Partial<RocketDesign> = {}
      for (const [k, v] of Object.entries(parsed.design) as [keyof RocketDesign, unknown][]) {
        if (JSON.stringify(current[k]) !== JSON.stringify(v)) (patch as Record<string, unknown>)[k] = v
      }
      if (Object.keys(patch).length > 0) update(patch)
      if (parsed.metric) setMetric(parsed.metric)
    },
    [update, setMetric],
  )
  useHashState(value, encode, apply)
}

/**
 * Drives the pad and the playback clock: the pump animation, the 3-2-1 countdown and the flight itself.
 * Any change to the flight puts a fresh rocket on the pad.
 */
function usePadAndPlayback(flight: LaunchResult) {
  const playing = useLabStore((s) => s.playing)
  const pumping = useLabStore((s) => s.pumping)
  const countdown = useLabStore((s) => s.countdown)

  useEffect(() => {
    useLabStore.getState().reset()
  }, [flight])

  useEffect(() => () => useLabStore.getState().reset(), [])

  // Pump: progress follows the clock (an interval, not rAF) so it also finishes in a background tab.
  useEffect(() => {
    if (!pumping) return
    const start = performance.now()
    const duration = 1400
    const id = window.setInterval(() => {
      const f = Math.min(1, (performance.now() - start) / duration)
      const st = useLabStore.getState()
      st.setPump(f)
      if (f >= 1) {
        window.clearInterval(id)
        st.setPumping(false)
      }
    }, 16)
    return () => window.clearInterval(id)
  }, [pumping])

  useEffect(() => {
    if (countdown === null) return
    const id = window.setTimeout(() => {
      const st = useLabStore.getState()
      if (countdown > 1) st.setCountdown(countdown - 1)
      else st.play()
    }, 700)
    return () => window.clearTimeout(id)
  }, [countdown])

  // Playback: flight time is anchored to the clock at (re)start, so a throttled frame rate never slows it.
  const speed = useLabStore((s) => s.speed)
  useEffect(() => {
    if (!playing) return
    const end = flight.samples[flight.samples.length - 1]?.t ?? 0
    const t0 = useLabStore.getState().time
    const start = performance.now()
    let raf = 0
    const step = () => {
      const st = useLabStore.getState()
      const t = t0 + ((performance.now() - start) / 1000) * speed
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
  }, [playing, flight, speed])
}
