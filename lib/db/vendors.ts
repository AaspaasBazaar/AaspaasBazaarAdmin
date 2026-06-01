import { VendorSchema, type Vendor } from "@/lib/schemas";
import {
  storageMode,
  listFirestore,
  getFirestoreDoc,
  setFirestoreDoc,
  updateFirestoreDoc,
  firestoreDb,
  mutateJson,
  readJsonOnce,
} from "@/lib/storage";
import { listZones, zoneForPincode } from "./zones";

const COL = "vendors";

export type ListFilter = {
  zone_id?: string;
  status?: Vendor["status"];
};

export async function listVendors(filter?: ListFilter): Promise<Vendor[]> {
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Vendor>(COL)
      : (((await readJsonOnce()).vendors as unknown) as Vendor[]);
  let out = [...rows].sort((a, b) => a.id - b.id);
  if (filter?.zone_id) out = out.filter((v) => v.zone_id === filter.zone_id);
  if (filter?.status) out = out.filter((v) => v.status === filter.status);
  return out;
}

export async function getVendor(id: number): Promise<Vendor | null> {
  if (storageMode() === "firestore") {
    return getFirestoreDoc<Vendor>(COL, String(id));
  }
  const db = await readJsonOnce();
  return (db.vendors.find((v) => v.id === id) as Vendor) ?? null;
}

type NewVendorInput = Omit<
  Vendor,
  "id" | "distance" | "rating" | "status" | "approved_by" | "approved_at" | "rejection_reason" | "created_at"
>;

export async function addVendor(payload: NewVendorInput): Promise<Vendor> {
  const existing = await listVendors();
  const newId = existing.length ? Math.max(...existing.map((v) => v.id)) + 1 : 1;
  const distanceNum = Math.round((0.5 + (newId % 5) * 0.7) * 10) / 10;

  // Auto-pick zone from pincode if not set
  let zone_id = payload.zone_id;
  if (!zone_id && payload.pincode) {
    const zones = await listZones();
    zone_id = zoneForPincode(zones, payload.pincode)?.id;
  }

  const candidate = VendorSchema.parse({
    ...payload,
    id: newId,
    zone_id,
    distance: `${distanceNum} km`,
    rating: Math.round((4.0 + (newId % 10) * 0.1) * 10) / 10,
    status: "pending",
    created_at: Date.now(),
  });

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, String(vendor_idOf(candidate)), candidate);
  } else {
    await mutateJson(async (db) => {
      db.vendors.push(candidate);
    });
  }
  return candidate;
}

function vendor_idOf(v: Vendor): number {
  return v.id;
}

export async function updateVendor(
  id: number,
  patch: Partial<Omit<Vendor, "id">>,
): Promise<Vendor | null> {
  const cur = await getVendor(id);
  if (!cur) return null;

  // If pincode changed and zone_id absent, re-derive
  let mergedPatch: Partial<Vendor> = { ...patch };
  if (patch.pincode && !patch.zone_id) {
    const zones = await listZones();
    const zone = zoneForPincode(zones, patch.pincode);
    if (zone) mergedPatch.zone_id = zone.id;
  }

  const next = VendorSchema.parse({ ...cur, ...mergedPatch });

  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, String(id), mergedPatch as Record<string, unknown>);
    if (patch.name && patch.name !== cur.name) {
      const itemsSnap = await firestoreDb()
        .collection("items")
        .where("vendor_id", "==", id)
        .get();
      const batch = firestoreDb().batch();
      itemsSnap.docs.forEach((d) => batch.update(d.ref, { vendor_name: patch.name! }));
      if (itemsSnap.size > 0) await batch.commit();
    }
  } else {
    await mutateJson(async (db) => {
      const v = db.vendors.find((x) => x.id === id) as Vendor | undefined;
      if (v) Object.assign(v, mergedPatch);
      if (patch.name && patch.name !== cur.name) {
        for (const it of db.items) {
          if ((it as unknown as { vendor_id: number }).vendor_id === id) {
            (it as Record<string, unknown>).vendor_name = patch.name;
          }
        }
      }
    });
  }
  return next;
}

export async function toggleVendor(id: number): Promise<{ id: number; open: boolean } | null> {
  if (storageMode() === "firestore") {
    const v = await getFirestoreDoc<Vendor>(COL, String(id));
    if (!v) return null;
    const open = !v.open;
    await updateFirestoreDoc(COL, String(id), { open });
    return { id, open };
  }
  return mutateJson(async (db) => {
    const v = db.vendors.find((x) => x.id === id) as Vendor | undefined;
    if (!v) return null;
    v.open = !v.open;
    return { id, open: v.open };
  });
}

export async function approveVendor(
  id: number,
  approverEmail: string,
): Promise<Vendor | null> {
  return updateVendor(id, {
    status: "approved",
    approved_by: approverEmail,
    approved_at: Date.now(),
    rejection_reason: undefined,
  });
}

export async function rejectVendor(
  id: number,
  approverEmail: string,
  reason: string,
): Promise<Vendor | null> {
  return updateVendor(id, {
    status: "rejected",
    approved_by: approverEmail,
    approved_at: Date.now(),
    rejection_reason: reason,
  });
}

export async function suspendVendor(
  id: number,
  approverEmail: string,
  reason?: string,
): Promise<Vendor | null> {
  return updateVendor(id, {
    status: "suspended",
    approved_by: approverEmail,
    approved_at: Date.now(),
    rejection_reason: reason ?? "",
  });
}

export async function deleteVendor(id: number): Promise<{ items_removed: number } | null> {
  if (storageMode() === "firestore") {
    const ref = await getFirestoreDoc<Vendor>(COL, String(id));
    if (!ref) return null;
    const db = firestoreDb();
    const itemsSnap = await db.collection("items").where("vendor_id", "==", id).get();
    const batch = db.batch();
    batch.delete(db.collection(COL).doc(String(id)));
    itemsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { items_removed: itemsSnap.size };
  }
  return mutateJson(async (db) => {
    const before = db.vendors.length;
    db.vendors = db.vendors.filter((v) => v.id !== id);
    if (db.vendors.length === before) return null;
    const itemsBefore = db.items.length;
    db.items = db.items.filter((i) => (i as unknown as { vendor_id: number }).vendor_id !== id);
    return { items_removed: itemsBefore - db.items.length };
  });
}
