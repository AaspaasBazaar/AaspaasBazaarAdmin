/**
 * One-shot migration: backfill new vendor fields introduced in the
 * zones + approval + per-vendor delivery refactor.
 *
 *   npx tsx scripts/migrate-vendor-fields.ts
 *
 * Idempotent: only writes a field when it is currently missing.
 */
import { hasAdminCreds, getDb } from "../lib/firebase-admin";
import { listZones, zoneForPincode } from "../lib/db/zones";
import { DEFAULT_HOURS } from "../lib/schemas";

async function main() {
  if (!hasAdminCreds()) {
    console.error("[migrate] no Firebase Admin creds — set service-account.json or env vars");
    process.exit(1);
  }
  const db = getDb();
  const zones = await listZones();
  const defaultZone = zones[0]?.id; // single default — works for seed data

  const snap = await db.collection("vendors").get();
  console.log(`[migrate] examining ${snap.size} vendor docs`);

  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (data.status === undefined) patch.status = "approved";
    if (data.delivery_fee === undefined) patch.delivery_fee = 25;
    if (data.min_order_amount === undefined) patch.min_order_amount = 0;
    if (data.prep_time_minutes === undefined) patch.prep_time_minutes = 20;
    if (data.pickup_available === undefined) patch.pickup_available = true;
    if (data.delivery_available === undefined) patch.delivery_available = data.delivery ?? true;
    if (data.payment_methods === undefined) patch.payment_methods = ["upi", "cash"];
    if (data.business_hours === undefined) patch.business_hours = DEFAULT_HOURS;
    if (data.description === undefined) patch.description = "";
    if (data.specialty === undefined) patch.specialty = "";
    if (data.whatsapp === undefined) patch.whatsapp = "";
    if (data.notes === undefined) patch.notes = "";
    if (data.created_at === undefined) patch.created_at = 1780000000000;
    if (data.zone_id === undefined) {
      const pin = (data.pincode as string | undefined) ?? undefined;
      const z = pin ? zoneForPincode(zones, pin) : null;
      patch.zone_id = z?.id ?? defaultZone;
    }

    if (Object.keys(patch).length > 0) {
      await doc.ref.update(patch);
      updated++;
      console.log(`[migrate] ${doc.id}: ${Object.keys(patch).join(", ")}`);
    }
  }

  console.log(`[migrate] done — ${updated}/${snap.size} docs updated`);
}

main().catch((e) => {
  console.error("[migrate] failed:", e);
  process.exit(1);
});
