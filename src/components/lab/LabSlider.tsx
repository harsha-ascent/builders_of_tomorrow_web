import type { ReactNode } from 'react'

/** A compact labelled slider for the instrument theme, with the value and unit beside the label. */
export function LabSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  display,
  hint,
  hot = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  /** Formatted value; defaults to the number. */
  display?: string
  hint?: ReactNode
  hot?: boolean
  onChange: (v: number) => void
}) {
  return (
    <label className="lab-slider">
      <span className="lab-slider-label">{label}</span>
      <span className={`lab-slider-value ${hot ? 'lab-accent' : ''}`}>
        {display ?? value}
        {unit ? ` ${unit}` : ''}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="lab-slider-hint">{hint}</span>}
    </label>
  )
}
