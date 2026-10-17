import { Link } from 'react-router'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import type { ReactNode } from 'react'
import type { Worksheet } from '../../content/water-rocket/worksheets'
import { answerableCount } from '../../content/worksheetUtils'
import { useWorksheetIndex } from '../../lib/useWorksheet'

const LEVEL_STYLE: Record<Worksheet['level'], string> = {
  Explorer: 'bg-grass/30 text-ink',
  Builder: 'bg-skyblue/30 text-ink',
  Engineer: 'bg-grape/25 text-ink',
}

export function WorksheetsView({ workshop, worksheets, intro }: { workshop: string; worksheets: Worksheet[]; intro?: ReactNode }) {
  const index = useWorksheetIndex()
  return (
    <Page wide>
      <Callout emoji="📝" title="Worksheets" tone="sun" className="mb-8">
        {intro ?? (
          <>
            Fill them in on screen (they save automatically) or press <strong>Print</strong> for paper. Start with <strong>Explorer</strong>, then try{' '}
            <strong>Builder</strong> and <strong>Engineer</strong>.
          </>
        )}
      </Callout>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {worksheets.map((ws) => {
          const total = answerableCount(ws)
          const done = index[`${workshop}/${ws.id}`]?.answered ?? 0
          const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0
          return (
            <Link key={ws.id} to={ws.id} className="card flex flex-col transition hover:-translate-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-5xl">{ws.emoji}</div>
                <span className={`chip ${LEVEL_STYLE[ws.level]}`}>{ws.level}</span>
              </div>
              <h2 className="mt-3 font-display text-xl font-bold leading-tight">{ws.title}</h2>
              <p className="mt-1 flex-1 text-ink">{ws.summary}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-ink-soft">
                <span>⏱️ about {ws.minutes} min</span>
                <span>{pct === 100 ? '✅ Complete' : done > 0 ? `${pct}% done` : 'Not started'}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-grass transition-all" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
