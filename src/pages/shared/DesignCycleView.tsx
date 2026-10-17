import { useState } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { SectionTitle } from '../../components/ui/SectionTitle'
import type { CycleStep } from '../../content/water-rocket/cycle'
import type { ReactNode } from 'react'

export interface DesignCycleViewProps {
  steps: CycleStep[]
  intro: ReactNode
  journal: { label: string; to: string }
  build: { label: string; to: string }
}

export function DesignCycleView({ steps: CYCLE_STEPS, intro, journal, build }: DesignCycleViewProps) {
  const [selectedId, setSelectedId] = useState(CYCLE_STEPS[0].id)
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const step = CYCLE_STEPS.find((s) => s.id === selectedId)!
  const idx = CYCLE_STEPS.indexOf(step)

  return (
    <Page wide>
      <Callout emoji="🔁" title="Engineers go round and round" tone="grape" className="mb-8">
        {intro}
      </Callout>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card flex items-center justify-center">
          <CycleDiagram steps={CYCLE_STEPS} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className={`card ${step.bg}`}>
          <div className="flex items-center gap-3">
            <span className="text-6xl">{step.emoji}</span>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                Step {idx + 1} of {CYCLE_STEPS.length}
              </div>
              <h2 className="font-display text-4xl font-bold">{step.title}</h2>
            </div>
          </div>
          <p className="mt-3 font-display text-xl font-semibold text-ink">“{step.question}”</p>
          <p className="prose-kid mt-3">{step.description}</p>
          <div className="mt-4 rounded-2xl bg-white/70 p-4">
            <div className="font-display font-bold">🚀 In the Rocket Lab</div>
            <p className="mt-1 text-ink">{step.inTheLab}</p>
            <Link to={step.link.to} className="btn-sky mt-3 !py-2 text-sm">
              {step.link.label}
            </Link>
          </div>
          <div className="mt-4">
            <div className="font-display font-bold">✅ Checklist</div>
            <ul className="mt-2 space-y-2">
              {step.checklist.map((c, i) => {
                const key = `${step.id}-${i}`
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/70 p-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-grass"
                        checked={Boolean(ticks[key])}
                        onChange={(e) => setTicks({ ...ticks, [key]: e.target.checked })}
                      />
                      <span className={ticks[key] ? 'text-ink-soft line-through' : 'text-ink'}>{c}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" className="btn-ghost !py-2" onClick={() => setSelectedId(CYCLE_STEPS[(idx + CYCLE_STEPS.length - 1) % CYCLE_STEPS.length].id)}>
              ← Previous
            </button>
            <button type="button" className="btn-primary !py-2" onClick={() => setSelectedId(CYCLE_STEPS[(idx + 1) % CYCLE_STEPS.length].id)}>
              Next step →
            </button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <SectionTitle emoji="🧠" title="Habits of great engineers" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['🙋', 'Ask lots of questions', 'Why did that happen? What if we…? There are no silly questions in engineering.'],
            ['📏', 'Measure, don’t guess', 'Write down numbers every time. Your flight log is your superpower.'],
            ['💪', 'Failure is data', 'A rocket that flops still teaches you something. Change one thing and try again.'],
          ].map(([e, t, d]) => (
            <div key={t} className="card">
              <div className="text-4xl">{e}</div>
              <h3 className="mt-2 font-display text-xl font-bold">{t}</h3>
              <p className="mt-1 text-ink">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to={journal.to} className="btn-sun">
          {journal.label}
        </Link>
        <Link to={build.to} className="btn-primary">
          {build.label}
        </Link>
      </div>
    </Page>
  )
}

function CycleDiagram({ steps: CYCLE_STEPS, selectedId, onSelect }: { steps: CycleStep[]; selectedId: string; onSelect: (id: string) => void }) {
  const cx = 210
  const cy = 210
  const R = 150
  const n = CYCLE_STEPS.length
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }
  }
  const arcs = CYCLE_STEPS.map((s, i) => {
    const from = pos(i)
    const to = pos((i + 1) % n)
    const gap = 0.33 // radians to leave around each node
    const a1 = from.a + gap
    const a2 = to.a - gap
    const p1 = { x: cx + R * Math.cos(a1), y: cy + R * Math.sin(a1) }
    const p2 = { x: cx + R * Math.cos(a2), y: cy + R * Math.sin(a2) }
    return { id: s.id, d: `M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`, color: s.color }
  })
  return (
    <svg viewBox="0 0 420 420" className="h-auto w-full max-w-[460px]" role="group" aria-label="Engineering design cycle">
      <defs>
        {CYCLE_STEPS.map((s) => (
          <marker key={s.id} id={`arrow-${s.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={s.color} />
          </marker>
        ))}
      </defs>
      {arcs.map((a) => (
        <path key={a.id} d={a.d} fill="none" stroke={a.color} strokeWidth={6} strokeLinecap="round" markerEnd={`url(#arrow-${a.id})`} />
      ))}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1e2a4a" fontFamily="Fredoka, sans-serif">
        Engineering
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1e2a4a" fontFamily="Fredoka, sans-serif">
        Design Cycle
      </text>
      <text x={cx} y={cy + 40} textAnchor="middle" fontSize={26}>
        🔁
      </text>
      {CYCLE_STEPS.map((s, i) => {
        const p = pos(i)
        const active = s.id === selectedId
        return (
          <g key={s.id} transform={`translate(${p.x} ${p.y})`} onClick={() => onSelect(s.id)} className="cursor-pointer" role="button" aria-label={s.title} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}>
            <circle r={active ? 46 : 40} fill={s.color} stroke="#fff" strokeWidth={active ? 6 : 4} className="transition-all" />
            <text y={-6} textAnchor="middle" fontSize={26}>
              {s.emoji}
            </text>
            <text y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1e2a4a" fontFamily="Fredoka, sans-serif">
              {s.title}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
