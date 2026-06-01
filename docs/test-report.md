# AaspaasBazaar Admin — Test Report

**Date:** 2026-05-31
**Build:** Next.js 15.5.18 dev server, Firestore mode (`STORAGE_MODE=firestore`, project `aaspaasbazaar`)
**Method:** Playwright MCP walk-through of every page + every interactive element + every API endpoint

Severity levels:
- **P0** — blocks core workflow (broken auth, data loss, page crash)
- **P1** — feature visibly present but non-functional
- **P2** — UX rough edge or incorrect data display
- **P3** — polish, missing-but-not-promised feature

---

## 1. Summary

| Page | Renders | Reads data | Writes work | Auth gate | Verdict |
|------|---------|-----------|-------------|-----------|---------|
| `/login` | ✅ | n/a | ✅ POST `/api/auth/login` | n/a | OK |
| `/` Dashboard | ✅ | ✅ | n/a | ✅ | mostly OK — stat labels misleading |
| `/vendors` | ✅ | ✅ | ✅ add, toggle, delete | ✅ | edit button stub, no detail view |
| `/categories` | ✅ | ✅ | ✅ add, delete | ✅ | no edit |
| `/items` | ✅ | ✅ | ❌ no CRUD | ✅ | read-only |
| `/orders` | ✅ | ✅ | ❌ no status update | ✅ | read-only |
| `/admins` | ✅ | ✅ | ✅ add, toggle, delete | ✅ | no edit |
| `/settings` | ✅ | ✅ | ❌ no edit form | ✅ | read-only |
| Logout | ✅ | n/a | ✅ POST `/api/auth/logout` | n/a | OK |
| **Search bar (topbar)** | ✅ | ❌ | ❌ **no handler at all** | ✅ | **broken everywhere** |

---

## 2. Defects (full inventory)

### P0 — broken / blocks workflow

| # | Area | Issue | Where |
|---|------|-------|-------|
| 1 | Search | Top-bar search input has no `onChange`, no form, no submit, no results page. Typing does nothing on every page. Backend `/api/search?q=` works but no UI consumes it. | `components/Topbar.tsx` |
| 2 | Auth | Login is email-only — anyone who knows an admin email can sign in. No password / OTP / OAuth challenge. | `app/api/auth/login/route.ts` |

### P1 — feature present but non-functional

| # | Area | Issue | Where |
|---|------|-------|-------|
| 3 | Vendors | "Edit" pencil button opens `alert("Edit form coming soon")`. No edit modal. | `components/VendorsTable.tsx:152` |
| 4 | Categories | No edit — only add + delete. Can't change color or name once created. | `components/CategoriesPanel.tsx` |
| 5 | Admins | No edit — only add + toggle + delete. Can't change role after creating. | `components/AdminsTable.tsx` |
| 6 | Items | Read-only table. No Add / Edit / Delete. No stock-status toggle. | `app/items/page.tsx` |
| 7 | Orders | Read-only table. No way to change order status (Pending → Accepted → Completed). | `app/orders/page.tsx` |
| 8 | Settings | Read-only card. No form to edit `discovery_radius`, `default_delivery_fee`, `order_model`. Backend `POST /api/settings` works. | `app/settings/page.tsx` |
| 9 | Dashboard | No button to trigger order simulator. `/api/simulate-order` exists but unreachable from UI. | `app/page.tsx` |
| 10 | Topbar | Notification bell has hardcoded red dot — no notification feed, no click handler. | `components/Topbar.tsx` |

### P2 — UX / data correctness

| # | Area | Issue | Where |
|---|------|-------|-------|
| 11 | Dashboard | "Orders today" tile actually shows the **weekly total**, not today. Label misleading. | `app/page.tsx:30` |
| 12 | Dashboard | "Active vendors change" hardcoded to `▲ {vendors.length - 8} new` — bogus math, not tied to real delta. | `app/page.tsx:42` |
| 13 | Dashboard | `Orders today` delta `12.4%`, `Revenue` `8.1%`, `Pending` `3 waiting` are all hardcoded strings copied from Figma. | `app/page.tsx:38-50` |
| 14 | Topbar | "Geofence · 3km" chip hardcoded. Should read `settings.discovery_radius`. | `components/Topbar.tsx:23` |
| 15 | Sidebar | "Orders" badge hardcoded `7`. Should show real pending count. | `components/Sidebar.tsx:14` |
| 16 | Sidebar | User card hardcodes "Dheeraj" + "Super Admin". Should pull from session cookie / `/api/auth/me`. | `components/Sidebar.tsx:101-104` |
| 17 | Vendors | Clicking a vendor row does nothing — no detail view (`/vendors/:id`). | `app/vendors/page.tsx` |
| 18 | Orders | No order detail view. No customer info, no item list, no map. | `app/orders/page.tsx` |
| 19 | Items | No filter UI (vendor / category / status) although API supports `?vendor_id` `?category` `?status`. | `app/items/page.tsx` |
| 20 | Orders | No filter UI (status / vendor / limit) although API supports these. | `app/orders/page.tsx` |
| 21 | Forms | Inputs are not wrapped in `<form>` — Enter key doesn't submit. User must click "Save". | All three add forms |
| 22 | Errors | Toggle / delete failures show `alert()` modals. Need toast or inline message. | `VendorsTable`, `AdminsTable` |
| 23 | Add vendor form | All category badges shown at full opacity even when none picked? — Re-check; actually code dims non-picked but visual contrast is weak. | `VendorsTable.tsx:289` |
| 24 | Search bar | Even when wired, no debounce, no results dropdown design. Need a `SearchPalette` component. | `components/Topbar.tsx` |
| 25 | Categories | Vendor count is computed by matching `category.name === vendor.categories[i]` (string compare). If a category is renamed, vendor join breaks. Should join by slug. | `lib/db/categories.ts:55` |
| 26 | Login | Footer says "Default owner: purchase@ascentspark.com" — leaks an email; remove for production. | `components/LoginForm.tsx:55` |
| 27 | Live feed | Shows top 4 orders fetched server-side; not actually live — no Firestore listener, no polling, no auto-refresh on simulator click. | `app/page.tsx`, `components/LiveFeed.tsx` |
| 28 | Dashboard | Revenue calc reads the **entire** orders collection (could be 100k+ docs in prod) every request — expensive on Firestore reads. | `app/page.tsx:23` |

### P3 — polish

| # | Area | Issue |
|---|------|-------|
| 29 | All pages | No loading skeletons / spinners during initial fetch — pages blank until data arrives. |
| 30 | All tables | No pagination — orders table will choke at 1000+ rows. |
| 31 | All tables | No sorting on column headers. |
| 32 | Mobile | Not tested. Layout uses fixed 256px sidebar; will be unusable below 640px. |
| 33 | A11y | Icon-only buttons (edit / delete / toggle / notification / logout) have no aria-label or only some have it. |
| 34 | Theme | No dark-mode toggle. |
| 35 | Empty states | Categories + vendors have them; items, orders, admins don't. |
| 36 | Sidebar | Stat tiles show `0` if Firestore returns empty — no friendlier message. |
| 37 | Favicon | `app/icon.svg` works in Chrome; Safari may need PNG `app/apple-icon.png`. |

### Security review (non-caveman)

| # | Severity | Issue | Where |
|---|----------|-------|-------|
| S1 | **HIGH** | Login is email-only allowlist. Anyone with knowledge of an admin email can authenticate. **Add password (or OAuth, or email-OTP) before going to production.** | `app/api/auth/login/route.ts` |
| S2 | MED | Middleware only checks cookie *presence*, not HMAC validity. A user with a junk `ab_session` cookie value bypasses the redirect to `/login`. Pages then read `verifySession()` and treat it as logged-out, so they render no user data — but this is brittle. Verify in middleware via Web Crypto. | `middleware.ts` |
| S3 | MED | Mutation routes (`POST /api/vendors`, `POST /api/admins`, `DELETE …`) do **not** check the session cookie. Anyone who can reach the server bypasses auth on writes. Wrap with a `requireSession()` helper. | All `app/api/**/route.ts` |
| S4 | MED | No CSRF token. `SameSite=Lax` on the session cookie blocks most cross-site POST attacks, but a malicious site can still issue `POST` with `Content-Type: text/plain` and trigger writes. Add a CSRF token issued on login. |
| S5 | LOW | No rate limiting on `/api/auth/login`. Email-enumeration / brute-force possible. Add Upstash Redis + `@upstash/ratelimit` once production. |
| S6 | LOW | Error responses leak which emails are vs are not on the allowlist (`Email not on allowlist`). Use generic `Invalid credentials` once a password is added. |
| S7 | LOW | `service-account.json` lives at repo root. `.gitignore` covers it but verify on every commit (`git status`). |
| S8 | INFO | `SESSION_SECRET` in `.env.local` for dev. Production needs ≥32-char value via Vercel env. The dev fallback in `lib/session.ts` throws in production. |

---

## 3. What works (the green list)

- Login → cookie set → redirect to `next` ✓
- Logout → cookie cleared → next request 307 → `/login` ✓
- Auth gate redirects every protected path to `/login` ✓
- All 17 API routes respond with valid JSON and correct status codes ✓
- Vendor `+Add vendor` form posts and refreshes table ✓
- Vendor toggle switch persists to Firestore ✓
- Vendor delete cascades to items in same batch ✓
- Admin add / toggle / delete persists ✓
- Admin `LAST_OWNER` protection refuses deletion of the only active owner ✓
- Categories auto-seed 8 defaults on first read ✓
- Category add / delete persists ✓
- Category vendor counts computed live from vendors ✓
- Storage abstraction switches Firestore ↔ JSON via env ✓
- Order simulator endpoint creates orders + increments weekly totals ✓
- `npx tsc --noEmit` clean ✓
- Build clean (17 routes, 8 pages) ✓

---

## 4. Recommended changes (prioritised backlog)

### Sprint 1 — make it complete (P0 / P1 / S1-S3)

| Order | Task | Files | Effort |
|------:|------|-------|-------:|
| 1 | Wire global search: debounced fetch to `/api/search?q=`, dropdown with grouped results (Vendors / Items / Orders), `Cmd/Ctrl+K` shortcut. | New `components/SearchPalette.tsx`, replace input in `Topbar.tsx` | M |
| 2 | Add password (or email-OTP) login. Either bcrypt password on admins doc, or 6-digit code mailed via Resend. | `lib/schemas.ts` (password_hash), `lib/auth.ts` (verify), `LoginForm.tsx` | L |
| 3 | Wrap every mutation route with `requireSession(roles?: AdminRole[])`. Verify HMAC via `lib/session.ts`. Add an `auth()` helper. | New `lib/auth-server.ts`, edit every `app/api/**/route.ts` mutation | M |
| 4 | Edit Vendor modal: pre-fill form, `PATCH /api/vendors/:id`. | New `PATCH` route, edit `VendorsTable.tsx` | M |
| 5 | Edit Category: name + color in inline row form, `PATCH /api/categories/:slug`. | New `PATCH` route, edit `CategoriesPanel.tsx` | S |
| 6 | Edit Admin: name + role inline, `PATCH /api/admins/:email` (already exists). | `AdminsTable.tsx` | S |
| 7 | Settings form: editable fields with save button, POST `/api/settings`. | `app/settings/page.tsx` → client wrapper | S |
| 8 | Items CRUD: Add Item form (vendor select + category + price + unit + status), edit, delete. | New `lib/db/items.ts` writers + routes + `ItemsTable.tsx` | L |
| 9 | Orders: status dropdown per row, `PATCH /api/orders/:id/status`. | New route + `OrdersTable.tsx` | M |
| 10 | "Simulate order" button on dashboard, POST `/api/simulate-order`, `router.refresh()`. | `app/page.tsx` | S |

### Sprint 2 — data correctness (P2)

| Order | Task | Effort |
|------:|------|-------:|
| 11 | Dashboard stats: real "orders today" (filter by `created_at` >= start-of-day), revenue today, real deltas (vs yesterday). | M |
| 12 | Sidebar "Orders" badge: actual pending count from Firestore. Server fetch + pass into Sidebar via session-aware layout. | S |
| 13 | Sidebar user card: read `email` + `role` + `name` from session. Add `/api/auth/me` endpoint. | S |
| 14 | Geofence chip: read `settings.discovery_radius` (server-fetched into Topbar via prop). | S |
| 15 | Categories: join vendor counts by `slug` not `name` (rename-safe). | S |
| 16 | Live feed: poll `/api/orders?limit=5` every 5s via SWR, or attach Firestore `onSnapshot` (needs client SDK + auth token). | M |
| 17 | Replace `alert()` errors with a toast component (sonner or custom). | M |
| 18 | Wrap forms in `<form onSubmit>` for keyboard submit. | XS |
| 19 | Items + Orders filter dropdowns. | M |
| 20 | Vendor detail page `/vendors/:id` + Order detail `/orders/:id`. | L |

### Sprint 3 — polish (P3)

| Order | Task | Effort |
|------:|------|-------:|
| 21 | Loading skeletons on tables. | M |
| 22 | Table pagination (server-side, cursor on Firestore `startAfter`). | L |
| 23 | Sortable column headers. | M |
| 24 | Mobile responsive sidebar (collapsible drawer below 768px). | M |
| 25 | A11y pass: aria-labels on every icon button, focus rings, keyboard nav. | M |
| 26 | Dark mode (Tailwind `dark:` variants + theme toggle in topbar). | M |
| 27 | Empty states on items / orders / admins. | XS |
| 28 | Apple PNG icon for Safari favicon. | XS |
| 29 | Remove "Default owner" hint from login footer for prod. | XS |
| 30 | Sentry + log scrubbing for production errors. | M |

### Sprint 4 — security hardening (S4–S8)

| Order | Task | Effort |
|------:|------|-------:|
| 31 | Web-Crypto HMAC verify in middleware (proper signed cookie check on every request). | M |
| 32 | CSRF token: issue on login, store in cookie + body header; verify on every POST/PATCH/DELETE. | M |
| 33 | Rate limit `/api/auth/login` (Upstash Redis or in-memory per-IP token bucket). | M |
| 34 | Generic "Invalid credentials" on auth failures (drop "Email not on allowlist"). | XS |
| 35 | Pre-commit gitleaks hook to catch `service-account.json` accidents. | S |
| 36 | Move `service-account.json` to env vars in production deploy. | S |

---

## 5. Effort estimate (rough)

| Sprint | Items | Total effort |
|--------|------:|-------------:|
| 1 | 10 | ~6–8 days |
| 2 | 10 | ~5–7 days |
| 3 | 10 | ~6–8 days |
| 4 | 6 | ~3–4 days |

**Bare-minimum to call v1 done:** Sprint 1 items 1, 3, 7, 8, 9 + Sprint 2 items 11, 16, 17 → ~5 days of focused work.
