import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { RocketDesign } from '../../shared/types'
import { rocketDesignSchema } from '../../shared/validation'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { designs } from '../db/schema'

type Row = typeof designs.$inferSelect

export function rowToDesign(row: Row): RocketDesign {
  return {
    ...(row.params as Omit<RocketDesign, 'id' | 'name' | 'workshop'>),
    id: row.id,
    name: row.name,
    workshop: row.workshop,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const designsRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const { userId } = c.get('auth')
    const workshop = c.req.query('workshop')
    const rows = await c
      .get('db')
      .select()
      .from(designs)
      .where(workshop ? and(eq(designs.userId, userId), eq(designs.workshop, workshop)) : eq(designs.userId, userId))
      .orderBy(desc(designs.updatedAt))
    return c.json(rows.map(rowToDesign))
  })
  .put('/:id', async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    const parsed = rocketDesignSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'That rocket design is not valid', issues: parsed.error.issues }, 400)
    if (parsed.data.id !== id) return c.json({ error: 'Design id mismatch' }, 400)
    const { id: _id, name, workshop, createdAt: _c, updatedAt: _u, ...params } = parsed.data
    void _id
    void _c
    void _u
    const db = c.get('db')
    const existing = await db.select({ userId: designs.userId }).from(designs).where(eq(designs.id, id)).limit(1)
    if (existing.length > 0 && existing[0].userId !== userId) return c.json({ error: 'That rocket belongs to someone else' }, 403)
    const now = new Date()
    const [row] = await db
      .insert(designs)
      .values({ id, userId, workshop, name, params, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: designs.id, set: { name, workshop, params, updatedAt: now } })
      .returning()
    return c.json(rowToDesign(row))
  })
  .delete('/:id', async (c) => {
    const { userId } = c.get('auth')
    await c
      .get('db')
      .delete(designs)
      .where(and(eq(designs.id, c.req.param('id')), eq(designs.userId, userId)))
    return c.body(null, 204)
  })
