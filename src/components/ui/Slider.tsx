import type { ReactNode } from 'react'

interface SliderProps {
  label: string
  emoji?: string
  value: number
  min: number
  max: number
  step: number
  display: string
  hint?: ReactNode
  onChange: (v: number) => void
  /** Labels for the two ends of the slider, e.g. ["Empty", "Full"]. */
  ends?: [string, string]
}

export function Slider({ label, emoji, value, min, max, step, display, hint, onChange, ends }: SliderProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="font-display text-base font-semibold text-ink">
          {emoji && <span className="mr-1">{emoji}</span>}
          {label}
        </label>
        <span className="rounded-full bg-ink/5 px-3 py-0.5 font-display text-base font-bold tabular-nums text-ink">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {ends && (
        <div className="mt-1 flex justify-between text-xs font-bold text-ink-soft">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}
