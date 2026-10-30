import { useMemo } from 'react'
import { Dot, LabPanel, Readout } from '../../../components/lab'
import { G, MATERIALS, forcesAt, layersOf } from '../../../sim/bridge'
import { useBridgeLabStore } from '../../../store/bridgeLabStore'
import { FAIL_LABEL } from '../testCopy'
import { fmtKg, useLabLoad, useSelectedMember, type BridgeLab } from './labHooks'

const TENSION = '#ff5a5a'
const COMPRESSION = '#4f8cff'

/**
 * A free-body sketch of one piece (the one selected anywhere, or the first to break) with the force on
 * it now, then the hardest-working pieces at the current load. Hover and click link to the 3-D rig.
 */
export function MemberPanel({ lab }: { lab: BridgeLab }) {
  const { design, resp } = lab
  const loadKg = useLabLoad(15)
  const hoverId = useBridgeLabStore((s) => s.hoverId)
  const setHover = useBridgeLabStore((s) => s.setHover)
  const setSelected = useBridgeLabStore((s) => s.setSelected)
  const selectedId = useSelectedMember(resp)
  const shownId = hoverId && resp?.ids.includes(hoverId) ? hoverId : selectedId

  const now = useMemo(() => (resp ? forcesAt(resp, loadKg * G) : null), [resp, loadKg])
  const atBreak = useMemo(() => (resp && Number.isFinite(resp.capacityN) ? forcesAt(resp, resp.capacityN) : null), [resp])
  const ranked = useMemo(() => {
    if (!resp || !now) return []
    return resp.ids
      .map((id, i) => ({ id, i, util: now.utilization[i], force: now.forceN[i] }))
      .sort((a, b) => b.util - a.util)
      .slice(0, 6)
  }, [resp, now])

  const i = resp && shownId ? resp.ids.indexOf(shownId) : -1
  const member = shownId ? design.members.find((m) => m.id === shownId) : undefined
  const mat = member ? MATERIALS[member.material] : null
  const force = i >= 0 && now ? now.forceN[i] : 0
  const pulled = force >= 0
  const limit = i >= 0 && resp ? (pulled ? resp.tensionLimitN[i] : resp.compressionLimitN[i]) : 1
  const util = i >= 0 && now ? now.utilization[i] : 0
  const utilBreak = i >= 0 && atBreak ? atBreak.utilization[i] : 0
  const isFirst = resp?.firstToBreak === shownId
  const limitText = i >= 0 && resp ? (pulled ? `the glue joint lets go at ${limit.toFixed(0)} N` : `${resp.eulerLimited[i] ? 'buckles' : 'is crushed'} at ${limit.toFixed(0)} N`) : ''
  const color = pulled ? TENSION : COMPRESSION

  return (
    <LabPanel
      title="Piece"
      readout={
        member && mat && resp ? (
          <>
            <span>
              <b>
                {mat.emoji} {mat.name}
                {layersOf(member) > 1 ? ` ×${layersOf(member)}` : ''}
              </b>
            </span>
            <Dot />
            <span>
              <b>{resp.lengthsCm[i]}</b> cm
            </span>
            <Dot />
            <Readout label={pulled ? 'pulled' : 'pushed'} value={Math.abs(force).toFixed(1)} unit="N" hot />
            <Dot />
            <span className={util >= 1 ? 'lab-accent' : ''}>
              <b>{Math.round(util * 100)}</b> % of its limit
            </span>
            {isFirst && <span className="lab-accent"> ★</span>}
            {hoverId && shownId === hoverId && <span className="lab-k"> · hovering</span>}
          </>
        ) : (
          <span className="lab-k">fix the bridge first</span>
        )
      }
      tools={<span className="lab-k">★ first to break · click a piece here or in 3-D to pin it</span>}
    >
      <div className="flex h-full flex-col">
        <div className="px-3 pt-2">
          <svg viewBox="0 0 360 118" className="block w-full" style={{ maxHeight: 150 }} role="img" aria-label={member && mat ? `${pulled ? 'Tension' : 'Compression'} of ${Math.abs(force).toFixed(1)} newtons on a ${mat.name}` : 'No piece'}>
            <defs>
              <marker id="bl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {member && mat ? (
              <>
                {/* the piece, seen edge-on: one rectangle per layer */}
                {Array.from({ length: layersOf(member) }, (_, k) => (
                  <rect key={k} x={96} y={52 + k * 6 - (layersOf(member) - 1) * 3} width={168} height={6} rx={2} fill={mat.color} stroke="#0b0f17" strokeWidth={0.8} />
                ))}
                <circle cx={96} cy={55} r={6} fill="var(--lab-panel-2)" stroke="var(--lab-muted)" strokeWidth={1.5} />
                <circle cx={264} cy={55} r={6} fill="var(--lab-panel-2)" stroke="var(--lab-muted)" strokeWidth={1.5} />
                {Math.abs(force) > 0.05 && (
                  <g stroke={color} strokeWidth={3} markerEnd="url(#bl-arrow)" strokeLinecap="round">
                    {pulled ? (
                      <>
                        <line x1={84} y1={55} x2={30} y2={55} />
                        <line x1={276} y1={55} x2={330} y2={55} />
                      </>
                    ) : (
                      <>
                        <line x1={24} y1={55} x2={82} y2={55} />
                        <line x1={336} y1={55} x2={278} y2={55} />
                      </>
                    )}
                  </g>
                )}
                <text x={180} y={30} textAnchor="middle" fill={color} fontSize={15} fontWeight={700} fontFamily="var(--lab-mono)">
                  {Math.abs(force) > 0.05 ? `${pulled ? 'pulled apart' : 'squeezed'} · ${Math.abs(force).toFixed(1)} N` : 'no force'}
                </text>
                <text x={180} y={92} textAnchor="middle" fill="var(--lab-muted)" fontSize={11} fontFamily="var(--lab-mono)">
                  {limitText}
                </text>
                <text x={180} y={110} textAnchor="middle" fill="var(--lab-dim)" fontSize={11} fontFamily="var(--lab-mono)">
                  {resp && isFirst && resp.failureMode ? `at ${fmtKg(resp.capacityN / G)} kg ${FAIL_LABEL[resp.failureMode]}` : `${Math.round(utilBreak * 100)} % of its limit at the breaking load`}
                </text>
              </>
            ) : (
              <text x={180} y={60} textAnchor="middle" fill="var(--lab-muted)" fontSize={12} fontFamily="var(--lab-mono)">
                no piece to show
              </text>
            )}
          </svg>
          {member && (
            <div className="mb-2 mt-1">
              <div className="flex justify-between text-[11px]">
                <span className="lab-k">how hard it is working</span>
                <span className={util >= 1 ? 'lab-accent' : ''}>
                  <b>{Math.round(util * 100)} %</b> now · {Math.round(utilBreak * 100)} % at the breaking load
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'var(--lab-line)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, util * 100)}%`, background: util >= 1 ? '#ff5a5a' : color }} />
              </div>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto border-t px-1" style={{ borderColor: 'var(--lab-line)' }}>
          <table className="lab-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th>hardest-working at {fmtKg(loadKg)} kg</th>
                <th style={{ width: '7.5rem' }}>force</th>
                <th style={{ width: '7rem' }}>of its limit</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const m = design.members.find((x) => x.id === r.id)
                if (!m) return null
                const p = r.force >= 0
                const hov = hoverId === r.id
                return (
                  <tr
                    key={r.id}
                    className={`cursor-pointer ${selectedId === r.id ? 'is-on' : ''}`}
                    style={hov ? { background: 'rgb(245 166 35 / 0.1)' } : undefined}
                    onPointerEnter={() => setHover(r.id)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => setSelected(r.id)}
                    aria-selected={selectedId === r.id}
                  >
                    <td className="truncate" title={`${MATERIALS[m.material].name}, ${resp?.lengthsCm[r.i]} cm${resp?.firstToBreak === r.id ? ', first to break' : ''}`}>
                      {resp?.firstToBreak === r.id ? '★ ' : ''}
                      {MATERIALS[m.material].emoji} {MATERIALS[m.material].name}
                      {layersOf(m) > 1 ? ` ×${layersOf(m)}` : ''} · {resp?.lengthsCm[r.i]} cm
                    </td>
                    <td style={{ color: p ? TENSION : COMPRESSION }}>
                      {p ? 'pull' : 'push'} {Math.abs(r.force).toFixed(1)} N
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--lab-line)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.util * 100)}%`, background: r.util >= 1 ? '#ff5a5a' : p ? TENSION : COMPRESSION }} />
                        </div>
                        <span className={`w-9 text-right ${r.util >= 1 ? 'lab-accent' : ''}`}>{Math.round(r.util * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </LabPanel>
  )
}
