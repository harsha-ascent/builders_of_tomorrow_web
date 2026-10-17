import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Enrollment } from '../../shared/types'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { enrollments } from '../db/schema'

const KNOWN = new Set(['water-rocket', 'bridge-builder', 'paper-plane-wind-tunnel', 'solar-oven'])

function toEnrollment(row: typeof enrollments.$inferSelect): Enrollment {
  return { workshop: row.workshop, createdAt: row.createdAt.toISOString() }
}

/** Which workshops the signed-in learner has joined. */
export const enrollmentsRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c.get('db').select().from(enrollments).where(eq(enrollments.userId, userId))
    return c.json(rows.map(toEnrollment))
  })
  .post('/', async (c) => {
    const { userId } = c.get('auth')
    const body = (await c.req.json().catch(() => null)) as { workshop?: unknown } | null
    const workshop = typeof body?.workshop === 'string' ? body.workshop.trim().slice(0, 40) : ''
    if (!workshop || !KNOWN.has(workshop)) return c.json({ error: 'Unknown workshop' }, 400)
    const db = c.get('db')
    await db.insert(enrollments).values({ userId, workshop }).onConflictDoNothing()
    const rows = await db.select().from(enrollments).where(eq(enrollments.userId, userId))
    return c.json(rows.map(toEnrollment), 201)
  })
  .delete('/:workshop', async (c) => {
    const { userId } = c.get('auth')
    await c
      .get('db')
      .delete(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.workshop, c.req.param('workshop'))))
    return c.body(null, 204)
  })
