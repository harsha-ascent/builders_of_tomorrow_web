import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { LaunchRecord } from '../../shared/types'
import { launchRecordSchema } from '../../shared/validation'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { designs, launches } from '../db/schema'

type Row = typeof launches.$inferSelect

function rowToRecord(row: Row): LaunchRecord {
  return {
    id: row.id,
    designId: row.designId ?? '',
    designName: row.designName,
    settings: row.settings as LaunchRecord['settings'],
    result: row.result as LaunchRecord['result'],
    createdAt: row.createdAt.toISOString(),
  }
}

export const launchesRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c.get('db').select().from(launches).where(eq(launches.userId, userId)).orderBy(desc(launches.createdAt)).limit(200)
    return c.json(rows.map(rowToRecord))
  })
  .post('/', async (c) => {
    const { userId } = c.get('auth')
    const parsed = launchRecordSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'That launch record is not valid', issues: parsed.error.issues }, 400)
    const db = c.get('db')
    const owned = await db
      .select({ id: designs.id })
      .from(designs)
      .where(and(eq(designs.id, parsed.data.designId), eq(designs.userId, userId)))
      .limit(1)
    const [row] = await db
      .insert(launches)
      .values({
        id: parsed.data.id,
        userId,
        designId: owned.length ? parsed.data.designId : null,
        designName: parsed.data.designName,
        settings: parsed.data.settings,
        result: parsed.data.result,
        createdAt: new Date(parsed.data.createdAt),
      })
      .onConflictDoNothing()
      .returning()
    return c.json(row ? rowToRecord(row) : parsed.data, 201)
  })
  .delete('/', async (c) => {
    const { userId } = c.get('auth')
    await c.get('db').delete(launches).where(eq(launches.userId, userId))
    return c.body(null, 204)
  })
  .delete('/:id', async (c) => {
    const { userId } = c.get('auth')
    await c
      .get('db')
      .delete(launches)
      .where(and(eq(launches.id, c.req.param('id')), eq(launches.userId, userId)))
    return c.body(null, 204)
  })
