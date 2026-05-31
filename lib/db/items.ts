import type { Item } from "@/lib/schemas";
import { storageMode, listFirestore, readJsonOnce } from "@/lib/storage";

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
