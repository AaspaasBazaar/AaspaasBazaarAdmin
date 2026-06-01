import { CategorySchema, type Category } from "@/lib/schemas";
import {
  storageMode,
  listFirestore,
  getFirestoreDoc,
  setFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  firestoreDb,
  mutateJson,
  readJsonOnce,
} from "@/lib/storage";
import { listVendors } from "./vendors";

const COL = "categories";

// Default catalog — seeded on first read if collection empty
const DEFAULTS: Category[] = [
  { slug: "vegetables", name: "Vegetables", color: "#2E9E4F", vendor_count: 0, created_at: 1780000000000 },
  { slug: "fruits",     name: "Fruits",     color: "#F0682E", vendor_count: 0, created_at: 1780000000000 },
  { slug: "dairy",      name: "Dairy",      color: "#4FA3C7", vendor_count: 0, created_at: 1780000000000 },
  { slug: "bakery",     name: "Bakery",     color: "#C98A11", vendor_count: 0, created_at: 1780000000000 },
  { slug: "groceries",  name: "Groceries",  color: "#3B6FB0", vendor_count: 0, created_at: 1780000000000 },
  { slug: "meat",       name: "Meat",       color: "#C5453B", vendor_count: 0, created_at: 1780000000000 },
  { slug: "stationery", name: "Stationery", color: "#2BB3A3", vendor_count: 0, created_at: 1780000000000 },
  { slug: "pharmacy",   name: "Pharmacy",   color: "#E26FA0", vendor_count: 0, created_at: 1780000000000 },
];

async function seedIfEmpty(): Promise<void> {
  if (storageMode() === "firestore") {
    const existing = await listFirestore<Category>(COL);
    if (existing.length === 0) {
      for (const c of DEFAULTS) await setFirestoreDoc(COL, c.slug, c);
    }
  } else {
    await mutateJson(async (db) => {
      if (!db.categories || db.categories.length === 0) {
        db.categories = DEFAULTS as unknown as DbCat[];
      }
    });
  }
}

type DbCat = Record<string, unknown> & { slug: string };

export async function listCategories(): Promise<Category[]> {
  await seedIfEmpty();
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Category>(COL)
      : ((await readJsonOnce()).categories as unknown as Category[]);
  // Compute live vendor counts from vendors collection (name match)
  const vendors = await listVendors();
  const counts = new Map<string, number>();
  for (const v of vendors) for (const c of v.categories) {
    const key = c.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rows
    .map((c) => ({ ...c, vendor_count: counts.get(c.name.toLowerCase()) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const id = slug.trim().toLowerCase();
  if (!id) return null;
  if (storageMode() === "firestore") return getFirestoreDoc<Category>(COL, id);
  const db = await readJsonOnce();
  return ((db.categories as unknown as Category[]).find((c) => c.slug === id)) ?? null;
}

export async function addCategory(
  input: Omit<Category, "created_at" | "vendor_count">,
): Promise<{ ok: true; category: Category } | { ok: false; code: "DUPLICATE" }> {
  const candidate = CategorySchema.parse({ ...input, created_at: Date.now(), vendor_count: 0 });
  const dup = await getCategory(candidate.slug);
  if (dup) return { ok: false, code: "DUPLICATE" };

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, candidate.slug, candidate);
  } else {
    await mutateJson(async (db) => {
      db.categories.push(candidate as unknown as DbCat);
    });
  }
  return { ok: true, category: candidate };
}

export async function updateCategory(
  slug: string,
  patch: Partial<Omit<Category, "slug" | "created_at" | "vendor_count">>,
): Promise<Category | null> {
  const id = slug.trim().toLowerCase();
  const cur = await getCategory(id);
  if (!cur) return null;
  const next = CategorySchema.parse({ ...cur, ...patch });
  const oldName = cur.name;
  const newName = patch.name;

  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, id, patch as Record<string, unknown>);
    if (newName && newName !== oldName) {
      const snap = await firestoreDb()
        .collection("vendors")
        .where("categories", "array-contains", oldName)
        .get();
      const batch = firestoreDb().batch();
      snap.docs.forEach((d) => {
        const cats = ((d.data().categories as string[]) ?? []).map((c) => (c === oldName ? newName : c));
        batch.update(d.ref, { categories: cats });
      });
      if (snap.size > 0) await batch.commit();
    }
  } else {
    await mutateJson(async (db) => {
      const cat = (db.categories as unknown as Category[]).find((c) => c.slug === id);
      if (cat) Object.assign(cat, patch);
      if (newName && newName !== oldName) {
        for (const v of db.vendors) {
          const cats = (v as unknown as { categories?: string[] }).categories;
          if (cats) {
            (v as unknown as { categories: string[] }).categories = cats.map((c) =>
              c === oldName ? newName : c,
            );
          }
        }
      }
    });
  }
  return next;
}

export async function deleteCategory(slug: string): Promise<boolean> {
  const id = slug.trim().toLowerCase();
  const cur = await getCategory(id);
  if (!cur) return false;
  if (storageMode() === "firestore") await deleteFirestoreDoc(COL, id);
  else {
    await mutateJson(async (db) => {
      db.categories = db.categories.filter((c) => (c.slug as string) !== id);
    });
  }
  return true;
}
