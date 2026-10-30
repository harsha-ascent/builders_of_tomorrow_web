import type { CSSProperties, ReactNode } from 'react'

/** One instrument panel: small-caps title and the current readout in the header, tools on the right. */
export function LabPanel({
  title,
  readout,
  tools,
  children,
  className = '',
  style,
}: {
  title: string
  readout?: ReactNode
  tools?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section className={`lab-panel ${className}`} style={style} aria-label={title}>
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
