import { useMemo } from 'react'
import { Dot, LabPanel, LabSlider, ParameterMap, Readout, type MapAxis, type MapContour, type MapPreset } from '../../../components/lab'
import { useParameterMap } from '../../../lib/useParameterMap'
import { G, SPAN_CM } from '../../../sim/bridge'
import { BRIDGE_CELL, BRIDGE_MAP, BRIDGE_MAP_POSITIONS, bridgeMapLoads, loadTicks } from '../../../sim/bridgeMap'
import { useBridgeLabStore } from '../../../store/bridgeLabStore'
import { fmtKg, isHot, useLabLoad, type BridgeLab } from './labHooks'

const X_AXIS: MapAxis = {
  label: 'where the load sits',
  unit: 'cm from the left cliff',
  min: 0,
  max: SPAN_CM,
  values: BRIDGE_MAP_POSITIONS,
  step: 0.5,
  ticks: [0, 10, 20, 30, 40],
}

/**
 * Load position × test load, shaded by how hard the hardest-working piece is working; the breaking-load
 * curve outlines the safe region. The marker is the current test: drag it and every panel follows.
 */
export function LoadMapPanel({ lab }: { lab: BridgeLab }) {
  const { design, resp, rangeKg, columns } = lab
  const loadKg = useLabLoad(15)
  const loadX = useBridgeLabStore((s) => s.loadX)
  const active = useBridgeLabStore((s) => s.active)
  const setLoadKg = useBridgeLabStore((s) => s.setLoadKg)
  const setLoadX = useBridgeLabStore((s) => s.setLoadX)
  const setActive = useBridgeLabStore((s) => s.setActive)
  const map = useParameterMap(design, BRIDGE_MAP)

  const yAxis = useMemo<MapAxis>(
    () => ({
      label: 'test load',
      unit: 'kg',
      min: 0,
      max: rangeKg,
      values: bridgeMapLoads(rangeKg),
      step: rangeKg >= 20 ? 0.1 : rangeKg >= 2 ? 0.01 : 0.001,
      ticks: loadTicks(rangeKg),
      format: (v) => `${Number(v.toFixed(2))}`,
    }),
    [rangeKg],
  )

  // Breaking load along the road (the safe region's edge) and the spots worth a button.
  const { contours, presets, weakest } = useMemo(() => {
    if (!columns) return { contours: [] as MapContour[], presets: [] as MapPreset[], weakest: null as { x: number; kg: number } | null }
    const caps = columns.map((c) => (Number.isFinite(c.capacityN) ? c.capacityN / G : Infinity))
    const points = BRIDGE_MAP_POSITIONS.map((x, i) => ({ x, y: Number.isFinite(caps[i]) ? caps[i] : rangeKg * 3 }))
    let wi = -1
    for (let i = 1; i < caps.length - 1; i++) if (wi < 0 || caps[i] < caps[wi]) wi = i
    const weakest = wi >= 0 && Number.isFinite(caps[wi]) ? { x: BRIDGE_MAP_POSITIONS[wi], kg: caps[wi] } : null
    const mid = BRIDGE_MAP_POSITIONS.indexOf(SPAN_CM / 2)
    const contours: MapContour[] = [{ points, color: 'rgb(255 120 120)', dashed: true }]
    const presets: MapPreset[] = []
    if (mid >= 0 && Number.isFinite(caps[mid])) presets.push({ id: 'middle', label: `middle · ${fmtKg(caps[mid])} kg`, x: SPAN_CM / 2, y: caps[mid], slot: 'above-right' })
    if (weakest && weakest.x !== SPAN_CM / 2) presets.push({ id: 'weakest', label: `weakest · ${fmtKg(weakest.kg)} kg`, x: weakest.x, y: weakest.kg, slot: 'below' })
    return { contours, presets, weakest }
  }, [columns, rangeKg])

  const capHere = resp && Number.isFinite(resp.capacityN) ? resp.capacityN / G : Infinity
  const midCap = presets.find((p) => p.id === 'middle')?.y
  const near = (a: number, b: number) => Math.abs(a - b) < 0.05

  return (
    <LabPanel
      title="Load map"
      readout={
        <>
          <Readout label="load" value={fmtKg(loadKg)} unit="kg" hot={isHot(active, 'load')} />
          <Dot />
          <Readout label="at" value={loadX} unit="cm" hot={isHot(active, 'position')} />
          <span className="lab-k"> → </span>
          <Readout label="breaks at" value={fmtKg(capHere)} unit="kg" />
        </>
      }
      tools={
        <>
          {midCap !== undefined && (
            <button type="button" className="lab-btn" aria-pressed={near(loadX, SPAN_CM / 2)} onClick={() => setLoadX(SPAN_CM / 2)} title="Put the load in the middle of the road">
              Middle <span className="lab-k">20 cm</span>
            </button>
          )}
          {weakest && (
            <button type="button" className="lab-btn" aria-pressed={near(loadX, weakest.x)} onClick={() => setLoadX(weakest.x)} title="Where the bridge breaks soonest">
              Weakest spot <span className="lab-k">{weakest.x} cm</span>
            </button>
          )}
          <button
            type="button"
            className="lab-btn"
            disabled={!Number.isFinite(capHere)}
            aria-pressed={Number.isFinite(capHere) && near(loadKg, capHere)}
            onClick={() => setLoadKg(Math.round(capHere * 100) / 100)}
            title="Apply exactly the breaking load for this spot"
          >
            Breaking load <span className="lab-k">{fmtKg(capHere)} kg</span>
          </button>
          {!map.done && (
            <span className="lab-k" aria-live="polite">
              computing {Math.round(map.progress * 100)} %
            </span>
          )}
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <ParameterMap
            xAxis={X_AXIS}
            yAxis={yAxis}
            cell={(i, j) => {
              const row = map.rows[j]
              if (!row) return null
              const u = row[i * BRIDGE_CELL.SIZE + BRIDGE_CELL.util]
              if (!Number.isFinite(u) || u >= 1) return NaN
              return u * 100
            }}
            fieldLabel="hardest piece, % of its limit"
            fieldUnit="%"
            fieldMax={100}
            fieldMaxLabel="100 % · breaks"
            x={loadX}
            y={loadKg}
            markerLabel={`${fmtKg(loadKg)} kg · ${loadX} cm`}
            onChange={(x, y) => {
              setLoadX(x)
              setLoadKg(y)
            }}
            onDragStart={() => setActive('map')}
            onDragEnd={() => setActive(null)}
            hot={active === 'map'}
            presets={presets}
            contours={contours}
            ariaLabel="Load position and test load"
          />
        </div>
        <div className="border-t px-3 py-2" style={{ borderColor: 'var(--lab-line)' }}>
          <LabSlider
            label="where the load sits"
            value={loadX}
            min={0}
            max={SPAN_CM}
            step={0.5}
            unit="cm from the left cliff"
            hot={isHot(active, 'position')}
            onChange={(v) => {
              setActive('position')
              setLoadX(v)
              window.setTimeout(() => setActive(null), 300)
            }}
            hint="hatched = the bridge has already broken · dashed red line = the breaking load along the road"
          />
        </div>
      </div>
    </LabPanel>
  )
}
