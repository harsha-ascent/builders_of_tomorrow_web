import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { Resend } from 'resend'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { users } from '../db/schema'
import { DIGEST_DAYS, digestHtml, digestRecipients, digestStatsFor, digestSubject } from '../digest'

/**
 * Weekly summary emails.
 *  - POST /api/digest/run      called by the cron Worker (Authorization: Bearer DIGEST_SECRET); ?dryRun=1 to preview
 *  - GET  /api/digest/preview  the signed-in learner's own week, for the My Work page
 */
export const digestRoutes = new Hono<AppEnv>()
  .post('/run', async (c) => {
    const secret = c.env.DIGEST_SECRET
    if (!secret) return c.json({ error: 'DIGEST_SECRET is not configured' }, 503)
    const auth = c.req.header('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) return c.json({ error: 'Forbidden' }, 403)
    if (!c.env.RESEND_API_KEY) return c.json({ error: 'Email is not configured on the server' }, 503)

    const dryRun = c.req.query('dryRun') === '1'
    const db = c.get('db')
    const origin = c.env.APP_ORIGIN ?? new URL(c.req.url).origin
    const resend = new Resend(c.env.RESEND_API_KEY)
    const now = new Date()
    const recipients = await digestRecipients(db)
    const report: { userId: string; status: 'sent' | 'skipped-quiet' | 'skipped-recent' | 'dry-run' | 'failed'; detail?: string }[] = []

    for (const u of recipients) {
      // never more than one digest per 6 days per user, even if the cron fires twice
      if (u.lastDigestAt && now.getTime() - u.lastDigestAt.getTime() < 6 * 86_400_000) {
        report.push({ userId: u.id, status: 'skipped-recent' })
        continue
      }
      const stats = await digestStatsFor(db, u.id, DIGEST_DAYS, now)
      if (!stats.hasActivity) {
        report.push({ userId: u.id, status: 'skipped-quiet' })
        continue
      }
      if (dryRun) {
        report.push({ userId: u.id, status: 'dry-run', detail: digestSubject(stats, u.displayName) })
        continue
      }
      const { error } = await resend.emails.send({
        from: c.env.RESEND_FROM ?? 'Builders of Tomorrow <onboarding@resend.dev>',
        to: u.email!,
        subject: digestSubject(stats, u.displayName),
        html: digestHtml(stats, { name: u.displayName, origin }),
      })
      if (error) {
        report.push({ userId: u.id, status: 'failed', detail: error.message })
        continue
      }
      await db.update(users).set({ lastDigestAt: now }).where(eq(users.id, u.id))
      report.push({ userId: u.id, status: 'sent' })
    }
    const summary = report.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
    return c.json({ ok: true, dryRun, recipients: recipients.length, summary, report: report.map((r) => ({ ...r, userId: r.userId.slice(0, 10) + '…' })) })
  })
  .get('/preview', requireAuth, async (c) => {
    const { userId } = c.get('auth')
    return c.json(await digestStatsFor(c.get('db'), userId))
  })
