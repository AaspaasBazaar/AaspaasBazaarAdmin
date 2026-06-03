# AaspaasBazaar — Website Design Prompt (for Claude)

> Paste this whole document to Claude as the brief for designing & building the
> AaspaasBazaar web app. It is self-contained: brand, roles, pages, data model,
> and APIs are all below.

---

## 1. What you're building

**One website, two experiences chosen by login.** A single Next.js web app for
**AaspaasBazaar**, a hyperlocal (zone-based) marketplace in India. After a user
signs in, their **role decides the entire app**:

- **`user` (customer)** → browse vendors & items in their zone, build a cart,
  place orders, track order status, manage profile.
- **`vendor`** → manage their shop: items/stock, incoming orders, accept/advance
  order status, toggle open/closed, edit shop profile & hours.

There is **no role switcher** inside the app — the role comes from the
authenticated account (a Firebase custom claim) and the entire navigation, layout,
and feature set render accordingly. Same URL host, same login page, divergent app
shells post-auth.

(An internal **admin panel** already exists separately and is **out of scope** for
this build — do not design admin screens.)

### Where it lives
Build the **frontend inside the existing repo** (`AaspaasBazaarAdmin`, Next.js 15
App Router) as **new route groups** — e.g. `app/(shop)/...` for the customer +
vendor experiences, kept separate from the existing admin routes. Reuse:
- the Tailwind design tokens (`tailwind.config.ts`) and fonts,
- the Firebase **web** SDK config for client auth.

**Backend is a SEPARATE service** (`AaspaasBazaarBackend` — see
`docs/BACKEND_REPO_SPEC.md`), not in this repo. The webapp calls it **over HTTP at
its base URL** (configured via `NEXT_PUBLIC_API_BASE_URL`), **not** same-origin
`/api/*`. The backend's CORS allowlist must include the webapp origin. Send the
Firebase ID token as `Authorization: Bearer <token>` on every request.

> Transitional note: the `/api/app/*` routes currently embedded in this repo are
> being migrated into `AaspaasBazaarBackend` and will be removed here. Treat the
> standalone backend as the real API target; do not add new endpoints in this repo.

---

## 2. Roles & auth model

- Auth = **Firebase Authentication** (email/phone). The web app obtains a Firebase
  **ID token** and sends it as `Authorization: Bearer <token>` on every API call.
- Role lives on a Firebase **custom claim**: `role: "user" | "vendor"`. Vendors
  also carry a `vendor_id` claim.
- **Routing rule:** after login, read the role from the ID token.
  - `user` → mount the **Customer app shell** (`/app/...` or root).
  - `vendor` → mount the **Vendor app shell**.
  - No/expired token → redirect to **/login**.
- The web app **never reads or writes the database directly.** All data flows
  through the backend API (section 7). This is a hard architectural rule.

---

## 3. Brand & design system

Hyperlocal, fresh, trustworthy — "your neighbourhood market, online." Clean,
green, modern Indian D2C feel. Not corporate, not childish.

### Color tokens (reuse exactly — these match the existing product)
```
Brand greens (primary actions, headers)
  ink-900  #06160E   ink-800 #0F2419   ink-700 #15321F
  ink-600  #16241D   ink-500 #1E4030   ink-400 #16352B
  leaf-400 #2EB36A   leaf-500 #2E9E4F  leaf-600 #1B8A5A  (primary CTA = leaf)
  leaf-700 #13653F   leaf-50  #E7F4ED
Neutrals / surfaces
  sage-50 #F4F7F4  sage-100 #EEF2EF  sage-200 #E5EAE6  sage-300 #CDD6D0
  sage-400 #A8C4B5 sage-500 #6E8A7A
  canvas (app bg) #DCE5DE
Accents (category badges, status, stat icons)
  ocean 400 #4FA3C7 / 600 #3B6FB0     aqua 400 #2BB3A3
  amber 600 #C98A11                   orange 600 #F0682E
  rose  600 #E26FA0                   ruby 600 #C5453B (errors/destructive)
```

### Type
- Display / headings: **Bricolage Grotesque** (`--font-bricolage`)
- Body / UI: **Hanken Grotesk** (`--font-hanken`)
- Mono (codes, ids, amounts where tabular): **JetBrains Mono**

### Shape & elevation
- Card radius **16px** (`rounded-card`), panel radius **20px** (`rounded-panel`).
- Soft shadow: `0 1px 2px rgba(15,36,25,0.04)`.
- Generous whitespace, rounded inputs, pill buttons for primary CTAs.

### Currency & locale
- Currency is **INR (₹)**. Distances in **km**, delivery radius in **metres**.
- Indian phone formats; pincode = 6 digits.

---

## 4. Customer (user) experience

App shell: top bar with **zone/location selector**, search, cart icon (count),
profile menu. Mobile-first, responsive up to desktop.

Pages / flows:
1. **Home / Discover** — vendors in the selected zone. Cards show name, specialty,
   rating, open/closed, delivery vs pickup badges, delivery fee, min order, prep
   time, distance. Filter by category; search by vendor/item.
2. **Vendor storefront** — vendor header (hours, open state, fees, payment methods),
   item list grouped by category. Each item: name, price/unit, stock status
   ("In stock" / "Low stock" / "Out of stock" — disable add when out). Add to cart.
3. **Cart** — line items + qty steppers, subtotal, delivery fee (if Delivery),
   min-order check, choose **Delivery or Pickup**, payment method (UPI/cash/card/
   wallet per vendor support). Cart is **single-vendor** (one order = one vendor).
4. **Checkout / place order** — confirm address (Delivery) or pickup, submit.
   Order amount is computed & confirmed **server-side**; show the server's total.
5. **Orders** — list of own orders with status chips (Pending → Accepted →
   Preparing → Out for delivery → Completed / Cancelled). Order detail view.
6. **Order tracking** — live status of an active order (realtime; see §6 note).
7. **Profile** — name, email, phone, default address & pincode. Edit.
8. **Auth** — login / signup (Firebase), zone selection on first run.

Customer rules:
- Never show prices the client invents — render server-confirmed amounts.
- Respect vendor `open`, `status === "approved"`, stock, and `min_order_amount`.

---

## 5. Vendor experience

App shell: sidebar nav (brand green `ink`/`leaf`), shop name + open/closed toggle
prominent in the header.

Pages / flows:
1. **Dashboard** — today's orders count, revenue, pending orders needing action,
   open/closed toggle, low/out-of-stock item alerts.
2. **Orders (incoming)** — queue of orders for this vendor. Advance status:
   Pending → Accepted → Preparing → Out for delivery → Completed; or Cancel.
   Filter by status. Sound/visual cue for new orders (realtime; see §6).
3. **Items / menu** — CRUD list of own items: name, category, price, unit, stock
   status. Quick stock toggle (In/Low/Out).
4. **Shop profile** — edit description, specialty, contact, address, categories,
   delivery vs pickup, delivery radius, delivery fee, min order, prep time,
   payment methods, **business hours** (per-day open/close/closed), compliance
   (GST, FSSAI), payout details (bank/UPI).
5. **Auth** — login (Firebase). Vendor's `vendor_id` claim scopes all data.

Vendor rules:
- A vendor only ever sees **their own** vendor record, items, and orders — scope
  derives from the verified token, never from a client-supplied id.
- Edits to operational fields are immediate; approval/zone fields are admin-owned
  and **read-only** here.

---

## 5b. Operations matrix (must all be supported)

Every operation runs through the backend API; the client only renders + calls.

**Customer (`user`)**
- Sign up / log in / log out (Firebase); set & edit profile + default address.
- Select / change zone; browse approved vendors in zone; search & filter.
- Open a vendor storefront; view items, prices, stock, hours, fees.
- Add / remove / change qty in a single-vendor cart.
- Choose Delivery or Pickup + payment method; place an order (server prices it).
- View order history; view order detail; track an active order's live status.
- Cancel an order while still cancellable (e.g. before Accepted) — if allowed.

**Vendor (`vendor`)**
- Log in / log out (Firebase); edit shop profile, hours, fees, payout, compliance.
- Toggle shop **open/closed**.
- **Inventory:** create / edit / delete items; set price, unit, category; change
  stock status (In stock / Low stock / Out of stock).
- **Orders:** see incoming orders queue; accept / advance status (Pending →
  Accepted → Preparing → Out for delivery → Completed) or cancel.
- See dashboard metrics (today's orders, revenue, pending, low-stock alerts).

All vendor data is scoped to the signed-in vendor via the verified token.

## 6. Data model (shapes you'll render)

All money INR. Timestamps are unix ms. Source of truth = backend; these are the
field sets returned/accepted.

**Vendor** — `id, name, owner, description, specialty, phone, whatsapp, email,
address, pincode, latitude, longitude, distance, categories[], rating, open,
pickup_available, delivery_available, delivery_radius(m), delivery_fee(₹),
min_order_amount(₹), prep_time_minutes, payment_methods[upi|cash|card|wallet],
business_hours{Mon..Sun:{closed,open,close}}, gst_number?, fssai_license?,
bank_*?, upi_id?, zone_id, status(pending|approved|rejected|suspended), notes`.
Customers see only **approved** vendors.

**Item** — `id, name, vendor_id, vendor_name, category, price(₹), unit,
status("In stock"|"Low stock"|"Out of stock")`.

**Order** — `id, vendor_id, vendor_name, customer_name, customer_code,
amount(₹), items_count, type("Delivery"|"Pickup"),
status("Pending"|"Accepted"|"Preparing"|"Out for delivery"|"Completed"|"Cancelled"),
time, day, user_id`.

**User (customer profile)** — `uid, name, email?, phone?, default_address?,
default_pincode?, active, created_at`.

**Zone** — `id, name, city, pincodes[], center_lat?, center_lng?, active`.
Customers pick/are matched to a zone by pincode.

---

## 7. Backend API (the only data path)

Base URL: the standalone backend (`AaspaasBazaarBackend`), via
`NEXT_PUBLIC_API_BASE_URL` — **not** same-origin. Path prefix `/api/app/*`. Always
send the Firebase ID token as `Authorization: Bearer <token>`. JSON in/out.
Errors: `{ error: { code, message } }` with 401 (no/invalid token) / 403 (wrong
role). The backend allowlists this webapp's origin in CORS. Full endpoint contract
lives in `docs/BACKEND_REPO_SPEC.md` §7 — that is the source of truth; the list
below is the subset this webapp consumes.

Customer (`/api/app/user/*`, `/api/app/*`):
- `GET  /api/app/user/profile` · `PUT /api/app/user/profile`
- `GET  /api/app/catalog?zone_id=` — approved + open vendors in a zone
- `GET  /api/app/vendors/:id` — storefront (vendor + items)
- `GET  /api/app/zones` — zones / resolve by pincode
- `POST /api/app/user/orders` — place order `{ vendor_id, type, items:[{item_id, qty}] }`
  (server prices it; client must NOT send amount)
- `GET  /api/app/user/orders` · `GET /api/app/user/orders/:id`
- `POST /api/app/user/orders/:id/cancel` — while cancellable

Vendor (`/api/app/vendor/*`):
- `GET /api/app/vendor/profile` · `PATCH /api/app/vendor/profile`
- `POST /api/app/vendor/open` — toggle open/closed
- `GET/POST /api/app/vendor/items` · `PATCH/DELETE /api/app/vendor/items/:id`
- `GET /api/app/vendor/orders` · `PATCH /api/app/vendor/orders/:id/status`
- `GET /api/app/vendor/dashboard`

**Realtime note:** order tracking (customer) and new-order alerts (vendor) may use
a direct, **read-only, auth-scoped** Firestore subscription as an exception. Every
**write** still goes through the API. Default to API polling; use realtime only
where live push genuinely matters.

---

## 8. Tech & constraints

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS.** Match the
  existing repo conventions and the design tokens above (Tailwind config already
  defines `ink/sage/leaf/...`, `rounded-card/panel`, the font families).
- **Validation:** mirror the field rules above; trust the server for totals/state.
- **Accessibility:** semantic HTML, keyboard-navigable, visible focus, adequate
  contrast on green surfaces.
- **Responsive:** mobile-first; vendor dashboard usable on desktop.
- **No secrets in the client.** No service-account keys; only the Firebase web
  config + the user's ID token.

---

## 9. Deliverables expected from Claude

1. Auth + role-routing shell (login → role-based app mount).
2. Customer experience: discover, storefront, cart, checkout, orders, tracking,
   profile.
3. Vendor experience: dashboard, orders queue, items, shop profile.
4. Reusable component kit (vendor card, item row, status chip, qty stepper,
   open/closed toggle, empty states) using the brand tokens.
5. Wire to the `AaspaasBazaarBackend` `/api/app/*` endpoints (base URL via
   `NEXT_PUBLIC_API_BASE_URL`, Bearer token, CORS). Centralize calls in one API
   client module; mock responses where an endpoint isn't live yet.

### Acceptance checks
- Logging in as a `user` shows only customer UI; as a `vendor`, only vendor UI.
- A customer can browse an approved vendor in their zone and place an order whose
  total comes back from the server.
- A vendor sees only their own orders/items and can advance an order's status.
- No screen reads/writes Firestore directly except the noted realtime read.
- Visual design uses the AaspaasBazaar green palette, Bricolage/Hanken fonts, and
  card/panel radii — not generic defaults.
