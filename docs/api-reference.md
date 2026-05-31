# API Reference

All endpoints live under `/api/`. Requests and responses are JSON. Mutating routes require an authenticated admin session (NextAuth cookie). See [security.md](./security.md).

Error envelope (all 4xx/5xx):
```json
{ "error": { "code": "INVALID_INPUT", "message": "..." , "issues": [ ... ] } }
```

## Endpoint summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET    | `/api/stats` | yes | Dashboard counters + weekly totals |
| GET    | `/api/vendors` | yes | List vendors |
| POST   | `/api/vendors` | yes | Create vendor |
| POST   | `/api/vendors/:id/toggle` | yes | Toggle `open` flag |
| DELETE | `/api/vendors/:id` | yes | Delete vendor + its items |
| GET    | `/api/items` | yes | List items |
| GET    | `/api/orders` | yes | List recent orders |
| GET    | `/api/settings` | yes | Read platform settings |
| POST   | `/api/settings` | yes | Update platform settings |
| POST   | `/api/simulate-order` | yes | Manually trigger one simulated order |
| GET    | `/api/search?q=` | yes | Cross-collection search |
| POST   | `/api/cron/simulate-order` | secret | Vercel Cron hook for periodic simulation |
| GET    | `/api/admins` | yes | List admin users |
| POST   | `/api/admins` | yes (owner) | Create admin |
| GET    | `/api/admins/:email` | yes | Read single admin |
| PATCH  | `/api/admins/:email` | yes (owner) | Partial update (`name`, `role`, `active`) |
| POST   | `/api/admins/:email/toggle` | yes (owner) | Flip `active` |
| DELETE | `/api/admins/:email` | yes (owner) | Delete admin (refuses last active owner) |

## GET `/api/stats`

```jsonc
// 200
{
  "vendors_total": 8,
  "vendors_open": 6,
  "items_total": 7,
  "orders_today": 14,
  "orders_pending": 3,
  "revenue_today": 12450,
  "weekly_totals": { "Mon": 2300, "Tue": 1800, "Wed": 0, ... }
}
```

## GET `/api/vendors`

Query params:
- `category` (optional) — filter by category string.
- `open` (optional) — `true|false`.

```jsonc
// 200
{ "vendors": [Vendor, ...] }
```

## POST `/api/vendors`

Body — `VendorSchema` minus `id` (server assigns next int).
```jsonc
// 201
{ "vendor": Vendor }
// 400
{ "error": { "code": "INVALID_INPUT", "message": "Validation failed", "issues": [...] } }
```

## POST `/api/vendors/:id/toggle`

No body. Flips `vendor.open`.
```jsonc
// 200
{ "vendor": Vendor }
// 404
{ "error": { "code": "NOT_FOUND", "message": "Vendor 42 not found" } }
```

## DELETE `/api/vendors/:id`

Deletes the vendor doc and all items referencing it in a single batched write. Orders are preserved.
```jsonc
// 200
{ "deleted": { "vendor_id": 42, "items_removed": 3 } }
```

## GET `/api/items`

Query params: `vendor_id` (optional, number), `category` (optional), `status` (optional).
```jsonc
{ "items": [Item, ...] }
```

## GET `/api/orders`

Query params:
- `status` (optional) — one of `OrderStatus`.
- `vendor_id` (optional, number).
- `limit` (optional, default 50, max 200).

```jsonc
{ "orders": [Order, ...] }
```

## GET `/api/settings`

```jsonc
{ "settings": Settings }
```

## POST `/api/settings`

Body — full or partial `SettingsSchema`. Server merges with current doc.
```jsonc
// 200
{ "settings": Settings }
```

## POST `/api/simulate-order`

Generates one fake order using a random open vendor. Returns the inserted order.
```jsonc
// 201
{ "order": Order }
```

## GET `/api/search?q=`

Returns up to 10 matches per collection (case-insensitive `name` prefix match).
```jsonc
{
  "vendors": [Vendor, ...],
  "items":   [Item,   ...],
  "orders":  [Order,  ...]   // matches by customer_name or numeric id
}
```

## POST `/api/cron/simulate-order`

Triggered by Vercel Cron every minute (configurable). Header `Authorization: Bearer ${CRON_SECRET}` required.
```jsonc
// 200
{ "ok": true, "order_id": 4944 }
// 401
{ "error": { "code": "UNAUTHORIZED" } }
```

## Endpoint mapping vs Flask prototype

| Flask | Next.js |
|-------|---------|
| `GET /api/stats` | `GET /api/stats` |
| `GET /api/vendors` | unchanged |
| `POST /api/vendors` | unchanged |
| `POST /api/vendors/<int:id>/toggle` | `POST /api/vendors/:id/toggle` |
| `DELETE /api/vendors/<int:id>` | `DELETE /api/vendors/:id` |
| `GET/POST /api/settings` | split into `GET` + `POST` route handler in one file |
| `GET /api/orders` | unchanged |
| `POST /api/simulate_order` | renamed to `POST /api/simulate-order` (kebab-case) |
| `GET /api/search` | unchanged |
| _(none)_ | `POST /api/cron/simulate-order` (replaces background thread) |
| `GET /api/items` | new — current Flask only exposes items through search; we surface them |
| _(new in Flask too — see below)_ | `GET/POST/PATCH/DELETE /api/admins` family |

## Admins (already implemented in Flask `app.py`)

`Admin` shape:

```json
{
  "email": "purchase@ascentspark.com",
  "name": "Owner",
  "role": "owner",          // owner | admin | viewer
  "active": true,
  "created_at": 1780233536492
}
```

Doc ID = lowercased email. `email` is immutable — to change it, delete and recreate.

### GET `/api/admins`

```jsonc
// 200 — sorted by email asc
[Admin, ...]
```

### POST `/api/admins`

Body — full `AdminSchema` minus `created_at` (server stamps it).
```jsonc
// 201
{ "email": "...", "name": "...", "role": "admin", "active": true, "created_at": 1780233536492 }
// 400 — bad payload
{ "error": "Invalid email" }
// 409 — duplicate
{ "error": "Admin already exists" }
```

### GET `/api/admins/:email`

URL-encode the email if it contains characters Flask's default converter rejects (none for typical RFC-5322 emails).
```jsonc
// 200
Admin
// 404
{ "error": "Admin not found" }
```

### PATCH `/api/admins/:email`

Partial body — any subset of `{name, role, active}`. `email` cannot be patched.
```jsonc
// 200
Admin
// 400
{ "error": "Email is immutable; delete and recreate to change it" }
// 404
{ "error": "Admin not found" }
```

### POST `/api/admins/:email/toggle`

Flips `active`. Even an owner can be toggled inactive — but if they were the last *active* owner, the next delete on them will be refused.
```jsonc
// 200
{ "success": true, "email": "...", "active": false }
// 404
{ "error": "Admin not found" }
```

### DELETE `/api/admins/:email`

Refuses to delete the last active owner — prevents lock-out.
```jsonc
// 200
{ "success": true, "email": "..." }
// 400
{ "error": "Cannot delete the last active owner" }
// 404
{ "error": "Admin not found" }
```
