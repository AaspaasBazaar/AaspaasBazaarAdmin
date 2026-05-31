# Local Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS (≥ 20.11) | `nvm install 20 && nvm use 20` |
| pnpm | 9.x | `npm i -g pnpm@9` |
| Firebase CLI | latest | `npm i -g firebase-tools` |
| gcloud CLI | latest (only for emulator alt) | optional |
| Git | 2.40+ | system |

## 1. Clone & install

```bash
git clone <repo-url>
cd AaspaasBazaarAdmin
pnpm install
```

## 2. Firebase project

You need a Firebase project with **Firestore (Native mode)** enabled.

```bash
firebase login
firebase projects:list
firebase use --add        # pick the project, alias it "default"
```

Generate a service-account key for local dev:
1. Firebase console → Project Settings → Service Accounts → "Generate new private key".
2. Save the JSON file **outside** the repo (e.g. `~/.config/aaspaas/firebase-admin.json`).
3. Reference it via `GOOGLE_APPLICATION_CREDENTIALS` env var.

## 3. Environment variables

Copy and fill:

```bash
cp .env.example .env.local
```

`.env.example`:
```dotenv
# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/firebase-admin.json
FIREBASE_PROJECT_ID=aaspaas-bazaar

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-openssl-rand-base64-32

# Auth providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Admin allowlist (comma-separated emails)
ADMIN_EMAILS=you@example.com,teammate@example.com

# Cron
CRON_SECRET=replace-with-openssl-rand-hex-32
```

Generate secrets:
```bash
openssl rand -base64 32     # NEXTAUTH_SECRET
openssl rand -hex 32        # CRON_SECRET
```

## 4. Seed Firestore from `db.json`

The old prototype's `db.json` is the seed source. Run once:

```bash
pnpm tsx scripts/seed-from-dbjson.ts
```

Idempotent: skips collections that already contain data unless `--force` is passed.

## 5. Run dev server

```bash
pnpm dev
```

App at http://localhost:3000. First visit redirects to `/login`.

## 6. Useful scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright tests |
| `pnpm seed` | Re-run seed script |
| `pnpm firestore:rules:deploy` | Deploy `firestore.rules` |
| `pnpm firestore:indexes:deploy` | Deploy `firestore.indexes.json` |

## 7. Firestore emulator (optional, offline dev)

```bash
firebase emulators:start --only firestore
# in another shell
FIRESTORE_EMULATOR_HOST=localhost:8080 pnpm dev
```

The Firebase Admin SDK auto-detects `FIRESTORE_EMULATOR_HOST` and routes all reads/writes to the emulator — no creds required.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `PERMISSION_DENIED` from Firestore | Service-account key missing/expired | Re-download key, update `GOOGLE_APPLICATION_CREDENTIALS` |
| Login loop on `/login` | `ADMIN_EMAILS` doesn't include your address | Add your email, restart dev server |
| `Error: Firebase Admin already initialized` | Hot reload bug | Wrap init in `if (!getApps().length)` (already in `lib/firebase-admin.ts`) |
| Stale data on dashboard | RSC cache | Add `export const revalidate = 0` on the affected route or call `revalidatePath()` after mutation |
