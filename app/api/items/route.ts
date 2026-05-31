import { listItems } from "@/lib/db/items";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const vendorIdRaw = url.searchParams.get("vendor_id");
  const vendor_id = vendorIdRaw && /^\d+$/.test(vendorIdRaw) ? Number(vendorIdRaw) : undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  return ok(await listItems({ vendor_id, category, status }));
}
