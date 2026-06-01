import { listVendors, addVendor } from "@/lib/db/vendors";
import { VendorCreate, VendorStatus } from "@/lib/schemas";
import { ok, badRequest, parseJson, err } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";
import { zoneScopeFor } from "@/lib/auth-scope";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async (session, req: Request) => {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? undefined;
  const status = statusParam ? VendorStatus.parse(statusParam) : undefined;

  const scopeZone = await zoneScopeFor(session);
  const zoneParam = url.searchParams.get("zone_id") ?? undefined;
  const zone_id = scopeZone ?? zoneParam;

  return ok(await listVendors({ zone_id, status }));
});

export const POST = withAuth(["owner", "zonal_admin", "admin"], async (session, req: Request) => {
  try {
    const body = await parseJson(req);
    const payload = VendorCreate.parse(body);

    // zonal_admin must create vendors in their own zone
    if (session.role === "zonal_admin") {
      const scopeZone = await zoneScopeFor(session);
      if (!scopeZone) return err("FORBIDDEN", "Zonal admin has no zone assigned", 403);
      if (payload.zone_id && payload.zone_id !== scopeZone) {
        return err("FORBIDDEN", "Cannot create vendors outside your zone", 403);
      }
      payload.zone_id = scopeZone;
    }

    const vendor = await addVendor(payload);
    return ok(vendor, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
