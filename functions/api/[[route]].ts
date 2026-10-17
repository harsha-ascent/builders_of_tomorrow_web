import app from '../../server/app'
import type { Env } from '../../server/env'

/** Cloudflare Pages Function: every /api/* request is handled by the Hono app. */
export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, context.env, context as unknown as ExecutionContext)
