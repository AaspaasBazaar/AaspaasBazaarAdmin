import { toggleAdmin } from "@/lib/db/admins";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ email: string }> }) {
  const { email } = await ctx.params;
  const id = decodeURIComponent(email).trim().toLowerCase();
  const result = await toggleAdmin(id);
  if (!result) return err("NOT_FOUND", "Admin not found", 404);
  return ok({ success: true, ...result });
}
