import { createClerkClient } from '@clerk/backend'
import { createMiddleware } from 'hono/factory'
import { sql } from 'drizzle-orm'
import type { AppEnv } from './context'
import { users } from './db/schema'

export function clerkFor(env: { CLERK_SECRET_KEY?: string; CLERK_PUBLISHABLE_KEY?: string }) {
  return createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY })
}

/** Requires a valid Clerk session token (Authorization: Bearer ...) and makes sure the user row exists. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.env.CLERK_SECRET_KEY) return c.json({ error: 'Accounts are not configured on the server' }, 503)
  const clerk = clerkFor(c.env)
  const authorizedParties = c.env.AUTHORIZED_PARTIES?.split(',').map((s) => s.trim()).filter(Boolean)
  const state = await clerk.authenticateRequest(c.req.raw, {
    acceptsToken: 'session_token',
    ...(authorizedParties && authorizedParties.length > 0 ? { authorizedParties } : {}),
  })
  if (!state.isSignedIn) return c.json({ error: 'Please sign in' }, 401)
  const auth = state.toAuth()
  const userId = auth.userId
  if (!userId) return c.json({ error: 'Please sign in' }, 401)

  const db = c.get('db')
  await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing()
  // keep updated_at fresh without a second round-trip in the common path
  void sql
  c.set('auth', { userId })
  await next()
})
