"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Order, Vendor } from "@/lib/schemas";

const STATUSES = [
  "Pending", "Accepted", "Preparing", "Out for delivery", "Completed", "Cancelled",
] as const;

const STATUS_TONE: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-600",
  Accepted: "bg-ocean-50 text-ocean-600",
  Preparing: "bg-rose-50 text-rose-600",
  "Out for delivery": "bg-orange-50 text-orange-600",
  Completed: "bg-leaf-100 text-leaf-800",
  Cancelled: "bg-sage-100 text-sage-600",
};

export function OrdersTable({
  initial,
  vendors,
}: {
  initial: Order[];
  vendors: Vendor[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");

  const filtered = useMemo(() => {
    return initial.filter((o) =>
      (filterStatus === "all" || o.status === filterStatus) &&
      (filterVendor === "all" || String(o.vendor_id) === filterVendor),
    );
  }, [initial, filterStatus, filterVendor]);

  function setStatus(id: number, status: string) {
    start(async () => {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  function simulate() {
    start(async () => {
      const res = await fetch(`/api/simulate-order`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-sage-100">
        <select className="input-pill" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-pill" value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
          <option value="all">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="ml-auto">
          <button className="btn-primary" onClick={simulate} disabled={pending}>
            {pending ? "…" : "+ Simulate order"}
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-sage-50/40">
          <tr className="text-left text-[11px] uppercase tracking-wider text-sage-600">
            <th className="px-5 py-3 font-bold">Order</th>
            <th className="px-5 py-3 font-bold">Vendor</th>
            <th className="px-5 py-3 font-bold">Customer</th>
            <th className="px-5 py-3 font-bold">Type</th>
            <th className="px-5 py-3 font-bold">Amount</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3 font-bold">Day</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sage-400">
                No orders match these filters
              </td>
            </tr>
          )}
          {filtered.map((o) => (
            <tr key={o.id} className="border-t border-sage-100/80">
              <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink-600">#{o.id}</td>
              <td className="px-5 py-3 text-[13.5px] font-semibold text-ink-600">{o.vendor_name}</td>
              <td className="px-5 py-3 text-[13px] text-sage-600">{o.customer_name}</td>
              <td className="px-5 py-3 text-[12.5px] text-sage-600">{o.type}</td>
              <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink-600">₹{o.amount}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${STATUS_TONE[o.status] ?? "bg-sage-100 text-sage-600"}`}>
                    {o.status}
                  </span>
                  <select
                    aria-label="Update status"
                    className="text-[11.5px] rounded-md border border-sage-200 bg-white px-1.5 py-0.5 text-sage-600"
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                    disabled={pending}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">{o.day}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
