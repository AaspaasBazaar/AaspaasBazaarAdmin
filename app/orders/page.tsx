import { listOrders } from "@/lib/db/orders";
import { listVendors } from "@/lib/db/vendors";
import { Topbar } from "@/components/Topbar";
import { OrdersTable } from "@/components/OrdersTable";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, vendors] = await Promise.all([
    listOrders({ limit: 200 }),
    listVendors(),
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
