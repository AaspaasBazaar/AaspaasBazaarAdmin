# Architecture

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (Admin)                       │
│  React 19 Server Components + Client Components             │
│  Tailwind CSS + shadcn/ui + Lucide icons                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (NextAuth session cookie)
┌──────────────────────────▼──────────────────────────────────┐
│                  Next.js 15 (App Router)                    │
│  ┌──────────────────┐   ┌──────────────────────────────┐    │
│  │  app/(admin)/*   │   │   app/api/* (Route Handlers) │    │
│  │  pages (RSC)     │   │   REST endpoints             │    │
│  └────────┬─────────┘   └──────────────┬───────────────┘    │
│           │                            │                    │
│           └─────────┬──────────────────┘                    │
│                     ▼                                       │
│           ┌──────────────────────┐                          │
│           │  lib/firestore.ts    │  Firebase Admin SDK      │
│           │  lib/auth.ts         │  NextAuth                │
│           │  lib/schemas.ts      │  Zod validators          │
│           └──────────┬───────────┘                          │
└──────────────────────┼──────────────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │   Firestore      │  (Google Cloud)
              │   Collections:   │
              │   vendors, items │
              │   orders,        │
              │   settings,      │
              │   weeklyTotals   │
              └──────────────────┘
```

## Layers

### 1. Presentation (React 19 + Tailwind)
- **Server Components** by default — fetch from Firestore directly, render HTML.
- **Client Components** only for interactivity: form inputs, charts, real-time order feed.
- **shadcn/ui** for primitives (Dialog, Table, Form, Toast).
- **Recharts** for weekly totals visualization.

### 2. API (Next.js Route Handlers)
- Located in `app/api/**/route.ts`.
- Mirror current Flask endpoints (see [api-reference.md](./api-reference.md)).
- Validate input with Zod, return typed JSON.
- Mutations protected by NextAuth middleware.

### 3. Data Access (`lib/db/*`)
- Thin wrappers over Firebase Admin SDK.
- One module per collection: `vendors.ts`, `items.ts`, `orders.ts`, `settings.ts`, `weeklyTotals.ts`.
- All functions accept/return typed objects defined in `lib/schemas.ts`.

### 4. Persistence (Firestore)
- Primary store. Drop `db.json` after migration.
- Indexes declared in `firestore.indexes.json`.
- Security rules in `firestore.rules` (deny-all from client; admin SDK on server bypasses rules).

### 5. Background work
- **Order simulator** (port of `simulator_thread_loop`) → run via Vercel Cron + a `/api/cron/simulate-order` route guarded by a secret.
- No long-lived threads — serverless-friendly.

## Folder layout

```
.
├── app/
│   ├── (admin)/              # Authenticated admin shell
│   │   ├── layout.tsx        # Sidebar + topbar
│   │   ├── page.tsx          # Dashboard
│   │   ├── vendors/
│   │   ├── items/
│   │   ├── orders/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── vendors/route.ts
│   │   ├── vendors/[id]/route.ts
│   │   ├── vendors/[id]/toggle/route.ts
│   │   ├── items/route.ts
│   │   ├── orders/route.ts
│   │   ├── settings/route.ts
│   │   ├── stats/route.ts
│   │   ├── search/route.ts
│   │   └── cron/simulate-order/route.ts
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn primitives
│   ├── vendors/
│   ├── items/
│   ├── orders/
│   └── dashboard/
├── lib/
│   ├── auth.ts
│   ├── firebase-admin.ts
│   ├── db/
│   │   ├── vendors.ts
│   │   ├── items.ts
│   │   ├── orders.ts
│   │   ├── settings.ts
│   │   └── weekly-totals.ts
│   ├── schemas.ts            # Zod
│   └── utils.ts
├── scripts/
│   └── seed-from-dbjson.ts   # One-off migration script
├── docs/
├── public/
├── firestore.rules
├── firestore.indexes.json
├── .env.example
├── next.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Runtime targets

| Concern | Choice | Notes |
|---------|--------|-------|
| Node version | 20 LTS | Required by Next.js 15 + Firebase Admin |
| Package mgr | pnpm | Faster, strict deps |
| Runtime (API) | Node (not Edge) | Firebase Admin SDK requires Node APIs |
| Runtime (RSC) | Node | Same reason |
| Bundler | Turbopack (dev) | Webpack still used for `next build` until stable |
