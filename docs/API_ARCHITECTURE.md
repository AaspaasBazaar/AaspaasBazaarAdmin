# API Architecture

## Decision

**One backend serves all clients. The backend is the only writer to Firestore.**

Clients (user app, vendor app, admin web) never write to Firestore directly. They
send data to this Next.js backend, which validates it and writes via the Firebase
Admin SDK (service account). Reads also go through the backend **by default**;
direct Firestore reads are allowed only where real-time push is genuinely needed,
and then only read-only and auth-scoped.

```
[User app]   ─┐
[Vendor app] ─┼──> [Next.js backend API] ──(Admin SDK)──> [Firestore]
[Admin web]  ─┘            (only writer)
                                                ▲
        realtime only (read-only, scoped) ──────┘
        e.g. live order tracking, vendor new-order ping
```

## Two auth surfaces, one service

| Surface        | Routes              | Auth                                   | Defined in            |
| -------------- | ------------------- | -------------------------------------- | --------------------- |
| Admin panel    | `/api/vendors`, `/api/orders`, … | HMAC cookie session (`ab_session`) | `lib/auth-server.ts`  |
| User + Vendor  | `/api/app/user/*`, `/api/app/vendor/*` | Firebase ID token (Bearer) | `lib/auth-token.ts`   |

- Admin routes are gated by the cookie in `middleware.ts`.
- `/api/app/*` is exempt from the cookie gate (see `PUBLIC_PREFIXES` in
  `middleware.ts`) but **is not unauthenticated** — each route verifies a Firebase
  ID token via `withAppAuth(role, handler)`.

### Roles
- Admin session roles: `owner | zonal_admin | admin | viewer`.
- App roles come from a Firebase **custom claim** set at signup:
  `getAuth().setCustomUserClaims(uid, { role: "user" })` or `{ role: "vendor", vendor_id }`.

## Route layout

```
app/api/
  vendors/ orders/ items/ ...    # admin API (cookie auth) — existing
  app/
    user/
      profile/route.ts           # GET own profile
      orders/route.ts            # GET own history, POST place order
    vendor/
      orders/route.ts            # GET own vendor's orders
```

Add new app endpoints under `app/api/app/{user,vendor}/…`, always wrapped in
`withAppAuth(...)`.

## Rules of engagement

1. **New feature → backend API by default.** Only carve a read-only Firestore
   rule when polling can't replace push.
2. **Never trust the client.** Validate every payload with Zod. Derive identity
   from the verified token (`auth.uid`), never from the request body.
3. **Server owns money & state.** Price, status, and timestamps are set
   server-side. Clients propose; the server disposes.
4. **Rate-limit** public (`/api/app/*`) endpoints — abuse surface.
5. **Idempotency** on order/payment writes — mobile retries on flaky networks.

## Firestore rules

`firestore.rules`: deny-all catch-all, plus narrow read-only carve-outs
(`/orders` by `user_id`, `/vendor_feed` by `vendor_id`). No client write rule
exists anywhere. Deploy with `firebase deploy --only firestore:rules`.

## Known gaps (wire up before launch)

- ~~`OrderSchema` has no `user_id` field~~ — DONE. `user_id` (optional) added;
  set on app-placed orders, used for per-user scoping + the `/orders` read rule.
- ~~`lib/db/users.ts` does not exist~~ — DONE. `users` collection (keyed by
  Firebase uid) + `UserSchema`. Profile route does GET (seeds from claims) + PUT.
- Order pricing in `POST /api/app/user/orders` is stubbed (`amount: 0`); compute
  from trusted item prices server-side. Wrap the write in a Firestore transaction
  for idempotency.
- Set Firebase custom claims at signup: `role: "user"` for customers,
  `{ role: "vendor", vendor_id }` for vendors. The app routes depend on these.
