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
   The sign-in page uses Clerk's **sign-in-or-up** flow (`<SignIn withSignUp />`): an email without an account
   goes straight to "create account → enter code" instead of showing *Couldn't find your account*.
4. **API keys**: copy the **Publishable key** → `VITE_CLERK_PUBLISHABLE_KEY` *and* `CLERK_PUBLISHABLE_KEY`;
   copy the **Secret key** → `CLERK_SECRET_KEY`.
5. (Optional, recommended) **Webhooks → Add endpoint**:
   URL `https://<your-domain>/api/webhooks/clerk`, events `user.created`, `user.updated`, `user.deleted`.
   Copy the **Signing secret** → `CLERK_WEBHOOK_SIGNING_SECRET`. Without it the app still works: users are
   created in the database the first time they save something.
6. Going live (**done 17 Oct 2026**): the **production** instance is live on the root domain `ascent-i-tech.in`.
   Clerk's front-end API answers at `clerk.ascent-i-tech.in`, the hosted account pages at
   `accounts.ascent-i-tech.in`, and sign-in codes are sent from `clkmail.ascent-i-tech.in` (five CNAMEs, all
   verified in Clerk → Configure → Domains). Production keys are `pk_live_…` / `sk_live_…` (Clerk → API keys on
   the *Production* instance). The production instance only works on `*.ascent-i-tech.in`, so sign-in no longer
   works on the `pages.dev` address. The development instance still exists for experiments; `.dev.vars` and
   `.env.local` currently point at **production** so local runs share the real user base.
7. Children & privacy: Clerk does not age-gate. For under-13 students, collect a **parent or teacher** email
   rather than the child's. The site says so on its privacy page: <https://builders.ascent-i-tech.in/privacy>
   (`src/pages/PrivacyPage.tsx`) lists what is stored, which services process it, and how to delete an account;
   <https://builders.ascent-i-tech.in/terms> (`src/pages/TermsPage.tsx`) holds the short terms of use. Both are
   linked from the footer. Update the *Last updated* date in `PrivacyPage.tsx` when you change either page.
8. **Sign in with Google** (production, enabled 17 Oct 2026): Clerk → Configure → SSO connections → Google uses
   *custom credentials* from the Google Cloud project **Builders of Tomorrow** (ID `builders-of-tomorrow`, org
   `ascent-i-tech.in`): OAuth consent screen *External*, app name "Builders of Tomorrow", support/developer email
   `harsha@ascent-i-tech.in`, authorised domain `ascent-i-tech.in`; a *Web application* OAuth client with JavaScript
   origin `https://builders.ascent-i-tech.in` and redirect URI `https://clerk.ascent-i-tech.in/v1/oauth_callback`.
   The `<SignIn withSignUp />` / `<SignUp />` components show the "Continue with Google" button automatically.
   Branding also carries the privacy policy link `https://builders.ascent-i-tech.in/privacy` and the Terms of
   Service link `https://builders.ascent-i-tech.in/terms` (added 17 Oct 2026); Google requires the privacy link
   before an external app can leave *Testing*. Google Auth Platform → Audience → **Publish app** → Confirm moves
   the app from *Testing* (only listed test users can sign in) to **In production** (any Google account). No
   verification is needed for the `openid`/`email`/`profile` scopes as long as the app has no logo and fewer
   than ten authorised domains, so do not upload a logo on the Branding page. **Published 17 Oct 2026**: the
   Audience page reads *In production*, so any Google account can sign in.
   Note: Google accounts managed by Family Link (most under-13s) usually cannot sign in to third-party apps, so
   students keep using the email code; Google sign-in is mainly for parents and teachers.

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
- **A sub-domain of your own domain** — **this is what is live**: <https://builders.ascent-i-tech.in>.
  Pages → **Custom domains → Set up a domain**, then a `CNAME builders → builders-of-tomorrow-web.pages.dev` at
  the DNS provider. Cloudflare issues the certificate itself (status "Active" in the Pages project). The
  `pages.dev` address keeps serving the same deployment, but sign-in only works on the custom domain.
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
- [x] Neon: project, pooled `DATABASE_URL`, tables created (`npm run db:migrate`, 5 migrations; the latest adds `event_interest`)
- [x] Clerk: **production** instance on `ascent-i-tech.in` (email code only; password, phone, Apple and Google
  off), `pk_live`/`sk_live` on the Pages project; DNS verified, certificates issued by Clerk
  (webhook not configured; the app upserts users lazily). Accounts created on the old development instance
  do not carry over — students sign up again.
- [x] Resend: API key in place; sending domain `mail.ascent-i-tech.in` (DKIM TXT + two CNAMEs added in Squarespace DNS); sender `hello@mail.ascent-i-tech.in`, replies go to harsha@ascent-i-tech.in
- [x] Cloudflare Pages: project `builders-of-tomorrow-web` created with wrangler, secrets set, deployed by **direct upload**
- [x] Cloudflare R2: bucket `builders-of-tomorrow-files` (bound as `FILES` by `wrangler.toml`)
- [x] Domain: <https://builders.ascent-i-tech.in> (Pages custom domain, active). `APP_ORIGIN` in `wrangler.toml`
  and in the digest Worker point at it.
- [x] Clerk production instance + custom domain
- [x] DMARC: `_dmarc` TXT `v=DMARC1; p=none;` on the root domain (monitor-only policy; tighten to
  `p=quarantine` later once Google Workspace, Resend and Clerk mail all pass).
- [x] Privacy and terms pages (`/privacy`, `/terms`), admin page (`/admin`, owner only), in-person interest form
  (`/in-person`) — 17 Oct 2026.

### DNS records added for this project (Squarespace Domains → ascent-i-tech.in → DNS → Custom records)

The zone is hosted by Google (Squarespace Domains); the existing Google Workspace MX/SPF/DKIM records were not
touched. Squarespace asks for your authenticator code before every editing session.

| Purpose | Type | Name | Data |
| --- | --- | --- | --- |
| Site (Cloudflare Pages) | CNAME | `builders` | `builders-of-tomorrow-web.pages.dev` |
| Clerk front-end API | CNAME | `clerk` | `frontend-api.clerk.services` |
| Clerk account portal | CNAME | `accounts` | `accounts.clerk.services` |
| Clerk sign-in emails | CNAME | `clkmail` | `mail.xnya4tm470ld.clerk.services` |
| Clerk DKIM 1 | CNAME | `clk._domainkey` | `dkim1.xnya4tm470ld.clerk.services` |
| Clerk DKIM 2 | CNAME | `clk2._domainkey` | `dkim2.xnya4tm470ld.clerk.services` |
| Resend sending domain | as listed in Resend → Domains → `mail.ascent-i-tech.in` | | DKIM TXT + two CNAMEs |
| DMARC (root) | TXT | `_dmarc` | `v=DMARC1; p=none;` |

### Weekly summary email (digest)

Nothing emails on a launch. Once a week a tiny scheduled Worker (`workers/digest-cron`, cron `30 3 * * 1` = Monday
09:00 IST) calls `POST /api/digest/run` on the site with a shared secret; the API emails each opted-in learner a summary
of the last 7 days in the workshops they have **joined** (launches, best height, bridge tests, worksheets). Learners
turn it off under My Work → Weekly summary.

- Secret: `DIGEST_SECRET` (random, in `.dev.vars`) is set on **both** the Pages project and the Worker.
- Deploy the Worker: `npx wrangler deploy -c workers/digest-cron/wrangler.jsonc`
- Dry run (no emails): `curl -X POST -H "Authorization: Bearer $DIGEST_SECRET" "https://builders-of-tomorrow-digest-cron.<account>.workers.dev/run?dryRun=1"`
- Sending domain: `mail.ascent-i-tech.in` (verified in Resend). The root domain's Google Workspace MX/SPF records were left untouched.

### Admin page (site owner only)

<https://builders.ascent-i-tech.in/admin> shows every registered learner (email, name, role, joined date, workshops
joined, designs, launches, bridge tests, worksheets, uploads, last activity, weekly-email setting, CSV export) plus
basic analytics: sign-ups per week, activity per day, totals per workshop. The page is only a view; access is
enforced by the API. `GET /api/admin/stats` and `GET /api/admin/users` run `requireAuth` and then `requireAdmin`
(`server/auth.ts`), which asks Clerk for the signed-in account's **verified primary email** on every call and
compares it, case-insensitively, with the comma-separated `ADMIN_EMAILS` variable (`wrangler.toml` `[vars]`,
currently `harsha@ascent-i-tech.in`; the code falls back to that address when the variable is unset). Everyone
else gets `403`, and the "Admin" link in the header only appears when `/api/me` reports `isAdmin: true`. To add a
second admin, append their email to `ADMIN_EMAILS` and redeploy. Queries are read-only; `server/admin.test.ts`
covers the allow-list and `server/admin.db.test.ts` is a read-only smoke test that runs only when `DATABASE_URL`
is set.

### In-person workshop interest form

<https://builders.ascent-i-tech.in/in-person> (`src/pages/InPersonPage.tsx`, linked from the home page banner and the
footer) lets parents, teachers and club leaders say they want a physical water-rocket workshop: name, email, optional
phone, city, number of children, their ages, preferred format (school/club, weekend event, either) and a message. No
account is needed. `POST /api/interest` (`server/routes/interest.ts`) validates with `interestRequestSchema`
(`shared/validation.ts`), drops submissions whose hidden honeypot field is filled, allows at most 3 per email per day,
records the Clerk user id when the visitor happens to be signed in, and stores the row in the `event_interest`
table (migration `drizzle/0004_*.sql`). Rows have a `status` column (`new` by default) for your own bookkeeping; the
site never changes it. The admin page lists every request newest first with search and CSV export
(`GET /api/admin/interest`, owner only). Nothing is emailed on submission; check `/admin` or export the CSV.

### Workshops are opt-in

Learners **join** a workshop (Home → Join workshop, or automatically when they first save a design or log a test).
My Work, the header links and the weekly summary only show joined workshops; every workshop stays browsable.
Guest-mode joins live in the browser and are copied into the account on sign-in.

### Deploying updates

The project was deployed with **direct upload**, not Git integration, so a new version ships with:

```bash
npm run deploy
```

(`npm run build` bakes `VITE_CLERK_PUBLISHABLE_KEY` from `.env.production` / `.env.local` — both hold the
`pk_live` key — then `wrangler pages deploy ./dist`.) `[vars]` from `wrangler.toml` are uploaded with every
deploy; secrets stay on the project. If `APP_ORIGIN` changes, also redeploy the digest Worker.
To switch to automatic deploys on every push instead: Cloudflare dashboard → Workers & Pages →
`builders-of-tomorrow-web` → Settings → Builds & deployments → **Connect to Git**, pick the GitHub repo, set
build command `npm run build`, output `dist`, and add `NODE_VERSION=22` and `VITE_CLERK_PUBLISHABLE_KEY` as
build variables. Runtime secrets already live on the project.
