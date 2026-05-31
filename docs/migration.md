# Migration: Flask → Next.js

## Goal

Replace the Python/Flask prototype (`app.py`, `db.json`) with the new TypeScript/Next.js stack **without losing data** and **without overlapping ownership of the database** at any point.

## Strategy

Cutover, not parallel-run. The Flask app and the Next.js app must never write to the same store simultaneously — they would race on auto-increment IDs and weekly totals. The plan:

1. Freeze the Flask app (read-only).
2. Snapshot `db.json` (and Firestore, if the Flask app has been writing there).
3. Seed Firestore canonical state from that snapshot.
4. Bring the Next.js app online pointing at the same Firestore.
5. Decommission Flask.

## Endpoint mapping

Already covered in [api-reference.md § Endpoint mapping vs Flask prototype](./api-reference.md#endpoint-mapping-vs-flask-prototype). Frontends consuming the old API only need:

- `POST /api/simulate_order` → `POST /api/simulate-order` (rename).
- All path params switch from Flask's `<int:id>` to plain `:id`. The runtime change is transparent to callers.

## Behaviour parity matrix

| Flask behaviour (`app.py` line) | Where it lives in Next.js |
|---------------------------------|---------------------------|
| `load_local_db` / `save_local_db` | gone — Firestore only |
| `seed_firestore_if_empty` | `scripts/seed-from-dbjson.ts` (one-off) |
| `get_vendors` (line 305) | `lib/db/vendors.ts → listVendors()` |
| `add_vendor` (322) | `lib/db/vendors.ts → addVendor()` |
| `toggle_vendor` (330) | `lib/db/vendors.ts → toggleVendor()` |
| `delete_vendor` (353) | `lib/db/vendors.ts → deleteVendor()` (batched with items) |
| `get_items` (371) | `lib/db/items.ts → listItems()` |
| `get_orders` (389) | `lib/db/orders.ts → listOrders()` |
| `add_order` (406) | `lib/db/orders.ts → addOrder()` |
| `get_settings` / `save_settings` (426/440) | `lib/db/settings.ts` |
| `get_weekly_totals` (452) | `lib/db/weekly-totals.ts` |
| `place_simulated_order` (479) | `lib/sim/place-simulated-order.ts` |
| `simulator_thread_loop` (519) | **removed** — replaced by Vercel Cron hitting `/api/cron/simulate-order` |
| `/api/stats` (542) | `app/api/stats/route.ts` |
| `/api/search` (655) | `app/api/search/route.ts` |

## ID strategy

Flask uses ascending integer IDs (max + 1). Firestore is happiest with string doc IDs.

**Decision:** keep numeric IDs for external API compatibility, use `String(id)` as the doc ID, also store `id: number` inside the doc. Allocation:

- Counter doc `meta/counters` with fields `{ vendor: number, item: number, order: number }`.
- `addVendor` / `addItem` / `addOrder` run a Firestore transaction: increment the relevant counter, use the new value as the ID.

This avoids races that the Flask `max(id) + 1` approach suffers under concurrent writes.

## Seed script (`scripts/seed-from-dbjson.ts`)

```ts
// pnpm tsx scripts/seed-from-dbjson.ts [--force]
import { readFile } from "node:fs/promises";
import { db } from "@/lib/firebase-admin";
import {
  VendorSchema, ItemSchema, OrderSchema,
  SettingsSchema, WeeklyTotalsSchema,
} from "@/lib/schemas";

const force = process.argv.includes("--force");

async function seedCollection<T>(
  name: string,
  docs: T[],
  idOf: (d: T) => string,
) {
  const col = db.collection(name);
  if (!force) {
    const existing = await col.limit(1).get();
    if (!existing.empty) {
      console.log(`skip ${name}: already populated`);
      return;
    }
  }
  // Batches of 500 per Firestore limit
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch();
    docs.slice(i, i + 500).forEach(d => batch.set(col.doc(idOf(d)), d));
    await batch.commit();
  }
  console.log(`seeded ${name}: ${docs.length} docs`);
}

async function main() {
  const raw = JSON.parse(
    await readFile("db.json", "utf8"),
  ) as {
    vendors: unknown[]; items: unknown[]; orders: unknown[];
    settings: unknown; weekly_totals: unknown;
  };

  const vendors = raw.vendors.map(v => VendorSchema.parse(v));
  const items   = raw.items.map(  v => ItemSchema.parse(v));
  const orders  = raw.orders.map( v => OrderSchema
    .extend({ created_at: z.number().optional() })  // synthesize if missing
    .parse(v))
    .map(o => ({ ...o, created_at: o.created_at ?? Date.now() }));

  await seedCollection("vendors", vendors, v => String(v.id));
  await seedCollection("items",   items,   v => String(v.id));
  await seedCollection("orders",  orders,  v => String(v.id));

  await db.collection("settings").doc("global")
    .set(SettingsSchema.parse(raw.settings));
  await db.collection("weeklyTotals").doc("current")
    .set(WeeklyTotalsSchema.parse(raw.weekly_totals));

  await db.collection("meta").doc("counters").set({
    vendor: Math.max(...vendors.map(v => v.id), 0),
    item:   Math.max(...items.map(  v => v.id), 0),
    order:  Math.max(...orders.map( v => v.id), 0),
  });

  console.log("done");
}
main().catch(e => { console.error(e); process.exit(1); });
```

## Cutover runbook

1. **T-30 min:** announce maintenance window. Put Flask in read-only mode (set an env flag and have mutation endpoints return `503`).
2. **T-15 min:** take fresh snapshot of `db.json` from the live Flask host and `gcloud firestore export` if Firestore was being written to.
3. **T-10 min:** run `pnpm tsx scripts/seed-from-dbjson.ts --force` against the **production** Firebase project.
4. **T-5 min:** smoke test the new app on a temporary URL (Vercel preview).
5. **T-0:** switch DNS / promote Vercel deployment. Stop the Flask process.
6. **T+15 min:** verify `/api/stats` numbers match the snapshot; verify cron has fired at least once.
7. **T+1 day:** archive `app.py`, `db.json`, `templates/`, `static/` to a `legacy/` branch; delete from `main`.

## Rollback

If the new app is broken within the first hour:
1. Stop Vercel cron (Vercel UI → Crons → Pause).
2. Switch DNS back to the Flask host.
3. Restart Flask **with** the in-memory state restored from the snapshot from step T-15.
4. Re-seed Firestore from that same snapshot later (any writes the Next.js app did during the window must be reconciled manually — log them from Firestore audit collection).
