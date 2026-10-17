import { Link } from 'react-router'
import { useAppAuth } from '../auth/AppAuth'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'
import { StatTile } from '../components/ui/StatTile'
import { WORKSHEETS } from '../content/water-rocket/worksheets'
import { useDesigns } from '../lib/useDesigns'
import { useLaunchLog } from '../lib/useLaunchLog'
import { useWorksheetIndex } from '../lib/useWorksheet'
import { WORKSHOP_WATER_ROCKET } from '../sim/presets'
import { answerableCount } from './water-rocket/WorksheetsPage'

export default function MyWorkPage() {
  const { enabled, isSignedIn, displayName, email, signOut } = useAppAuth()
  const { designs } = useDesigns(WORKSHOP_WATER_ROCKET)
  const { launches } = useLaunchLog()
  const index = useWorksheetIndex()
  const completed = WORKSHEETS.filter((w) => (index[`${WORKSHOP_WATER_ROCKET}/${w.id}`]?.answered ?? 0) >= answerableCount(w)).length
  const best = launches.reduce((m, l) => Math.max(m, l.result.maxHeightM), 0)

  return (
    <Page>
      <h1 className="font-display text-4xl font-bold">
        {displayName ? `Hi ${displayName}! 👋` : 'My work 🧰'}
      </h1>
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
            <Link to="/sign-in" className="font-bold underline">Sign in</Link> with your email and we will send you a code. Then your rockets and
            worksheets follow you to any device.
          </Callout>
        )
      ) : (
        <p className="mt-1 text-ink-soft">Guest mode: your work is saved in this browser.</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile emoji="🚀" label="Rockets built" value={String(designs.length)} tone="sky" />
        <StatTile emoji="📒" label="Launches logged" value={String(launches.length)} tone="sun" />
        <StatTile emoji="⬆️" label="Best height" value={best ? `${best.toFixed(1)} m` : '—'} tone="grass" />
        <StatTile emoji="📝" label="Worksheets done" value={`${completed}/${WORKSHEETS.length}`} tone="grape" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link to="/workshops/water-rocket/hangar" className="card transition hover:-translate-y-1">
          <div className="text-4xl">🏠</div>
          <div className="mt-2 font-display text-xl font-bold">My rockets</div>
          <p className="text-ink-soft">Open, edit, copy or launch your saved designs.</p>
        </Link>
        <Link to="/workshops/water-rocket/launch" className="card transition hover:-translate-y-1">
          <div className="text-4xl">📒</div>
          <div className="mt-2 font-display text-xl font-bold">Flight log</div>
          <p className="text-ink-soft">Compare your launches and spot patterns.</p>
        </Link>
        <Link to="/workshops/water-rocket/worksheets" className="card transition hover:-translate-y-1">
          <div className="text-4xl">📝</div>
          <div className="mt-2 font-display text-xl font-bold">Worksheets</div>
          <p className="text-ink-soft">Pick up where you left off.</p>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Badges</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge earned={designs.length >= 1} emoji="🔧" label="First build" />
          <Badge earned={launches.length >= 3} emoji="🧪" label="Tester (3 launches)" />
          <Badge earned={best >= 30} emoji="🏔️" label="Sky high (30 m)" />
          <Badge earned={completed >= 1} emoji="📝" label="Worksheet wizard" />
          <Badge earned={completed >= WORKSHEETS.length} emoji="🎓" label="Rocket engineer" />
        </div>
      </section>
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
