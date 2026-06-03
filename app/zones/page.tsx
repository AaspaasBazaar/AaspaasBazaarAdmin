import { backendFetch } from "@/lib/backend";
import type { Zone, Admin } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { ZonesPanel } from "@/components/ZonesPanel";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const [zones, admins] = await Promise.all([
    backendFetch<Zone[]>("/api/admin/zones"),
    backendFetch<Admin[]>("/api/admin/admins"),
  ]);
  return (
    <>
      <Topbar title="Zones" subtitle="Geographic groups of pincodes; each zone has its zonal admin" />
      <div className="flex-1 overflow-auto p-8">
        <ZonesPanel initial={zones} admins={admins} />
      </div>
    </>
  );
}
