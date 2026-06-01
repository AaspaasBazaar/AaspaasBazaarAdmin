import { listItems, addItem } from "@/lib/db/items";
import { ItemCreate } from "@/lib/schemas";
import { ok, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async (_session, req: Request) => {
  const url = new URL(req.url);
  const vendorIdRaw = url.searchParams.get("vendor_id");
  const vendor_id = vendorIdRaw && /^\d+$/.test(vendorIdRaw) ? Number(vendorIdRaw) : undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  return ok(await listItems({ vendor_id, category, status }));
});

export const POST = withAuth(["owner", "admin"], async (_session, req: Request) => {
  try {
    const body = await parseJson(req);
    const payload = ItemCreate.parse(body);
    const item = await addItem(payload);
    return ok(item, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
