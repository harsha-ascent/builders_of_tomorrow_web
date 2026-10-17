import { Link } from 'react-router'
import { ACCURACY_NOTE, ASSUMPTIONS, EFFECT_LABEL, type Assumption } from '../sim/assumptions'

const effectTone: Record<Assumption['effect'], string> = {
  small: 'bg-grass/30 text-ink',
  medium: 'bg-sun/40 text-ink',
  large: 'bg-rocket/20 text-rocket-dark',
}

/** Collapsible "how accurate is this?" box. `full` lists every assumption; otherwise the top three. */
export function AssumptionsPanel({
  full = false,
  className = '',
  items: allItems = ASSUMPTIONS,
  note = ACCURACY_NOTE,
  moreTo = '/workshops/water-rocket/math',
  accuracy = 'about ±25 %',
}: {
  full?: boolean
  className?: string
  items?: Assumption[]
  note?: string
  moreTo?: string
  accuracy?: string
}) {
  const items = full ? allItems : allItems.slice(0, 3)
  return (
    <details className={`group rounded-2xl border-2 border-dashed border-ink/15 bg-white/60 p-3 ${className}`}>
      <summary className="cursor-pointer list-none font-display text-base font-bold text-ink">
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>🔍 How accurate is this? <span className="font-sans text-sm font-bold text-ink-soft">(estimate, {accuracy})</span>
      </summary>
      <p className="mt-2 text-sm text-ink">{note}</p>
      <ul className="mt-3 space-y-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-xl bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display font-bold text-ink">{a.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${effectTone[a.effect]}`}>{EFFECT_LABEL[a.effect]}</span>
            </div>
            <div className="mt-1 text-ink">
              <span className="font-bold text-ink-soft">We assume:</span> {a.assume}
            </div>
            <div className="mt-0.5 text-ink">
              <span className="font-bold text-ink-soft">Real rockets:</span> {a.reality}
            </div>
          </li>
        ))}
      </ul>
      {!full && (
        <Link to={moreTo} className="mt-3 inline-block text-sm font-bold text-grape-dark underline">
          See all {allItems.length} assumptions and the equations →
        </Link>
      )}
    </details>
  )
}
