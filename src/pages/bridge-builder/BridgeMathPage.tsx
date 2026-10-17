import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { BarChart } from '../../components/charts/BarChart'
import { Formula } from '../../components/Formula'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatTile } from '../../components/ui/StatTile'
import { G, MATERIALS, MATERIAL_LIST, SPAN_CM, analyzeBridge, compressionLimitN, isSupport, layersOf, memberLengthCm, memberSection } from '../../sim/bridge'
import { BRIDGE_ACCURACY_NOTE, BRIDGE_ASSUMPTIONS } from '../../sim/bridgeAssumptions'
import { useBridgeStore } from '../../store/bridgeStore'

const R = String.raw

export default function BridgeMathPage() {
  const design = useBridgeStore((s) => s.design)
  const analysis = useMemo(() => analyzeBridge(design), [design])
  const [chartMaterial, setChartMaterial] = useState<keyof typeof MATERIALS>('stick')

  const m = useMemo(() => {
    const byUtil = [...analysis.members].sort((a, b) => b.utilization - a.utilization)
    const hardest = byUtil[0]
    const hardestMember = hardest ? design.members.find((x) => x.id === hardest.id) : undefined
    const pushed = analysis.members.filter((r) => r.forceN < 0)
    const longestPushed = pushed.sort((a, b) => b.lengthCm - a.lengthCm)[0]
    const longestMember = longestPushed ? design.members.find((x) => x.id === longestPushed.id) : undefined
    const joints = design.nodes.filter((n) => design.members.some((mm) => mm.a === n.id || mm.b === n.id)).length
    const members = design.members.length
    const reactions = 3
    const determinacy = members + reactions - 2 * joints
    let stress = 0
    let strain = 0
    let dL = 0
    if (hardest && hardestMember) {
      const sec = memberSection(hardestMember)
      const A = sec.mat.areaM2 * sec.layers
      stress = Math.abs(hardest.forceN) / A
      strain = stress / sec.mat.E
      dL = strain * (hardest.lengthCm / 100) * 1000
    }
    return { hardest, hardestMember, longestPushed, longestMember, joints, members, determinacy, stress, strain, dL }
  }, [analysis, design])

  const lengthChart = useMemo(() => [5, 7.5, 10, 12.5, 15, 20].map((L) => ({ label: `${L} cm`, value: compressionLimitN(MATERIALS[chartMaterial], L) })), [chartMaterial])

  return (
    <Page wide>
      <Callout emoji="🎓" title="Engineer level · ages 12 and up" tone="grape" className="mb-6">
        Younger builders can skip this and still build great bridges. Here are the equations behind the load test, with the numbers for{' '}
        <strong>“{design.name}”</strong> filled in. Change the bridge in <Link to="../build" className="font-bold underline">Build</Link> and come back.
      </Callout>

      <div className="card mb-8 bg-gradient-to-r from-grass/15 to-skyblue/15">
        <h2 className="font-display text-2xl font-bold">🧮 “{design.name}” by the numbers</h2>
        {analysis.ok ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Breaking load" value={`${analysis.capacityN.toFixed(0)} N`} sub={`${analysis.capacityKg.toFixed(1)} kg`} tone="grass" />
            <StatTile label="Joints" value={`${m.joints}`} sub={`${m.members} members`} />
            <StatTile label="Equations to solve" value={`${2 * m.joints - 3}`} sub="2 per joint, minus 3 supports" tone="sky" />
            <StatTile label="Determinacy" value={m.determinacy === 0 ? 'just right' : m.determinacy > 0 ? `+${m.determinacy} spare` : `${m.determinacy} short`} sub="m + 3 − 2j" tone={m.determinacy < 0 ? 'rocket' : 'sun'} />
            <StatTile label="Efficiency" value={`${analysis.efficiency}×`} sub="own weight" tone="grape" />
          </div>
        ) : (
          <Callout emoji="⚠️" tone="rocket" className="mt-3">
            {analysis.message} The equations below still apply, but the numbers need a bridge that stands up.
          </Callout>
        )}
      </div>

      <MathSection emoji="🧱" title="1. Stress, strain and stiffness" lead="Force per area tells you how hard a piece is working; stretch per length tells you how much it gives.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`\sigma = \frac{F}{A} \qquad \varepsilon = \frac{\Delta L}{L} \qquad E = \frac{\sigma}{\varepsilon}`} />
              <p className="prose-kid">
                <Formula tex={R`\sigma`} /> (sigma) is <strong>stress</strong>: the force spread over the cross-section. <Formula tex={R`\varepsilon`} /> (epsilon) is{' '}
                <strong>strain</strong>: how much the piece stretches compared with its length. <Formula tex="E" /> is Young’s modulus, a number for each material
                that says how stiff it is. Hooke’s law says they are proportional until something breaks.
              </p>
              <Formula block tex={R`k = \frac{E\,A}{L}`} />
              <p className="prose-kid">
                So every piece behaves like a spring with stiffness <Formula tex="k" />: short, fat, stiff-material pieces are stiff springs. The simulator is really
                a big web of springs.
              </p>
            </>
          }
          right={
            <LiveBox title="Hardest-working piece">
              {m.hardest && m.hardestMember ? (
                <>
                  <Row k="Piece" v={`${MATERIALS[m.hardestMember.material].name}${layersOf(m.hardestMember) > 1 ? ` ×${layersOf(m.hardestMember)}` : ''}, ${m.hardest.lengthCm} cm`} />
                  <Row k="Force F" v={`${Math.abs(m.hardest.forceN).toFixed(1)} N (${m.hardest.forceN >= 0 ? 'pulled' : 'pushed'})`} />
                  <Row k="Area A" v={`${(memberSection(m.hardestMember).mat.areaM2 * layersOf(m.hardestMember) * 1e6).toFixed(1)} mm²`} />
                  <Row k="Stress σ = F/A" v={`${(m.stress / 1e6).toFixed(2)} MPa`} />
                  <Row k="Young’s modulus E" v={`${(MATERIALS[m.hardestMember.material].E / 1e9).toFixed(1)} GPa`} />
                  <Row k="Strain ε = σ/E" v={`${(m.strain * 100).toFixed(3)} %`} />
                  <Row k="Stretch ΔL" v={`${m.dL.toFixed(3)} mm`} />
                </>
              ) : (
                <p className="text-sm text-ink-soft">Build a bridge that stands up to see live numbers.</p>
              )}
            </LiveBox>
          }
        />
      </MathSection>

      <MathSection emoji="📏" title="2. Euler buckling" lead="The equation that kills most model bridges.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`P_{cr} = \frac{\pi^2\,E\,I}{L^2}`} />
              <p className="prose-kid">
                <Formula tex="P_{cr}" /> is the push at which a pinned piece suddenly bows sideways. <Formula tex="I" /> is the <strong>second moment of area</strong>
                — a measure of how far the material sits from the middle of the cross-section:
              </p>
              <Formula block tex={R`I_{\text{rectangle}} = \frac{b\,h^3}{12} \qquad I_{\text{tube}} = \frac{\pi\,(r_o^4 - r_i^4)}{4}`} />
              <p className="prose-kid">
                Read the exponents: <strong>length squared</strong> underneath (half the length, four times the load) and <strong>thickness cubed</strong> on top
                (two sticks face to face: eight times the load). Nothing else in this lab is that powerful.
              </p>
            </>
          }
          right={
            <LiveBox title="Longest pushed piece">
              {m.longestPushed && m.longestMember ? (
                <>
                  <Row k="Piece" v={`${MATERIALS[m.longestMember.material].name}${layersOf(m.longestMember) > 1 ? ` ×${layersOf(m.longestMember)}` : ''}`} />
                  <Row k="Length L" v={`${m.longestPushed.lengthCm} cm`} />
                  <Row k="I (with layers)" v={`${(MATERIALS[m.longestMember.material].iM4 * layersOf(m.longestMember) ** 3).toExponential(2)} m⁴`} />
                  <Row k="Pcr = π²EI/L²" v={`${m.longestPushed.compressionLimitN} N (${(m.longestPushed.compressionLimitN / G).toFixed(1)} kg)`} />
                  <Row k="Push on it at breaking load" v={`${Math.abs(m.longestPushed.forceN).toFixed(1)} N`} />
                  <Row k="Crushing limit (for comparison)" v={`${MATERIALS[m.longestMember.material].crushLimitN * layersOf(m.longestMember)} N`} />
                </>
              ) : (
                <p className="text-sm text-ink-soft">No pushed pieces yet.</p>
              )}
            </LiveBox>
          }
        />
        <div className="card mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">Buckling load vs. length</h3>
            <div className="flex flex-wrap gap-1">
              {MATERIAL_LIST.map((mat) => (
                <button key={mat.id} type="button" onClick={() => setChartMaterial(mat.id)} className={`rounded-full px-3 py-1 text-sm font-bold ${chartMaterial === mat.id ? 'bg-ink text-white' : 'bg-ink/5'}`}>
                  {mat.emoji} {mat.name}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={lengthChart} yLabel="Pcr (N), single piece" color={MATERIALS[chartMaterial].color} digits={1} />
        </div>
      </MathSection>

      <MathSection emoji="⚖️" title="3. The method of joints" lead="At every joint the forces must balance, or the joint would move.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`\sum F_x = 0 \qquad \sum F_y = 0 \quad \text{at every joint}`} />
              <p className="prose-kid">
                Take the simplest truss, a <strong>king post</strong>: two sloping pieces from the cliffs meet at a peak above the middle, and a weight{' '}
                <Formula tex="W" /> hangs below. At the peak, the two slopes must together push up by <Formula tex="W" />:
              </p>
              <Formula block tex={R`2\,F\sin\theta = W \quad\Longrightarrow\quad F = \frac{W}{2\sin\theta}`} />
              <p className="prose-kid">
                A low, flat truss (small <Formula tex={R`\theta`} />) means <Formula tex={R`\sin\theta`} /> is small and <Formula tex="F" /> is huge. A tall truss cuts the
                forces — but makes the pieces longer, and section 2 says long pieces buckle. Engineering is choosing the trade.
              </p>
            </>
          }
          right={
            <LiveBox title="Worked example">
              {(() => {
                const h = 15
                const theta = Math.atan2(h, SPAN_CM / 2)
                const W = analysis.ok ? analysis.capacityN : 50
                const F = W / (2 * Math.sin(theta))
                return (
                  <>
                    <Row k="Peak height" v={`${h} cm over a ${SPAN_CM} cm gap`} />
                    <Row k="θ = atan(15 ÷ 20)" v={`${((theta * 180) / Math.PI).toFixed(1)}°`} />
                    <Row k="Load W" v={`${W.toFixed(0)} N`} />
                    <Row k="Force in each slope" v={`${F.toFixed(1)} N (pushed)`} />
                    <Row k="Force in the road piece" v={`${(F * Math.cos(theta)).toFixed(1)} N (pulled)`} />
                  </>
                )
              })()}
            </LiveBox>
          }
        />
      </MathSection>

      <MathSection emoji="💻" title="4. How the load test actually works" lead="Too many joints to do by hand? Write every balance equation at once and let the computer solve them.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`\mathbf{K}\,\mathbf{u} = \mathbf{F}`} />
              <p className="prose-kid">
                Each joint can move in <Formula tex="x" /> and <Formula tex="y" />, so a bridge with <Formula tex="j" /> joints has <Formula tex="2j" /> unknown movements{' '}
                <Formula tex={R`\mathbf{u}`} /> (minus 3 that the supports hold still). Every piece adds its spring stiffness <Formula tex="EA/L" /> into the big matrix{' '}
                <Formula tex={R`\mathbf{K}`} />. The loads go in <Formula tex={R`\mathbf{F}`} />. Solving gives the movements; stretching each piece by its ends gives its
                force. This is the <strong>direct stiffness method</strong>, the same idea inside the software that designs real bridges.
              </p>
              <p className="prose-kid">
                Because everything is linear, we solve once for a 1 N load and scale up until the first piece reaches its limit. If the matrix cannot be solved,
                the structure can move without stretching anything: a <strong>mechanism</strong>. Add a diagonal.
              </p>
            </>
          }
          right={
            <LiveBox title="Your bridge’s equations">
              <Row k="Joints j" v={`${m.joints}`} />
              <Row k="Members m" v={`${m.members}`} />
              <Row k="Unknown movements" v={`${2 * m.joints - 3}`} />
              <Row k="m + 3 − 2j" v={`${m.determinacy} → ${m.determinacy === 0 ? 'statically determinate' : m.determinacy > 0 ? 'redundant (spare members)' : 'mechanism!'}`} />
              <Row k="Supports" v="left: pin · right: roller" />
              {analysis.ok && <Row k="Scale factor to failure" v={`${analysis.capacityN.toFixed(1)} × (1 N solution)`} />}
            </LiveBox>
          }
        />
      </MathSection>

      <MathSection emoji="🏆" title="5. Efficiency and why big bridges are hard" lead="Hold the most with the least.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`\eta = \frac{W_{\text{held}}}{m_{\text{bridge}}\,g}`} />
              <p className="prose-kid">
                Contest judges divide the load held by the bridge’s own weight. Doubling every dimension of a bridge makes it <strong>8×</strong> heavier (volume) but
                only <strong>4×</strong> stronger (area) — the square-cube law. That is why a toothpick model can hold hundreds of times its weight while a real
                bridge mostly holds up itself.
              </p>
            </>
          }
          right={
            <LiveBox title="Your bridge">
              <Row k="Held" v={analysis.ok ? `${analysis.capacityN.toFixed(0)} N` : '—'} />
              <Row k="Own weight" v={`${(analysis.massG / 1000 * G).toFixed(2)} N (${analysis.massG.toFixed(1)} g)`} />
              <Row k="Efficiency η" v={analysis.ok ? `${analysis.efficiency}×` : '—'} />
              <Row k="Cost" v={`${analysis.costCoins.toFixed(0)} of ${design.budget} coins`} />
            </LiveBox>
          }
        />
      </MathSection>

      <MathSection emoji="🔍" title="6. What the simulator assumes" lead="Pin joints, glue-limited tension, Euler buckling: here is the honest list.">
        <div className="card">
          <AssumptionsPanel full items={BRIDGE_ASSUMPTIONS} note={BRIDGE_ACCURACY_NOTE} moreTo="/workshops/bridge-builder/math" accuracy="joints decide" />
        </div>
      </MathSection>

      <section className="card mt-10 bg-ink text-white">
        <h2 className="font-display text-2xl font-bold">🧠 Think it through</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-white/90">
          <li>Your longest pushed piece buckles at {m.longestPushed ? `${m.longestPushed.compressionLimitN} N` : 'some load'}. What would it take if you added a joint in its middle?</li>
          <li>Why does a king post with a very low peak need enormous forces in its sloping pieces?</li>
          <li>Which has more unknowns to solve: a bridge with 8 joints or 10 joints? How many more equations is that?</li>
          <li>If every piece were twice as long, twice as wide and twice as thick, how would the bridge’s weight and its buckling loads change?</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="../worksheets/bridge-math" className="btn-sun">
            🧮 Do the Bridge Math Challenge worksheet
          </Link>
          <Link to="../test" className="btn-ghost !bg-white/10 !text-white !ring-white/30">
            🏋️ Test a prediction
          </Link>
        </div>
      </section>
    </Page>
  )
}

function MathSection({ emoji, title, lead, children }: { emoji: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <SectionTitle emoji={emoji} title={title} subtitle={lead} />
      {children}
    </section>
  )
}

function TwoCol({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="card space-y-3">{left}</div>
      <div>{right}</div>
    </div>
  )
}

function LiveBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card h-full border-2 border-dashed border-grass/50 bg-grass/5">
      <div className="mb-2 font-display text-lg font-bold text-grass-dark">🔢 {title}</div>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 py-1.5 last:border-0">
      <span className="text-sm font-bold text-ink-soft">{k}</span>
      <span className="text-right font-display text-base font-bold tabular-nums text-ink">{v}</span>
    </div>
  )
}

void isSupport
void memberLengthCm
