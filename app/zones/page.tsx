import { listZones } from "@/lib/db/zones";
import { listAdmins } from "@/lib/db/admins";
import { Topbar } from "@/components/Topbar";
import { ZonesPanel } from "@/components/ZonesPanel";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const [zones, admins] = await Promise.all([listZones(), listAdmins()]);
  return (
    <>
      <Topbar title="Zones" subtitle="Geographic groups of pincodes; each zone has its zonal admin" />
      <div className="flex-1 overflow-auto p-8">
        <ZonesPanel initial={zones} admins={admins} />
      </div>
    </>
  );
}
