# API Test Report — Admin Panel → Backend Extraction

**Date:** 2026-06-04
**Scope:** Verify the admin panel performs every CRUD operation through the
standalone **AaspaasBazaarBackend** API with zero direct Firestore access, and
that all backend admin endpoints work correctly.

## Architecture under test

```
Browser ──/api/* (same-origin)──> Admin Next.js proxy ──HTTP──> AaspaasBazaarBackend ──Admin SDK──> Firestore
Server components ────────────── lib/backend.ts ──────HTTP──┘        (only writer)
```

- Admin repo: branch `feat/nextjs-rewrite` — embedded API + Firestore layer removed.
- Backend repo: branch `init/backend` — Express 4 + TypeScript, `STORAGE_MODE=json` for this run.
- Path mapping in proxy (`app/api/[...path]/route.ts`):
  `/api/auth/*`, `/api/health` → verbatim; `/api/<resource>` → `/api/admin/<resource>`.

## Test setup

| Component | Detail |
|-----------|--------|
| Backend | `tsx src/index.ts`, port 8080, json storage (20 vendors, 80 items, 202 orders, 1 owner admin seeded) |
| Admin panel | `next dev`, port 3000, `API_BASE_URL=http://localhost:8080` |
| Static checks | Backend: `tsc --noEmit` ✅, `vitest` 23/23 ✅ · Admin: `tsc --noEmit` ✅, `next build` ✅ |

## 1. Backend direct — 56/56 checks pass

### Auth (`/api/auth/*`)
| Endpoint | Method | Case | Expected | Result |
|----------|--------|------|----------|--------|
| `/api/auth/login` | POST | invalid body | 400 | ✅ |
| `/api/auth/login` | POST | first-login owner (sets password) | 200 + cookie + bearer token | ✅ |
| `/api/auth/login` | POST | wrong password | 401 | ✅ |
| `/api/auth/me` | GET | with session | 200 | ✅ |
| `/api/auth/me` | GET | after logout | 401 | ✅ |
| `/api/auth/logout` | POST | clears cookie | 200 | ✅ |

### Vendors (`/api/admin/vendors`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | unauthenticated | 401 | ✅ |
| GET | list / `?status=approved` filter | 200 | ✅ |
| POST | create (full Zod payload) | 201 | ✅ |
| GET | by id / unknown id | 200 / 404 | ✅ |
| PATCH | update / invalid field type | 200 / 400 | ✅ |
| POST | `/:id/approve`, `/:id/suspend`, `/:id/reject`, `/:id/toggle` | 200 | ✅ |
| DELETE | by id | 200 | ✅ |

### Items (`/api/admin/items`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | list / by id | 200 | ✅ |
| POST | create | 201 | ✅ |
| PATCH | update / invalid status enum | 200 / 400 | ✅ |
| DELETE | by id | 200 | ✅ |

### Orders (`/api/admin/orders`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | list / `?limit=5` | 200 | ✅ |
| PATCH | `/:id/status` valid / invalid enum | 200 / 400 | ✅ |

### Zones (`/api/admin/zones`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | list / by id | 200 | ✅ |
| POST | create | 201 | ✅ |
| PATCH | update | 200 | ✅ |
| DELETE | by id | 200 | ✅ |

### Categories (`/api/admin/categories`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | list / by slug | 200 | ✅ |
| POST | create (hex `color` enforced — `"leaf"` correctly rejected 400) | 201 | ✅ |
| PATCH | update | 200 | ✅ |
| DELETE | by slug | 200 | ✅ |

### Admins (`/api/admin/admins`)
| Method | Case | Expected | Result |
|--------|------|----------|--------|
| GET | list | 200 | ✅ |
| POST | create viewer | 201 | ✅ |
| PATCH | update | 200 | ✅ |
| POST | `/:email/toggle` (×2) | 200 | ✅ |
| DELETE | by email | 200 | ✅ |

### Role enforcement (viewer session)
| Action | Expected | Result |
|--------|----------|--------|
| GET vendors | 200 | ✅ |
| POST zone | 403 | ✅ |
| PATCH settings | 403 | ✅ |
| POST vendor | 403 | ✅ |
| DELETE admin | 403 | ✅ |

### Settings / Stats / Search / Simulate / Health
| Endpoint | Method | Expected | Result |
|----------|--------|----------|--------|
| `/api/admin/settings` | GET / PATCH | 200 | ✅ |
| `/api/admin/stats` | GET | 200 (incl. `weekly_totals`) | ✅ |
| `/api/admin/search?q=` | GET | 200 | ✅ |
| `/api/admin/simulate-order` | POST | 201 (new — ported from admin repo) | ✅ |
| `/api/health` | GET | 200, no auth | ✅ |

## 2. Through the admin panel proxy — all pass

| Check | Expected | Result |
|-------|----------|--------|
| Unauthenticated page → redirect | 307 → `/login?next=…` | ✅ |
| Unauthenticated `/api/vendors` | 401 (middleware gate) | ✅ |
| `POST /api/auth/login` via proxy | 200, `ab_session` cookie set first-party | ✅ |
| GET via proxy: vendors, items, orders, zones, categories, admins, settings, stats, search | 200 each | ✅ |
| `POST /api/simulate-order` via proxy | 201 (write lands via backend) | ✅ |
| Full vendor CRUD via proxy (create→patch→approve→delete) | 201/200/200/200 | ✅ |
| `POST /api/auth/logout` via proxy | 200, cookie cleared, pages redirect again | ✅ |

## 3. Page rendering (server components → `backendFetch`)

All pages render HTTP 200 with live backend data, zero error markers:
`/` (dashboard incl. weekly chart + stats), `/vendors` (seeded vendor names
visible), `/items`, `/orders`, `/zones`, `/categories`, `/admins`, `/settings`.

## What changed in the admin repo

**Removed** (backend now owns all of it):
- `app/api/*` embedded route handlers (27 files) → replaced by one catch-all proxy
- `lib/db/*`, `lib/firebase-admin.ts`, `lib/storage.ts`, `lib/sim/*`
- `lib/session.ts`, `lib/password.ts`, `lib/auth-server.ts`, `lib/auth-scope.ts`, `lib/auth-token.ts`, `lib/api.ts`
- `firestore.rules`, `firebase.json`, `db.json`, Firestore scripts
- `firebase-admin` + `tsx` dependencies

**Added:**
- `lib/backend.ts` — server-side HTTP client (cookie-forwarding)
- `app/api/[...path]/route.ts` — catch-all proxy, zero business logic
- `API_BASE_URL` env var (`.env.example`, `.env.local`)

**Backend repo additions:**
- `src/services/simulateOrder.ts` + `POST /api/admin/simulate-order` (owner/admin) — keeps the dashboard "Simulate order" button working without client-side writes

## Notes / follow-ups

1. **`SESSION_SECRET` moved backend-side.** The admin `.env.local` previously held
   the session secret; the backend must now run with that same `SESSION_SECRET`
   in production (dev falls back to a stable built-in secret). Admin no longer
   verifies HMAC — middleware checks cookie presence only; the backend is the
   enforcement point on every request.
2. **`service-account.json`** still sits in the admin working tree (gitignored,
   never committed). Move it to the backend deployment environment and delete
   it from this machine's admin folder.
3. **Legacy vendor rows in backend `db.json`** still use the old shape
   (`delivery` instead of `delivery_available`, no `status`/`zone_id`). The API
   serves them as-is in json mode; reseed or migrate before relying on
   approval/zone filters with that data.
4. **Older docs** (`docs/architecture.md`, `api-reference.md`, `security.md`,
   etc.) describe the pre-extraction embedded-API architecture — treat as
   historical; `docs/BACKEND_REPO_SPEC.md` §7 is the endpoint source of truth.
5. **Test side-effects in backend `db.json`** (untracked dev data): the seeded
   owner `purchase@ascentspark.com` now has a password set by the first-login
   flow during testing (`AdminPass123!` — change or delete the `password_hash`
   field to re-trigger first-login), two simulated orders were added (202→204),
   and one order was moved to `Accepted`.
6. Test artifacts: full check list in `/tmp/ab-results.tsv` from this run
   (56 direct + 16 proxy/page checks). 6 initial "failures" were test-harness
   bugs (curl cookie-jar flags, wrong color format), re-verified passing.
