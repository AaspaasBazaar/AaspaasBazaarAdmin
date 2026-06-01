import { listVendors } from "@/lib/db/vendors";
import { listCategories } from "@/lib/db/categories";
import { listZones } from "@/lib/db/zones";
import { Topbar } from "@/components/Topbar";
import { VendorsTable } from "@/components/VendorsTable";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [vendors, categories, zones] = await Promise.all([
    listVendors(),
    listCategories(),
    listZones(),
  ]);
  return (
    <>
      <Topbar title="Vendors" subtitle="Onboard, approve and manage local shops in your geofence" />
      <div className="flex-1 overflow-auto p-8">
        <VendorsTable initial={vendors} categories={categories} zones={zones} />
      </div>
    </>
  );
}
