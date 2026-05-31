import { listVendors } from "@/lib/db/vendors";
import { listItems } from "@/lib/db/items";
import { listOrders } from "@/lib/db/orders";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").toLowerCase();

  const [vendors, items, orders] = await Promise.all([listVendors(), listItems(), listOrders()]);

  if (!q) {
    return ok({
      query: "",
      total_results: items.length,
      results: { vendors, items, orders },
    });
  }

  const matchedVendors = vendors.filter(
    (v) => v.name.toLowerCase().includes(q) || v.categories.some((c) => c.toLowerCase().includes(q)),
  );
  const matchedItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.vendor_name.toLowerCase().includes(q),
  );
  const matchedOrders = orders.filter(
    (o) =>
      String(o.id).includes(q) ||
      o.vendor_name.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q),
  );

  return ok({
    query: q,
    total_results: matchedVendors.length + matchedItems.length + matchedOrders.length,
    results: { vendors: matchedVendors, items: matchedItems, orders: matchedOrders },
  });
}
