import { z } from "zod";
import { rejectVendor, getVendor } from "@/lib/db/vendors";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";
import { assertZoneAccess, zoneScopeFor } from "@/lib/auth-scope";

export const dynamic = "force-dynamic";

const Body = z.object({ reason: z.string().min(3).max(500) });

export const POST = withAuth(["owner", "zonal_admin"], async (session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return err("BAD_REQUEST", "Invalid id", 400);
  const v = await getVendor(n);
  if (!v) return err("NOT_FOUND", `Vendor ${n} not found`, 404);

  const scopeZone = await zoneScopeFor(session);
  const access = assertZoneAccess(session, scopeZone, v);
  if (!access.ok) return err("FORBIDDEN", access.reason, 403);

  try {
    const body = await parseJson(req);
    const { reason } = Body.parse(body);
    const updated = await rejectVendor(n, session.email, reason);
    return ok({ success: true, vendor: updated });
  } catch (e) {
    return badRequest(e);
  }
});
