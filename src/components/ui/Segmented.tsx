export interface SegmentOption<T extends string | number> {
  value: T
  label: string
  emoji?: string
  hint?: string
}

interface SegmentedProps<T extends string | number> {
  label?: string
  value: T
  options: SegmentOption<T>[]
  onChange: (v: T) => void
  columns?: 2 | 3 | 4
}

export function Segmented<T extends string | number>({ label, value, options, onChange, columns }: SegmentedProps<T>) {
  const cols = columns ?? (options.length >= 4 ? 4 : options.length === 3 ? 3 : 2)
  const gridClass = cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2'
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div role="radiogroup" aria-label={label} className={`grid gap-2 ${gridClass}`}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-2 py-2 text-center font-display text-sm font-semibold transition ${
                active
                  ? 'border-skyblue bg-skyblue/15 text-ink shadow-chunky-sm'
                  : 'border-ink/10 bg-white text-ink-soft hover:border-skyblue/50 hover:bg-skyblue/5'
              }`}
            >
              {o.emoji && <span className="text-xl leading-none">{o.emoji}</span>}
              <span>{o.label}</span>
              {o.hint && <span className="text-[11px] font-bold text-ink-soft/80">{o.hint}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
