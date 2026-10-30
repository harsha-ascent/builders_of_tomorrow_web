import { useMemo } from 'react'
import { Link } from 'react-router'
import { AssumptionsPanel } from '../../../components/AssumptionsPanel'
import { LabEquation as Eq, LabPanel, fmtNum as f } from '../../../components/lab'
import { G, MATERIALS, SPAN_CM, forcesAt, layersOf, sagAt } from '../../../sim/bridge'
import { BRIDGE_ACCURACY_NOTE, BRIDGE_ASSUMPTIONS } from '../../../sim/bridgeAssumptions'
import { useBridgeLabStore } from '../../../store/bridgeLabStore'
import { fmtKg, useLabLoad, useSelectedMember, type BridgeLab } from './labHooks'

const R = String.raw

/** The relations the load test actually applies, with this bridge's numbers filled in. For ages 12 and up. */
export function BridgeEquationsStrip({ lab }: { lab: BridgeLab }) {
  const { model, resp } = lab
  const loadKg = useLabLoad(5)
  const loadX = useBridgeLabStore((s) => s.loadX)
  const selectedId = useSelectedMember(resp)
  const W = loadKg * G

  const m = useMemo(() => {
    if (!model.ok || !resp) return null
    const joints = model.index.size
    const unknowns = 2 * joints - 3
    // Lever rule: which road joints carry the load, and how much each.
    const deck = model.deck
    let share: { a: number; b: number; t: number } | null = null
    const exact = deck.find((n) => Math.abs(n.x - loadX) < 1e-6)
    if (exact) share = { a: exact.x, b: exact.x, t: 0 }
    else
      for (let k = 0; k < deck.length - 1; k++)
        if (loadX > deck[k].x && loadX < deck[k + 1].x) share = { a: deck[k].x, b: deck[k + 1].x, t: (loadX - deck[k].x) / (deck[k + 1].x - deck[k].x) }
    const now = forcesAt(resp, W)
    const i = selectedId ? resp.ids.indexOf(selectedId) : -1
    const member = i >= 0 ? model.members[i] : null
    const mat = member ? MATERIALS[member.material] : null
    const n = member ? layersOf(member) : 1
    const L = i >= 0 ? model.lengthsM[i] : 0
    const A = mat ? mat.areaM2 * n : 0
    const k = mat && L > 0 ? (mat.E * A) / L : 0
    const F = i >= 0 ? now.forceN[i] : 0
    const dL = k > 0 ? F / k : 0
    const sigma = A > 0 ? F / A : 0
    const I = mat ? mat.iM4 * n ** 3 : 0
    const euler = mat && L > 0 ? (Math.PI ** 2 * mat.E * I) / (L * L) : 0
    const crush = mat ? mat.crushLimitN * n : 0
    const T = mat ? mat.tensionLimitN * n : 0
    const fi = resp.firstToBreak ? resp.ids.indexOf(resp.firstToBreak) : -1
    const first =
      fi >= 0
        ? {
            id: resp.firstToBreak!,
            mat: MATERIALS[model.members[fi].material],
            n: layersOf(model.members[fi]),
            self: resp.selfN[fi],
            unit: resp.unitN[fi],
            limit: resp.unitN[fi] >= 0 ? resp.tensionLimitN[fi] : -resp.compressionLimitN[fi],
            pulled: resp.unitN[fi] >= 0,
          }
        : null
    return { joints, unknowns, share, now, i, member, mat, n, L, A, k, F, dL, sigma, I, euler, crush, T, first, capKg: resp.capacityN / G }
  }, [model, resp, loadX, W, selectedId])

  const pieceName = m?.mat ? `${m.mat.name.toLowerCase()}${m.n > 1 ? ` ×${m.n}` : ''}, ${f(m.L * 100, 1)} cm` : 'the selected piece'

  return (
    <LabPanel
      title="Equations"
      span
      compact
      readout={<span className="lab-k">the relations the load test uses, with your numbers filled in · ages 12 and up</span>}
      tools={
        <Link to="../math" className="lab-link">
          full derivations on The Math tab →
        </Link>
      }
    >
      {m && resp ? (
        <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-3">
          <Eq
            title="1 · Every joint must balance"
            tex={R`\sum F_x = 0,\;\; \sum F_y = 0 \;\;\text{at every joint}\;\;\Longrightarrow\;\; \mathbf{K}\,\mathbf{u} = \mathbf{F}`}
            sub={`${m.joints} joints → ${2 * m.joints} balance equations, ${m.unknowns} unknown movements (the supports hold 3) · W = ${fmtKg(loadKg)} kg × ${G} = ${f(W, 1)} N at ${loadX} cm${
              m.share ? (m.share.t === 0 ? `, straight onto the joint at ${m.share.a} cm` : `, shared ${f((1 - m.share.t) * 100, 0)} % / ${f(m.share.t * 100, 0)} % between the joints at ${m.share.a} and ${m.share.b} cm`) : ''
            }`}
            result={`solved every time you drag · mid-span sag = ${f(Math.max(0, sagAt(resp, W)), 2)} mm (${f(resp.sagPerN * G, 3)} mm per kg)`}
          />
          <Eq
            title="2 · Each piece is a spring"
            tex={R`F = \dfrac{E\,A}{L}\,\Delta L`}
            sub={`${pieceName}: E = ${f((m.mat?.E ?? 0) / 1e9, 1)} GPa · A = ${f(m.A * 1e6, 1)} mm² (${m.n} layer${m.n > 1 ? 's' : ''}) · L = ${f(m.L * 100, 1)} cm → k = EA/L = ${f(m.k / 1000, 1)} N/mm`}
            result={`F = ${f(Math.abs(m.F), 1)} N (${m.F >= 0 ? 'pulled' : 'pushed'}) → ΔL = F/k = ${f(Math.abs(m.dL) * 1000, 3)} mm`}
          />
          <Eq
            title="3 · Stress in the piece"
            tex={R`\sigma = \dfrac{F}{A}`}
            sub={`= ${f(Math.abs(m.F), 1)} N / ${f(m.A * 1e6, 1)} mm²`}
            result={`σ = ${f(Math.abs(m.sigma) / 1e6, 2)} MPa · strain ε = σ/E = ${f((Math.abs(m.sigma) / (m.mat?.E ?? 1)) * 100, 3)} %`}
            warn={m.F >= 0 ? `the joint, not the material, decides: the glue lets go at ${f(m.T, 0)} N` : undefined}
          />
          <Eq
            title="4 · Breaking a pulled piece"
            tex={R`F \;\ge\; T_{\text{joint}}\times n`}
            sub={`${m.mat?.name.toLowerCase() ?? 'piece'} joint ${f(m.mat?.tensionLimitN ?? 0, 0)} N × ${m.n} = ${f(m.T, 0)} N`}
            result={m.F >= 0 ? `now ${f(m.F, 1)} N = ${f((m.F / Math.max(m.T, 1e-9)) * 100, 0)} % of the way` : `this piece is pushed, so the pull limit does not apply`}
          />
          <Eq
            title="5 · Breaking a pushed piece (Euler)"
            tex={R`F \;\ge\; \min\!\left(\dfrac{\pi^2 E I}{L^2},\; C_{\text{crush}}\,n\right),\quad I = n^3 I_1`}
            sub={`I = ${m.n}³ × ${f((m.mat?.iM4 ?? 0) * 1e12, 2)} mm⁴ = ${f(m.I * 1e12, 2)} mm⁴ · L = ${f(m.L * 100, 1)} cm → π²EI/L² = ${f(m.euler, 1)} N · crush = ${f(m.crush, 0)} N`}
            result={`push limit ${f(Math.min(m.euler, m.crush), 1)} N (${m.euler < m.crush ? 'it would buckle' : 'it would crush'})${m.F < 0 ? ` · now ${f(-m.F, 1)} N = ${f((-m.F / Math.max(Math.min(m.euler, m.crush), 1e-9)) * 100, 0)} % of the way` : ''}`}
          />
          <Eq
            title="6 · The breaking load"
            tex={R`W_{\text{break}} = \min_i\; \dfrac{\text{limit}_i - F_{i,\text{self}}}{F_{i,\text{per newton}}}`}
            sub={
              m.first
                ? `first to break: ${m.first.mat.name.toLowerCase()}${m.first.n > 1 ? ` ×${m.first.n}` : ''} → (${f(m.first.limit, 1)} − ${f(m.first.self, 2)}) / ${f(m.first.unit, 3)} = ${f(resp.capacityN, 1)} N`
                : 'the load sits right over a support: no piece is loaded'
            }
            result={Number.isFinite(m.capKg) ? `W_break = ${f(resp.capacityN, 1)} N ÷ ${G} = ${fmtKg(m.capKg)} kg · sag then ${f(Math.max(0, sagAt(resp, resp.capacityN)), 2)} mm` : 'W_break → ∞ here'}
          />
        </div>
      ) : (
        <p className="lab-prose p-3">Build a bridge that stands up to see the numbers.</p>
      )}
      <div className="px-2 pb-2">
        <p className="lab-prose mb-2">
          The simulator assembles every joint's balance equations into one matrix and solves them once per bridge (the direct stiffness method). Because
          everything is linear until the first piece fails, the forces at any load are the self-weight forces plus the load times the per-newton response,
          which is what every panel reads as you drag. The two-dimensional drawing stands for two identical trusses across a {SPAN_CM} cm gap.
        </p>
        <AssumptionsPanel dark items={BRIDGE_ASSUMPTIONS} note={BRIDGE_ACCURACY_NOTE} moreTo="/workshops/bridge-builder/math" accuracy="joints decide" />
      </div>
    </LabPanel>
  )
}
