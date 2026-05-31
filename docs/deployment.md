# Deployment

Target stack: **Vercel** (Next.js app) + **Firebase / Firestore** (data + rules) + **Vercel Cron** (scheduled simulator).

## Pre-flight checklist

- [ ] `pnpm build` passes locally.
- [ ] `pnpm typecheck` and `pnpm lint` clean.
- [ ] Firestore rules and indexes deployed for the **production** Firebase project.
- [ ] All secrets present in Vercel env (Production scope).
- [ ] `ADMIN_EMAILS` lists every person who should retain access.
- [ ] `CRON_SECRET` rotated since last team change.

## 1. Vercel project

```bash
pnpm i -g vercel
vercel login
vercel link               # link this folder to a Vercel project
```

## 2. Environment variables

Set per environment (Preview + Production) in Vercel UI or:

```bash
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production            # https://admin.aaspaasbazaar.com
vercel env add FIREBASE_PROJECT_ID production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add ADMIN_EMAILS production
vercel env add CRON_SECRET production
```

**Service-account credentials** — do *not* paste a JSON file path. Instead inline three fields:

```bash
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_CLIENT_EMAIL production       # from JSON
vercel env add FIREBASE_PRIVATE_KEY production        # from JSON, keep \n escapes
```

`lib/firebase-admin.ts` reads those and builds a credential at runtime — no file on disk needed in serverless.

## 3. Deploy Firestore rules + indexes

```bash
firebase use --add production
firebase deploy --only firestore:rules,firestore:indexes
```

Rules live in `firestore.rules`. Default policy: **deny all client reads/writes**. Server-side Admin SDK bypasses rules — all access is mediated by Next.js API routes.

## 4. Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/simulate-order",
      "schedule": "* * * * *"
    }
  ]
}
```

The handler must verify `Authorization: Bearer ${CRON_SECRET}` — Vercel sends a known token, but we require our own secret to also protect against direct calls.

> Cron frequency: `* * * * *` = every minute. Tune in `vercel.json` once realistic order load is known.

## 5. Custom domain

1. Vercel → Project → Domains → Add `admin.aaspaasbazaar.com`.
2. Set CNAME at DNS to `cname.vercel-dns.com`.
3. Update `NEXTAUTH_URL` to match.
4. Update Google OAuth client → Authorized redirect URIs → `https://admin.aaspaasbazaar.com/api/auth/callback/google`.

## 6. Deploy

```bash
vercel --prod
```

Or push to `main` if Git integration is enabled.

## 7. Post-deploy smoke test

```bash
curl -sf https://admin.aaspaasbazaar.com/api/stats \
  -H "Cookie: <session-cookie>" | jq

# Cron path (use the real secret)
curl -sf -X POST https://admin.aaspaasbazaar.com/api/cron/simulate-order \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

## Rollback

Vercel keeps every deploy. Roll back via UI ("Promote to Production" on a prior deploy) or:

```bash
vercel rollback <deployment-url>
```

Firestore data is *not* rolled back by a Vercel rollback — destructive migrations need a separate plan (snapshot via `gcloud firestore export` before risky migrations).

## Observability

| Concern | Tool |
|---------|------|
| App logs | Vercel → Functions → Logs |
| Errors | Sentry (`@sentry/nextjs`, optional; wire `SENTRY_DSN` env) |
| Firestore usage | Google Cloud Console → Firestore → Usage |
| Cron runs | Vercel → Crons → Recent Invocations |
| Uptime | UptimeRobot or BetterStack ping on `/api/health` |

`/api/health` route should return `{"ok": true}` without touching Firestore (so the check stays cheap and signals app-process health, not DB health).
