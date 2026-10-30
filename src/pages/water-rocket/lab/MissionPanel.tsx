import type { LaunchResult } from '../../../../shared/types'
import { Dot, LabPanel, Readout } from '../../../components/lab'
import { heightComparison, speedComparison } from '../../../lib/format'
import { useLabStore } from '../../../store/labStore'

export const TARGET_TOLERANCE_M = 3

/** Mission card: free flight or the target challenge, with the live prediction and the verdict after a launch. */
export function MissionPanel({ flight }: { flight: LaunchResult }) {
  const target = useLabStore((s) => s.target)
  const setTarget = useLabStore((s) => s.setTarget)
  const done = useLabStore((s) => s.done)
  const miss = target != null ? flight.rangeM - target : null
  const hit = miss != null && Math.abs(miss) <= TARGET_TOLERANCE_M

  function newTarget() {
    setTarget(5 * Math.round((15 + Math.random() * 45) / 5))
  }

  return (
    <LabPanel
      title="Mission"
      compact
      readout={
        target == null ? (
          <span className="lab-k">free flight: go as high or as far as you can</span>
        ) : (
          <>
            <Readout label="target" value={target} unit="m away" hot />
            <Dot />
            <Readout label="predicted landing" value={flight.liftedOff ? flight.rangeM.toFixed(1) : '—'} unit="m" />
            {miss != null && flight.liftedOff && (
              <span className="lab-k">
                {' '}
                ({hit ? 'inside the ring' : `${Math.abs(miss).toFixed(1)} m ${miss < 0 ? 'short' : 'too far'}`})
              </span>
            )}
          </>
        )
      }
      tools={
        target == null ? (
          <button type="button" className="lab-btn" onClick={newTarget}>
            🎯 Target challenge
          </button>
        ) : (
          <>
            <button type="button" className="lab-btn" onClick={newTarget}>
              🔀 New target
            </button>
            <button type="button" className="lab-btn" onClick={() => setTarget(null)}>
              ✖ Free flight
            </button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-2 p-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="top height" value={flight.liftedOff ? flight.maxHeightM.toFixed(1) : '—'} unit="m" note={flight.liftedOff ? heightComparison(flight.maxHeightM) : 'no lift-off'} />
          <Tile label="lands" value={flight.liftedOff ? flight.rangeM.toFixed(1) : '—'} unit="m away" />
          <Tile label="in the air" value={flight.liftedOff ? flight.flightTimeS.toFixed(1) : '—'} unit="s" />
          <Tile label="top speed" value={flight.liftedOff ? flight.maxSpeedMs.toFixed(0) : '—'} unit="m/s" note={flight.liftedOff ? speedComparison(flight.maxSpeedMs) : undefined} />
          <Tile label="landing" value={flight.liftedOff ? flight.landingSpeedMs.toFixed(0) : '—'} unit="m/s" note={flight.liftedOff ? (flight.safeLanding ? 'soft: flies again' : 'hard: add a parachute') : undefined} />
        </div>
        <p className="lab-prose">
          {target == null
            ? 'Set a target to practise aiming: change water, pressure and angle until the predicted landing sits inside the ring, then launch to check.'
            : `Land inside the ring ${target} m away (within ${TARGET_TOLERANCE_M} m). The prediction updates as you drag; the launch is the proof.`}
        </p>
        {done && target != null && flight.liftedOff && (
          <div className="rounded-md border px-3 py-2" style={{ borderColor: hit ? 'var(--lab-accent)' : 'var(--lab-line)', background: hit ? 'var(--lab-accent-soft)' : 'transparent' }}>
            <b className={hit ? 'lab-accent' : ''}>{hit ? '🎯 BULLSEYE! You hit the target.' : `📏 Missed by ${Math.abs(miss!).toFixed(1)} m.`}</b>{' '}
            <span className="lab-prose">
              {hit
                ? 'That is real engineering: you tuned the design to do a job. Try a new target.'
                : miss! < 0
                  ? 'Too short: more pressure, a lower angle, or a different amount of water.'
                  : 'Too far: less pressure, a steeper angle, or more water to make it heavier.'}
            </span>
          </div>
        )}
      </div>
    </LabPanel>
  )
}

function Tile({ label, value, unit, note }: { label: string; value: string; unit: string; note?: string }) {
  return (
    <div className="lab-eq" style={{ padding: '6px 8px' }}>
      <div className="lab-k">{label}</div>
      <div className="lab-readout">
        <b style={{ fontSize: 15 }}>{value}</b> {unit}
      </div>
      {note && <div className="lab-prose" style={{ fontSize: 11 }}>{note}</div>}
    </div>
  )
}
