import { getAdmin, updateAdmin, deleteAdmin } from "@/lib/db/admins";
import { AdminPatch } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

function normalize(raw: string): string {
  return decodeURIComponent(raw).trim().toLowerCase();
}

export async function GET(_req: Request, ctx: { params: Promise<{ email: string }> }) {
  const { email } = await ctx.params;
  const admin = await getAdmin(normalize(email));
  if (!admin) return err("NOT_FOUND", "Admin not found", 404);
  return ok(admin);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ email: string }> }) {
  const { email } = await ctx.params;
  try {
    const body = await parseJson(req);
    const patch = AdminPatch.parse(body);
    const updated = await updateAdmin(normalize(email), patch);
    if (!updated) return err("NOT_FOUND", "Admin not found", 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ email: string }> }) {
  const { email } = await ctx.params;
  const id = normalize(email);
  const result = await deleteAdmin(id);
  if (result.ok) return ok({ success: true, email: id });
  if (result.code === "NOT_FOUND") return err("NOT_FOUND", "Admin not found", 404);
  return err("LAST_OWNER", "Cannot delete the last active owner", 400);
}
