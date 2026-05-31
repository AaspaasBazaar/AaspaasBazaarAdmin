# Roadmap

Phased delivery. Each phase ends with a demoable, deployable artifact. No phase blocks the next from starting design work, but a phase must be **deployed to staging** before the following one merges to `main`.

## Phase 0 — Foundations (1 week)

**Goal:** empty Next.js shell deployed.

- [ ] Scaffold Next.js 15 + TS + Tailwind v4 + shadcn init.
- [ ] Add ESLint, Prettier, Vitest, Playwright, lefthook (precommit).
- [ ] Wire Firebase Admin SDK (`lib/firebase-admin.ts`).
- [ ] Wire NextAuth Google provider + admin allowlist.
- [ ] CI: lint + typecheck + test on every PR.
- [ ] Deploy a "Hello, admin" page to Vercel.
- [ ] Set up `firestore.rules`, `firestore.indexes.json`, `vercel.json`.

**Exit criteria:** login works against allowlist; deploy is green.

## Phase 1 — Data layer + read-only UI (1 week)

- [ ] Implement `lib/schemas.ts` (Zod for all entities).
- [ ] Implement `lib/db/{vendors,items,orders,settings,weekly-totals}.ts`.
- [ ] Run `scripts/seed-from-dbjson.ts` against staging Firestore.
- [ ] Build read-only pages: Dashboard, Vendors, Items, Orders, Settings.
- [ ] Build server-component data fetchers with `revalidate` set per page.
- [ ] Tests: unit tests for each db module (mocking Firestore).

**Exit criteria:** every screen shows real data from Firestore.

## Phase 2 — Mutations (1 week)

- [ ] API routes: POST/DELETE vendors; toggle open; POST settings.
- [ ] Forms: add-vendor dialog, settings form.
- [ ] CSRF middleware + per-user rate limit.
- [ ] Audit log writes on every mutation.
- [ ] Playwright smoke: login → add vendor → toggle → delete.

**Exit criteria:** admin can do every action the Flask app supports.

## Phase 3 — Simulator + cron (3 days)

- [ ] Port `place_simulated_order` to TS (`lib/sim/place-simulated-order.ts`).
- [ ] `/api/cron/simulate-order` guarded by `CRON_SECRET`.
- [ ] `/api/simulate-order` (manual trigger from UI).
- [ ] `vercel.json` cron configured to `* * * * *` (tunable).

**Exit criteria:** orders appear in the live feed on schedule in staging.

## Phase 4 — Real-time order feed + dashboard polish (3 days)

- [ ] Firestore `onSnapshot` listener on the dashboard for the last 10 orders.
- [ ] Weekly totals chart (Recharts) wired to `weeklyTotals/current`.
- [ ] Stats tiles with sparkline trend (last 7 days).
- [ ] Loading skeletons; empty states; error toasts.

**Exit criteria:** dashboard feels live and never shows a broken state.

## Phase 5 — Production cutover (1 day, calendar-blocked)

- [ ] Run the [Migration cutover runbook](./migration.md#cutover-runbook).
- [ ] Decommission Flask host.
- [ ] Move `app.py`, `db.json`, `templates/`, `static/` to a `legacy/` branch.

**Exit criteria:** Flask is off; new app serves all traffic; weekly totals match the pre-cutover snapshot.

## Phase 6 — Stretch (post-launch, opportunistic)

| Item | Notes |
|------|-------|
| Vendor detail page with map | Leaflet + OSM tiles |
| Bulk item CSV import | Drag-drop, Zod-validated row-by-row |
| Order status transitions | State machine + history per order |
| Push notifications to vendors | FCM, vendor-side app required |
| Multi-language admin UI | next-intl, English + Hindi + Bengali |
| Role-based access (admin/viewer) | Extend session token; gate mutations |
| Sentry + uptime monitoring | DSN env, dashboards |

## Out of scope

- Customer-facing storefront — separate repo.
- Vendor self-service portal — separate repo.
- Payments — handled outside this admin panel.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firestore cost spike from real-time listener | Med | Med | Limit subscription to `where("created_at", ">", now-1h)`, fall back to polling if quota hit |
| Vercel cold starts hurt cron timing | Low | Low | Cron is opportunistic, drift is fine |
| Service-account key leak | Low | High | env-only, gitleaks precommit, rotate on offboarding |
| OAuth lockout if allowlist breaks | Low | High | Keep a documented "break-glass" admin email + a rotated personal-access script that can add an email via gcloud directly |
