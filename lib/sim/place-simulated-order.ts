import { listVendors } from "@/lib/db/vendors";
import { listItems } from "@/lib/db/items";
import { addOrder } from "@/lib/db/orders";
import type { Day, Order } from "@/lib/schemas";

const NAMES: Array<[string, string]> = [
  ["Rahul S", "RS"],
  ["Karan M", "KM"],
  ["Divya K", "DK"],
  ["Ananya G", "AG"],
  ["Deepak T", "DT"],
  ["Sonia P", "SP"],
  ["Vijay R", "VR"],
  ["Arjun M", "AA"],
];

const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export async function placeSimulatedOrder(): Promise<Order | null> {
  const openVendors = (await listVendors()).filter((v) => v.open);
  if (!openVendors.length) return null;

  const vendor = pickRandom(openVendors);
  const [customerName, customerCode] = pickRandom(NAMES);

  const allItems = await listItems();
  const matching = allItems.filter((i) => vendor.categories.includes(i.category));
  const candidates = matching.length ? matching : allItems;
  if (!candidates.length) return null;

  const picks = sampleN(candidates, Math.max(1, Math.min(3, candidates.length)));
  const itemsCount = picks.reduce((sum) => sum + 1 + Math.floor(Math.random() * 4), 0);
  const amount = picks.reduce((sum, item) => sum + item.price * (1 + Math.floor(Math.random() * 2)), 0);

  const day = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return addOrder({
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    customer_name: customerName,
    customer_code: customerCode,
    amount,
    items_count: itemsCount,
    type: Math.random() < 0.6 && vendor.delivery ? "Delivery" : "Pickup",
    status: "Pending",
    time: "Just now",
    day,
  });
}
