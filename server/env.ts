/** Bindings and secrets available to the Pages Functions. Configure them in Cloudflare (see docs/SETUP.md). */
export interface Env {
  /** Neon Postgres connection string (pooled). */
  DATABASE_URL?: string
  CLERK_SECRET_KEY?: string
  CLERK_PUBLISHABLE_KEY?: string
  CLERK_WEBHOOK_SIGNING_SECRET?: string
  /** Comma-separated list of origins allowed to call the API with a session token, e.g. https://builders.example.com */
  AUTHORIZED_PARTIES?: string
  RESEND_API_KEY?: string
  /** e.g. "Builders of Tomorrow <hello@ascent-i-tech.in>" */
  RESEND_FROM?: string
  APP_ORIGIN?: string
  /** R2 bucket binding for student uploads. */
  FILES?: R2Bucket
}
