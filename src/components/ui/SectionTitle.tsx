import type { ReactNode } from 'react'

export function SectionTitle({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji?: string
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-3xl font-bold text-ink">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-base text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
