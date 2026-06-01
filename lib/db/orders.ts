import { OrderSchema, OrderStatus, type Order, type Day } from "@/lib/schemas";
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

const COL = "orders";

export async function listOrders(filter?: {
  status?: string;
  vendor_id?: number;
  limit?: number;
}): Promise<Order[]> {
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Order>(COL)
      : ((await readJsonOnce()).orders as unknown as Order[]);
  let out = [...rows].sort((a, b) => b.id - a.id);
  if (filter?.status) out = out.filter((o) => o.status === filter.status);
  if (filter?.vendor_id !== undefined) out = out.filter((o) => o.vendor_id === filter.vendor_id);
  if (filter?.limit) out = out.slice(0, Math.min(filter.limit, 200));
  return out;
}

export async function addOrder(payload: Omit<Order, "id"> & { id?: number }): Promise<Order> {
  const all = await listOrders();
  const newId = payload.id ?? (all.length ? Math.max(...all.map((o) => o.id)) + 1 : 4822);
  const order = OrderSchema.parse({ ...payload, id: newId });

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, String(order.id), order);
    const totalsRef = firestoreDb().collection("config").doc("weekly_totals");
    const snap = await totalsRef.get();
    const cur = (snap.exists ? (snap.data() as Record<Day, number>) : {} as Record<Day, number>);
    cur[order.day] = (cur[order.day] ?? 0) + 1;
    await totalsRef.set(cur, { merge: true });
  } else {
    await mutateJson(async (db) => {
      db.orders.unshift(order);
      db.weekly_totals[order.day] = (db.weekly_totals[order.day] ?? 0) + 1;
    });
  }
  return order;
}

export async function getOrder(id: number): Promise<Order | null> {
  if (storageMode() === "firestore") return getFirestoreDoc<Order>(COL, String(id));
  const db = await readJsonOnce();
  return (db.orders.find((o) => o.id === id) as Order) ?? null;
}

export async function updateOrderStatus(id: number, status: string): Promise<Order | null> {
  const parsed = OrderStatus.safeParse(status);
  if (!parsed.success) throw new Error(`Invalid status: ${status}`);
  const cur = await getOrder(id);
  if (!cur) return null;
  const next = { ...cur, status: parsed.data };

  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, String(id), { status: parsed.data });
  } else {
    await mutateJson(async (db) => {
      const o = db.orders.find((x) => x.id === id);
      if (o) (o as Record<string, unknown>).status = parsed.data;
    });
  }
  return next;
}
