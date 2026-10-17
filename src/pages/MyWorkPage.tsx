import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { BridgeDesign, BridgeTestRecord, DigestStats, MeResponse, RocketDesign } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { JoinWorkshopButton } from '../components/JoinWorkshopButton'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'
import { StatTile } from '../components/ui/StatTile'
import { BRIDGE_WORKSHEETS } from '../content/bridge-builder/worksheets'
import { WORKSHEETS } from '../content/water-rocket/worksheets'
import { WORKSHOPS } from '../content/workshops'
import { answerableCount } from '../content/worksheetUtils'
import { apiFetch } from '../lib/api'
import { useDesigns } from '../lib/useDesigns'
import { useEnrollments } from '../lib/useEnrollments'
import { useLaunchLog } from '../lib/useLaunchLog'
import { useTestLog } from '../lib/useTestLog'
import { useWorksheetIndex } from '../lib/useWorksheet'
import { WORKSHOP_WATER_ROCKET, normalizeDesign } from '../sim/presets'
import { WORKSHOP_BRIDGE, normalizeBridge } from '../store/bridgeStore'

export default function MyWorkPage() {
  const { enabled, isSignedIn, displayName, email, signOut } = useAppAuth()
  const { enrolled, leave } = useEnrollments()
  const { designs } = useDesigns<RocketDesign>(WORKSHOP_WATER_ROCKET, normalizeDesign)
  const { designs: bridges } = useDesigns<BridgeDesign>(WORKSHOP_BRIDGE, normalizeBridge)
  const { launches } = useLaunchLog()
  const { records: bridgeTests } = useTestLog<BridgeTestRecord>(WORKSHOP_BRIDGE)
  const index = useWorksheetIndex()

  const hasRockets = enrolled.includes(WORKSHOP_WATER_ROCKET)
  const hasBridges = enrolled.includes(WORKSHOP_BRIDGE)
  const rocketWs = WORKSHEETS.filter((w) => (index[`${WORKSHOP_WATER_ROCKET}/${w.id}`]?.answered ?? 0) >= answerableCount(w)).length
  const bridgeWs = BRIDGE_WORKSHEETS.filter((w) => (index[`${WORKSHOP_BRIDGE}/${w.id}`]?.answered ?? 0) >= answerableCount(w)).length
  const best = launches.reduce((m, l) => Math.max(m, l.result.maxHeightM), 0)
  const bestBridge = bridgeTests.reduce((m, t) => Math.max(m, t.result.capacityKg ?? 0), 0)
  const joinedWorkshops = WORKSHOPS.filter((w) => enrolled.includes(w.slug))
  const notJoined = WORKSHOPS.filter((w) => w.status === 'live' && !enrolled.includes(w.slug))

  return (
    <Page>
      <h1 className="font-display text-4xl font-bold">{displayName ? `Hi ${displayName}! 👋` : 'My work 🧰'}</h1>
      {enabled ? (
        isSignedIn ? (
          <p className="mt-1 text-ink-soft">
            Signed in as {email}.{' '}
            <button type="button" className="font-bold underline" onClick={() => void signOut()}>
              Sign out
            </button>
          </p>
        ) : (
          <Callout emoji="☁️" tone="sky" className="mt-4" title="Save your work to your account">
            <Link to="/sign-in" className="font-bold underline">
              Sign in
            </Link>{' '}
            with your email and we will send you a code. Then your workshops, designs and worksheets follow you to any device.
          </Callout>
        )
      ) : (
        <p className="mt-1 text-ink-soft">Guest mode: your work is saved in this browser.</p>
      )}

      {/* Joined workshops */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">My workshops</h2>
          <Link to="/#workshops" className="text-sm font-bold text-ink-soft underline">
            Browse all workshops
          </Link>
        </div>
        {joinedWorkshops.length === 0 ? (
          <div className="card mt-3 text-center">
            <div className="text-6xl">🎒</div>
            <p className="prose-kid mt-2">You have not joined a workshop yet. Join one and it appears here with your progress.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {notJoined.map((w) => (
                <div key={w.slug} className="rounded-2xl border-2 border-ink/10 p-4 text-left">
                  <div className="font-display text-xl font-bold">
                    {w.emoji} {w.title}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{w.tagline}</p>
                  <div className="mt-3 flex gap-2">
                    <JoinWorkshopButton workshop={w.slug} size="sm" />
                    <Link to={w.path} className="btn-ghost !px-3 !py-1 text-sm">
                      Have a look first
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {joinedWorkshops.map((w) => (
              <div key={w.slug} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-chunky-sm ring-1 ring-ink/5">
                <Link to={w.path} className="font-display font-bold">
                  {w.emoji} {w.title}
                </Link>
                <button type="button" className="text-xs font-bold text-ink-soft underline" onClick={() => void leave(w.slug)} title="Remove from my profile">
                  leave
                </button>
              </div>
            ))}
            {notJoined.map((w) => (
              <div key={w.slug} className="flex items-center gap-2 rounded-full border-2 border-dashed border-ink/15 px-3 py-1.5">
                <span className="text-ink-soft">
                  {w.emoji} {w.title}
                </span>
                <JoinWorkshopButton workshop={w.slug} size="sm" className="!py-0.5" />
              </div>
            ))}
          </div>
        )}
      </section>

      {hasRockets && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold">🚀 Water Rocket Lab</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile emoji="🚀" label="Rockets built" value={String(designs.length)} tone="sky" />
            <StatTile emoji="📒" label="Launches logged" value={String(launches.length)} tone="sun" />
            <StatTile emoji="⬆️" label="Best height" value={best ? `${best.toFixed(1)} m` : '—'} tone="grass" />
            <StatTile emoji="📝" label="Worksheets done" value={`${rocketWs}/${WORKSHEETS.length}`} tone="grape" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Link to="/workshops/water-rocket/hangar" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">🏠 My rockets</div>
              <p className="text-sm text-ink-soft">Open, edit, copy or launch your saved designs.</p>
            </Link>
            <Link to="/workshops/water-rocket/launch" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">📒 Flight log</div>
              <p className="text-sm text-ink-soft">Compare your launches and spot patterns.</p>
            </Link>
            <Link to="/workshops/water-rocket/worksheets" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">📝 Worksheets</div>
              <p className="text-sm text-ink-soft">Pick up where you left off.</p>
            </Link>
          </div>
        </section>
      )}

      {hasBridges && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold">🌉 Bridge Builder</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile emoji="🌉" label="Bridges built" value={String(bridges.length)} tone="grass" />
            <StatTile emoji="🏋️" label="Load tests" value={String(bridgeTests.length)} tone="sun" />
            <StatTile emoji="💪" label="Strongest bridge" value={bestBridge ? `${bestBridge.toFixed(1)} kg` : '—'} tone="sky" />
            <StatTile emoji="📝" label="Worksheets done" value={`${bridgeWs}/${BRIDGE_WORKSHEETS.length}`} tone="grape" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Link to="/workshops/bridge-builder/hangar" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">🏠 My bridges</div>
              <p className="text-sm text-ink-soft">Open, edit or load-test your saved bridges.</p>
            </Link>
            <Link to="/workshops/bridge-builder/test" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">📒 Test log</div>
              <p className="text-sm text-ink-soft">Compare what each version held.</p>
            </Link>
            <Link to="/workshops/bridge-builder/worksheets" className="card py-4 transition hover:-translate-y-1">
              <div className="font-display text-lg font-bold">📝 Worksheets</div>
              <p className="text-sm text-ink-soft">Triangles, buckling and budgets.</p>
            </Link>
          </div>
        </section>
      )}

      {(hasRockets || hasBridges) && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {hasRockets && (
              <>
                <Badge earned={designs.length >= 1} emoji="🔧" label="First build" />
                <Badge earned={launches.length >= 3} emoji="🧪" label="Tester (3 launches)" />
                <Badge earned={best >= 30} emoji="🏔️" label="Sky high (30 m)" />
                <Badge earned={rocketWs >= 1} emoji="📝" label="Worksheet wizard" />
                <Badge earned={rocketWs >= WORKSHEETS.length} emoji="🎓" label="Rocket engineer" />
              </>
            )}
            {hasBridges && (
              <>
                <Badge earned={bridges.length >= 1} emoji="🌉" label="Bridge builder" />
                <Badge earned={bestBridge >= 10} emoji="🏋️" label="Heavy lifter (10 kg)" />
                <Badge earned={bridgeWs >= BRIDGE_WORKSHEETS.length} emoji="🎓" label="Bridge engineer" />
              </>
            )}
          </div>
        </section>
      )}

      <WeeklySummaryCard />
    </Page>
  )
}

function Badge({ earned, emoji, label }: { earned: boolean; emoji: string; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-display font-bold ${earned ? 'border-sun bg-sun/30 text-ink' : 'border-ink/10 bg-white text-ink/40 grayscale'}`}>
      <span className="text-2xl">{emoji}</span>
      {label}
    </div>
  )
}

/** Weekly email preference plus "this week so far". Needs an account. */
function WeeklySummaryCard() {
  const { enabled, isSignedIn, isLoaded, getToken } = useAppAuth()
  const remote = isLoaded && isSignedIn
  const [me, setMe] = useState<MeResponse | null>(null)
  const [week, setWeek] = useState<DigestStats | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!remote) return
    apiFetch<MeResponse>('/api/me', getToken).then(setMe).catch(() => {})
    apiFetch<DigestStats>('/api/digest/preview', getToken).then(setWeek).catch(() => {})
  }, [remote, getToken])

  const toggle = useCallback(async () => {
    if (!me) return
    setSaving(true)
    try {
      setMe(await apiFetch<MeResponse>('/api/me/preferences', getToken, { method: 'PUT', body: { digestOptIn: !me.digestOptIn } }))
    } finally {
      setSaving(false)
    }
  }, [me, getToken])

  return (
    <section className="card mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">📬 Weekly summary</h2>
          <p className="text-ink-soft">
            Once a week (Monday morning) we email a short summary of what you built, launched and tested in the workshops you have joined. No
            other emails, ever.
          </p>
        </div>
        {remote && me && (
          <button type="button" className={me.digestOptIn ? 'btn-grass' : 'btn-ghost'} onClick={() => void toggle()} disabled={saving}>
            {me.digestOptIn ? '✅ Weekly email on' : '🔕 Weekly email off'}
          </button>
        )}
      </div>
      {!enabled || !remote ? (
        <p className="mt-3 text-sm text-ink-soft">Sign in to turn the weekly summary on or off and to see this week so far.</p>
      ) : week ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile emoji="🚀" label="Launches this week" value={String(week.rockets.launches)} tone="sky" />
          <StatTile emoji="⬆️" label="Best height" value={week.rockets.bestHeightM != null ? `${week.rockets.bestHeightM.toFixed(1)} m` : '—'} tone="grass" />
          <StatTile emoji="🏋️" label="Bridge tests" value={String(week.bridges.tests)} tone="sun" />
          <StatTile emoji="📝" label="Worksheets touched" value={String(week.worksheetsTouched)} tone="grape" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">Loading this week…</p>
      )}
      {me?.lastDigestAt && <p className="mt-2 text-xs text-ink-soft">Last summary sent {new Date(me.lastDigestAt).toLocaleDateString()}.</p>}
    </section>
  )
}
