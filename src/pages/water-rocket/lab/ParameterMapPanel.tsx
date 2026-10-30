import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { LabPanel, LabSeg, ParameterMap, Readout, Dot, type MapAxis, type MapPreset } from '../../../components/lab'
import { useParameterMap } from '../../../lib/useParameterMap'
import { CELL, MAP_PRESSURES, MAP_WATERS, ROCKET_MAP } from '../../../sim/paramMap'
import { LIMITS, SAFETY } from '../../../sim/rocket'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore, type LabMetric } from '../../../store/labStore'
import { isHot } from './labHooks'

const X_AXIS: MapAxis = {
  label: 'water in the bottle',
  unit: '%',
  min: LIMITS.waterFraction.min,
  max: LIMITS.waterFraction.max,
  values: MAP_WATERS,
  step: 0.01,
  format: (v) => `${Math.round(v * 100)}`,
  ticks: [0, 0.2, 0.4, 0.6, 0.8],
}
const Y_AXIS: MapAxis = {
  label: 'pump pressure',
  unit: 'psi',
  min: LIMITS.pressurePsi.min,
  max: LIMITS.pressurePsi.max,
  values: MAP_PRESSURES,
  step: 1,
  ticks: [10, 20, 30, 40, 50, 60, 70, 80],
}
const GUIDES = [
  { axis: 'y' as const, at: SAFETY.schoolMaxPsi, label: `${SAFETY.schoolMaxPsi} psi · school limit` },
  { axis: 'y' as const, at: SAFETY.supervisedMaxPsi, label: `${SAFETY.supervisedMaxPsi} psi · adult + launch cord` },
]
const SLOT: Record<string, MapPreset['slot']> = { height: 'above-left', range: 'above-right', gentle: 'below' }

/**
 * Water × pressure map shaded by the simulator's predicted height or distance, with the presets it finds
 * outlined faintly and a draggable marker for the current setting.
 */
export function ParameterMapPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const update = useDesignStore((s) => s.update)
  const metric = useLabStore((s) => s.metric)
  const setMetric = useLabStore((s) => s.setMetric)
  const active = useLabStore((s) => s.active)
  const setActive = useLabStore((s) => s.setActive)
  const map = useParameterMap(design, ROCKET_MAP)
  const field = metric === 'height' ? CELL.height : CELL.range

  const value = metric === 'height' ? flight.maxHeightM : flight.rangeM
  const matches = (p: { waterFraction: number; pressurePsi: number }) => Math.abs(p.waterFraction - design.waterFraction) < 0.006 && Math.abs(p.pressurePsi - design.pressurePsi) < 0.6

  return (
    <LabPanel
      title="Settings map"
      readout={
        <>
          <Readout label="water" value={Math.round(design.waterFraction * 100)} unit="%" hot={isHot(active, 'water')} />
          <Dot />
          <Readout label="pressure" value={design.pressurePsi} unit="psi" hot={isHot(active, 'pressure')} />
          <span className="lab-k"> → </span>
          <Readout label={metric === 'height' ? 'predicted height' : 'predicted distance'} value={flight.liftedOff ? value.toFixed(1) : 'no lift-off'} unit={flight.liftedOff ? 'm' : undefined} />
        </>
      }
      tools={
        <>
          <LabSeg<LabMetric>
            label="Shade the map by"
            value={metric}
            options={[
              { value: 'height', label: 'Height' },
              { value: 'range', label: 'Distance' },
            ]}
            onChange={setMetric}
          />
          {map.presets?.map((p) => (
            <button
              key={p.id}
              type="button"
              className="lab-btn"
              aria-pressed={matches(p)}
              title={`${p.rule} → ${p.heightM.toFixed(1)} m high, ${p.rangeM.toFixed(1)} m far, lands at ${p.landingMs.toFixed(0)} m/s`}
              onClick={() => update({ waterFraction: p.waterFraction, pressurePsi: p.pressurePsi })}
            >
              {p.label}{' '}
              <span className="lab-k">
                {Math.round(p.waterFraction * 100)} % · {p.pressurePsi} psi
              </span>
            </button>
          ))}
          {!map.done && (
            <span className="lab-k" aria-live="polite">
              computing {Math.round(map.progress * 100)} %
            </span>
          )}
        </>
      }
    >
      <ParameterMap
        xAxis={X_AXIS}
        yAxis={Y_AXIS}
        cell={(i, j) => {
          const row = map.rows[j]
          if (!row) return null
          return row[i * CELL.SIZE + CELL.lifted] > 0 ? row[i * CELL.SIZE + field] : NaN
        }}
        fieldLabel={metric === 'height' ? 'height' : 'distance'}
        fieldUnit="m"
        x={design.waterFraction}
        y={design.pressurePsi}
        markerLabel={`${Math.round(design.waterFraction * 100)} % · ${design.pressurePsi} psi`}
        onChange={(x, y) => update({ waterFraction: x, pressurePsi: y })}
        onDragStart={() => setActive('map')}
        onDragEnd={() => setActive(null)}
        hot={active === 'map'}
        presets={map.presets?.map((p) => ({ id: p.id, label: p.label, x: p.waterFraction, y: p.pressurePsi, slot: SLOT[p.id] }))}
        guides={GUIDES}
        ariaLabel="Water fraction and pump pressure"
      />
    </LabPanel>
  )
}
