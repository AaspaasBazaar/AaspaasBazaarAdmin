# AaspaasBazaar Admin Panel

Admin panel for the AaspaasBazaar hyperlocal marketplace — manage vendors, items, orders, and platform settings.

## Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| Framework | Next.js 15 (App Router) |
| Persistence | Firestore (primary) — falls back to local `db.json` when Admin creds absent |
| Frontend | React 19 + Tailwind CSS |
| Validation | Zod |
| Deploy target | Vercel + Firebase |

Storage auto-detects: with `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` set, the app uses Firestore. Without them, it reads / writes the bundled `db.json` so a fresh clone runs immediately.

Override with `STORAGE_MODE=firestore` (require Firestore — error if creds missing) or `STORAGE_MODE=json` (force local mode).

## Quickstart

```bash
npm install
npm run dev                  # http://localhost:3000
```

Optional — wire Firestore:

```bash
cp .env.example .env.local
# fill FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
npm run seed                 # one-shot migration from db.json
npm run dev
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Seed Firestore from `db.json` (Admin creds required) |

## Routes

UI:

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/vendors` | Vendor list |
| `/items` | Item list |
| `/orders` | Recent orders |
| `/settings` | Platform settings (read-only stub) |
| `/admins` | Admin user list |

API: see [`docs/api-reference.md`](./docs/api-reference.md).

## Project layout

```
app/                 # Next.js App Router (pages + API routes)
  api/               # 11 REST endpoints
lib/
  schemas.ts         # Zod schemas (single source of truth for shapes)
  firebase-admin.ts  # Admin SDK init (lazy, cached)
  storage.ts         # Firestore | JSON storage abstraction
  db/                # One module per collection
  sim/               # Order simulator
scripts/
  seed-from-dbjson.ts
docs/                # Full docs (architecture, data model, security, deployment, ...)
db.json              # Dev seed data — used directly in JSON mode
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [architecture.md](./docs/architecture.md) | System diagram, layers, folder layout |
| [data-model.md](./docs/data-model.md) | Firestore collections, Zod schemas |
| [api-reference.md](./docs/api-reference.md) | REST endpoint contracts |
| [setup.md](./docs/setup.md) | Local dev setup |
| [deployment.md](./docs/deployment.md) | Vercel + Firebase production deploy |
| [frontend.md](./docs/frontend.md) | Page list, components, state, design system |
| [security.md](./docs/security.md) | Auth, Firestore rules, middleware, rate limits |
| [migration.md](./docs/migration.md) | Flask → Next.js migration plan + data seed (historical) |
| [roadmap.md](./docs/roadmap.md) | Phased delivery plan |
| [contributing.md](./docs/contributing.md) | Branching, commits, code style, tests |

## License

See [LICENSE](./LICENSE).
