import { useMemo } from 'react'
import { Dot, LabPanel, LabSlider, Readout, TimeSeriesGraph, snap, type GraphBand, type GraphMarker, type GraphSeries } from '../../../components/lab'
import { G, forcesAt, sagAt } from '../../../sim/bridge'
import { useBridgeLabStore } from '../../../store/bridgeLabStore'
import { FAIL_LABEL } from '../testCopy'
import { fmtKg, isHot, subscribeLabLoad, useLabLoad, useSelectedMember, type BridgeLab } from './labHooks'

const TENSION = '#ff5a5a'
const COMPRESSION = '#4f8cff'

/**
 * Mid-span sag and the force in the selected piece against the test load, from the linear analysis.
 * The cursor is the applied load: drag it and every other panel follows; Start moves it up the ramp.
 */
export function LoadGraphPanel({ lab }: { lab: BridgeLab }) {
  const { resp, rangeKg } = lab
  const loadKg = useLabLoad(15)
  const active = useBridgeLabStore((s) => s.active)
  const setLoadKg = useBridgeLabStore((s) => s.setLoadKg)
  const setActive = useBridgeLabStore((s) => s.setActive)
  const selectedId = useSelectedMember(resp)
  const capKg = resp && Number.isFinite(resp.capacityN) ? resp.capacityN / G : Infinity

  const { series, markers, bands } = useMemo(() => {
    const series: GraphSeries[] = []
    const markers: GraphMarker[] = []
    const bands: GraphBand[] = []
    if (!resp) return { series, markers, bands }
    const end = Math.min(capKg, rangeKg)
    const N = 32
    const kgs = Array.from({ length: N + 1 }, (_, k) => (end * k) / N)
    series.push({
      label: 'sag at mid-span',
      unit: 'mm',
      points: kgs.map((kg) => ({ t: kg, v: Math.max(0, sagAt(resp, kg * G)) })),
      max: Math.max(sagAt(resp, end * G), 0.01) * 1.1,
      digits: 2,
    })
    const i = selectedId ? resp.ids.indexOf(selectedId) : -1
    if (i >= 0) {
      const fEnd = resp.selfN[i] + end * G * resp.unitN[i]
      const pulled = fEnd >= 0
      const limit = pulled ? resp.tensionLimitN[i] : resp.compressionLimitN[i]
      series.push({
        label: `${pulled ? 'pull' : 'push'} on the selected piece`,
        unit: 'N',
        points: kgs.map((kg) => ({ t: kg, v: Math.abs(resp.selfN[i] + kg * G * resp.unitN[i]) })),
        max: limit,
        digits: 1,
        color: pulled ? TENSION : COMPRESSION,
      })
    }
    if (Number.isFinite(capKg) && capKg <= rangeKg) {
      markers.push({ t: capKg, label: `first piece fails: ${fmtKg(capKg)} kg`, position: 'bottom' })
      bands.push({ from: capKg, to: rangeKg, color: 'rgb(255 90 90 / 0.12)' })
    }
    return { series, markers, bands }
  }, [resp, rangeKg, selectedId, capKg])

  const sagNow = resp ? Math.max(0, sagAt(resp, loadKg * G)) : 0
  const worst = resp ? forcesAt(resp, loadKg * G).worst : 0
  const step = rangeKg >= 20 ? 0.1 : rangeKg >= 2 ? 0.01 : 0.001

  return (
    <LabPanel
      title="Load & sag"
      readout={
        resp ? (
          <>
            <Readout label="load" value={fmtKg(loadKg)} unit="kg" hot={isHot(active, 'load')} />
            <Dot />
            <Readout label="sag" value={sagNow.toFixed(2)} unit="mm" />
            <Dot />
            <Readout label="hardest piece at" value={Math.round(worst * 100)} unit="% of its limit" hot={worst >= 1} />
            <Dot />
            <Readout label="breaks at" value={fmtKg(capKg)} unit="kg" />
            {resp.failureMode && <span className="lab-k"> ({FAIL_LABEL[resp.failureMode]})</span>}
          </>
        ) : (
          <span className="lab-k">fix the bridge first</span>
        )
      }
      tools={<span className={`lab-k ${isHot(active, 'load') ? 'lab-accent' : ''}`}>drag across the graph to change the load · the piece's row tops out at its limit</span>}
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <TimeSeriesGraph
            series={series}
            markers={markers}
            bands={bands}
            tMax={rangeKg}
            timeUnit="kg"
            xLabel="load"
            xDigits={rangeKg >= 20 ? 1 : 2}
            cursor={loadKg}
            subscribeCursor={subscribeLabLoad}
            onScrub={(kg) => setLoadKg(snap(kg, step))}
            onScrubStart={() => setActive('graph')}
            onScrubEnd={() => setActive(null)}
            ariaLabel="Test load"
          />
        </div>
        <div className="border-t px-3 py-2" style={{ borderColor: 'var(--lab-line)' }}>
          <LabSlider
            label="test load"
            value={loadKg}
            min={0}
            max={rangeKg}
            step={step}
            unit="kg"
            display={fmtKg(loadKg)}
            hot={isHot(active, 'load')}
            onChange={(v) => {
              setActive('load')
              setLoadKg(v)
              window.setTimeout(() => setActive(null), 300)
            }}
            hint={Number.isFinite(capKg) ? `${fmtKg(capKg)} kg breaks it with the load here` : 'the load sits right over a support'}
          />
        </div>
      </div>
    </LabPanel>
  )
}
