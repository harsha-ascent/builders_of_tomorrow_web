import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { WorksheetProgress } from '../../shared/types'
import { worksheetAnswersSchema } from '../../shared/validation'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { worksheetProgress } from '../db/schema'

type Row = typeof worksheetProgress.$inferSelect

function rowToProgress(row: Row): WorksheetProgress {
  return {
    workshop: row.workshop,
    worksheetId: row.worksheetId,
    answers: row.answers as WorksheetProgress['answers'],
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const worksheetsRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/:workshop', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c
      .get('db')
      .select()
      .from(worksheetProgress)
      .where(and(eq(worksheetProgress.userId, userId), eq(worksheetProgress.workshop, c.req.param('workshop'))))
    return c.json(rows.map(rowToProgress))
  })
  .get('/:workshop/:id', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c
      .get('db')
      .select()
      .from(worksheetProgress)
      .where(
        and(
          eq(worksheetProgress.userId, userId),
          eq(worksheetProgress.workshop, c.req.param('workshop')),
          eq(worksheetProgress.worksheetId, c.req.param('id')),
        ),
      )
      .limit(1)
    return c.json(rows.length ? rowToProgress(rows[0]) : null)
  })
  .put('/:workshop/:id', async (c) => {
    const { userId } = c.get('auth')
    const body = (await c.req.json().catch(() => null)) as { answers?: unknown } | null
    const parsed = worksheetAnswersSchema.safeParse(body?.answers)
    if (!parsed.success) return c.json({ error: 'Those answers are not valid', issues: parsed.error.issues }, 400)
    const now = new Date()
    const values = {
      userId,
      workshop: c.req.param('workshop'),
      worksheetId: c.req.param('id'),
      answers: parsed.data,
      updatedAt: now,
    }
    const [row] = await c
      .get('db')
      .insert(worksheetProgress)
      .values(values)
      .onConflictDoUpdate({
        target: [worksheetProgress.userId, worksheetProgress.workshop, worksheetProgress.worksheetId],
        set: { answers: parsed.data, updatedAt: now },
      })
      .returning()
    return c.json(rowToProgress(row))
  })
