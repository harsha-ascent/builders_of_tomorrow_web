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
  dark = false,
}: {
  full?: boolean
  className?: string
  items?: Assumption[]
  note?: string
  moreTo?: string
  accuracy?: string
  /** Lab view: colours for a dark instrument panel. */
  dark?: boolean
}) {
  const items = full ? allItems : allItems.slice(0, 3)
  const text = dark ? 'text-[#d7dde8]' : 'text-ink'
  const soft = dark ? 'text-[#8b94a7]' : 'text-ink-soft'
  return (
    <details className={`group rounded-2xl border-2 border-dashed p-3 ${dark ? 'border-[#273043] bg-[#0f141f]' : 'border-ink/15 bg-white/60'} ${className}`}>
      <summary className={`cursor-pointer list-none font-display text-base font-bold ${text}`}>
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>🔍 How accurate is this? <span className={`font-sans text-sm font-bold ${soft}`}>(estimate, {accuracy})</span>
      </summary>
      <p className={`mt-2 text-sm ${text}`}>{note}</p>
      <ul className="mt-3 space-y-2">
        {items.map((a) => (
          <li key={a.id} className={`rounded-xl p-3 text-sm ${dark ? 'bg-[#111827]' : 'bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`font-display font-bold ${text}`}>{a.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${effectTone[a.effect]}`}>{EFFECT_LABEL[a.effect]}</span>
            </div>
            <div className={`mt-1 ${text}`}>
              <span className={`font-bold ${soft}`}>We assume:</span> {a.assume}
            </div>
            <div className={`mt-0.5 ${text}`}>
              <span className={`font-bold ${soft}`}>Real rockets:</span> {a.reality}
            </div>
          </li>
        ))}
      </ul>
      {!full && (
        <Link to={moreTo} className={`mt-3 inline-block text-sm font-bold underline ${dark ? 'text-[#f5a623]' : 'text-grape-dark'}`}>
          See all {allItems.length} assumptions and the equations →
        </Link>
      )}
    </details>
  )
}
