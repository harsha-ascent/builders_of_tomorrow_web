import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import type { WorksheetAnswer } from '../../../shared/types'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import type { CycleStep } from '../../content/water-rocket/cycle'
import type { Worksheet, WorksheetItem } from '../../content/water-rocket/worksheets'
import { answerableCount } from '../../content/worksheetUtils'
import { useAppAuth } from '../../auth/AppAuth'
import { useWorksheet } from '../../lib/useWorksheet'

export interface WorksheetViewProps {
  workshop: string
  workshopTitle: string
  worksheets: Worksheet[]
  cycleSteps: CycleStep[]
  /** Where the big finishing button goes. */
  next: { label: string; to: string }
}

/** Reads :worksheetId from the route and renders that worksheet. */
export function WorksheetRoute(props: WorksheetViewProps) {
  const { worksheetId } = useParams()
  const ws = props.worksheets.find((w) => w.id === worksheetId)
  if (!ws) return <Navigate to=".." replace />
  return <WorksheetView key={ws.id} ws={ws} {...props} />
}

function WorksheetView({ ws, workshop, workshopTitle, cycleSteps, next }: WorksheetViewProps & { ws: Worksheet }) {
  const { answers, setAnswer, reset, status, answered } = useWorksheet(workshop, ws.id)
  const { displayName } = useAppAuth()
  const total = answerableCount(ws)
  const complete = total > 0 && answered >= total
  const step = ws.cycleStep ? cycleSteps.find((s) => s.id === ws.cycleStep) : undefined

  return (
    <Page>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to=".." className="font-bold text-ink-soft hover:text-ink">
          ← All worksheets
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            {status === 'saving' ? '💾 Saving…' : status === 'error' ? '⚠️ Not saved' : status === 'saved' ? '✅ Saved' : `${answered}/${total} answered`}
          </span>
          <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button
            type="button"
            className="btn-ghost !py-2 text-sm"
            onClick={() => {
              if (window.confirm('Clear all your answers on this worksheet?')) reset()
            }}
          >
            🧽 Clear
          </button>
        </div>
      </div>

      <header className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="text-6xl">{ws.emoji}</div>
          <div className="flex-1">
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              {workshopTitle} · {ws.level} · about {ws.minutes} min
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{ws.title}</h1>
            <p className="prose-kid mt-2">{ws.intro}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-dashed border-ink/20 px-3 py-2">
                <span className="text-xs font-extrabold uppercase text-ink-soft">Name</span>
                <div className="font-display text-lg font-bold">{displayName ?? <span className="text-ink/30">______________</span>}</div>
              </div>
              <div className="rounded-xl border-2 border-dashed border-ink/20 px-3 py-2">
                <span className="text-xs font-extrabold uppercase text-ink-soft">Date</span>
                <div className="font-display text-lg font-bold">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
            {step && (
              <div className="no-print mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: `${step.color}33` }}>
                <span>{step.emoji}</span> Design cycle step: {step.title}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {ws.sections.map((section, si) => (
          <section key={si} className="card">
            <h2 className="font-display text-2xl font-bold">
              {section.emoji && <span className="mr-2">{section.emoji}</span>}
              {section.heading}
            </h2>
            <div className="mt-4 space-y-6">
              {section.items.map((item, ii) => (
                <ItemView key={item.key} item={item} number={ii + 1} value={answers[item.key]} onChange={(v) => setAnswer(item.key, v)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {complete && (
        <Callout emoji="🏆" title="Worksheet complete!" tone="grass" className="no-print mt-6 animate-pop">
          Brilliant work, engineer. Show a grown-up or teacher, then try the next worksheet.
        </Callout>
      )}

      <div className="no-print mt-8 flex justify-between">
        <Link to=".." className="btn-ghost">
          ← Back to worksheets
        </Link>
        <Link to={next.to} className="btn-primary">
          {next.label}
        </Link>
      </div>
    </Page>
  )
}

function ItemView({ item, number, value, onChange }: { item: WorksheetItem; number: number; value: WorksheetAnswer | undefined; onChange: (v: WorksheetAnswer) => void }) {
  if (item.type === 'info') {
    return (
      <Callout emoji={item.emoji} tone="sun">
        {item.text}
      </Callout>
    )
  }
  return (
    <div>
      <div className="mb-2 flex gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{number}</span>
        <p className="font-display text-lg font-semibold text-ink">{item.prompt}</p>
      </div>
      <div className="pl-9">
        <ItemInput item={item} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

function ItemInput({ item, value, onChange }: { item: Exclude<WorksheetItem, { type: 'info' }>; value: WorksheetAnswer | undefined; onChange: (v: WorksheetAnswer) => void }) {
  switch (item.type) {
    case 'text':
      return (
        <>
          <textarea className="input no-print" rows={item.lines ?? 2} placeholder={item.placeholder} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
          <div className="print-lines hidden print:block">{typeof value === 'string' ? value : ''}</div>
        </>
      )
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input type="number" className="input max-w-[10rem]" placeholder={item.placeholder} value={typeof value === 'string' || typeof value === 'number' ? value : ''} onChange={(e) => onChange(e.target.value)} />
          {item.unit && <span className="font-display text-lg font-bold text-ink-soft">{item.unit}</span>}
        </div>
      )
    case 'choice':
      return <ChoiceInput options={item.options} answer={item.answer} explain={item.explain} value={typeof value === 'number' ? value : null} onChange={onChange} />
    case 'checklist': {
      const checked = Array.isArray(value) ? (value as string[]) : []
      return (
        <ul className="grid gap-2 sm:grid-cols-2">
          {item.options.map((o) => {
            const on = checked.includes(o)
            return (
              <li key={o}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${on ? 'border-grass bg-grass/15' : 'border-ink/10 bg-white'}`}>
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-grass" checked={on} onChange={(e) => onChange(e.target.checked ? [...checked, o] : checked.filter((x) => x !== o))} />
                  <span className="text-ink">{o}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )
    }
    case 'table': {
      const rows = Array.isArray(value) && Array.isArray(value[0]) ? (value as string[][]) : []
      const cell = (r: number, c: number) => rows[r]?.[c] ?? item.prefill?.[r]?.[c] ?? ''
      const set = (r: number, c: number, v: string) => {
        const next: string[][] = Array.from({ length: item.rows }, (_, ri) => Array.from({ length: item.columns.length }, (_, ci) => cell(ri, ci)))
        next[r][c] = v
        onChange(next)
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                {item.columns.map((c) => (
                  <th key={c} className="rounded-lg bg-ink/5 px-2 py-2 text-left font-display text-sm font-bold text-ink">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: item.rows }, (_, r) => (
                <tr key={r}>
                  {item.columns.map((_, c) => {
                    const fixed = item.prefill?.[r]?.[c] != null
                    return (
                      <td key={c}>
                        <input
                          className={`w-full min-w-[6rem] rounded-lg border-2 px-2 py-2 text-base ${fixed ? 'border-transparent bg-sun/30 font-bold' : 'border-ink/10 bg-white focus:border-skyblue'}`}
                          value={cell(r, c)}
                          readOnly={fixed}
                          aria-label={`${item.columns[c]} row ${r + 1}`}
                          onChange={(e) => set(r, c, e.target.value)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'rating': {
      const max = item.max ?? 5
      const v = typeof value === 'number' ? value : 0
      return (
        <div className="flex gap-1" role="radiogroup" aria-label={item.prompt}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={v === n} aria-label={`${n} of ${max}`} onClick={() => onChange(n)} className={`text-4xl transition hover:scale-110 ${n <= v ? '' : 'opacity-30 grayscale'}`}>
              ⭐
            </button>
          ))}
        </div>
      )
    }
  }
}

function ChoiceInput({ options, answer, explain, value, onChange }: { options: string[]; answer?: number; explain?: string; value: number | null; onChange: (v: WorksheetAnswer) => void }) {
  const [tries, setTries] = useState(0)
  const isCorrect = answer !== undefined && value === answer
  const isWrong = answer !== undefined && value !== null && value !== answer
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const picked = value === i
          let cls = 'border-ink/10 bg-white hover:border-skyblue/60'
          if (picked && answer === undefined) cls = 'border-skyblue bg-skyblue/15'
          if (picked && isCorrect) cls = 'border-grass bg-grass/20'
          if (picked && isWrong) cls = 'border-rocket bg-rocket/10'
          return (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(i)
                if (answer !== undefined && i !== answer) setTries((t) => t + 1)
              }}
              className={`rounded-xl border-2 px-4 py-3 text-left font-semibold text-ink transition ${cls}`}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              {o}
            </button>
          )
        })}
      </div>
      {isCorrect && (
        <Callout emoji="🎉" tone="grass" className="mt-3 animate-pop">
          <strong>Yes!</strong> {explain}
        </Callout>
      )}
      {isWrong && (
        <Callout emoji="🤔" tone="sun" className="mt-3 animate-pop">
          Not quite. {tries >= 2 && explain ? <>Hint: {explain}</> : 'Think about it and try another answer.'}
        </Callout>
      )}
    </div>
  )
}
