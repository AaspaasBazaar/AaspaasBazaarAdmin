import { backendFetch } from "@/lib/backend";
import type { Vendor, Category, Zone } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { VendorsTable } from "@/components/VendorsTable";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [vendors, categories, zones] = await Promise.all([
    backendFetch<Vendor[]>("/api/admin/vendors"),
    backendFetch<Category[]>("/api/admin/categories"),
    backendFetch<Zone[]>("/api/admin/zones"),
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
