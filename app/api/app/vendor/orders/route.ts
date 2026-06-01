import { ok } from "@/lib/api";
import { withAppAuth } from "@/lib/auth-token";
import { listOrders } from "@/lib/db/orders";

export const dynamic = "force-dynamic";

// GET /api/app/vendor/orders — orders for the signed-in vendor only.
// The vendor's numeric id is expected on the Firebase custom claim `vendor_id`
// (set at vendor signup alongside role:"vendor"). The client cannot ask for
// another vendor's orders — the scope is derived from the verified token.
export const GET = withAppAuth("vendor", async (auth) => {
  const vendorId = auth.vendor_id as number | undefined;
  if (typeof vendorId !== "number") return ok([]);
  const orders = await listOrders({ vendor_id: vendorId });
  return ok(orders);
});
