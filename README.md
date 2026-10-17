# Builders of Tomorrow · Water Rocket Lab 🚀

Kid-friendly STEM workshops with 3-D animations, by [Ascent Intelligent Technologies](https://ascent-i-tech.in/).
This is the starter: the **Water Rocket Lab**. More workshops plug into the same shell.

## What is inside

| Tab | What kids do |
| --- | --- |
| **Learn** | Four interactive 3-D explainers: Newton's third law (“Push Back!”), air pressure (“Squeeze the Air”), parts of the rocket & launcher, launch angles; plus charts for water and pressure. |
| **Design Cycle** | The Engineering Design Cycle (Ask → Imagine → Plan → Create → Test → Improve) as a clickable diagram with checklists and links into the lab. |
| **Build** | Design a rocket in 3-D: bottle size, nose shape, fins, nozzle, weight, colours; set water, pressure and angle on the launcher; see a live prediction. |
| **Launch** | Pump up, count down, and watch the flight in 3-D with a follow camera, slow motion, HUD, results, fun comparisons, a target challenge and a flight log. |
| **Worksheets** | Seven worksheets (Explorer / Builder / Engineer) that auto-save and print cleanly: fair tests, variables, a design journal, safety. |
| **My Rockets** | Saved designs, copies, launches; sign in to keep everything across devices. |

The simulator (`src/sim/rocket.ts`) is a real physics model: adiabatic air expansion, Bernoulli water exhaust,
choked air flow after the water runs out, drag, and a launcher that holds the rocket until thrust beats gravity.
Tests in `src/sim/rocket.test.ts` pin down the behaviour kids are meant to discover (sweet spot for water,
45° for distance, pointy noses, and so on).

## Stack

- **Front-end**: Vite 8 + React 19 + TypeScript, Tailwind CSS v4, React Router, React Three Fiber + drei, Zustand.
- **Hosting**: Cloudflare **Pages** (static site) + Pages Functions for `/api/*` (Hono).
- **Accounts**: **Clerk** with email verification *code* sign-in (no passwords).
- **Database**: **Neon** Postgres via Drizzle ORM (`server/db/schema.ts`, migrations in `drizzle/`).
- **Files**: Cloudflare **R2** (student uploads).
- **Email**: **Resend** (share a launch result with a parent/teacher).

Everything degrades gracefully: with no keys configured the site runs in **guest mode** and saves to the browser.

👉 **Account setup, keys and the free-tier checklist: [docs/SETUP.md](docs/SETUP.md).**

## Project layout

```
index.html, src/           Vite app (pages, components, 3-D scenes, physics)
  src/sim/                 physics engine + tests
  src/three/               React Three Fiber scenes (launch, workbench, explainers)
  src/pages/water-rocket/  the workshop tabs
  src/content/             worksheets, design-cycle text, workshop catalogue
  src/lib/                 API client, local/remote storage hooks
shared/                    types + zod schemas shared by browser and API
server/                    Hono API (routes, auth, Drizzle schema)
functions/api/[[route]].ts Cloudflare Pages Function entry → server/app.ts
drizzle/                   generated SQL migrations
wrangler.toml              Pages config: output dir, R2 binding, vars
docs/SETUP.md              what to create on GitHub / Cloudflare / Neon / Clerk / Resend
```

## Scripts

```bash
npm run dev            # Vite dev server (http://localhost:5173), proxies /api → :8788
npm run dev:api        # Pages Functions locally with .dev.vars + local R2 (http://localhost:8788)
npm run build          # type-check + production build into dist/
npm run preview:pages  # build and serve dist/ + functions through Wrangler (like production)
npm run deploy         # manual deploy with Wrangler (Git integration is the default path)
npm test               # physics unit tests (vitest)
npm run typecheck      # tsc -b over app, functions and config
npm run db:generate    # new migration after editing server/db/schema.ts
npm run db:migrate     # apply migrations to DATABASE_URL from .dev.vars
```

## API (all under `/api`, Bearer token from Clerk)

| Method & path | Purpose |
| --- | --- |
| `GET /health` | which services are configured |
| `GET /me` | upsert + return the signed-in user |
| `GET /designs?workshop=` · `PUT /designs/:id` · `DELETE /designs/:id` | saved rockets |
| `GET /launches` · `POST /launches` · `DELETE /launches[/:id]` | flight log |
| `GET /worksheets/:workshop[/:id]` · `PUT /worksheets/:workshop/:id` | worksheet answers |
| `GET/POST /files` · `GET/DELETE /files/:id` | uploads in R2 (images/PDF ≤ 5 MB) |
| `POST /share` | email a launch result via Resend |
| `POST /webhooks/clerk` | keep users in sync with Clerk |

## Adding the next workshop

1. Add an entry to `src/content/workshops.ts`.
2. Create `src/pages/<slug>/` with a layout + tabs and register routes in `src/App.tsx`.
3. Reuse `useDesigns`, `useLaunchLog`, `useWorksheet` with the new `workshop` slug; the API and database are
   already workshop-aware.

---

© Ascent Intelligent Technologies. Built for curious kids.
