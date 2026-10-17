import { and, eq, gte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { interestRequestSchema } from '../../shared/validation'
import { clerkFor } from '../auth'
import type { AppEnv } from '../context'
import { eventInterest } from '../db/schema'

const DAY = 86_400_000
/** Submissions per email per day before we stop accepting (keeps a stuck "submit" button from flooding the table). */
const MAX_PER_EMAIL_PER_DAY = 3

/**
 * Public: register interest in an in-person workshop. No account needed, so the form carries a honeypot field
 * and the route throttles repeats per email. If the visitor is signed in we remember their user id too.
 */
export const interestRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const parsed = interestRequestSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Please check the highlighted fields', issues: parsed.error.issues }, 400)
  const data = parsed.data
  // Bots fill every field; people never see this one. Pretend it worked.
  if (data.website) return c.json({ ok: true, id: crypto.randomUUID() }, 201)

  let userId: string | null = null
  if (c.req.header('Authorization') && c.env.CLERK_SECRET_KEY) {
    try {
      const state = await clerkFor(c.env).authenticateRequest(c.req.raw, { acceptsToken: 'session_token' })
      if (state.isSignedIn) userId = state.toAuth().userId ?? null
    } catch {
      /* an invalid token just means an anonymous submission */
    }
  }

  const db = c.get('db')
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(eventInterest)
    .where(and(eq(eventInterest.email, data.email), gte(eventInterest.createdAt, new Date(Date.now() - DAY))))
  if ((recent?.n ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
    return c.json({ error: 'We already have your details for today. We will be in touch!' }, 429)
  }

  const id = crypto.randomUUID()
  await db.insert(eventInterest).values({
    id,
    workshop: data.workshop,
    userId,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    city: data.city,
    kids: data.kids,
    ages: data.ages || null,
    format: data.format,
    message: data.message || null,
  })
  return c.json({ ok: true, id }, 201)
})
