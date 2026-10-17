import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { MeResponse } from '../../shared/types'
import { clerkFor, requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { users } from '../db/schema'

export const meRoutes = new Hono<AppEnv>().use('*', requireAuth).get('/', async (c) => {
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
  const me: MeResponse = {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: (row.role as MeResponse['role']) ?? 'student',
  }
  void eq
  return c.json(me)
})
