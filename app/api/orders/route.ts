import { listOrders } from "@/lib/db/orders";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const vendorIdRaw = url.searchParams.get("vendor_id");
  const vendor_id = vendorIdRaw && /^\d+$/.test(vendorIdRaw) ? Number(vendorIdRaw) : undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(Number(limitRaw), 200) : undefined;
  return ok(await listOrders({ status, vendor_id, limit }));
}
