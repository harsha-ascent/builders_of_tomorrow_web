# Builders of Tomorrow 🚀🌉

Kid-friendly STEM workshops with 3-D animations, by [Ascent Intelligent Technologies](https://ascent-i-tech.in/).
Two workshops ship today, the **Water Rocket Lab** and the **Bridge Builder**; more plug into the same shell.

## Water Rocket Lab

| Tab | What kids do |
| --- | --- |
| **Learn** | Four interactive 3-D explainers: Newton's third law (“Push Back!”), air pressure (“Squeeze the Air”), parts of the rocket & launcher, launch angles; plus charts for water and pressure. |
| **Design Cycle** | The Engineering Design Cycle (Ask → Imagine → Plan → Create → Test → Improve) as a clickable diagram with checklists and links into the lab. |
| **Build** | Design a rocket in 3-D: bottle size, nose shape, fins, nozzle, weight, colours; add up to two **booster stages**; choose **free fall or a parachute** (canopy size); set water, pressure, angle and **wind** on the launcher; see a live prediction with landing speed. |
| **Launch** | Pump up, count down, and watch the flight in 3-D: stage separation with boosters tumbling away, canopy inflating at apogee, follow camera, slow motion, HUD, results, fun comparisons, a target challenge and a flight log. |
| **Worksheets** | Ten worksheets (Explorer / Builder / Engineer) that auto-save and print cleanly: fair tests, variables, parachutes, two-stage challenge, a design journal, safety, rocket maths. |
| **My Rockets** | Saved designs, copies, launches; sign in to keep everything across devices. |
| **The Math** | Ages 12+: KaTeX equations for Newton's laws, Bernoulli thrust, adiabatic expansion, drag, projectile motion, terminal velocity, staging, energy and Euler integration, each with live numbers from the kid's own rocket, plus every modelling assumption. |

The simulator (`src/sim/rocket.ts`) is a real physics model: adiabatic air expansion, Bernoulli water exhaust with a
nozzle discharge coefficient, choked (and adiabatically cooled) air flow after the water runs out, drag against a steady
wind, sequential booster stages that separate when empty, a parachute that opens after apogee, and a launcher that holds
the rocket until thrust beats gravity.
Tests in `src/sim/rocket.test.ts` pin down the behaviour kids are meant to discover (sweet spot for water,
45° for distance, pointy noses, and so on) and keep the numbers in real-world ranges: a 2 L school rocket at
40 psi reaches roughly 20–40 m, a good one at 60 psi 30–55 m.

**Realism and safety.** Pressures are real gauge pressures. The default is 40 psi (typical school limit); the UI
marks 40–60 psi as "adult + launch cord" and above 60 psi as "simulator only". Every modelling assumption
(drag coefficients, nozzle factor 0.95, adiabatic air, no launch-tube boost, perfect stability, ±25 % accuracy)
is listed in `src/sim/assumptions.ts` and shown on the Build, Launch and Math pages.

## Bridge Builder

| Tab | What kids do |
| --- | --- |
| **Learn** | 3-D explainers: squash vs. stretch (tension/compression and buckling), why triangles hold their shape, five bridge types; buckling charts by length and material. |
| **Build** | A 2-D truss editor on a 5 cm grid across a 40 cm gap: add joints, glue pieces of craft stick, balsa, straw or spaghetti, laminate them (×1–×3), move and delete, undo, start from Warren/Pratt/Howe/king-post/under-deck patterns. Live analysis colours every piece red (pulled) or blue (pushed), shows exaggerated sag, cost against a coin budget and a 3-D preview at the breaking load. |
| **Load Test** | A 3-D test rig: a bucket filling up at mid-span or a toy truck driving to the worst spot, forces building up in colour until the first piece snaps. Breaking load, sag, mass, cost, efficiency ("holds N× its own weight"), the weakest link and how it failed, advice, and a test log. |
| **Worksheets** | Six worksheets: push or pull, triangle power, strongest shape test, budget engineer, design journal, bridge maths. |
| **The Math** | Stress/strain, Euler buckling (with the thickness-cubed and length-squared story), method of joints, the direct-stiffness method the solver uses, determinacy, efficiency and the square-cube law, plus assumptions. |

The solver (`src/sim/bridge.ts`) is a 2-D direct-stiffness truss analysis with self-weight, glue-limited tension,
Euler buckling capped by crushing, mechanism and connectivity checks, and a linear scale-to-first-failure that gives the
exact breaking load. Material numbers are rounded real values for classroom items; tests in `src/sim/bridge.test.ts`
keep single-stick trusses in the few-kilogram range and laminated ones several times stronger.

## Stack

- **Front-end**: Vite 8 + React 19 + TypeScript, Tailwind CSS v4, React Router, React Three Fiber + drei, Zustand.
- **Hosting**: Cloudflare **Pages** (static site) + Pages Functions for `/api/*` (Hono).
- **Accounts**: **Clerk** with email verification *code* sign-in (no passwords).
- **Database**: **Neon** Postgres via Drizzle ORM (`server/db/schema.ts`, migrations in `drizzle/`).
- **Files**: Cloudflare **R2** (student uploads).
- **Email**: **Resend** (share a launch result with a parent/teacher).

Everything degrades gracefully: with no keys configured the site runs in **guest mode** and saves to the browser.
Workshops are **opt-in**: learners join the ones they want (or join automatically on first save) and My Work shows only
those. A scheduled Worker (`workers/digest-cron`) sends one **weekly summary email**; nothing emails per launch.

👉 **Account setup, keys and the free-tier checklist: [docs/SETUP.md](docs/SETUP.md).**

## Project layout

```
index.html, src/           Vite app (pages, components, 3-D scenes, physics)
  src/sim/                 rocket physics + bridge truss solver + tests
  src/three/               React Three Fiber scenes (launch, workbench, explainers, bridge test rig)
  src/components/bridge/   2-D truss editor
  src/pages/water-rocket/  rocket workshop tabs
  src/pages/bridge-builder/ bridge workshop tabs
  src/pages/shared/        design-cycle and worksheet views reused by every workshop
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
| `GET /launches?workshop=` · `POST /launches` · `DELETE /launches[/:id]` | saved tests: rocket launches, bridge load tests |
| `GET /worksheets/:workshop[/:id]` · `PUT /worksheets/:workshop/:id` | worksheet answers |
| `GET/POST /files` · `GET/DELETE /files/:id` | uploads in R2 (images/PDF ≤ 5 MB) |
| `POST /share` | email a launch result via Resend |
| `POST /webhooks/clerk` | keep users in sync with Clerk |
| `GET/POST /enrollments` · `DELETE /enrollments/:workshop` | workshops the learner has joined |
| `GET /digest/preview` · `POST /digest/run` (cron Worker, bearer secret) · `PUT /me/preferences` | weekly summary email |

## Adding the next workshop

1. Add an entry to `src/content/workshops.ts`.
2. Create `src/pages/<slug>/` with a layout + tabs and register routes in `src/App.tsx`; reuse `DesignCycleView`,
   `WorksheetsView` and `WorksheetRoute` from `src/pages/shared/`.
3. Reuse `useDesigns<T>(workshop, normalize)`, `useTestLog<T>(workshop)` and `useWorksheet` with the new slug;
   add a zod schema to `shared/validation.ts` and map it in `designSchemaFor`. The API and database are already
   workshop-aware (designs and tests carry a `workshop` column).

---

© Ascent Intelligent Technologies. Built for curious kids.
