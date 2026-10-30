import { LabPanel, Readout } from '../../../components/lab'
import type { TestLog } from './labHooks'

/** Saved load tests, newest first, for comparing versions of a bridge. */
export function TestLogPanel({ log }: { log: TestLog }) {
  const best = log.records.reduce((b, r) => Math.max(b, Number(r.result.capacityKg) || 0), 0)
  return (
    <LabPanel
      title="Test log"
      span
      compact
      readout={
        log.records.length ? (
          <>
            <Readout label="tests saved" value={log.records.length} />
            <span className="lab-k"> · </span>
            <Readout label="best" value={best.toFixed(1)} unit="kg" hot />
          </>
        ) : (
          <span className="lab-k">break a bridge, then save the result to compare versions</span>
        )
      }
      tools={
        log.records.length > 0 ? (
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              if (window.confirm('Clear the whole test log?')) void log.clearAll()
            }}
          >
            clear
          </button>
        ) : undefined
      }
    >
      {log.records.length > 0 && (
        <div className="max-h-56 overflow-auto">
          <table className="lab-table">
            <thead>
              <tr>
                <th>bridge</th>
                <th>test</th>
                <th>mass g</th>
                <th>held kg</th>
                <th>how it broke</th>
                <th>sag mm</th>
                <th>× own weight</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {log.records.slice(0, 12).map((r) => (
                <tr key={r.id}>
                  <td className="max-w-[10rem] truncate" title={r.designName}>
                    {r.designName}
                  </td>
                  <td>{r.settings.loadMode === 'truck' ? '🚚 truck' : '🪣 bucket'}</td>
                  <td>{Number(r.settings.massG).toFixed(1)}</td>
                  <td>
                    <b>{Number(r.result.capacityKg).toFixed(1)}</b>
                  </td>
                  <td>{r.result.failureMode ?? '—'}</td>
                  <td>{Number(r.result.maxDeflectionMm).toFixed(1)}</td>
                  <td>{r.result.efficiency}×</td>
                  <td className="text-right">
                    <button type="button" aria-label="Delete" className="lab-k hover:lab-accent" onClick={() => void log.deleteRecord(r.id)}>
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LabPanel>
  )
}
