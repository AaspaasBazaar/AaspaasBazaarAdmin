"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Zone, Admin } from "@/lib/schemas";

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; original: Zone };

export function ZonesPanel({ initial, admins }: { initial: Zone[]; admins: Admin[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  function remove(id: string) {
    if (!confirm(`Delete zone "${id}"?`)) return;
    start(async () => {
      const res = await fetch(`/api/zones/${encodeURIComponent(id)}`, { method: "DELETE" });
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
      <div className="flex items-center px-5 py-4 border-b border-sage-100">
        <h2 className="font-display text-[16px] font-bold text-ink-600">Zones</h2>
        <button
          className="ml-auto btn-primary"
          onClick={() => (mode.kind === "closed" ? setMode({ kind: "create" }) : setMode({ kind: "closed" }))}
          disabled={pending}
        >
          {mode.kind === "closed" ? "+ Add zone" : "Cancel"}
        </button>
      </div>

      {mode.kind !== "closed" && (
        <ZoneForm
          mode={mode}
          admins={admins}
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
            <th className="px-5 py-3 font-bold">Zone</th>
            <th className="px-5 py-3 font-bold">City</th>
            <th className="px-5 py-3 font-bold">Pincodes</th>
            <th className="px-5 py-3 font-bold">Zonal admin</th>
            <th className="px-5 py-3 font-bold">Active</th>
            <th className="px-5 py-3 font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-sage-400">
                No zones yet
              </td>
            </tr>
          )}
          {initial.map((z) => (
            <tr key={z.id} className="border-t border-sage-100/80">
              <td className="px-5 py-3">
                <div className="leading-tight">
                  <div className="text-[13.5px] font-semibold text-ink-600">{z.name}</div>
                  <div className="font-mono text-[12px] text-sage-600">{z.id}</div>
                </div>
              </td>
              <td className="px-5 py-3 text-[13px] text-sage-600">{z.city}</td>
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">
                {z.pincodes.join(", ")}
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-ink-600">
                {z.zonal_admin_email ?? <span className="text-sage-400">unassigned</span>}
              </td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${
                  z.active ? "bg-leaf-100 text-leaf-800" : "bg-sage-100 text-sage-600"
                }`}>
                  {z.active ? "active" : "inactive"}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={() => setMode({ kind: "edit", original: z })}
                    title="Edit zone"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-sage-600 hover:bg-sage-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(z.id)}
                    disabled={pending}
                    title="Delete zone"
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

function ZoneForm({
  mode,
  admins,
  onCancel,
  onSaved,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  admins: Admin[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit";
  const original = editing ? mode.original : null;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState(original?.id ?? "");
  const [name, setName] = useState(original?.name ?? "");
  const [city, setCity] = useState(original?.city ?? "Kolkata");
  const [pincodes, setPincodes] = useState(original?.pincodes.join(", ") ?? "");
  const [zonalAdmin, setZonalAdmin] = useState(original?.zonal_admin_email ?? "");
  const [active, setActive] = useState(original?.active ?? true);

  const zonalCandidates = admins.filter((a) => a.role === "zonal_admin" || a.role === "owner");

  function autoSlug(v: string) {
    setName(v);
    if (!editing) {
      setZoneId(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pins = pincodes.split(",").map((p) => p.trim()).filter(Boolean);
    if (!pins.length) return setError("Enter at least one pincode");
    if (pins.some((p) => !/^\d{6}$/.test(p))) return setError("Each pincode must be 6 digits");
    start(async () => {
      const body: Record<string, unknown> = { name, city, pincodes: pins, active };
      if (zonalAdmin) body.zonal_admin_email = zonalAdmin;
      const res = editing
        ? await fetch(`/api/zones/${encodeURIComponent(original!.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/zones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, id: zoneId }),
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
          <span className="text-[12px] font-semibold text-sage-600">Zone name</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="New Town · Action Area I"
            value={name}
            onChange={(e) => autoSlug(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">
            ID {editing && <em className="text-sage-400 not-italic">(immutable)</em>}
          </span>
          <input
            className="input-pill w-full mt-1 font-mono disabled:opacity-60"
            placeholder="newtown-aa1"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            disabled={editing}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">City</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="Kolkata"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Pincodes (comma-separated)</span>
          <input
            className="input-pill w-full mt-1 font-mono"
            placeholder="700156, 700157"
            value={pincodes}
            onChange={(e) => setPincodes(e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Zonal admin email</span>
          <select
            className="input-pill w-full mt-1 font-mono"
            value={zonalAdmin}
            onChange={(e) => setZonalAdmin(e.target.value)}
          >
            <option value="">— unassigned —</option>
            {zonalCandidates.map((a) => (
              <option key={a.email} value={a.email}>
                {a.email} ({a.role})
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] text-sage-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
      {error && <p className="text-[12px] text-ruby-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update zone" : "Save zone"}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
