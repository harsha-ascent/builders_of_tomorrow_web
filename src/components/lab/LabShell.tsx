import type { CSSProperties, ReactNode } from 'react'
import './lab.css'

/**
 * The dark instrument panel a workshop's lab view lives in: a toolbar row, then a dense grid of panels.
 * Scoped by the `.lab` class, so nothing outside it changes.
 */
export function LabShell({ toolbar, children, className = '' }: { toolbar?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`lab p-2 md:p-3 ${className}`}>
      {toolbar}
      <div className={`lab-grid ${toolbar ? 'mt-2' : ''}`}>{children}</div>
    </div>
  )
}

/** One instrument panel: small-caps title and the current readout in the header, tools on the right. */
export function LabPanel({
  title,
  readout,
  tools,
  children,
  className = '',
  style,
  compact = false,
  span = false,
}: {
  title: string
  readout?: ReactNode
  tools?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** No minimum height (text panels). */
  compact?: boolean
  /** Span every grid column. */
  span?: boolean
}) {
  return (
    <section className={`lab-panel ${span ? 'lab-span' : ''} ${className}`} style={{ ...(compact ? { minHeight: 0 } : {}), ...style }} aria-label={title}>
      <header className="lab-panel-head">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="lab-title">{title}</h3>
          {readout && <div className="lab-readout">{readout}</div>}
        </div>
        {tools && <div className="lab-tools">{tools}</div>}
      </header>
      <div className="lab-panel-body">{children}</div>
    </section>
  )
}

/** A readout item: plain-language label, bold value, unit. `hot` lights it in the accent colour. */
export function Readout({ label, value, unit, hot = false }: { label: string; value: ReactNode; unit?: string; hot?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className="lab-k">{label}</span> <b className={hot ? 'lab-accent' : ''}>{value}</b>
      {unit ? <span className={hot ? 'lab-accent' : ''}> {unit}</span> : null}
    </span>
  )
}

/** Separator between readouts. */
export function Dot() {
  return <span className="lab-k"> · </span>
}

/** A row of radio-style buttons. */
export function LabSeg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="lab-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} aria-pressed={o.value === value} className="lab-btn" title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
