"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Item, Vendor, Category } from "@/lib/schemas";
import { CategoryBadge } from "@/components/CategoryBadge";

const STATUS_OPTIONS = ["In stock", "Low stock", "Out of stock"] as const;

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; original: Item };

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "In stock" ? "bg-leaf-100 text-leaf-800"
      : status === "Low stock" ? "bg-amber-50 text-amber-600"
        : "bg-orange-50 text-orange-600";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function ItemsTable({
  initial,
  vendors,
  categories,
}: {
  initial: Item[];
  vendors: Vendor[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return initial.filter((i) =>
      (filterVendor === "all" || String(i.vendor_id) === filterVendor) &&
      (filterCategory === "all" || i.category === filterCategory) &&
      (filterStatus === "all" || i.status === filterStatus),
    );
  }, [initial, filterVendor, filterCategory, filterStatus]);

  function remove(id: number, name: string) {
    if (!confirm(`Delete item "${name}"?`)) return;
    start(async () => {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) return alert(`Delete failed (HTTP ${res.status})`);
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-sage-100">
        <select className="input-pill" value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
          <option value="all">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select className="input-pill" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select className="input-pill" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="ml-auto">
          <button
            className="btn-primary"
            onClick={() => (mode.kind === "closed" ? setMode({ kind: "create" }) : setMode({ kind: "closed" }))}
            disabled={pending}
          >
            {mode.kind === "closed" ? "+ Add item" : "Cancel"}
          </button>
        </div>
      </div>

      {mode.kind !== "closed" && (
        <ItemForm
          mode={mode}
          vendors={vendors}
          categories={categories}
          onCancel={() => setMode({ kind: "closed" })}
          onSaved={() => {
            setMode({ kind: "closed" });
            router.refresh();
          }}
        />
      )}

      <table className="w-full text-sm">
        <thead className="bg-sage-50/40">
          <tr className="text-left text-[11px] uppercase tracking-wider text-sage-600">
            <th className="px-5 py-3 font-bold">ID</th>
            <th className="px-5 py-3 font-bold">Item</th>
            <th className="px-5 py-3 font-bold">Vendor</th>
            <th className="px-5 py-3 font-bold">Category</th>
            <th className="px-5 py-3 font-bold">Price</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3 font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sage-400">
                No items match these filters
              </td>
            </tr>
          )}
          {filtered.map((it) => (
            <tr key={it.id} className="border-t border-sage-100/80">
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">#{it.id}</td>
              <td className="px-5 py-3 text-[13.5px] font-semibold text-ink-600">{it.name}</td>
              <td className="px-5 py-3 text-[13px] text-sage-600">{it.vendor_name}</td>
              <td className="px-5 py-3"><CategoryBadge name={it.category} /></td>
              <td className="px-5 py-3 font-mono text-[13px] text-ink-600">
                ₹{it.price} <span className="text-sage-600">/ {it.unit}</span>
              </td>
              <td className="px-5 py-3"><StatusPill status={it.status} /></td>
              <td className="px-5 py-3 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={() => setMode({ kind: "edit", original: it })}
                    title="Edit item"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-sage-600 hover:bg-sage-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(it.id, it.name)}
                    disabled={pending}
                    title="Delete item"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-ruby-600 hover:bg-orange-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemForm({
  mode,
  vendors,
  categories,
  onCancel,
  onSaved,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  vendors: Vendor[];
  categories: Category[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit";
  const original = editing ? mode.original : null;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(original?.name ?? "");
  const [vendorId, setVendorId] = useState<string>(String(original?.vendor_id ?? vendors[0]?.id ?? ""));
  const [category, setCategory] = useState(original?.category ?? categories[0]?.name ?? "");
  const [price, setPrice] = useState(String(original?.price ?? "0"));
  const [unit, setUnit] = useState(original?.unit ?? "per kg");
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>(
    (original?.status as typeof STATUS_OPTIONS[number]) ?? "In stock",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name) return setError("Name is required");
    const p = parseFloat(price);
    if (!Number.isFinite(p) || p < 0) return setError("Price must be 0 or more");
    const vId = parseInt(vendorId, 10);
    if (!Number.isInteger(vId) || vId <= 0) return setError("Pick a vendor");
    start(async () => {
      const body = { name, vendor_id: vId, category, price: p, unit, status };
      const res = editing
        ? await fetch(`/api/items/${original!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={submit} className="px-5 py-4 border-b border-sage-100 bg-sage-50/40 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <span className="text-[12px] font-semibold text-sage-600">Item name</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="Green capsicum"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Status</span>
          <select
            className="input-pill w-full mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof STATUS_OPTIONS[number])}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Vendor</span>
          <select
            className="input-pill w-full mt-1"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Category</span>
          <select
            className="input-pill w-full mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Unit</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="per kg"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
      </div>
      <label className="block max-w-[200px]">
        <span className="text-[12px] font-semibold text-sage-600">Price (₹)</span>
        <input
          type="number"
          min="0"
          step="1"
          className="input-pill w-full mt-1 font-mono"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      {error && <p className="text-[12px] text-ruby-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update item" : "Save item"}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
