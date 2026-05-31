import { listOrders } from "@/lib/db/orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await listOrders({ limit: 100 });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Orders</h1>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Day</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{o.id}</td>
                <td className="px-3 py-2">{o.vendor_name}</td>
                <td className="px-3 py-2">{o.customer_name}</td>
                <td className="px-3 py-2">{o.type}</td>
                <td className="px-3 py-2">₹{o.amount}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.day}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
