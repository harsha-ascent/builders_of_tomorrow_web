# Setup guide: accounts, resources and keys

Everything in this project runs on free tiers. This page lists **exactly what to create** on each
service and **where each value goes**. Do them in order; each step takes 5–10 minutes.

> **Who sends what?** Clerk sends the sign-in code emails itself. Resend is used for the emails *this app*
> sends (for example "share my launch result with a parent or teacher"). Neon stores accounts, saved rockets,
> flight logs and worksheet answers. R2 stores uploaded files (photos of real rockets, scanned worksheets).

---

## 0. Values you will collect

| Value | From | Where it goes |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk → API keys → Publishable key (`pk_test_…` / `pk_live_…`) | Cloudflare Pages **build** environment variable; local `.env.local` |
| `CLERK_PUBLISHABLE_KEY` | same value as above | Cloudflare Pages **runtime** variable; local `.dev.vars` |
| `CLERK_SECRET_KEY` | Clerk → API keys → Secret key (`sk_…`) | Cloudflare Pages **secret**; local `.dev.vars` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk → Webhooks → your endpoint → Signing secret (`whsec_…`) | Cloudflare Pages **secret** (optional) |
| `DATABASE_URL` | Neon → Connect → **Pooled** connection string | Cloudflare Pages **secret**; local `.dev.vars` |
| `RESEND_API_KEY` | Resend → API Keys (`re_…`) | Cloudflare Pages **secret**; local `.dev.vars` |
| `RESEND_FROM` | your verified sender, e.g. `Builders of Tomorrow <hello@ascent-i-tech.in>` | `wrangler.toml` `[vars]` or Pages variable |
| `APP_ORIGIN` | your site URL, e.g. `https://builders.ascent-i-tech.in` | `wrangler.toml` `[vars]` or Pages variable |
| `AUTHORIZED_PARTIES` | comma-separated origins allowed to call the API (optional hardening) | Pages variable |
| R2 bucket `builders-of-tomorrow-files` | Cloudflare → R2 | bound as `FILES` in `wrangler.toml` |

---

## 1. GitHub (code hosting) — free

- Repository: `git@github.com:harsha-ascent/builders_of_tomorrow_web.git` (already created, currently empty).
- Push this project's `main` branch to it. Cloudflare Pages deploys from this repo.

## 2. Neon (Postgres database) — free tier

1. Sign up at <https://neon.tech> and create a **Project** called `builders-of-tomorrow`.
   Pick a region close to your students (for India: AWS **Singapore, ap-southeast-1**).
2. Keep the default database `neondb` and role.
3. Click **Connect**, choose **Pooled connection**, and copy the URL. It looks like
   `postgresql://neondb_owner:…@ep-…-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
   This is `DATABASE_URL`.
4. Create the tables. Either:
   - copy `DATABASE_URL` into `.dev.vars` and run `npm run db:migrate`, **or**
   - open Neon's **SQL Editor** and paste the contents of `drizzle/0000_*.sql`.
5. Free tier notes: about 0.5 GB storage and a monthly compute allowance; the database auto-suspends when idle
   and wakes on the first request (adds ~0.5 s to the first API call after a quiet period). Plenty for workshops.

## 3. Clerk (sign-in with email code) — free up to 10,000 monthly active users

1. Sign up at <https://clerk.com> and create an application **Builders of Tomorrow**.
2. In **Configure → Email, phone, username**:
   - **Email address**: required ✔, and under *Verification methods* enable **Email verification code**.
     Turn **off** *Email verification link* (optional, keeps it simple for kids).
   - **Password**: turn **off** (the site is code-only, as requested).
   - Optionally turn on **Name** so students can enter a first name.
3. In **Configure → Paths**, leave the defaults; the app passes `/sign-in`, `/sign-up` and `/me` itself.
4. **API keys**: copy the **Publishable key** → `VITE_CLERK_PUBLISHABLE_KEY` *and* `CLERK_PUBLISHABLE_KEY`;
   copy the **Secret key** → `CLERK_SECRET_KEY`.
5. (Optional, recommended) **Webhooks → Add endpoint**:
   URL `https://<your-domain>/api/webhooks/clerk`, events `user.created`, `user.updated`, `user.deleted`.
   Copy the **Signing secret** → `CLERK_WEBHOOK_SIGNING_SECRET`. Without it the app still works: users are
   created in the database the first time they save something.
6. Going live: Clerk's **development** instance works on `*.pages.dev` straight away. A **production** instance
   needs a domain you control (e.g. `builders.ascent-i-tech.in`) because Clerk asks you to add a few DNS
   records. Do this when you are ready for real students.
7. Children & privacy: Clerk does not age-gate. For under-13 students, collect a **parent or teacher** email
   rather than the child's, and say so on your sign-up page. Keep this in mind for your privacy notice.

## 4. Resend (transactional email) — free: 3,000 emails/month, 100/day

1. Sign up at <https://resend.com>. Create an **API key** with *Sending access* → `RESEND_API_KEY`.
2. **Domains → Add domain**: add `ascent-i-tech.in` (or a sub-domain such as `mail.ascent-i-tech.in`), then
   add the DNS records Resend shows (SPF + DKIM, and MX for bounce handling) at your DNS provider.
   When it shows **Verified**, set `RESEND_FROM="Builders of Tomorrow <hello@ascent-i-tech.in>"`.
3. Until the domain is verified you can test with `onboarding@resend.dev` — but it can only email the address
   you signed up to Resend with.

## 5. Cloudflare (hosting, functions, file storage) — free

### 5a. Pages project
1. Sign up at <https://dash.cloudflare.com>. Go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the GitHub repo `harsha-ascent/builders_of_tomorrow_web`.
3. Build settings: framework preset **None**, build command `npm run build`, build output `dist`
   (the `wrangler.toml` in the repo also declares this, plus the R2 binding and compatibility flags).
4. **Environment variables** (set for *Production* and *Preview*):
   - `NODE_VERSION` = `22`
   - `VITE_CLERK_PUBLISHABLE_KEY` = your `pk_…` key (needed at build time)
   - `CLERK_PUBLISHABLE_KEY` = the same `pk_…`
   - Secrets (click *Encrypt*): `CLERK_SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`,
     and optionally `CLERK_WEBHOOK_SIGNING_SECRET`.
   - Optional: `APP_ORIGIN`, `RESEND_FROM`, `AUTHORIZED_PARTIES` (override the values in `wrangler.toml`).
5. Save and deploy. You get `https://builders-of-tomorrow-web.pages.dev` (the exact sub-domain is shown in the
   dashboard; if it differs, update `APP_ORIGIN` in `wrangler.toml`).
6. Free tier: unlimited static requests, 100,000 Function requests/day, 500 builds/month.

### 5b. R2 bucket (file uploads)
1. **R2 → Create bucket** named exactly `builders-of-tomorrow-files` (that name is in `wrangler.toml`).
   Cloudflare may ask you to add a payment method to enable R2; the free tier (10 GB storage, 1M writes and
   10M reads per month) is not charged.
2. Nothing else: Pages reads the binding from `wrangler.toml`. The `/api/files` endpoints will start working.

### 5c. Domain
Free options, best first:
- **`<project>.pages.dev`** — automatic, HTTPS, zero setup. Fine for a pilot.
- **A sub-domain of your own domain**, e.g. `builders.ascent-i-tech.in` — free, looks professional, and is
  what Clerk production and Resend will want anyway. In Pages → **Custom domains → Set up a domain** and add
  the CNAME it shows at your DNS provider (or move `ascent-i-tech.in` DNS to Cloudflare's free plan and it is
  one click).
- Truly free registrable domains (Freenom `.tk` etc.) have shut down or are unreliable; avoid them.

---

## 6. Local development

```bash
cp .env.example .env.local        # add VITE_CLERK_PUBLISHABLE_KEY (or leave empty for guest mode)
cp .dev.vars.example .dev.vars    # add DATABASE_URL, CLERK_SECRET_KEY, RESEND_API_KEY, ...
npm install
npm run db:migrate                # creates the tables in Neon (reads DATABASE_URL from .dev.vars)
npm run dev                       # front-end on http://localhost:5173 (proxies /api to :8788)
npm run dev:api                   # in a second terminal: Pages Functions + local R2 on http://localhost:8788
```

Without any keys the site runs in **guest mode**: everything is saved in the browser and the sign-in pages
explain what is missing. `npm run preview:pages` builds and serves the whole site through Wrangler exactly as
Cloudflare will.

## 7. Checklist (status as of 17 Oct 2026)

- [x] GitHub: `main` pushed (push access via a collaborator account on this Mac)
- [x] Neon: project, pooled `DATABASE_URL`, tables created (`npm run db:migrate`, 2 migrations)
- [x] Clerk: development instance, keys in place (webhook not configured yet; the app upserts users lazily)
- [x] Resend: API key in place; sender still `onboarding@resend.dev` (verify `ascent-i-tech.in` to email anyone)
- [x] Cloudflare Pages: project `builders-of-tomorrow-web` created with wrangler, secrets set, deployed by **direct upload**
- [x] Cloudflare R2: bucket `builders-of-tomorrow-files` (bound as `FILES` by `wrangler.toml`)
- [ ] Domain: `builders-of-tomorrow-web.pages.dev` for now; add `builders.ascent-i-tech.in` under Pages → Custom domains when ready
- [ ] Clerk production instance + custom domain before real students sign up

### Deploying updates

The project was deployed with **direct upload**, not Git integration, so a new version ships with:

```bash
npm run deploy
```

(`npm run build` bakes `VITE_CLERK_PUBLISHABLE_KEY` from `.env.local`, then `wrangler pages deploy ./dist`.)
To switch to automatic deploys on every push instead: Cloudflare dashboard → Workers & Pages →
`builders-of-tomorrow-web` → Settings → Builds & deployments → **Connect to Git**, pick the GitHub repo, set
build command `npm run build`, output `dist`, and add `NODE_VERSION=22` and `VITE_CLERK_PUBLISHABLE_KEY` as
build variables. Runtime secrets already live on the project.
