import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { BridgeDesign } from '../../../shared/types'
import { useAppAuth } from '../../auth/AppAuth'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { fmt } from '../../lib/format'
import { useDesigns } from '../../lib/useDesigns'
import { MATERIALS, MAX_HEIGHT_CM, MIN_HEIGHT_CM, SPAN_CM, TEMPLATES, analyzeBridge, isSupport, layersOf } from '../../sim/bridge'
import { WORKSHOP_BRIDGE, makeBridge, normalizeBridge, useBridgeStore } from '../../store/bridgeStore'

export default function BridgeHangarPage() {
  const { designs, loading, error, saveDesign, deleteDesign, uploadLocalDesigns, localCount, remote } = useDesigns<BridgeDesign>(WORKSHOP_BRIDGE, normalizeBridge)
  const { enabled, isSignedIn } = useAppAuth()
  const current = useBridgeStore((s) => s.design)
  const dirty = useBridgeStore((s) => s.dirty)
  const material = useBridgeStore((s) => s.material)
  const load = useBridgeStore((s) => s.load)
  const markSaved = useBridgeStore((s) => s.markSaved)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const currentAnalysis = useMemo(() => analyzeBridge(current), [current])

  async function saveCurrent() {
    setBusy('current')
    try {
      markSaved(await saveDesign(current))
    } finally {
      setBusy(null)
    }
  }
  async function duplicate(d: BridgeDesign) {
    setBusy(d.id)
    try {
      await saveDesign(makeBridge({ ...d, name: `${d.name} 2` }))
    } finally {
      setBusy(null)
    }
  }
  async function remove(d: BridgeDesign) {
    if (!window.confirm(`Delete "${d.name}"? This cannot be undone.`)) return
    setBusy(d.id)
    try {
      await deleteDesign(d.id)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page wide>
      {enabled && !isSignedIn && (
        <Callout emoji="☁️" title="Keep your bridges anywhere" tone="sky" className="mb-6">
          Right now your bridges live in this browser. <Link to="/sign-in" className="font-bold underline">Sign in with your email</Link> to keep them safe and open them on any device.
        </Callout>
      )}
      {remote && localCount > 0 && (
        <Callout emoji="📦" title={`You have ${localCount} bridge${localCount === 1 ? '' : 's'} saved on this device`} tone="sun" className="mb-6">
          <button type="button" className="btn-sun !py-2 text-sm" onClick={() => void uploadLocalDesigns()}>
            Move them into my account
          </button>
        </Callout>
      )}

      <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-grass/20 to-skyblue/20">
        <div className="flex items-center gap-4">
          <MiniTruss d={current} />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">On the workbench now</div>
            <div className="font-display text-2xl font-bold">
              {current.name} {dirty && <span className="chip ml-2 bg-sun/50 align-middle text-xs">unsaved</span>}
            </div>
            <Chips d={current} holds={currentAnalysis.ok ? currentAnalysis.capacityKg : null} massG={currentAnalysis.massG} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-grass" onClick={saveCurrent} disabled={busy === 'current'}>
            💾 Save it
          </button>
          <Link to="../build" className="btn-ghost">
            🔧 Edit
          </Link>
          <Link to="../test" className="btn-primary">
            🏋️ Test
          </Link>
        </div>
      </div>

      <SectionTitle emoji="🏠" title="My bridges" subtitle={remote ? 'Saved to your account.' : 'Saved in this browser.'} />
      {error && (
        <Callout emoji="⚠️" tone="rocket" className="mb-4">
          {error}
        </Callout>
      )}
      {loading ? (
        <p className="text-ink-soft">Loading your bridges…</p>
      ) : designs.length === 0 ? (
        <div className="card text-center">
          <div className="text-6xl">🏗️</div>
          <p className="prose-kid mt-2">No saved bridges yet. Build one and press Save, or start from a pattern below.</p>
          <Link to="../build" className="btn-primary mt-4">
            🔧 Build my first bridge
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <BridgeCard
              key={d.id}
              d={d}
              busy={busy === d.id}
              onOpen={() => {
                load(d)
                navigate('../build')
              }}
              onTest={() => {
                load(d)
                navigate('../test')
              }}
              onDuplicate={() => void duplicate(d)}
              onDelete={() => void remove(d)}
            />
          ))}
        </div>
      )}

      <section className="mt-12">
        <SectionTitle emoji="🧩" title="Patterns" subtitle={`Add one to your collection (made of ${MATERIALS[material].name.toLowerCase()}s) and make it your own.`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const d = makeBridge({ name: t.name }, t.id, material)
            const a = analyzeBridge(d)
            return (
              <div key={t.id} className="card">
                <div className="flex items-center gap-3">
                  <MiniTruss d={d} />
                  <div>
                    <div className="font-display text-xl font-bold">
                      {t.emoji} {t.name}
                    </div>
                    <div className="text-sm text-ink-soft">{t.blurb}</div>
                  </div>
                </div>
                <Chips d={d} holds={a.ok ? a.capacityKg : null} massG={a.massG} />
                <button type="button" className="btn-sky mt-3 !py-2 text-sm" onClick={() => void saveDesign(d)}>
                  ➕ Add to my bridges
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </Page>
  )
}

function Chips({ d, holds, massG }: { d: BridgeDesign; holds: number | null; massG: number }) {
  const mats = Array.from(new Set(d.members.map((m) => m.material)))
  return (
    <div className="mt-1 flex flex-wrap gap-1 text-xs">
      <span className="chip">🧩 {d.members.length} pieces</span>
      <span className="chip">⚖️ {massG.toFixed(1)} g</span>
      <span className="chip">{holds == null ? '⚠️ not ready' : `🏋️ ${holds.toFixed(1)} kg`}</span>
      <span className="chip">{d.loadMode === 'truck' ? '🚚 truck' : '🪣 bucket'}</span>
      {mats.map((m) => (
        <span key={m} className="chip">
          {MATERIALS[m].emoji} {MATERIALS[m].name}
        </span>
      ))}
      {d.members.some((m) => layersOf(m) > 1) && <span className="chip bg-grape/20">▮▮ laminated</span>}
    </div>
  )
}

function BridgeCard({ d, busy, onOpen, onTest, onDuplicate, onDelete }: { d: BridgeDesign; busy: boolean; onOpen: () => void; onTest: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const a = useMemo(() => analyzeBridge(d), [d])
  return (
    <article className={`card flex flex-col ${busy ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <MiniTruss d={d} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl font-bold" title={d.name}>
            {d.name}
          </h3>
          <div className="text-xs font-bold text-ink-soft">Updated {fmt.date(d.updatedAt)}</div>
          <Chips d={d} holds={a.ok ? a.capacityKg : null} massG={a.massG} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-ink/5 p-3 text-center">
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Holds</div>
          <div className="font-display text-lg font-bold tabular-nums">{a.ok ? `${a.capacityKg.toFixed(1)} kg` : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Cost</div>
          <div className="font-display text-lg font-bold tabular-nums">{a.costCoins.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Efficiency</div>
          <div className="font-display text-lg font-bold tabular-nums">{a.ok ? `${a.efficiency}×` : '—'}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-sm" onClick={onTest} disabled={busy}>
          🏋️ Test
        </button>
        <button type="button" className="btn-ghost !py-2 text-sm" onClick={onOpen} disabled={busy}>
          🔧 Edit
        </button>
        <button type="button" className="btn-ghost !py-2 text-sm" onClick={onDuplicate} disabled={busy}>
          📋 Copy
        </button>
        <button type="button" className="btn-ghost !py-2 text-sm text-rocket-dark" onClick={onDelete} disabled={busy}>
          🗑️
        </button>
      </div>
    </article>
  )
}

/** Tiny SVG thumbnail of a truss. */
export function MiniTruss({ d, width = 96 }: { d: BridgeDesign; width?: number }) {
  const x0 = -4
  const x1 = SPAN_CM + 4
  const y0 = MIN_HEIGHT_CM
  const y1 = MAX_HEIGHT_CM
  const h = ((y1 - y0) / (x1 - x0)) * width
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * width
  const sy = (y: number) => ((y1 - y) / (y1 - y0)) * h
  const nodes = new Map(d.nodes.map((n) => [n.id, n]))
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} className="shrink-0 rounded-lg bg-[#eef7ff]" aria-hidden>
      <line x1={sx(0)} x2={sx(SPAN_CM)} y1={sy(0)} y2={sy(0)} stroke="#1e2a4a" strokeOpacity={0.15} />
      {d.members.map((m) => {
        const a = nodes.get(m.a)
        const b = nodes.get(m.b)
        if (!a || !b) return null
        return <line key={m.id} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} stroke={MATERIALS[m.material].color} strokeWidth={1 + layersOf(m)} strokeLinecap="round" />
      })}
      {d.nodes.map((n) => (
        <circle key={n.id} cx={sx(n.x)} cy={sy(n.y)} r={isSupport(n.id) ? 2.5 : 1.6} fill={isSupport(n.id) ? '#1e2a4a' : '#fff'} stroke="#1e2a4a" strokeWidth={0.8} />
      ))}
    </svg>
  )
}
