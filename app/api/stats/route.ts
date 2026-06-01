import { listVendors } from "@/lib/db/vendors";
import { listOrders } from "@/lib/db/orders";
import { getWeeklyTotals } from "@/lib/db/weekly-totals";
import { storageMode } from "@/lib/storage";
import { ok } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async () => {
  const [vendors, orders, weekly] = await Promise.all([
    listVendors(),
    listOrders(),
    getWeeklyTotals(),
  ]);

  const activeVendors = vendors.filter((v) => v.open).length;

  // Match Flask's display semantics: anchor on a Figma baseline + live additions
  const baseOrdersToday = 148;
  const baseRevenueToday = 240000;
  const additionalOrders = Math.max(0, orders.length - 4);
  const ordersToday = baseOrdersToday + additionalOrders;
  const additionalRevenue =
    orders.length > 4 ? orders.slice(0, orders.length - 4).reduce((s, o) => s + o.amount, 0) : 0;
  const revenueVal = (baseRevenueToday + additionalRevenue) / 100000;
  const revenueDisplay =
    revenueVal >= 1 ? `₹${Math.round(revenueVal * 100) / 100}L` : `₹${baseRevenueToday + additionalRevenue}`;

  const pendingAction = orders.filter((o) => ["Pending", "Accepted"].includes(o.status)).length;

  return ok({
    orders_today: ordersToday,
    orders_today_change: "▲ 12.4%",
    active_vendors: activeVendors,
    active_vendors_change: `▲ ${Math.max(0, vendors.length - 8)} new`,
    revenue_today: revenueDisplay,
    revenue_today_change: "▲ 8.1%",
    pending_action: pendingAction,
    pending_action_change: "▼ 3 waiting",
    weekly_totals: weekly,
    storage_mode: storageMode() === "firestore" ? "Firestore (Online)" : "Local Database (JSON)",
  });
});
