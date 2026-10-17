interface StatTileProps {
  label: string
  value: string
  emoji?: string
  sub?: string
  tone?: 'sky' | 'sun' | 'grass' | 'rocket' | 'grape' | 'plain'
}

const tones: Record<NonNullable<StatTileProps['tone']>, string> = {
  sky: 'bg-skyblue/15',
  sun: 'bg-sun/25',
  grass: 'bg-grass/20',
  rocket: 'bg-rocket/15',
  grape: 'bg-grape/15',
  plain: 'bg-ink/5',
}

export function StatTile({ label, value, emoji, sub, tone = 'plain' }: StatTileProps) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
      <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
        {emoji && <span className="mr-1">{emoji}</span>}
        {label}
      </div>
      <div className="font-display text-2xl font-bold tabular-nums text-ink">{value}</div>
      {sub && <div className="text-xs font-semibold text-ink-soft">{sub}</div>}
    </div>
  )
}
