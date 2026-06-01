import { getAdmin } from "@/lib/db/admins";
import type { SessionPayload } from "@/lib/session";
import type { Vendor } from "@/lib/schemas";

/**
 * Returns the zone_id a session is restricted to, or undefined if unscoped.
 * Owner + plain admin + viewer = unscoped (see all zones).
 * zonal_admin = restricted to their assigned zone_id.
 */
export async function zoneScopeFor(session: SessionPayload): Promise<string | undefined> {
  if (session.role !== "zonal_admin") return undefined;
  const a = await getAdmin(session.email);
  return a?.zone_id;
}

/**
 * Throws (caller converts to 403) if the session may not act on `vendor`.
 * Zonal admin: vendor must be in their zone.
 * Everyone else: allowed.
 */
export function assertZoneAccess(
  session: SessionPayload,
  scopedZoneId: string | undefined,
  vendor: Vendor,
): { ok: true } | { ok: false; reason: string } {
  if (session.role !== "zonal_admin") return { ok: true };
  if (!scopedZoneId) return { ok: false, reason: "Zonal admin has no zone assigned" };
  if (vendor.zone_id !== scopedZoneId) return { ok: false, reason: "Vendor outside your zone" };
  return { ok: true };
}
