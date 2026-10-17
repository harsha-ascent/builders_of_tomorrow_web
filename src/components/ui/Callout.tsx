import type { ReactNode } from 'react'

interface CalloutProps {
  emoji?: string
  title?: string
  tone?: 'sky' | 'sun' | 'grass' | 'rocket' | 'grape'
  children: ReactNode
  className?: string
}

const tones = {
  sky: 'border-skyblue bg-skyblue/10',
  sun: 'border-sun bg-sun/15',
  grass: 'border-grass bg-grass/15',
  rocket: 'border-rocket bg-rocket/10',
  grape: 'border-grape bg-grape/10',
}

export function Callout({ emoji, title, tone = 'sky', children, className = '' }: CalloutProps) {
  return (
    <div className={`flex gap-3 rounded-2xl border-l-8 p-4 ${tones[tone]} ${className}`}>
      {emoji && <div className="text-3xl leading-none">{emoji}</div>}
      <div className="min-w-0 flex-1">
        {title && <div className="font-display text-lg font-bold text-ink">{title}</div>}
        <div className="text-base text-ink">{children}</div>
      </div>
    </div>
  )
}
