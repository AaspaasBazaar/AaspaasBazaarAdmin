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

const COL = "vendors";

export async function listVendors(): Promise<Vendor[]> {
  if (storageMode() === "firestore") {
    const rows = await listFirestore<Vendor>(COL);
    return rows.sort((a, b) => a.id - b.id);
  }
  const db = await readJsonOnce();
  return [...db.vendors].sort((a, b) => a.id - b.id) as Vendor[];
}

export async function getVendor(id: number): Promise<Vendor | null> {
  if (storageMode() === "firestore") {
    return getFirestoreDoc<Vendor>(COL, String(id));
  }
  const db = await readJsonOnce();
  return (db.vendors.find((v) => v.id === id) as Vendor) ?? null;
}

export async function addVendor(payload: Omit<Vendor, "id" | "distance" | "rating">): Promise<Vendor> {
  const existing = await listVendors();
  const newId = existing.length ? Math.max(...existing.map((v) => v.id)) + 1 : 1;
  const distanceNum = Math.round((0.5 + (newId % 5) * 0.7) * 10) / 10;
  const candidate = {
    ...payload,
    id: newId,
    distance: `${distanceNum} km`,
    rating: Math.round((4.0 + (newId % 10) * 0.1) * 10) / 10,
  };
  const vendor = VendorSchema.parse(candidate);

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, String(vendor.id), vendor);
  } else {
    await mutateJson(async (db) => {
      db.vendors.push(vendor);
    });
  }
  return vendor;
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
