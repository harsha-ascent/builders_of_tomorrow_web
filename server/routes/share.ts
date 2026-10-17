import { Hono } from 'hono'
import { Resend } from 'resend'
import { shareRequestSchema } from '../../shared/validation'
import { requireAuth } from '../auth'
import type { AppEnv } from '../context'

function esc(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)
}

/** Emails a launch result to a parent or teacher using Resend. */
export const shareRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)
  .post('/', async (c) => {
    if (!c.env.RESEND_API_KEY) return c.json({ error: 'Email is not configured on the server' }, 503)
    const parsed = shareRequestSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'That share request is not valid', issues: parsed.error.issues }, 400)
    const { to, note, launch } = parsed.data
    const r = launch.result
    const origin = c.env.APP_ORIGIN ?? new URL(c.req.url).origin
    const html = `
      <div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1e2a4a">
        <h1 style="font-size:26px;margin:0 0 8px">🚀 ${esc(launch.designName)} flew!</h1>
        <p style="margin:0 0 16px;color:#4a5578">A launch result from Builders of Tomorrow · Water Rocket Lab</p>
        ${note ? `<blockquote style="border-left:6px solid #ffd93d;padding:8px 12px;margin:0 0 16px;background:#fff8ec">${esc(note)}</blockquote>` : ''}
        <table style="border-collapse:collapse;width:100%;font-size:16px">
          <tr><td style="padding:6px 0">💧 Water</td><td style="text-align:right">${Math.round(launch.settings.waterFraction * 100)}%</td></tr>
          <tr><td style="padding:6px 0">🫧 Pressure</td><td style="text-align:right">${launch.settings.pressurePsi} psi</td></tr>
          <tr><td style="padding:6px 0">📐 Angle</td><td style="text-align:right">${launch.settings.launchAngleDeg}°</td></tr>
          <tr><td style="padding:6px 0;border-top:2px solid #eee">⬆️ Max height</td><td style="text-align:right;border-top:2px solid #eee"><b>${r.maxHeightM.toFixed(1)} m</b></td></tr>
          <tr><td style="padding:6px 0">➡️ Distance</td><td style="text-align:right"><b>${r.rangeM.toFixed(1)} m</b></td></tr>
          <tr><td style="padding:6px 0">⏱️ Flight time</td><td style="text-align:right">${r.flightTimeS.toFixed(1)} s</td></tr>
          <tr><td style="padding:6px 0">💨 Top speed</td><td style="text-align:right">${(r.maxSpeedMs * 3.6).toFixed(0)} km/h</td></tr>
        </table>
        <p style="margin:20px 0 0"><a href="${esc(origin)}/workshops/water-rocket" style="background:#ff6b6b;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open the Water Rocket Lab</a></p>
        <p style="margin:24px 0 0;font-size:12px;color:#888">Sent by Builders of Tomorrow, a project of Ascent Intelligent Technologies.</p>
      </div>`
    const resend = new Resend(c.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: c.env.RESEND_FROM ?? 'Builders of Tomorrow <onboarding@resend.dev>',
      to,
      subject: `🚀 ${launch.designName} flew ${r.maxHeightM.toFixed(0)} m high!`,
      html,
    })
    if (error) return c.json({ error: error.message }, 502)
    return c.json({ ok: true })
  })
