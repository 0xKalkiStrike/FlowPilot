# FlowPilot

**Build browser automations visually.**

FlowPilot is a visual, no-code browser automation platform. Users drag nodes onto a canvas, connect them into a
workflow, and run it against a real Chromium browser via Playwright — no API keys, CSS selectors, or code required
for ordinary website automation.

```
USER → VISUAL WORKFLOW → AUTOMATION ENGINE → REAL BROWSER → WEBSITE
```

## What's here

A working monorepo:

- **`apps/web`** — React + Vite + TypeScript + Tailwind + XYFlow (React Flow) workflow builder, dashboard, runs,
  schedules, credentials, templates, settings.
- **`apps/server`** — Fastify + SQLite (via Node's built-in `node:sqlite`) REST API, JWT auth, a real workflow
  execution engine wired to Playwright, an in-process cron scheduler, Server-Sent Events for live execution logs,
  and a browser recorder.
- **`packages/workflow-schema`** — the versioned workflow JSON schema (Zod) and the central node registry (60+
  node types across Triggers, Browser, Interaction, Forms, Logic, Data, Files, Services, Utilities).
- **`packages/browser-engine`** — Playwright wrapper: multi-strategy selector resolution with fallback, element
  classification for the recorder, quantity-setting logic, per-node-type executors, and the recorder itself.
- **`packages/workflow-engine`** — the execution engine: variable resolution, IF/SWITCH branching, four loop types,
  retry/timeout/continue-on-error handling, and a small sandboxed condition expression evaluator (no `eval`).
- **`packages/shared`** — AES-256-GCM credential encryption, password hashing, structured/redacting logger,
  `{{variable}}` template resolution.

Every node type in the registry that's marked `implemented: true` has a real executor — there is no mocked
execution path. A handful of advanced connector/database integrations are intentionally left as clear,
non-mocked "not enabled" errors rather than fake success (see Known Limitations).

## Install & run

Requires Node 18.18+ and npm. Playwright's Chromium browser must be available (see your environment's Playwright
setup; nothing extra is required if Chromium is already installed on `PATH`/`PLAYWRIGHT_BROWSERS_PATH`).

```bash
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # paste into CREDENTIAL_ENCRYPTION_KEY
npm run build
npm run db:seed        # creates storage/flowpilot.db (tables auto-created) + demo login + built-in templates
npm run dev             # starts the API on :4000 and the web app on :5173
```

Open http://localhost:5173.

### Default login (seeded)

```
email:    demo@flowpilot.local
password: FlowPilot123!
```

No website credentials are seeded — add your own from the Credentials page only if a specific workflow needs one.

### Useful scripts

```
npm run dev          # server + web, both in watch mode
npm run build         # builds every package/app in dependency order
npm run test          # vitest across all workspaces (schema, engine, browser-engine, server, web)
npm run db:seed       # demo user + built-in templates (creates storage/flowpilot.db if it doesn't exist)
```

There's no separate migrate/push step: the server creates its tables automatically (`CREATE TABLE IF NOT EXISTS`)
the first time anything opens `storage/flowpilot.db`, including `db:seed` itself and the server's own startup.

## Environment variables

See `.env.example`. The only one you must set yourself is `CREDENTIAL_ENCRYPTION_KEY` (a base64 32-byte key) —
credential saving/using fails fast with a clear error until it's set. Everything else has a sane local default.
`BROWSER_HEADLESS=false` runs workflows in a visible browser window, which is the default for local development
so you can watch automations run; set it to `true` for unattended/scheduled runs on a server without a display.

## Design notes / known limitations

- **Database**: SQLite, accessed through a small hand-written data layer (`apps/server/src/db/sqlite.ts`) built
  directly on Node's built-in `node:sqlite` module — not a Prisma Client at runtime. This was a deliberate
  portability pivot: Prisma's query engine needs a native binary downloaded from `binaries.prisma.sh` at
  `npm install` time, which fails outright on a network that blocks that host (as this build environment's did).
  `node:sqlite` has zero native dependencies to download, so the app installs and runs identically on a
  locked-down corporate network, an offline machine, or a fresh laptop. `prisma/schema.prisma` is kept as the
  canonical, human-readable description of the same 13-table data model (and remains the intended path to a
  future PostgreSQL migration) — the hand-written layer's table DDL and query methods are kept in sync with it
  by hand, and expose the same `prisma.model.method()` call shape every route uses, so no route code needed to
  change. The one caveat: `node:sqlite` is still an experimental Node API (stable enough for this app, logs an
  `ExperimentalWarning` on startup) and, being very new, isn't yet recognized by every version of every dev
  tool — `apps/server/src/db/sqlite.ts` loads it via `require("node:sqlite")` rather than a static `import`
  specifically to stay compatible with vitest's bundled module resolver, which is documented in a comment there.
- **Scheduler**: an in-process cron scheduler (`node-cron` + `cron-parser`), not BullMQ/Redis. Schedules are
  persisted in SQLite and reloaded on every server start, so a restart never loses a schedule. This is the
  explicit fallback the spec calls for when Redis isn't available; swapping in BullMQ later is a service-layer
  change, not a schema change.
- **Container nodes (IF / SWITCH / loops)**: branch membership is assigned via the node's config panel
  ("Parent container" + "Branch") rather than dragging a node into a nested sub-canvas region. This keeps the
  execution model simple and fully functional; it's a UX simplification, not a missing feature — every branch,
  loop type, and nesting level actually executes.
- **Connectors** (Discord, GitHub, WordPress, WooCommerce, Vercel, Render): implemented as browser-automation
  building blocks (open the site, click, type — the same primitives as any other workflow) rather than one
  bespoke integration per service, since the product principle is "automate through the real UI, no API keys
  required." A `service.database` node exists in the registry but returns a clear "not enabled" error rather
  than pretending to run a query — no native DB driver is wired up in this build.
- **CAPTCHA / human verification**: detected heuristically and the run pauses with a clear message. FlowPilot
  never attempts to solve or bypass CAPTCHAs, MFA, or other access controls.
- **Recorder needs a real (or virtual) display**: recording opens a visible, headed browser window so you can
  click around it — that's unrelated to `BROWSER_HEADLESS`, which only controls *scheduled/run* browsers. On a
  headless server (no X server) the recorder will fail to launch with a clear "Missing X server or $DISPLAY"
  error; run it under `xvfb-run`, or record from a machine with a real display, or over the desktop app.
- **Mobile**: the dashboard, lists, and run detail pages are fully responsive. The workflow *builder* (node
  palette + canvas + config panel) is a desktop/tablet experience by design (per spec) — on narrow screens the
  side panels hide and the canvas remains usable for viewing/running, but building is most comfortable at
  tablet width or larger.
- **Webhook triggers**: the node type and its config exist end-to-end (schema, registry, validation), but no
  public HTTP endpoint is exposed to receive inbound webhooks in this build — trigger a workflow via the API,
  the UI, or a schedule instead.

## Project layout

```
flowpilot/
├── apps/
│   ├── web/            React + Vite builder UI
│   └── server/          Fastify API + scheduler + recorder
├── packages/
│   ├── workflow-schema/  Zod schema + node registry
│   ├── workflow-engine/  Execution engine
│   ├── browser-engine/   Playwright wrapper
│   └── shared/           Encryption, logging, variables
├── prisma/                schema.prisma + seed.ts
├── storage/                SQLite DB, browser profiles, downloads
├── screenshots/            Execution screenshots
└── workflows/              (reserved for standalone workflow JSON exports)
```
