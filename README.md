# AaspaasBazaar Admin Panel

Admin panel for the AaspaasBazaar hyperlocal marketplace — manage vendors, items, orders, zones, categories, and platform settings.

This app is a **pure frontend**. All data lives behind the standalone
[AaspaasBazaarBackend](https://github.com/AaspaasBazaar/AaspaasBazaarBackend)
service, which is the **only writer to Firestore**. Every CRUD operation here
goes over HTTP to that service — no Firebase credentials or database access
exist in this repo.

```
[Admin panel (this repo)] ──/api/* proxy──> [AaspaasBazaarBackend] ──Admin SDK──> [Firestore]
```

## Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| Framework | Next.js 15 (App Router) |
| Data | AaspaasBazaarBackend REST API (`API_BASE_URL`) |
| Frontend | React 19 + Tailwind CSS |
| Deploy target | Vercel |

## How requests flow

- **Server components** (`app/*/page.tsx`) fetch data with `lib/backend.ts` →
  `backendFetch("/api/admin/...")`, forwarding the admin session cookie.
- **Client components** call same-origin `/api/...`; the catch-all proxy at
  `app/api/[...path]/route.ts` forwards each request to the backend
  (`/api/vendors` → `{API_BASE_URL}/api/admin/vendors`, `/api/auth/*` and
  `/api/health` pass through verbatim) and relays `Set-Cookie` on login/logout.
- **Auth, validation, role + zone scoping** are all enforced by the backend.
  `middleware.ts` only checks cookie *presence* for fast login redirects.

## Quickstart

```bash
# 1. run the backend (separate repo)
cd ../AaspaasBazaarBackend && STORAGE_MODE=json PORT=8080 npm run dev

# 2. run this admin panel
cp .env.example .env.local        # API_BASE_URL=http://localhost:8080
npm install
npm run dev                       # http://localhost:3000
```

Sign in with an admin seeded in the backend's datastore (first login sets the
password for a seeded admin without one).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Routes

UI:

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/vendors` | Vendor list + approval workflow |
| `/items` | Item list |
| `/orders` | Recent orders |
| `/zones` | Zones + zonal admins |
| `/categories` | Category management |
| `/admins` | Admin user list |
| `/settings` | Platform settings |

API: every `/api/*` path is proxied to the backend — the endpoint contract is
documented in the backend repo (see `docs/BACKEND_REPO_SPEC.md` §7).

## Project layout

```
app/                     # Next.js App Router pages
  api/[...path]/route.ts # Catch-all proxy → AaspaasBazaarBackend
components/              # Client components (tables, forms, charts)
lib/
  backend.ts             # Server-side HTTP client for the backend service
  schemas.ts             # Zod schemas/types shared with UI components
middleware.ts            # Cookie-presence gate (redirects to /login)
docs/                    # Specs + API test report
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [BACKEND_REPO_SPEC.md](./docs/BACKEND_REPO_SPEC.md) | Backend service spec (source of truth for API contract) |
| [API_TEST_REPORT.md](./docs/API_TEST_REPORT.md) | End-to-end API verification report |
| [WEBSITE_DESIGN_PROMPT.md](./docs/WEBSITE_DESIGN_PROMPT.md) | Customer/vendor webapp design brief |

## License

See [LICENSE](./LICENSE).
