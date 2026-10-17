interface Env {
  APP_ORIGIN: string
  DIGEST_SECRET: string
}

async function runDigest(env: Env, dryRun = false): Promise<Response> {
  const url = `${env.APP_ORIGIN}/api/digest/run${dryRun ? '?dryRun=1' : ''}`
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${env.DIGEST_SECRET}` } })
  const text = await res.text()
  console.log(`digest run -> ${res.status} ${text.slice(0, 500)}`)
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

export default {
  /** Cron trigger (see wrangler.jsonc). */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDigest(env))
  },
  /** Manual trigger for testing: POST /run (or /run?dryRun=1) with the same bearer secret. */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/run') {
      if (request.headers.get('authorization') !== `Bearer ${env.DIGEST_SECRET}`) return new Response('forbidden', { status: 403 })
      return runDigest(env, url.searchParams.get('dryRun') === '1')
    }
    return new Response('Builders of Tomorrow digest cron: runs every Monday 09:00 IST.', { status: 200 })
  },
} satisfies ExportedHandler<Env>
