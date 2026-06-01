import { ItemSchema, type Item } from "@/lib/schemas";
import {
  storageMode,
  listFirestore,
  getFirestoreDoc,
  setFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  mutateJson,
  readJsonOnce,
} from "@/lib/storage";
import { getVendor } from "./vendors";

const COL = "items";

export async function listItems(filter?: {
  vendor_id?: number;
  category?: string;
  status?: string;
}): Promise<Item[]> {
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Item>(COL)
      : ((await readJsonOnce()).items as unknown as Item[]);
  let out = [...rows].sort((a, b) => a.id - b.id);
  if (filter?.vendor_id !== undefined) out = out.filter((i) => i.vendor_id === filter.vendor_id);
  if (filter?.category) out = out.filter((i) => i.category.toLowerCase() === filter.category!.toLowerCase());
  if (filter?.status) out = out.filter((i) => i.status === filter.status);
  return out;
}

export async function getItem(id: number): Promise<Item | null> {
  if (storageMode() === "firestore") return getFirestoreDoc<Item>(COL, String(id));
  const db = await readJsonOnce();
  return (db.items.find((x) => x.id === id) as Item) ?? null;
}

async function nextItemId(): Promise<number> {
  const all = await listItems();
  return all.length ? Math.max(...all.map((x) => x.id)) + 1 : 1;
}

export async function addItem(input: Omit<Item, "id" | "vendor_name">): Promise<Item> {
  const vendor = await getVendor(input.vendor_id);
  if (!vendor) throw new Error(`Vendor ${input.vendor_id} does not exist`);
  const id = await nextItemId();
  const candidate = ItemSchema.parse({ ...input, id, vendor_name: vendor.name });

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, String(id), candidate);
  } else {
    await mutateJson(async (db) => {
      db.items.push(candidate);
    });
  }
  return candidate;
}

export async function updateItem(
  id: number,
  patch: Partial<Omit<Item, "id" | "vendor_name">>,
): Promise<Item | null> {
  const cur = await getItem(id);
  if (!cur) return null;

  // If vendor_id changes, denormalize vendor_name too
  let vendor_name = cur.vendor_name;
  if (patch.vendor_id && patch.vendor_id !== cur.vendor_id) {
    const v = await getVendor(patch.vendor_id);
    if (!v) throw new Error(`Vendor ${patch.vendor_id} does not exist`);
    vendor_name = v.name;
  }
  const merged: Partial<Item> = { ...patch, vendor_name };
  const next = ItemSchema.parse({ ...cur, ...merged });

  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, String(id), merged as Record<string, unknown>);
  } else {
    await mutateJson(async (db) => {
      const it = db.items.find((x) => x.id === id);
      if (it) Object.assign(it, merged);
    });
  }
  return next;
}

export async function deleteItem(id: number): Promise<boolean> {
  const cur = await getItem(id);
  if (!cur) return false;
  if (storageMode() === "firestore") await deleteFirestoreDoc(COL, String(id));
  else {
    await mutateJson(async (db) => {
      db.items = db.items.filter((x) => x.id !== id);
    });
  }
  return true;
}
