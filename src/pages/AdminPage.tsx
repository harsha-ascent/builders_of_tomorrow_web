import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { AdminStats, AdminUser, AdminUsersResponse } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { BarChart } from '../components/charts/BarChart'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'
import { StatTile } from '../components/ui/StatTile'
import { WORKSHOPS } from '../content/workshops'
import { ApiError, apiFetch } from '../lib/api'

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const fmtShort = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`)
const emojiOf = (slug: string) => WORKSHOPS.find((w) => w.slug === slug)?.emoji ?? '🧩'
const titleOf = (slug: string) => WORKSHOPS.find((w) => w.slug === slug)?.title ?? slug

/** Site-owner dashboard: who has registered and what they have been doing. The API refuses everyone else. */
export default function AdminPage() {
  const { enabled, isLoaded, isSignedIn, getToken } = useAppAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUsersResponse | null>(null)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn) return
    let alive = true
    Promise.all([apiFetch<AdminStats>('/api/admin/stats', getToken), apiFetch<AdminUsersResponse>('/api/admin/users', getToken)])
      .then(([s, u]) => {
        if (!alive) return
        setError(null)
        setStats(s)
        setUsers(u)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof ApiError ? { status: e.status, message: e.message } : { status: 0, message: 'Could not load the dashboard' })
      })
    return () => {
      alive = false
    }
  }, [enabled, isLoaded, isSignedIn, getToken])

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Admin 🛠️</h1>
          <p className="mt-1 text-ink-soft">Registered learners and what they have been building. Only the site owner can see this.</p>
        </div>
        {stats && <p className="text-xs font-semibold text-ink-soft">Updated {new Date(stats.generatedAt).toLocaleString()}</p>}
      </div>

      {!enabled ? (
        <Callout emoji="🛠️" tone="sun" className="mt-6">
          Accounts are not switched on in this build, so there is nothing to show here.
        </Callout>
      ) : !isLoaded ? (
        <p className="mt-6 text-ink-soft">Loading…</p>
      ) : !isSignedIn ? (
        <Callout emoji="🔑" tone="sky" className="mt-6" title="Sign in first">
          <Link to="/sign-in" className="font-bold underline">
            Sign in
          </Link>{' '}
          with the site owner's account to open the dashboard.
        </Callout>
      ) : error ? (
        <Callout emoji={error.status === 403 ? '🚫' : '⚠️'} tone="rocket" className="mt-6" title={error.status === 403 ? 'This page is only for the site owner' : 'Could not load the dashboard'}>
          {error.status === 403 ? (
            <>
              Your account is not on the admin list.{' '}
              <Link to="/" className="font-bold underline">
                Back to the workshops
              </Link>
              .
            </>
          ) : (
            error.message
          )}
        </Callout>
      ) : !stats || !users ? (
        <p className="mt-6 text-ink-soft">Loading the numbers…</p>
      ) : (
        <>
          <Overview stats={stats} />
          <UsersTable data={users} />
        </>
      )}
    </Page>
  )
}

function Overview({ stats }: { stats: AdminStats }) {
  const liveWorkshops = WORKSHOPS.filter((w) => w.status === 'live')
  const totalRuns = Object.values(stats.workshops).reduce((n, w) => n + w.runs, 0)
  const signups = stats.signupsByWeek.map((w) => ({ label: fmtShort(w.weekStart), value: w.count }))
  const day = (k: 'launches' | 'tests' | 'worksheets') => stats.activityByDay.map((d) => ({ label: String(Number(d.day.slice(8, 10))), value: d[k] }))
  return (
    <>
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile emoji="👥" label="Registered" value={String(stats.users.total)} sub={`${stats.users.withEmail} with an email`} tone="sky" />
        <StatTile emoji="🆕" label="New this week" value={String(stats.users.new7d)} sub={`${stats.users.new30d} in 30 days`} tone="grass" />
        <StatTile emoji="⚡" label="Active this week" value={String(stats.users.active7d)} sub="saved, launched or tested" tone="sun" />
        <StatTile emoji="🧪" label="Launches & tests" value={String(totalRuns)} sub="all time" tone="rocket" />
        <StatTile emoji="📝" label="Worksheets saved" value={String(stats.worksheets.saved)} sub={`${stats.worksheets.saved7d} this week`} tone="grape" />
        <StatTile emoji="📬" label="Weekly email on" value={String(stats.users.digestOn)} sub={`of ${stats.users.total}`} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-xl font-bold text-ink">Sign-ups per week</h2>
          <p className="text-sm text-ink-soft">Last 12 weeks, by the Monday each week starts.</p>
          <div className="mt-2">
            <BarChart data={signups} yLabel="New accounts" color="#4cc9f0" />
          </div>
        </div>
        <div className="card">
          <h2 className="font-display text-xl font-bold text-ink">Workshops</h2>
          <p className="text-sm text-ink-soft">Joins, saved designs and launches or load tests.</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                <th className="py-1">Workshop</th>
                <th className="py-1 text-right">Joined</th>
                <th className="py-1 text-right">Designs</th>
                <th className="py-1 text-right">Runs</th>
                <th className="py-1 text-right">Runs (7 d)</th>
              </tr>
            </thead>
            <tbody>
              {liveWorkshops.map((w) => {
                const s = stats.workshops[w.slug] ?? { joined: 0, designs: 0, runs: 0, runs7d: 0 }
                return (
                  <tr key={w.slug} className="border-t border-ink/5">
                    <td className="py-2 font-bold text-ink">
                      {w.emoji} {w.title}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.joined}</td>
                    <td className="py-2 text-right tabular-nums">{s.designs}</td>
                    <td className="py-2 text-right tabular-nums">{s.runs}</td>
                    <td className="py-2 text-right tabular-nums">{s.runs7d}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-soft">
            Uploads: {stats.files.count} files, {fmtBytes(stats.files.bytes)}. Roles:{' '}
            {Object.entries(stats.users.roles)
              .map(([r, n]) => `${n} ${r}`)
              .join(', ') || 'none yet'}
            .
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="font-display text-lg font-bold text-ink">🚀 Rocket launches per day</h2>
          <p className="text-xs text-ink-soft">Last 14 days, by day of the month.</p>
          <BarChart data={day('launches')} yLabel="Launches" color="#4cc9f0" />
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-bold text-ink">🌉 Bridge tests per day</h2>
          <BarChart data={day('tests')} yLabel="Load tests" color="#6bcb77" />
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-bold text-ink">📝 Worksheet saves per day</h2>
          <BarChart data={day('worksheets')} yLabel="Saves" color="#845ec2" />
        </div>
      </section>
    </>
  )
}

type SortKey = 'createdAt' | 'lastActiveAt' | 'email'

function UsersTable({ data }: { data: AdminUsersResponse }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('createdAt')
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? data.users.filter((u) => (u.email ?? '').toLowerCase().includes(needle) || (u.displayName ?? '').toLowerCase().includes(needle) || u.id.includes(needle))
      : data.users
    const key = (u: AdminUser) => (sort === 'email' ? (u.email ?? '~') : (u[sort] ?? ''))
    return [...filtered].sort((a, b) => (sort === 'email' ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a))))
  }, [data.users, q, sort])

  const exportCsv = () => {
    const head = ['id', 'email', 'name', 'role', 'joined', 'last_active', 'workshops', 'rocket_designs', 'bridge_designs', 'launches', 'bridge_tests', 'worksheets', 'files', 'weekly_email']
    const esc = (v: string | number | boolean | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = rows.map((u) =>
      [
        u.id,
        u.email,
        u.displayName,
        u.role,
        u.createdAt,
        u.lastActiveAt,
        u.workshops.join(' '),
        u.designs['water-rocket'] ?? 0,
        u.designs['bridge-builder'] ?? 0,
        u.launches,
        u.bridgeTests,
        u.worksheets,
        u.files,
        u.digestOptIn,
      ]
        .map(esc)
        .join(','),
    )
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `builders-of-tomorrow-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Registered learners</h2>
          <p className="text-sm text-ink-soft">
            {rows.length} of {data.total}
            {data.users.length < data.total ? ` (showing the newest ${data.users.length})` : ''}. Emails appear after a learner's first visit to My Work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="input !w-64 !py-2" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search learners" />
          <select className="input !w-auto !py-2" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort learners">
            <option value="createdAt">Newest first</option>
            <option value="lastActiveAt">Recently active</option>
            <option value="email">Email A–Z</option>
          </select>
          <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={exportCsv} disabled={rows.length === 0}>
            ⬇️ CSV
          </button>
        </div>
      </div>

      <div className="card mt-3 overflow-x-auto !p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-ink/5 text-left text-xs font-extrabold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-2">Learner</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Workshops</th>
              <th className="px-3 py-2 text-right">Designs</th>
              <th className="px-3 py-2 text-right">Launches</th>
              <th className="px-3 py-2 text-right">Tests</th>
              <th className="px-3 py-2 text-right">Worksheets</th>
              <th className="px-3 py-2 text-right">Files</th>
              <th className="px-3 py-2">Last active</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-ink-soft">
                  No learners match.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-ink/5 align-top">
                <td className="px-4 py-2">
                  <div className="font-bold text-ink">{u.displayName || u.email || 'Unnamed'}</div>
                  <div className="text-xs text-ink-soft">{u.displayName && u.email ? u.email : u.id}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="chip">{u.role}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                <td className="px-3 py-2">
                  {u.workshops.length === 0 ? (
                    <span className="text-ink-soft">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {u.workshops.map((w) => (
                        <span key={w} className="chip" title={titleOf(w)}>
                          {emojiOf(w)}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{Object.values(u.designs).reduce((a, b) => a + b, 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.launches}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.bridgeTests}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.worksheets}</td>
                <td className="px-3 py-2 text-right tabular-nums" title={fmtBytes(u.filesBytes)}>
                  {u.files}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(u.lastActiveAt)}</td>
                <td className="px-3 py-2 whitespace-nowrap" title={u.lastDigestAt ? `Last summary ${fmtDate(u.lastDigestAt)}` : 'No summary sent yet'}>
                  {u.digestOptIn ? '✅ weekly' : '🔕 off'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
