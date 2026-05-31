import { toggleVendor } from "@/lib/db/vendors";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return err("BAD_REQUEST", "Invalid id", 400);
  const result = await toggleVendor(n);
  if (!result) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
  return ok({ success: true, ...result });
}
