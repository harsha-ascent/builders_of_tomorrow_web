import { verifyWebhook } from '@clerk/backend/webhooks'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { AppEnv } from '../context'
import { users } from '../db/schema'

/** Keeps the users table in sync with Clerk (optional; the app also upserts lazily). */
export const webhooksRoutes = new Hono<AppEnv>().post('/clerk', async (c) => {
  if (!c.env.CLERK_WEBHOOK_SIGNING_SECRET) return c.json({ error: 'Webhook secret not configured' }, 503)
  let evt
  try {
    evt = await verifyWebhook(c.req.raw, { signingSecret: c.env.CLERK_WEBHOOK_SIGNING_SECRET })
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }
  const db = c.get('db')
  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const u = evt.data
    const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0]
    const email = primary?.email_address ?? null
    const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || null
    await db
      .insert(users)
      .values({ id: u.id, email, displayName })
      .onConflictDoUpdate({ target: users.id, set: { email, displayName, updatedAt: new Date() } })
  } else if (evt.type === 'user.deleted' && evt.data.id) {
    await db.delete(users).where(eq(users.id, evt.data.id))
  }
  return c.json({ ok: true })
})
