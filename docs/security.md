# Security

## Threat model

| Asset | Threat | Mitigation |
|-------|--------|------------|
| Vendor + order data | Unauthorized read/write | NextAuth admin allowlist; Firestore deny-all client rules; server-only Admin SDK |
| Admin credentials | Phishing / shared device | Google OAuth (no passwords); short session lifetime; CSRF on mutations |
| Cron endpoint | Abuse / DoS | Bearer secret + path obscurity; rate limit |
| API mutations | CSRF | NextAuth's built-in `__Host-` cookie + `SameSite=Lax` + double-submit token on POST/DELETE |
| Input | Injection / malformed payloads | Zod validation at every route boundary |
| Secrets | Leakage via repo / logs | `.env.local` git-ignored; structured logger redacts known keys; Vercel env scoped per environment |
| Service-account key | Local exposure | Stored outside repo; in prod we use individual env fields, not the JSON file |

## Authentication

**Provider:** Google OAuth via NextAuth (`@auth/nextjs`).

The allowlist lives in Firestore (`admins` collection, doc ID = lowercase email). `ADMIN_EMAILS` env var is kept only as a **break-glass bootstrap** for the very first deploy — if the collection is empty, those emails are accepted; once anyone exists in `admins`, the env list is ignored.

`lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getAdmin, listAdmins } from "@/lib/db/admins";

const BOOTSTRAP_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      const admin = await getAdmin(email);
      if (admin) return admin.active;            // active flag gates access

      // Bootstrap: collection empty → accept env-listed emails so we are never locked out
      const any = await listAdmins({ limit: 1 });
      if (any.length === 0 && BOOTSTRAP_EMAILS.includes(email)) return true;

      return false;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const admin = await getAdmin(profile.email.toLowerCase());
        token.role = admin?.role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as "owner" | "admin" | "viewer";
      return session;
    },
  },
});
```

### Role checks on mutations

Only `owner` may create / patch / delete other admins. Enforce inside the route handler:

```ts
const session = await auth();
if (session?.user.role !== "owner") {
  return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
}
```

`viewer` is read-only across the whole panel; `admin` may mutate everything except the `admins` collection itself.

## Authorization

A single middleware (`middleware.ts`) guards `/(admin)/**` and `/api/**` (except auth + cron):

```ts
export { auth as middleware } from "@/lib/auth";
export const config = {
  matcher: [
    "/((?!login|api/auth|api/cron|_next|favicon.ico).*)",
  ],
};
```

For API routes, also call `auth()` inside the handler so we can return a proper JSON 401 instead of a redirect:

```ts
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return Response.json(
    { error: { code: "UNAUTHORIZED" } }, { status: 401 });
  // ...
}
```

## Firestore rules

`firestore.rules`:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} {
      allow read, write: if false;   // server-only via Admin SDK
    }
  }
}
```

The admin SDK bypasses these rules because it authenticates as a service account with `roles/datastore.user`. Every read/write therefore flows through code we own and can audit.

## Input validation

Every API route:

1. Parses body / query with the relevant Zod schema.
2. Returns `400 INVALID_INPUT` with `issues` array on failure.
3. Never trusts client-supplied IDs without an existence check.

```ts
import { VendorSchema } from "@/lib/schemas";

const body = await req.json().catch(() => null);
const parsed = VendorSchema.omit({ id: true }).safeParse(body);
if (!parsed.success) {
  return Response.json(
    { error: { code: "INVALID_INPUT", message: "Validation failed",
               issues: parsed.error.issues } },
    { status: 400 });
}
```

## Rate limiting

For public-ish endpoints (`/api/cron/*`, `/api/auth/*`) use Upstash Redis + `@upstash/ratelimit`:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(60, "1 m"),
});
```

Authenticated admin routes share a per-user limiter (key = session user id, e.g. 600/min) — generous, since the panel is internal.

## CSRF

- NextAuth sets a `__Host-next-auth.csrf-token` cookie and validates on every credential / sign-out POST.
- For our own mutation endpoints, the session cookie is `SameSite=Lax`. We additionally require an `x-csrf-token` header on `POST/PUT/PATCH/DELETE` that matches a token issued at page load (`/api/csrf`). The token rotates per session.

## Headers

`next.config.ts` adds default security headers via `headers()`:

```ts
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Content-Security-Policy", value: CSP },
    ],
  }];
}
```

CSP starter (tighten before launch):
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://accounts.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://*.googleusercontent.com https://*.tile.openstreetmap.org;
connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com;
frame-ancestors 'none';
```

> `unsafe-inline` for scripts is a Next.js dev requirement; in prod, swap to nonce-based CSP using `next/headers` once stable.

## Secret hygiene

- `.env*` and `*.json` service-account files are in `.gitignore`.
- A pre-commit hook (`lefthook`) runs `gitleaks` against staged changes.
- Logs scrub `authorization`, `cookie`, `set-cookie`, `private_key`, `client_secret`.

## Audit log

All mutating API routes append a row to `audit` collection:

```ts
await db.collection("audit").add({
  actor: session.user.email,
  action: "vendor.delete",
  target: { vendor_id: id },
  at: Date.now(),
});
```

Read-only in the UI under `/audit` (admin-only, append-never-delete enforced server-side).
