import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './context'
import { getDb } from './db/client'
import { adminRoutes } from './routes/admin'
import { designsRoutes } from './routes/designs'
import { digestRoutes } from './routes/digest'
import { enrollmentsRoutes } from './routes/enrollments'
import { filesRoutes } from './routes/files'
import { interestRoutes } from './routes/interest'
import { launchesRoutes } from './routes/launches'
import { meRoutes } from './routes/me'
import { shareRoutes } from './routes/share'
import { webhooksRoutes } from './routes/webhooks'
import { worksheetsRoutes } from './routes/worksheets'

const app = new Hono<AppEnv>().basePath('/api')

app.use('*', async (c, next) => {
  const origin = c.env.APP_ORIGIN
  return cors({ origin: origin ? [origin] : '*', allowHeaders: ['Authorization', 'Content-Type'] })(c, next)
})

app.get('/health', (c) =>
  c.json({
    ok: true,
    services: {
      database: Boolean(c.env.DATABASE_URL),
      clerk: Boolean(c.env.CLERK_SECRET_KEY),
      resend: Boolean(c.env.RESEND_API_KEY),
      r2: Boolean(c.env.FILES),
    },
  }),
)

// Everything below needs the database.
app.use('*', async (c, next) => {
  if (!c.env.DATABASE_URL) return c.json({ error: 'Database is not configured on the server' }, 503)
  c.set('db', getDb(c.env.DATABASE_URL))
  await next()
})

app.route('/me', meRoutes)
app.route('/designs', designsRoutes)
app.route('/launches', launchesRoutes)
app.route('/worksheets', worksheetsRoutes)
app.route('/files', filesRoutes)
app.route('/share', shareRoutes)
app.route('/webhooks', webhooksRoutes)
app.route('/digest', digestRoutes)
app.route('/enrollments', enrollmentsRoutes)
app.route('/admin', adminRoutes)
app.route('/interest', interestRoutes)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong on the server' }, 500)
})

export default app
