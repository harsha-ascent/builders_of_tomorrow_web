import { Hono } from 'hono'
import { adminStats, adminUsers } from '../admin'
import { requireAdmin, requireAuth } from '../auth'
import type { AppEnv } from '../context'

/** Read-only site analytics and the registered-user list. Only ADMIN_EMAILS get past requireAdmin. */
export const adminRoutes = new Hono<AppEnv>()
  .use('*', requireAuth, requireAdmin)
  .get('/stats', async (c) => c.json(await adminStats(c.get('db'))))
  .get('/users', async (c) => c.json(await adminUsers(c.get('db'))))
