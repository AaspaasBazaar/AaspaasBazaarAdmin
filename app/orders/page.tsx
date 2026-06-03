import { backendFetch } from "@/lib/backend";
import type { Order, Vendor } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { OrdersTable } from "@/components/OrdersTable";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, vendors] = await Promise.all([
    backendFetch<Order[]>("/api/admin/orders?limit=200"),
    backendFetch<Vendor[]>("/api/admin/vendors"),
  ]);
  return (
    <>
      <Topbar title="Orders" subtitle="All orders across vendors, newest first" />
      <div className="flex-1 overflow-auto p-8">
        <OrdersTable initial={orders} vendors={vendors} />
      </div>
    </>
  );
}
