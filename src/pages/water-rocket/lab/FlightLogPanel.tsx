import { useState } from 'react'
import type { LaunchRecord, LaunchResult, RocketDesign } from '../../../../shared/types'
import { LabPanel, Readout } from '../../../components/lab'
import { useLaunchLog } from '../../../lib/useLaunchLog'
import { newDesignId } from '../../../sim/presets'
import { useDesignStore } from '../../../store/designStore'
import { useLabStore } from '../../../store/labStore'

/** Save a launched flight and compare it with earlier ones. */
export function FlightLogPanel({ design, flight }: { design: RocketDesign; flight: LaunchResult }) {
  const { launches, addLaunch, deleteLaunch, clearAll } = useLaunchLog()
  const setLastResult = useDesignStore((s) => s.setLastResult)
  const done = useLabStore((s) => s.done)
  // Remembered per flight, so a new prediction re-enables the button without an effect.
  const [saveState, setSaveState] = useState<{ flight: LaunchResult; state: 'saving' | 'saved' } | null>(null)
  const saved = saveState?.flight === flight ? saveState.state : 'idle'

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

  const best = launches.reduce<LaunchRecord | null>((b, l) => (b == null || l.result.maxHeightM > b.result.maxHeightM ? l : b), null)

  return (
    <LabPanel
      title="Flight log"
      compact
      readout={
        <>
          <Readout label="saved flights" value={launches.length} />
          {best && (
            <>
              <span className="lab-k"> · </span>
              <Readout label="best height" value={best.result.maxHeightM.toFixed(1)} unit="m" />
            </>
          )}
        </>
      }
      tools={
        <>
          <button type="button" className="lab-btn lab-btn-primary" onClick={saveToLog} disabled={!done || saved !== 'idle'} title={done ? 'Save this flight to the log' : 'Launch first, then save'}>
            {saved === 'saved' ? '✓ saved' : saved === 'saving' ? 'saving…' : '📒 Save this flight'}
          </button>
          {launches.length > 0 && (
            <button
              type="button"
              className="lab-btn"
              onClick={() => {
                if (window.confirm('Clear the whole flight log?')) void clearAll()
              }}
            >
              clear
            </button>
          )}
        </>
      }
    >
      <div className="p-2">
        {launches.length === 0 ? (
          <p className="lab-prose">Launch, then save the flight. Engineers keep records so they can tell which change helped.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>rocket</th>
                  <th>water (%)</th>
                  <th>pressure (psi)</th>
                  <th>angle (°)</th>
                  <th>height (m)</th>
                  <th>distance (m)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {launches.slice(0, 10).map((l) => (
                  <tr key={l.id} className={best && l.id === best.id ? 'is-on' : ''}>
                    <td className="max-w-[9rem] truncate" title={l.designName}>
                      {l.designName}
                    </td>
                    <td>{Math.round(l.settings.waterFraction * 100)}</td>
                    <td>{l.settings.pressurePsi}</td>
                    <td>{l.settings.launchAngleDeg}</td>
                    <td>{l.result.maxHeightM.toFixed(1)}</td>
                    <td>{l.result.rangeM.toFixed(1)}</td>
                    <td className="text-right">
                      <button type="button" aria-label="Delete this flight" className="lab-btn" style={{ padding: '0 6px' }} onClick={() => void deleteLaunch(l.id)}>
                        ✖
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LabPanel>
  )
}
