import { listAdmins } from "@/lib/db/admins";
import { listZones } from "@/lib/db/zones";
import { Topbar } from "@/components/Topbar";
import { AdminsTable } from "@/components/AdminsTable";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const [admins, zones] = await Promise.all([listAdmins(), listZones()]);
  return (
    <>
      <Topbar title="Admins" subtitle="Who can sign in to the console" />
      <div className="flex-1 overflow-auto p-8">
        <AdminsTable initial={admins} zones={zones} />
      </div>
    </>
  );
}
