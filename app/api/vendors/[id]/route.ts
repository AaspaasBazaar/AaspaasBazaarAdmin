import { deleteVendor, getVendor, updateVendor } from "@/lib/db/vendors";
import { VendorPatch } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";
import { assertZoneAccess, zoneScopeFor } from "@/lib/auth-scope";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET = withAuth(undefined, async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const v = await getVendor(n);
  if (!v) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
  return ok(v);
});

export const PATCH = withAuth(["owner", "zonal_admin", "admin"], async (session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const cur = await getVendor(n);
  if (!cur) return err("NOT_FOUND", `Vendor ${n} not found`, 404);

  const scopeZone = await zoneScopeFor(session);
  const access = assertZoneAccess(session, scopeZone, cur);
  if (!access.ok) return err("FORBIDDEN", access.reason, 403);

  try {
    const body = await parseJson(req);
    const patch = VendorPatch.parse(body);

    // Disallow status / approval fields via PATCH — must use /approve, /reject, /suspend
    delete (patch as Record<string, unknown>).status;
    delete (patch as Record<string, unknown>).approved_by;
    delete (patch as Record<string, unknown>).approved_at;
    delete (patch as Record<string, unknown>).rejection_reason;

    // Zonal admin cannot move vendor out of their zone
    if (session.role === "zonal_admin" && patch.zone_id && patch.zone_id !== scopeZone) {
      return err("FORBIDDEN", "Cannot reassign vendor to another zone", 403);
    }

    const updated = await updateVendor(n, patch);
    if (!updated) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});

export const DELETE = withAuth(["owner"], async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const result = await deleteVendor(n);
  if (!result) return err("NOT_FOUND", `Vendor ${n} not found`, 404);
  return ok({ deleted: { vendor_id: n, items_removed: result.items_removed } });
});
