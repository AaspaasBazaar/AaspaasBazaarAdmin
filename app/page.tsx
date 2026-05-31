import { listVendors } from "@/lib/db/vendors";
import { listOrders } from "@/lib/db/orders";
import { getWeeklyTotals } from "@/lib/db/weekly-totals";
import { storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-bazaar-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const [vendors, orders, weekly] = await Promise.all([
    listVendors(),
    listOrders({ limit: 10 }),
    getWeeklyTotals(),
  ]);

  const openVendors = vendors.filter((v) => v.open).length;
  const pending = orders.filter((o) => ["Pending", "Accepted"].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Storage mode: <span className="font-mono">{storageMode()}</span>
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Vendors" value={vendors.length} hint={`${openVendors} open`} />
        <Tile label="Recent orders" value={orders.length} hint={`${pending} need action`} />
        <Tile label="Weekly orders" value={Object.values(weekly).reduce((s, n) => s + n, 0)} />
        <Tile label="Storage" value={storageMode()} hint="Set FIREBASE_* envs to switch to Firestore" />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Latest orders</h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    No orders yet
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{o.id}</td>
                  <td className="px-3 py-2">{o.vendor_name}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2">₹{o.amount}</td>
                  <td className="px-3 py-2">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
