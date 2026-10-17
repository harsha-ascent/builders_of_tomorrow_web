import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { RocketDesign } from '../../../shared/types'
import { useAppAuth } from '../../auth/AppAuth'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { fmt } from '../../lib/format'
import { predict } from '../../lib/runSim'
import { useDesigns } from '../../lib/useDesigns'
import { SAMPLE_DESIGNS, WORKSHOP_WATER_ROCKET, makeDesign, normalizeDesign } from '../../sim/presets'
import { useDesignStore } from '../../store/designStore'

export default function HangarPage() {
  const { designs, loading, error, saveDesign, deleteDesign, uploadLocalDesigns, localCount, remote } = useDesigns<RocketDesign>(WORKSHOP_WATER_ROCKET, normalizeDesign)
  const { enabled, isSignedIn } = useAppAuth()
  const current = useDesignStore((s) => s.design)
  const dirty = useDesignStore((s) => s.dirty)
  const load = useDesignStore((s) => s.load)
  const markSaved = useDesignStore((s) => s.markSaved)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  async function saveCurrent() {
    setBusy('current')
    try {
      markSaved(await saveDesign(current))
    } finally {
      setBusy(null)
    }
  }

  async function duplicate(d: RocketDesign) {
    setBusy(d.id)
    try {
      await saveDesign(makeDesign({ ...d, name: `${d.name} 2` }))
    } finally {
      setBusy(null)
    }
  }

  async function remove(d: RocketDesign) {
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
        <Callout emoji="☁️" title="Keep your rockets anywhere" tone="sky" className="mb-6">
          Right now your rockets live in this browser. <Link to="/sign-in" className="font-bold underline">Sign in with your email</Link> to
          keep them safe and open them on any device.
        </Callout>
      )}
      {remote && localCount > 0 && (
        <Callout emoji="📦" title={`You have ${localCount} rocket${localCount === 1 ? '' : 's'} saved on this device`} tone="sun" className="mb-6">
          <button type="button" className="btn-sun !py-2 text-sm" onClick={() => void uploadLocalDesigns()}>
            Move them into my account
          </button>
        </Callout>
      )}

      <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-skyblue/20 to-sun/20">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">On the workbench now</div>
          <div className="font-display text-2xl font-bold">
            {current.name} {dirty && <span className="chip ml-2 bg-sun/50 align-middle text-xs">unsaved</span>}
          </div>
          <DesignChips d={current} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-grass" onClick={saveCurrent} disabled={busy === 'current'}>
            💾 Save it
          </button>
          <Link to="../build" className="btn-ghost">
            🔧 Edit
          </Link>
          <Link to="../launch" className="btn-primary">
            🚀 Launch
          </Link>
        </div>
      </div>

      <SectionTitle emoji="🏠" title="My rockets" subtitle={remote ? 'Saved to your account.' : 'Saved in this browser.'} />
      {error && (
        <Callout emoji="⚠️" tone="rocket" className="mb-4">
          {error}
        </Callout>
      )}
      {loading ? (
        <p className="text-ink-soft">Loading your hangar…</p>
      ) : designs.length === 0 ? (
        <div className="card text-center">
          <div className="text-6xl">🛸</div>
          <p className="prose-kid mt-2">Your hangar is empty. Build a rocket and press Save, or start from one of the samples below.</p>
          <Link to="../build" className="btn-primary mt-4">
            🔧 Build my first rocket
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <RocketCard
              key={d.id}
              d={d}
              busy={busy === d.id}
              onOpen={() => {
                load(d)
                navigate('../build')
              }}
              onLaunch={() => {
                load(d)
                navigate('../launch')
              }}
              onDuplicate={() => void duplicate(d)}
              onDelete={() => void remove(d)}
            />
          ))}
        </div>
      )}

      <section className="mt-12">
        <SectionTitle emoji="🎁" title="Sample rockets" subtitle="Add one to your hangar and make it your own." />
        <div className="grid gap-4 sm:grid-cols-3">
          {SAMPLE_DESIGNS.map((s) => (
            <div key={s.name} className="card">
              <div className="flex items-center gap-2">
                <span className="inline-block h-6 w-6 rounded-full border-4 border-white shadow" style={{ backgroundColor: s.bodyColor }} />
                <div className="font-display text-xl font-bold">{s.name}</div>
              </div>
              <DesignChips d={s as RocketDesign} />
              <button type="button" className="btn-sky mt-3 !py-2 text-sm" onClick={() => void saveDesign(makeDesign({ ...s }))}>
                ➕ Add to my hangar
              </button>
            </div>
          ))}
        </div>
      </section>
    </Page>
  )
}

function DesignChips({ d }: { d: RocketDesign }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1 text-xs">
      <span className="chip">🧴 {d.bottleVolumeL} L</span>
      <span className="chip">💧 {fmt.pct(d.waterFraction)}</span>
      <span className="chip">🫧 {d.pressurePsi} psi</span>
      <span className="chip">📐 {d.launchAngleDeg}°</span>
      <span className="chip">
        {d.noseShape === 'pointy' ? '🔺' : d.noseShape === 'round' ? '🔴' : '⬛'} {d.finCount} fins
      </span>
      {d.boosters?.length > 0 && <span className="chip bg-grape/20">🚀×{d.boosters.length + 1} stages</span>}
      {d.recovery === 'parachute' && <span className="chip bg-sun/40">🪂 {Math.round(d.parachuteDiameterM * 100)} cm</span>}
      {d.windMs > 0 && <span className="chip">🌬️ {d.windMs} m/s</span>}
    </div>
  )
}

function RocketCard({ d, busy, onOpen, onLaunch, onDuplicate, onDelete }: { d: RocketDesign; busy: boolean; onOpen: () => void; onLaunch: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const p = useMemo(() => predict(d), [d])
  return (
    <article className={`card flex flex-col ${busy ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <MiniRocket d={d} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl font-bold" title={d.name}>
            {d.name}
          </h3>
          <div className="text-xs font-bold text-ink-soft">Updated {fmt.date(d.updatedAt)}</div>
          <DesignChips d={d} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-ink/5 p-3 text-center">
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Height</div>
          <div className="font-display text-lg font-bold tabular-nums">{p.liftedOff ? fmt.m(p.maxHeightM, 0) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Distance</div>
          <div className="font-display text-lg font-bold tabular-nums">{p.liftedOff ? fmt.m(p.rangeM, 0) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-ink-soft">Flight</div>
          <div className="font-display text-lg font-bold tabular-nums">{p.liftedOff ? fmt.s(p.flightTimeS) : '—'}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-sm" onClick={onLaunch} disabled={busy}>
          🚀 Launch
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

/** Tiny CSS rocket so cards show the colours without a 3-D canvas. */
function MiniRocket({ d }: { d: RocketDesign }) {
  return (
    <div className="flex h-20 w-12 shrink-0 flex-col items-center justify-end" aria-hidden>
      <div className="h-0 w-0 border-x-[14px] border-b-[18px] border-x-transparent" style={{ borderBottomColor: d.noseColor }} />
      <div className="relative w-7 flex-1 rounded-b-md" style={{ backgroundColor: d.bodyColor }}>
        <div className="absolute -left-3 bottom-0 h-0 w-0 border-y-[7px] border-r-[12px] border-y-transparent" style={{ borderRightColor: d.finColor }} />
        <div className="absolute -right-3 bottom-0 h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent" style={{ borderLeftColor: d.finColor }} />
      </div>
      <div className="h-2 w-3 rounded-b bg-ink/60" />
    </div>
  )
}
