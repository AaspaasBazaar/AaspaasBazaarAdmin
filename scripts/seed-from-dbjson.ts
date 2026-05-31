/**
 * Seed Firestore from the existing db.json snapshot.
 *
 *   pnpm seed             # idempotent — skips collections that already have docs
 *   pnpm seed -- --force  # overwrites
 *
 * Auth: either drop service-account.json at repo root, or set
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasAdminCreds, getDb } from "../lib/firebase-admin";
import {
  VendorSchema,
  ItemSchema,
  OrderSchema,
  SettingsSchema,
  WeeklyTotalsSchema,
  AdminSchema,
} from "../lib/schemas";

async function main() {
  if (!hasAdminCreds()) {
    console.error(
      "[seed] No Firebase Admin credentials found. Either drop service-account.json at repo root " +
        "or set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars. Aborting.",
    );
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const dbFile = path.join(process.cwd(), "db.json");
  const raw = JSON.parse(await readFile(dbFile, "utf8")) as {
    vendors?: unknown[];
    items?: unknown[];
    orders?: unknown[];
    admins?: unknown[];
    settings?: unknown;
    weekly_totals?: unknown;
  };

  const db = getDb();

  async function seedArray<T>(
    name: string,
    rows: unknown[] | undefined,
    parser: (x: unknown) => T,
    idOf: (t: T) => string,
  ) {
    if (!rows) {
      console.log(`[seed] ${name}: source missing — skipped`);
      return;
    }
    const col = db.collection(name);
    if (!force) {
      const existing = await col.limit(1).get();
      if (!existing.empty) {
        console.log(`[seed] ${name}: already populated — skipped (use --force to overwrite)`);
        return;
      }
    }
    const parsed = rows.map(parser);
    for (let i = 0; i < parsed.length; i += 500) {
      const batch = db.batch();
      parsed.slice(i, i + 500).forEach((d) => batch.set(col.doc(idOf(d)), d as Record<string, unknown>));
      await batch.commit();
    }
    console.log(`[seed] ${name}: ${parsed.length} docs written`);
  }

  await seedArray("vendors", raw.vendors, (x) => VendorSchema.parse(x), (v) => String(v.id));
  await seedArray("items", raw.items, (x) => ItemSchema.parse(x), (i) => String(i.id));
  await seedArray("orders", raw.orders, (x) => OrderSchema.parse(x), (o) => String(o.id));
  await seedArray("admins", raw.admins, (x) => AdminSchema.parse(x), (a) => a.email);

  if (raw.settings) {
    await db.collection("config").doc("settings").set(SettingsSchema.parse(raw.settings));
    console.log("[seed] settings: written");
  }
  if (raw.weekly_totals) {
    await db
      .collection("config")
      .doc("weekly_totals")
      .set(WeeklyTotalsSchema.parse(raw.weekly_totals));
    console.log("[seed] weekly_totals: written");
  }

  console.log("[seed] done");
}

main().catch((e) => {
  console.error("[seed] failed:", e);
  process.exit(1);
});
