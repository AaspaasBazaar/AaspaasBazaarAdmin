import { z } from "zod";
import { ok, badRequest, parseJson } from "@/lib/api";
import { withAppAuth } from "@/lib/auth-token";
import { listOrders, addOrder } from "@/lib/db/orders";
import { getVendor } from "@/lib/db/vendors";

export const dynamic = "force-dynamic";

// GET /api/app/user/orders — the signed-in customer's order history.
// NOTE: the current Order schema (lib/schemas.ts) has no user_id field. To scope
// orders to a user you must add `user_id` to OrderSchema and filter on it here.
export const GET = withAppAuth("user", async (auth) => {
  const all = await listOrders();
  const mine = all.filter((o) => o.user_id === auth.uid);
  return ok(mine);
});

// Body the CLIENT is allowed to send. Server fills the rest — price, status,
// timestamps — so the client can never set its own price or mark itself paid.
const PlaceOrder = z.object({
  vendor_id: z.number().int().positive(),
  type: z.enum(["Delivery", "Pickup"]),
  items: z
    .array(z.object({ item_id: z.number().int().positive(), qty: z.number().int().positive() }))
    .min(1),
});

// POST /api/app/user/orders — canonical write-through-backend path.
// The client proposes an order; the server validates, prices, and persists it.
// Firestore is written only here, with the Admin SDK.
export const POST = withAppAuth("user", async (auth, req) => {
  try {
    const body = PlaceOrder.parse(await parseJson(req));

    const vendor = await getVendor(body.vendor_id);
    if (!vendor) return badRequest(new Error("Unknown vendor"));
    if (vendor.status !== "approved" || !vendor.open) {
      return badRequest(new Error("Vendor not accepting orders"));
    }

    // TODO: look up each item, compute amount server-side from trusted prices,
    // and (ideally) wrap the write in a Firestore transaction for idempotency.
    const order = await addOrder({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      customer_name: auth.name ?? "Customer",
      customer_code: auth.uid.slice(0, 4),
      amount: 0, // computed server-side once item pricing is wired in
      items_count: body.items.reduce((n, i) => n + i.qty, 0),
      type: body.type,
      status: "Pending",
      time: "",
      day: "Mon",
      user_id: auth.uid,
    });

    return ok(order, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
