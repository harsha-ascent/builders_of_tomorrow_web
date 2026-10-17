import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { MeResponse } from '../../shared/types'
import { clerkFor, requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { users } from '../db/schema'

type Row = typeof users.$inferSelect

function toMe(row: Row): MeResponse {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: (row.role as MeResponse['role']) ?? 'student',
    digestOptIn: row.digestOptIn,
    lastDigestAt: row.lastDigestAt ? row.lastDigestAt.toISOString() : null,
  }
}

export const meRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const { userId } = c.get('auth')
    const db = c.get('db')
    let email: string | null = null
    let displayName: string | null = null
    try {
      const u = await clerkFor(c.env).users.getUser(userId)
      email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null
      displayName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || null
    } catch {
      /* Clerk API unavailable; keep what we have */
    }
    const [row] = await db
      .insert(users)
      .values({ id: userId, email, displayName })
      .onConflictDoUpdate({ target: users.id, set: { email, displayName, updatedAt: new Date() } })
      .returning()
    return c.json(toMe(row))
  })
  .put('/preferences', async (c) => {
    const { userId } = c.get('auth')
    const body = (await c.req.json().catch(() => null)) as { digestOptIn?: unknown } | null
    if (!body || typeof body.digestOptIn !== 'boolean') return c.json({ error: 'Send { digestOptIn: true | false }' }, 400)
    const [row] = await c
      .get('db')
      .update(users)
      .set({ digestOptIn: body.digestOptIn, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json(toMe(row))
  })
