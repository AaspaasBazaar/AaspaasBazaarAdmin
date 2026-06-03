import { backendFetch } from "@/lib/backend";
import type { Admin, Zone } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { AdminsTable } from "@/components/AdminsTable";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const [admins, zones] = await Promise.all([
    backendFetch<Admin[]>("/api/admin/admins"),
    backendFetch<Zone[]>("/api/admin/zones"),
  ]);
  return (
    <>
      <Topbar title="Admins" subtitle="Who can sign in to the console" />
      <div className="flex-1 overflow-auto p-8">
        <AdminsTable initial={admins} zones={zones} />
      </div>
    </>
  );
}
