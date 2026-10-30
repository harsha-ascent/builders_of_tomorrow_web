import { useMemo } from 'react'
import type { FlightPhase, LaunchResult } from '../../../../shared/types'
import { Dot, LabPanel, Readout, TimeSeriesGraph, type GraphBand, type GraphMarker } from '../../../components/lab'
import { useLabStore } from '../../../store/labStore'
import { isHot, subscribeLabTime } from './labHooks'

const PHASE_FILL: Partial<Record<FlightPhase, string>> = {
  thrust: 'rgb(79 140 255 / 0.18)',
  air: 'rgb(215 221 232 / 0.10)',
  parachute: 'rgb(53 200 192 / 0.12)',
}

/** Height and speed against time from the precomputed flight, with a cursor that scrubs the 3-D rocket. */
export function GraphsPanel({ flight }: { flight: LaunchResult }) {
  const scrub = useLabStore((s) => s.scrub)
  const setActive = useLabStore((s) => s.setActive)
  const active = useLabStore((s) => s.active)
  const time = useLabStore((s) => s.time)

  const { series, bands, markers } = useMemo(() => {
    const samples = flight.samples
    const y0 = samples[0]?.y ?? 0
    const height = samples.map((s) => ({ t: s.t, v: Math.max(s.y - y0, 0) }))
    const speed = samples.map((s) => ({ t: s.t, v: Math.hypot(s.vx, s.vy) }))
    const bands: GraphBand[] = []
    let start = 0
    let phase: FlightPhase = samples[0]?.phase ?? 'ready'
    const push = (p: FlightPhase, from: number, to: number) => {
      const color = PHASE_FILL[p]
      if (color) bands.push({ from, to, color })
    }
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].phase !== phase) {
        push(phase, start, samples[i].t)
        start = samples[i].t
        phase = samples[i].phase
      }
    }
    push(phase, start, samples[samples.length - 1]?.t ?? 0)
    const markers: GraphMarker[] = flight.events
      .filter((e) => e.type !== 'liftoff' && e.type !== 'landed')
      .map((e) => ({
        t: e.t,
        label:
          e.type === 'apogee'
            ? `top: ${flight.maxHeightM.toFixed(1)} m`
            : e.type === 'burnout'
              ? 'push ends'
              : e.type === 'parachute'
                ? 'parachute opens'
                : e.type === 'stage-separation'
                  ? `stage ${(e.stage ?? 0) + 1} drops off`
                  : e.type,
        position: e.type === 'apogee' ? 'top' : 'bottom',
      }))
    return {
      series: [
        { label: 'height', unit: 'm', points: height, max: Math.max(flight.maxHeightM, 1) * 1.08 },
        { label: 'speed', unit: 'm/s', points: speed, max: Math.max(flight.maxSpeedMs, 1) * 1.08 },
      ],
      bands,
      markers,
    }
  }, [flight])

  return (
    <LabPanel
      title="Height & speed over time"
      readout={
        flight.liftedOff ? (
          <>
            <Readout label="top" value={flight.maxHeightM.toFixed(1)} unit="m" hot />
            <span className="lab-k"> at {flight.apogeeTimeS.toFixed(1)} s</span>
            <Dot />
            <Readout label="fastest" value={flight.maxSpeedMs.toFixed(0)} unit="m/s" />
            <Dot />
            <Readout label="push lasts" value={(flight.thrustTimeS * 1000).toFixed(0)} unit="ms" />
            <Dot />
            <Readout label="lands" value={`${flight.rangeM.toFixed(1)} m away at ${flight.flightTimeS.toFixed(1)}`} unit="s" />
          </>
        ) : (
          <span className="lab-k">no lift-off with these settings</span>
        )
      }
      tools={<span className={`lab-k ${isHot(active, 'time') ? 'lab-accent' : ''}`}>drag across the graph to move the rocket</span>}
    >
      <TimeSeriesGraph
        series={series}
        bands={bands}
        markers={markers}
        cursor={time}
        subscribeCursor={subscribeLabTime}
        onScrub={scrub}
        onScrubStart={() => setActive('time')}
        onScrubEnd={() => setActive(null)}
        ariaLabel="Flight time"
      />
    </LabPanel>
  )
}
