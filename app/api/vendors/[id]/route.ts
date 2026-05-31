import { deleteVendor, getVendor } from "@/lib/db/vendors";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const v = await getVendor(n);
  if (!v) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
  return ok(v);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const result = await deleteVendor(n);
  if (!result) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
  return ok({ deleted: { vendor_id: n, items_removed: result.items_removed } });
}
