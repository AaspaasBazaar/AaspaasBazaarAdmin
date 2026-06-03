# AaspaasBazaar Backend — Repo Spec

> Paste this to Claude (or follow it yourself) to scaffold a **new standalone
> backend repo** for AaspaasBazaar. This backend is the single source of truth
> and the **only writer to Firestore**; every client (admin web, customer
> webapp, vendor webapp, future mobile apps) talks to it over HTTP.
>
> Suggested repo name: **`AaspaasBazaarBackend`**.

---

## 1. Why this repo exists

AaspaasBazaar is a hyperlocal, zone-based marketplace (India). Today the backend
is embedded inside the admin Next.js app (`AaspaasBazaarAdmin`). We are extracting
it into a dedicated service so all clients share one API, one set of business
rules, and one writer to the database.

**Hard architectural rules (non-negotiable):**
- This backend is the **only** process that writes Firestore (via Firebase Admin
  SDK / service account, which bypasses security rules).
- Clients **never** read or write Firestore directly — except narrow, read-only,
  auth-scoped realtime subscriptions (live order tracking / vendor new-order ping).
- All writes are validated server-side (Zod). Identity comes from the verified
  token, never from the request body. Server owns price/status/timestamps.

```
[Admin web]    ─┐
[Customer web] ─┼──> [AaspaasBazaarBackend] ──(Admin SDK)──> [Firestore]
[Vendor web]   ─┤         (only writer)
[Mobile apps]  ─┘
                          ▲ realtime reads only (read-only, scoped)
```

---

## 2. Stack

**Recommended (lowest friction — mirrors the existing code):**
- **Node 20 LTS + TypeScript**
- **Express 4** (HTTP framework)
- **firebase-admin** (Firestore + Auth token verification)
- **Zod** (request + data validation — reuse existing schemas verbatim)
- **helmet** (security headers), **cors**, **express-rate-limit**
- **tsx** (dev runner), **tsc** (build), **vitest** (tests), **eslint + prettier**

Alternatives (swap if preferred — structure below mostly carries over):
- **Fastify** instead of Express (faster, schema-native).
- **NestJS** if you want opinionated modules/DI (heavier).
- **Keep Next.js API-only** (route handlers, no pages) — least migration since the
  current code already is Next.js handlers; deploy to Vercel as functions.

The rest of this spec assumes the recommended Express stack.

---

## 3. Repo structure

```
AaspaasBazaarBackend/
├─ src/
│  ├─ index.ts                 # app bootstrap: express(), middleware, mount routers, listen
│  ├─ app.ts                   # buildApp() — returns configured Express app (testable)
│  ├─ config/
│  │  └─ env.ts                # load + validate env with Zod; throw on missing in prod
│  ├─ firebase/
│  │  └─ admin.ts              # initialize firebase-admin (cert from env/file); getDb(), getAuth()
│  ├─ lib/
│  │  ├─ http.ts               # ok()/err()/badRequest() response helpers + error shape
│  │  ├─ asyncHandler.ts       # wrap async route handlers → forward errors to error mw
│  │  └─ schemas.ts            # ALL Zod schemas (ported from admin repo lib/schemas.ts)
│  ├─ middleware/
│  │  ├─ adminAuth.ts          # verify admin session (HMAC cookie OR bearer) + role guard
│  │  ├─ appAuth.ts            # verify Firebase ID token (Bearer) + role claim guard
│  │  ├─ rateLimit.ts          # rate limiters (tighter on /app/* + /auth/*)
│  │  └─ errorHandler.ts       # central error → JSON { error: { code, message } }
│  ├─ db/                      # data access layer (one module per collection)
│  │  ├─ vendors.ts  items.ts  orders.ts  zones.ts
│  │  ├─ categories.ts  admins.ts  users.ts  settings.ts  weeklyTotals.ts
│  ├─ services/                # business logic (pricing, order placement, approval)
│  │  ├─ orderPricing.ts       # compute order amount from trusted item prices
│  │  └─ placeOrder.ts         # validate vendor/stock/min-order, price, persist (txn)
│  └─ routes/
│     ├─ index.ts              # mount all routers under /api
│     ├─ auth.ts               # /api/auth/*  (admin login/logout)
│     ├─ admin/                # /api/admin/* (admin web — cookie/bearer session)
│     │  └─ vendors.ts items.ts orders.ts zones.ts categories.ts admins.ts settings.ts stats.ts
│     └─ app/                  # /api/app/*  (customer + vendor — Firebase ID token)
│        ├─ user.ts            # profile, catalog, storefront, cart-less order placement, orders, tracking
│        └─ vendor.ts          # dashboard, items CRUD, orders queue + status, shop profile
├─ scripts/
│  ├─ seed.ts                  # seed Firestore from a db.json snapshot
│  └─ setClaims.ts             # set Firebase custom claims (role:user|vendor, vendor_id)
├─ firestore.rules             # deny-all + read-only realtime carve-outs
├─ firebase.json               # wires firestore.rules for deploy
├─ .env.example
├─ Dockerfile                  # for Cloud Run / container deploys
├─ package.json
├─ tsconfig.json
└─ README.md                   # quickstart (can be derived from this spec)
```

---

## 4. Auth — two surfaces, one service

| Surface | Path prefix | Auth mechanism | Roles |
|---------|-------------|----------------|-------|
| Admin web | `/api/admin/*`, `/api/auth/*` | HMAC-signed session cookie **or** `Authorization: Bearer <session>` | `owner`, `zonal_admin`, `admin`, `viewer` |
| Customer + Vendor apps | `/api/app/*` | Firebase **ID token** as `Authorization: Bearer <token>` | `user`, `vendor` (Firebase custom claims) |

- **Admin auth** (`middleware/adminAuth.ts`): port the existing HMAC session
  (`lib/session.ts` from the admin repo) — sign/verify with `SESSION_SECRET`,
  8h expiry, timing-safe compare. Provide `requireAdmin(roles?)`.
  - CORS note: if admin web is a separate origin, prefer `Authorization: Bearer`
    over a cookie (avoids cross-site cookie friction), or set
    `SameSite=None; Secure` cookies with a strict CORS allowlist.
- **App auth** (`middleware/appAuth.ts`): verify the Firebase ID token via
  `getAuth().verifyIdToken(token, true)`. Read `role` (+ `vendor_id`) from claims.
  Provide `requireApp(role?)`.
- Claims are set at signup by `scripts/setClaims.ts` /  an admin action:
  `setCustomUserClaims(uid, { role: "user" })` or `{ role: "vendor", vendor_id }`.

Error shape for all failures: `{ "error": { "code": "...", "message": "..." } }`
with HTTP 401 (unauthenticated) / 403 (wrong role) / 400 (validation) / 404 / 409.

---

## 5. Data store

- **Firestore** is the datastore. Collections (doc id in parens):
  - `vendors` (numeric id as string) · `items` (numeric id) · `orders` (numeric id)
  - `zones` (slug) · `categories` (slug) · `admins` (email) · `users` (Firebase uid)
  - `config/weekly_totals` (singleton doc) · `settings` (singleton)
- Keep the admin repo's **dual-mode** option if useful for local dev: a `db.json`
  fallback when no Admin creds are present (`STORAGE_MODE=json|firestore`). Optional
  but it makes a fresh clone run with zero setup. Otherwise require Firestore.

---

## 6. Schemas (port verbatim from the admin repo `lib/schemas.ts`)

Reuse the existing Zod definitions; do not redefine loosely. Summary of shapes:

- **Zone** — `id, name, city, pincodes[], center_lat?, center_lng?,
  zonal_admin_email?, active, created_at`.
- **Vendor** — identity (`id, name, owner, description, specialty`), contact
  (`phone, whatsapp, email`), location (`address, pincode, latitude, longitude,
  distance`), taxonomy (`categories[], rating`), operations (`open,
  pickup_available, delivery_available, delivery_radius(m), delivery_fee(₹),
  min_order_amount(₹), prep_time_minutes, payment_methods[upi|cash|card|wallet],
  business_hours{Mon..Sun:{closed,open,close}}`), compliance (`gst_number?,
  fssai_license?`), payouts (`bank_*?, upi_id?`), platform (`zone_id, status
  [pending|approved|rejected|suspended], approved_by?, approved_at?,
  rejection_reason?, notes, created_at`).
- **Item** — `id, name, vendor_id, vendor_name, category, price(₹), unit,
  status[In stock|Low stock|Out of stock]`.
- **Order** — `id, vendor_id, vendor_name, customer_name, customer_code,
  amount(₹), items_count, type[Delivery|Pickup], status[Pending|Accepted|
  Preparing|Out for delivery|Completed|Cancelled], time, day, user_id?`.
- **User** — `uid, name, email?, phone?, default_address?, default_pincode?,
  active, created_at`.
- **Settings** / **WeeklyTotals** — platform config + per-day order tallies.

All money is **INR**; timestamps unix ms; pincode 6 digits; phone India format.

---

## 7. Endpoints

### 7.1 Admin (`/api/admin/*`, `/api/auth/*`) — port existing
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET/POST /api/admin/vendors` · `GET/PATCH/DELETE /api/admin/vendors/:id`
  · `POST /api/admin/vendors/:id/{approve,reject,suspend,toggle}`
- `GET/POST /api/admin/items` · `GET/PATCH/DELETE /api/admin/items/:id`
- `GET /api/admin/orders` · `PATCH /api/admin/orders/:id/status`
- `GET/POST /api/admin/zones` · `GET/PATCH/DELETE /api/admin/zones/:id`
- `GET/POST /api/admin/categories` · `GET/PATCH/DELETE /api/admin/categories/:slug`
- `GET/POST /api/admin/admins` · `PATCH/DELETE /api/admin/admins/:email`
  · `POST /api/admin/admins/:email/toggle`
- `GET /api/admin/settings` · `PATCH /api/admin/settings`
- `GET /api/admin/stats` · `GET /api/admin/search`
- Zonal-admin scoping: `zonal_admin` is restricted to its `zone_id` (port
  `auth-scope.ts` logic).

### 7.2 Customer (`/api/app/user/*`) — Firebase token, role `user`
- `GET /api/app/user/profile` · `PUT /api/app/user/profile`
- `GET /api/app/catalog?zone_id=` — approved + open vendors in a zone (filter/search)
- `GET /api/app/vendors/:id` — storefront (vendor + its items, grouped by category)
- `GET /api/app/zones` — zones / resolve zone by pincode
- `POST /api/app/user/orders` — place order `{ vendor_id, type, items:[{item_id, qty}] }`
  → server validates vendor approved+open, stock, min-order; **prices server-side**;
  persists in a transaction; returns the order with server total.
- `GET /api/app/user/orders` · `GET /api/app/user/orders/:id`
- `POST /api/app/user/orders/:id/cancel` — only while cancellable (e.g. < Accepted)

### 7.3 Vendor (`/api/app/vendor/*`) — Firebase token, role `vendor`, scoped by `vendor_id`
- `GET /api/app/vendor/profile` · `PATCH /api/app/vendor/profile`
  (operational fields only; approval/zone are admin-owned, read-only here)
- `POST /api/app/vendor/open` — toggle open/closed
- `GET /api/app/vendor/items` · `POST /api/app/vendor/items`
  · `PATCH /api/app/vendor/items/:id` · `DELETE /api/app/vendor/items/:id`
- `GET /api/app/vendor/orders` · `PATCH /api/app/vendor/orders/:id/status`
  (advance Pending→Accepted→Preparing→Out for delivery→Completed, or Cancel)
- `GET /api/app/vendor/dashboard` — today's counts, revenue, pending, low-stock

### 7.4 Health
- `GET /api/health` — liveness (no auth).

---

## 8. Cross-cutting

- **Validation:** every body/query parsed with Zod; reject with 400 +
  `{ error: { code:"INVALID_INPUT", issues } }`.
- **Security headers:** `helmet()`. **CORS:** explicit origin allowlist
  (admin web, customer web, vendor web) — no wildcard with credentials.
- **Rate limiting:** global + stricter limits on `/api/auth/*` and `/api/app/*`.
- **Idempotency:** order/payment writes accept an idempotency key (header) to make
  mobile retries safe; wrap multi-doc writes in Firestore transactions.
- **Logging:** structured request logs; never log tokens/secrets/PII bodies.
- **No secrets in client/repo:** service account via env or mounted secret only.

---

## 9. Environment (`.env.example`)

```
# Firebase Admin (service account)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=          # literal \n escaped; restore newlines at load
# or: GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json

# Admin session signing (>=32 chars; required in prod)
SESSION_SECRET=

# Runtime
PORT=8080
NODE_ENV=development
STORAGE_MODE=firestore         # or "json" for local db.json fallback
CORS_ORIGINS=http://localhost:3000,https://admin.aaspaasbazaar.com,https://app.aaspaasbazaar.com
```

Validate these in `src/config/env.ts` with Zod; fail fast in production if any
required var is missing.

---

## 10. Scripts (`package.json`)

```
dev        tsx watch src/index.ts
build      tsc -p tsconfig.json
start      node dist/index.js
typecheck  tsc --noEmit
lint       eslint .
test       vitest run
seed       tsx scripts/seed.ts
claims     tsx scripts/setClaims.ts
```

---

## 11. Firestore rules + deploy

- `firestore.rules`: **deny-all** catch-all, plus read-only auth-scoped carve-outs
  for `orders` (by `user_id`) and a `vendor_feed`/order stream (by `vendor_id`).
  No client write rule anywhere. (Port from admin repo `firestore.rules`.)
- `firebase.json` wires the rules. Deploy: `firebase deploy --only firestore:rules`.
- **Service deploy:** containerize (`Dockerfile`) → **Google Cloud Run** (natural
  fit with Firestore) or any Node host. If you keep the Next.js-API-only variant,
  deploy to **Vercel** instead.

---

## 12. Migration plan (from `AaspaasBazaarAdmin`)

1. Copy `lib/schemas.ts`, `lib/db/*`, `lib/storage.ts`, `lib/firebase-admin.ts`,
   `lib/session.ts`, `lib/password.ts`, `lib/auth-scope.ts`, `lib/auth-token.ts`,
   `firestore.rules` into the new repo's `src/` (adjust imports — no Next.js).
2. Convert each Next.js route handler under `app/api/*` into an Express route in
   `src/routes/*` (same logic; swap `NextResponse` for the `http.ts` helpers).
3. Add the not-yet-built endpoints: `catalog`, storefront `vendors/:id`, vendor
   items CRUD, vendor order-status, vendor profile/open, dashboard, order cancel.
4. Wire `services/placeOrder.ts` to compute real totals (the admin repo currently
   stubs `amount: 0`).
5. Point the admin web + the new customer/vendor webapp at this backend's base URL.
6. Remove the embedded API from the admin repo once the standalone backend is live.

---

## 13. Acceptance checks

- All endpoints in §7 respond with the documented auth + error shapes.
- A `user` token cannot reach vendor/admin endpoints (and vice versa) → 403.
- Placing an order returns a **server-computed** total; client-sent amounts ignored.
- A vendor only ever sees/edits its own items + orders (scope from token).
- No endpoint lets a client write Firestore directly; Admin SDK is the only writer.
- `npm run typecheck` + `npm run test` pass; `GET /api/health` returns 200.
