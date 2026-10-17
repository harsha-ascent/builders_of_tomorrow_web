import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { FileRecord } from '../../shared/types'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'
import { files } from '../db/schema'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])

type Row = typeof files.$inferSelect

function rowToRecord(row: Row): FileRecord {
  return {
    id: row.id,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    url: `/api/files/${row.id}`,
    createdAt: row.createdAt.toISOString(),
  }
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file'
}

/** Student uploads (photos of real rockets, scanned worksheets) stored in Cloudflare R2. */
export const filesRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .use('*', async (c, next) => {
    if (!c.env.FILES) return c.json({ error: 'File storage is not configured on the server' }, 503)
    await next()
  })
  .get('/', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c.get('db').select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt)).limit(200)
    return c.json(rows.map(rowToRecord))
  })
  .post('/', async (c) => {
    const { userId } = c.get('auth')
    const form = await c.req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) return c.json({ error: 'Send a form with a "file" field' }, 400)
    if (file.size > MAX_BYTES) return c.json({ error: 'Files must be 5 MB or smaller' }, 413)
    if (!ALLOWED.has(file.type)) return c.json({ error: 'Only images and PDFs are allowed' }, 415)
    const id = crypto.randomUUID()
    const key = `users/${userId}/${id}/${safeName(file.name)}`
    await c.env.FILES!.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
    const [row] = await c
      .get('db')
      .insert(files)
      .values({ id, userId, r2Key: key, filename: file.name.slice(0, 200), contentType: file.type, sizeBytes: file.size })
      .returning()
    return c.json(rowToRecord(row), 201)
  })
  .get('/:id', async (c) => {
    const { userId } = c.get('auth')
    const rows = await c
      .get('db')
      .select()
      .from(files)
      .where(and(eq(files.id, c.req.param('id')), eq(files.userId, userId)))
      .limit(1)
    if (!rows.length) return c.json({ error: 'Not found' }, 404)
    const obj = await c.env.FILES!.get(rows[0].r2Key)
    if (!obj) return c.json({ error: 'Not found' }, 404)
    const headers = new Headers()
    headers.set('Content-Type', rows[0].contentType)
    headers.set('Content-Length', String(obj.size))
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('Content-Disposition', `inline; filename="${safeName(rows[0].filename)}"`)
    return new Response(obj.body as ReadableStream, { headers })
  })
  .delete('/:id', async (c) => {
    const { userId } = c.get('auth')
    const db = c.get('db')
    const rows = await db
      .select()
      .from(files)
      .where(and(eq(files.id, c.req.param('id')), eq(files.userId, userId)))
      .limit(1)
    if (rows.length) {
      await c.env.FILES!.delete(rows[0].r2Key)
      await db.delete(files).where(eq(files.id, rows[0].id))
    }
    return c.body(null, 204)
  })
