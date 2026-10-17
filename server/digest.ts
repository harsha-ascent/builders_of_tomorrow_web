import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'
import type { DigestStats } from '../shared/types'
import type { Db } from './db/client'
import { designs, enrollments, launches, users, worksheetProgress } from './db/schema'

export const DIGEST_DAYS = 7

export async function enrolledWorkshops(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db.select({ workshop: enrollments.workshop }).from(enrollments).where(eq(enrollments.userId, userId))
  return new Set(rows.map((r) => r.workshop))
}

/** Everything a learner did in the last `days` days in the workshops they have joined. */
export async function digestStatsFor(db: Db, userId: string, days = DIGEST_DAYS, until = new Date()): Promise<DigestStats> {
  const since = new Date(until.getTime() - days * 86_400_000)
  const joined = await enrolledWorkshops(db, userId)

  const [rocketLaunches] = await db
    .select({
      n: sql<number>`count(*)::int`,
      best: sql<number | null>`max((${launches.result}->>'maxHeightM')::numeric)::float`,
      soft: sql<number>`count(*) filter (where (${launches.result}->>'safeLanding') = 'true')::int`,
    })
    .from(launches)
    .where(and(eq(launches.userId, userId), eq(launches.workshop, 'water-rocket'), gte(launches.createdAt, since)))

  const [bridgeTests] = await db
    .select({
      n: sql<number>`count(*)::int`,
      best: sql<number | null>`max((${launches.result}->>'capacityKg')::numeric)::float`,
    })
    .from(launches)
    .where(and(eq(launches.userId, userId), eq(launches.workshop, 'bridge-builder'), gte(launches.createdAt, since)))

  const designRows = await db
    .select({ workshop: designs.workshop, n: sql<number>`count(*)::int` })
    .from(designs)
    .where(and(eq(designs.userId, userId), gte(designs.updatedAt, since)))
    .groupBy(designs.workshop)

  const [ws] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(worksheetProgress)
    .where(and(eq(worksheetProgress.userId, userId), gte(worksheetProgress.updatedAt, since)))

  const rocketDesigns = designRows.find((r) => r.workshop === 'water-rocket')?.n ?? 0
  const bridgeDesigns = designRows.find((r) => r.workshop === 'bridge-builder')?.n ?? 0
  const hasRockets = joined.has('water-rocket')
  const hasBridges = joined.has('bridge-builder')
  const stats: DigestStats = {
    since: since.toISOString(),
    until: until.toISOString(),
    rockets: hasRockets
      ? {
          designsTouched: rocketDesigns,
          launches: rocketLaunches?.n ?? 0,
          bestHeightM: rocketLaunches?.best ?? null,
          softLandings: rocketLaunches?.soft ?? 0,
        }
      : { designsTouched: 0, launches: 0, bestHeightM: null, softLandings: 0 },
    bridges: hasBridges
      ? { designsTouched: bridgeDesigns, tests: bridgeTests?.n ?? 0, bestLoadKg: bridgeTests?.best ?? null }
      : { designsTouched: 0, tests: 0, bestLoadKg: null },
    worksheetsTouched: joined.size ? (ws?.n ?? 0) : 0,
    hasActivity: false,
  }
  stats.hasActivity =
    stats.rockets.designsTouched + stats.rockets.launches + stats.bridges.designsTouched + stats.bridges.tests + stats.worksheetsTouched > 0
  return stats
}

/** Users who want the digest and have an email address. */
export async function digestRecipients(db: Db, limit = 500) {
  return db
    .select({ id: users.id, email: users.email, displayName: users.displayName, lastDigestAt: users.lastDigestAt })
    .from(users)
    .where(and(isNotNull(users.email), eq(users.digestOptIn, true)))
    .limit(limit)
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function digestSubject(stats: DigestStats, name: string | null) {
  const who = name ? `${name}'s` : 'Your'
  if (stats.rockets.bestHeightM != null) return `🚀 ${who} week at Builders of Tomorrow: best flight ${stats.rockets.bestHeightM.toFixed(0)} m`
  if (stats.bridges.bestLoadKg != null) return `🌉 ${who} week at Builders of Tomorrow: strongest bridge held ${stats.bridges.bestLoadKg.toFixed(1)} kg`
  return `🧰 ${who} week at Builders of Tomorrow`
}

/** Friendly HTML for the weekly summary. Pure function so it can be unit-tested. */
export function digestHtml(stats: DigestStats, opts: { name: string | null; origin: string }): string {
  const name = opts.name ? esc(opts.name) : 'Builder'
  const row = (emoji: string, label: string, value: string) =>
    `<tr><td style="padding:8px 0;font-size:16px">${emoji} ${label}</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:700">${value}</td></tr>`
  const rows: string[] = []
  const r = stats.rockets
  const b = stats.bridges
  if (r.launches) rows.push(row('🚀', 'Rocket launches', `${r.launches}`))
  if (r.bestHeightM != null) rows.push(row('⬆️', 'Best height', `${r.bestHeightM.toFixed(1)} m`))
  if (r.softLandings) rows.push(row('🪂', 'Soft landings', `${r.softLandings}`))
  if (r.designsTouched) rows.push(row('🔧', 'Rockets designed or improved', `${r.designsTouched}`))
  if (b.tests) rows.push(row('🏋️', 'Bridge load tests', `${b.tests}`))
  if (b.bestLoadKg != null) rows.push(row('🌉', 'Strongest bridge', `${b.bestLoadKg.toFixed(1)} kg`))
  if (b.designsTouched) rows.push(row('🧩', 'Bridges designed or improved', `${b.designsTouched}`))
  if (stats.worksheetsTouched) rows.push(row('📝', 'Worksheets worked on', `${stats.worksheetsTouched}`))
  const tip = r.launches && !r.softLandings
    ? 'Tip for next week: try a parachute in Build → Coming back down for a soft landing.'
    : b.tests
      ? 'Tip for next week: double up the piece that broke and test again — chasing the weakest link is real engineering.'
      : 'Tip for next week: pick ONE thing to change, predict what will happen, then test it.'
  return `
    <div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1e2a4a">
      <h1 style="font-size:26px;margin:0 0 4px">Hi ${name}! Here is your week 🧰</h1>
      <p style="margin:0 0 16px;color:#4a5578">${fmtDate(stats.since)} – ${fmtDate(stats.until)} · Builders of Tomorrow</p>
      <table style="border-collapse:collapse;width:100%">${rows.join('')}</table>
      <p style="margin:20px 0 0;padding:12px 16px;background:#fff8ec;border-left:6px solid #ffd93d;border-radius:8px">${tip}</p>
      <p style="margin:20px 0 0"><a href="${esc(opts.origin)}/me" style="background:#ff6b6b;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open My Work</a></p>
      <p style="margin:24px 0 0;font-size:12px;color:#888">You get this summary once a week. Turn it off any time under My Work → Weekly summary. Sent by Builders of Tomorrow, a project of Ascent Intelligent Technologies.</p>
    </div>`
}
