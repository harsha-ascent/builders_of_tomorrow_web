import type { LabView } from './useLabView'

/** The small Lab / Simple pill in the site's own (light) style, shown above either view. */
export function LabViewSwitch({ view, onChange, label }: { view: LabView; onChange: (v: LabView) => void; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-ink/5 p-0.5 text-xs ring-1 ring-ink/10" role="radiogroup" aria-label={label}>
      {(
        [
          { value: 'lab', label: '🔬 Lab' },
          { value: 'simple', label: '🧒 Simple' },
        ] as const
      ).map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 font-display font-bold transition ${view === o.value ? 'bg-ink text-white shadow-chunky-sm' : 'text-ink hover:bg-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
