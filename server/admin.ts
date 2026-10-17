import { sql } from 'drizzle-orm'
import type { AdminStats, AdminUser, AdminUsersResponse } from '../shared/types'
import type { Db } from './db/client'
import { designs, enrollments, files, launches, users, worksheetProgress } from './db/schema'

/** Used when ADMIN_EMAILS is not set: the site owner. */
export const DEFAULT_ADMIN_EMAILS = ['harsha@ascent-i-tech.in']

/** Parses the comma-separated ADMIN_EMAILS variable (case-insensitive, whitespace ignored). */
export function adminEmails(env: { ADMIN_EMAILS?: string }): Set<string> {
  const raw = env.ADMIN_EMAILS?.trim()
  const list = raw ? raw.split(',') : DEFAULT_ADMIN_EMAILS
  return new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean))
}

export function isAdminEmail(email: string | null | undefined, env: { ADMIN_EMAILS?: string }): boolean {
  if (!email) return false
  return adminEmails(env).has(email.trim().toLowerCase())
}

const DAY = 86_400_000

/** Monday 00:00 UTC of the week containing `d`. */
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (x.getUTCDay() + 6) % 7 // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow)
  return x
}

function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** Site-wide totals and small time series for the admin page. Read-only. */
export async function adminStats(db: Db, now = new Date()): Promise<AdminStats> {
  const since7 = new Date(now.getTime() - 7 * DAY)
  const since30 = new Date(now.getTime() - 30 * DAY)
  const weeks = 12
  const days = 14
  const firstWeek = weekStart(new Date(now.getTime() - (weeks - 1) * 7 * DAY))
  const firstDay = dayStart(new Date(now.getTime() - (days - 1) * DAY))

  const [userTotals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withEmail: sql<number>`count(*) filter (where ${users.email} is not null)::int`,
      new7d: sql<number>`count(*) filter (where ${users.createdAt} >= ${since7})::int`,
      new30d: sql<number>`count(*) filter (where ${users.createdAt} >= ${since30})::int`,
      digestOn: sql<number>`count(*) filter (where ${users.digestOptIn})::int`,
    })
    .from(users)

  const roleRows = await db.select({ role: users.role, n: sql<number>`count(*)::int` }).from(users).groupBy(users.role)

  const enrollRows = await db
    .select({ workshop: enrollments.workshop, n: sql<number>`count(*)::int` })
    .from(enrollments)
    .groupBy(enrollments.workshop)

  const designRows = await db.select({ workshop: designs.workshop, n: sql<number>`count(*)::int` }).from(designs).groupBy(designs.workshop)

  const runRows = await db
    .select({
      workshop: launches.workshop,
      n: sql<number>`count(*)::int`,
      n7: sql<number>`count(*) filter (where ${launches.createdAt} >= ${since7})::int`,
    })
    .from(launches)
    .groupBy(launches.workshop)

  const [ws] = await db
    .select({
      saved: sql<number>`count(*)::int`,
      learners: sql<number>`count(distinct ${worksheetProgress.userId})::int`,
      saved7d: sql<number>`count(*) filter (where ${worksheetProgress.updatedAt} >= ${since7})::int`,
    })
    .from(worksheetProgress)

  const [fileTotals] = await db
    .select({ count: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::bigint` })
    .from(files)

  const activeRes = await db.execute<{ n: number }>(sql`
    select count(distinct user_id)::int as n from (
      select ${designs.userId} as user_id from ${designs} where ${designs.updatedAt} >= ${since7}
      union all select ${launches.userId} from ${launches} where ${launches.createdAt} >= ${since7}
      union all select ${worksheetProgress.userId} from ${worksheetProgress} where ${worksheetProgress.updatedAt} >= ${since7}
      union all select ${files.userId} from ${files} where ${files.createdAt} >= ${since7}
    ) a`)
  const active = activeRes.rows[0]

  const signupRows = await db
    .select({ wk: sql<string>`to_char(date_trunc('week', ${users.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.createdAt} >= ${firstWeek}`)
    .groupBy(sql`1`)

  const runDayRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${launches.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
      workshop: launches.workshop,
      n: sql<number>`count(*)::int`,
    })
    .from(launches)
    .where(sql`${launches.createdAt} >= ${firstDay}`)
    .groupBy(sql`1`, launches.workshop)

  const wsDayRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${worksheetProgress.updatedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
    })
    .from(worksheetProgress)
    .where(sql`${worksheetProgress.updatedAt} >= ${firstDay}`)
    .groupBy(sql`1`)

  const workshops: AdminStats['workshops'] = {}
  const touch = (slug: string) => (workshops[slug] ??= { joined: 0, designs: 0, runs: 0, runs7d: 0 })
  for (const r of enrollRows) touch(r.workshop).joined = r.n
  for (const r of designRows) touch(r.workshop).designs = r.n
  for (const r of runRows) {
    const w = touch(r.workshop)
    w.runs = r.n
    w.runs7d = r.n7
  }

  const signupsByWeek: AdminStats['signupsByWeek'] = []
  for (let i = 0; i < weeks; i++) {
    const d = new Date(firstWeek.getTime() + i * 7 * DAY)
    const key = isoDate(d)
    signupsByWeek.push({ weekStart: key, count: signupRows.find((r) => r.wk === key)?.n ?? 0 })
  }

  const activityByDay: AdminStats['activityByDay'] = []
  for (let i = 0; i < days; i++) {
    const key = isoDate(new Date(firstDay.getTime() + i * DAY))
    activityByDay.push({
      day: key,
      launches: runDayRows.find((r) => r.day === key && r.workshop === 'water-rocket')?.n ?? 0,
      tests: runDayRows.find((r) => r.day === key && r.workshop === 'bridge-builder')?.n ?? 0,
      worksheets: wsDayRows.find((r) => r.day === key)?.n ?? 0,
    })
  }

  return {
    generatedAt: now.toISOString(),
    users: {
      total: userTotals?.total ?? 0,
      withEmail: userTotals?.withEmail ?? 0,
      new7d: userTotals?.new7d ?? 0,
      new30d: userTotals?.new30d ?? 0,
      active7d: Number(active?.n ?? 0),
      digestOn: userTotals?.digestOn ?? 0,
      roles: Object.fromEntries(roleRows.map((r) => [r.role, r.n])),
    },
    workshops,
    worksheets: { saved: ws?.saved ?? 0, learners: ws?.learners ?? 0, saved7d: ws?.saved7d ?? 0 },
    files: { count: fileTotals?.count ?? 0, bytes: Number(fileTotals?.bytes ?? 0) },
    signupsByWeek,
    activityByDay,
  }
}

const later = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a > b ? a : b)

/** Every registered learner with per-learner activity counts. Read-only; sized for a pilot (a few hundred users). */
export async function adminUsers(db: Db, limit = 1000): Promise<AdminUsersResponse> {
  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(users)
  const rows = await db.select().from(users).orderBy(sql`${users.createdAt} desc`).limit(limit)

  const enrollRows = await db.select({ userId: enrollments.userId, workshop: enrollments.workshop }).from(enrollments)
  const designRows = await db
    .select({ userId: designs.userId, workshop: designs.workshop, n: sql<number>`count(*)::int`, last: sql<Date>`max(${designs.updatedAt})` })
    .from(designs)
    .groupBy(designs.userId, designs.workshop)
  const runRows = await db
    .select({ userId: launches.userId, workshop: launches.workshop, n: sql<number>`count(*)::int`, last: sql<Date>`max(${launches.createdAt})` })
    .from(launches)
    .groupBy(launches.userId, launches.workshop)
  const wsRows = await db
    .select({ userId: worksheetProgress.userId, n: sql<number>`count(*)::int`, last: sql<Date>`max(${worksheetProgress.updatedAt})` })
    .from(worksheetProgress)
    .groupBy(worksheetProgress.userId)
  const fileRows = await db
    .select({
      userId: files.userId,
      n: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::bigint`,
      last: sql<Date>`max(${files.createdAt})`,
    })
    .from(files)
    .groupBy(files.userId)

  const asDate = (v: unknown): Date | null => (v instanceof Date ? v : typeof v === 'string' ? new Date(v) : null)

  const result: AdminUser[] = rows.map((u) => {
    let lastActive: Date | null = null
    const designsBy: Record<string, number> = {}
    for (const d of designRows.filter((r) => r.userId === u.id)) {
      designsBy[d.workshop] = d.n
      lastActive = later(lastActive, asDate(d.last))
    }
    let launchesN = 0
    let testsN = 0
    for (const r of runRows.filter((r) => r.userId === u.id)) {
      if (r.workshop === 'bridge-builder') testsN += r.n
      else launchesN += r.n
      lastActive = later(lastActive, asDate(r.last))
    }
    const ws = wsRows.find((r) => r.userId === u.id)
    if (ws) lastActive = later(lastActive, asDate(ws.last))
    const f = fileRows.find((r) => r.userId === u.id)
    if (f) lastActive = later(lastActive, asDate(f.last))
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: (u.role as AdminUser['role']) ?? 'student',
      digestOptIn: u.digestOptIn,
      lastDigestAt: u.lastDigestAt ? u.lastDigestAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      workshops: enrollRows.filter((r) => r.userId === u.id).map((r) => r.workshop),
      designs: designsBy,
      launches: launchesN,
      bridgeTests: testsN,
      worksheets: ws?.n ?? 0,
      files: f?.n ?? 0,
      filesBytes: Number(f?.bytes ?? 0),
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
    }
  })
  return { users: result, total }
}
