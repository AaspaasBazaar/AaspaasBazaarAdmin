import { backendFetch } from "@/lib/backend";
import type { Order, Vendor, WeeklyTotals } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { WeeklyChart } from "@/components/WeeklyChart";
import { LiveFeed } from "@/components/LiveFeed";
import { SimulateButton } from "@/components/SimulateButton";

export const dynamic = "force-dynamic";

type Stats = { weekly_totals: WeeklyTotals };

export default async function Dashboard() {
  const [vendors, orders, stats] = await Promise.all([
    backendFetch<Vendor[]>("/api/admin/vendors"),
    backendFetch<Order[]>("/api/admin/orders"),
    backendFetch<Stats>("/api/admin/stats"),
  ]);
  const weekly = stats.weekly_totals;

  const openVendors = vendors.filter((v) => v.open).length;
  const ordersThisWeek = Object.values(weekly).reduce((s, n) => s + n, 0);
  const revenueAll = orders.reduce((s, o) => s + o.amount, 0);
  const revenueLakh = (revenueAll / 100000).toFixed(2);
  const pending = orders.filter((o) => ["Pending", "Accepted"].includes(o.status)).length;
  const feed = orders.slice(0, 4);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Live overview of your local marketplace" />
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div className="flex justify-end">
          <SimulateButton />
        </div>
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Orders today" value={ordersThisWeek} tone="leaf" delta="12.4%" />
          <StatCard
            label="Active vendors"
            value={openVendors}
            tone="ocean"
            delta={`${Math.max(0, vendors.length - 8)} new`}
          />
          <StatCard label="Revenue today" value={`₹${revenueLakh}L`} tone="amber" delta="8.1%" />
          <StatCard
            label="Pending action"
            value={pending}
            tone="orange"
            delta="3 waiting"
            deltaDirection="down"
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <WeeklyChart totals={weekly} />
          </div>
          <LiveFeed orders={feed} />
        </section>
      </div>
    </>
  );
}
