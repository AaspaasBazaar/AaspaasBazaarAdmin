"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Admin, Zone } from "@/lib/schemas";

const ROLE_TONE: Record<string, string> = {
  owner: "bg-leaf-100 text-leaf-800",
  zonal_admin: "bg-aqua-50 text-aqua-400",
  admin: "bg-ocean-50 text-ocean-600",
  viewer: "bg-sage-100 text-sage-600",
};

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; original: Admin };

export function AdminsTable({ initial, zones }: { initial: Admin[]; zones: Zone[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  function toggle(email: string) {
    start(async () => {
      const res = await fetch(`/api/admins/${encodeURIComponent(email)}/toggle`, { method: "POST" });
      if (!res.ok) return alert(`Toggle failed (HTTP ${res.status})`);
      router.refresh();
    });
  }

  function remove(email: string) {
    if (!confirm(`Delete admin ${email}?`)) return;
    start(async () => {
      const res = await fetch(`/api/admins/${encodeURIComponent(email)}`, { method: "DELETE" });
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
        <h2 className="font-display text-[16px] font-bold text-ink-600">Allowlist</h2>
        <button
          className="ml-auto btn-primary"
          onClick={() => (mode.kind === "closed" ? setMode({ kind: "create" }) : setMode({ kind: "closed" }))}
          disabled={pending}
        >
          {mode.kind === "closed" ? "+ Add admin" : "Cancel"}
        </button>
      </div>

      {mode.kind !== "closed" && (
        <AdminForm
          mode={mode}
          zones={zones}
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
            <th className="px-5 py-3 font-bold">Email</th>
            <th className="px-5 py-3 font-bold">Name</th>
            <th className="px-5 py-3 font-bold">Role</th>
            <th className="px-5 py-3 font-bold">Zone</th>
            <th className="px-5 py-3 font-bold">Active</th>
            <th className="px-5 py-3 font-bold">Created</th>
            <th className="px-5 py-3 font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {initial.map((a) => (
            <tr key={a.email} className="border-t border-sage-100/80">
              <td className="px-5 py-3 font-mono text-[12.5px] text-ink-600">{a.email}</td>
              <td className="px-5 py-3 text-[13.5px] font-semibold text-ink-600">{a.name}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${ROLE_TONE[a.role] ?? "bg-sage-100 text-sage-600"}`}>
                  {a.role}
                </span>
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">
                {a.zone_id ?? <span className="text-sage-400">—</span>}
              </td>
              <td className="px-5 py-3">
                <button
                  onClick={() => toggle(a.email)}
                  disabled={pending}
                  className={`inline-flex h-[22px] w-[38px] items-center rounded-full p-0.5 transition-colors ${
                    a.active ? "justify-end bg-leaf-600" : "justify-start bg-sage-300"
                  }`}
                >
                  <span className="h-[18px] w-[18px] rounded-full bg-white" />
                </button>
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">
                {new Date(a.created_at).toISOString().slice(0, 10)}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setMode({ kind: "edit", original: a })}
                    disabled={pending}
                    title="Edit admin"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-sage-600 hover:bg-sage-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(a.email)}
                    disabled={pending}
                    title="Delete admin"
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

function AdminForm({
  mode,
  zones,
  onCancel,
  onSaved,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  zones: Zone[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit";
  const original = editing ? mode.original : null;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email] = useState(original?.email ?? "");
  const [emailNew, setEmailNew] = useState(original?.email ?? "");
  const [name, setName] = useState(original?.name ?? "");
  const [role, setRole] = useState<"owner" | "zonal_admin" | "admin" | "viewer">(original?.role ?? "admin");
  const [zoneId, setZoneId] = useState(original?.zone_id ?? "");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && (!emailNew || !name)) return setError("Email + name required");
    if (role === "zonal_admin" && !zoneId) return setError("Zonal admin requires a zone");
    start(async () => {
      let res: Response;
      const zoneField: Record<string, unknown> =
        role === "zonal_admin" ? { zone_id: zoneId } : { zone_id: undefined };
      if (editing) {
        const body: Record<string, unknown> = { name, role, ...zoneField };
        if (password) body.password = password;
        res = await fetch(`/api/admins/${encodeURIComponent(email)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const body: Record<string, unknown> = {
          email: emailNew,
          name,
          role,
          active: true,
          ...zoneField,
        };
        if (password) body.password = password;
        res = await fetch("/api/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
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
          <span className="text-[12px] font-semibold text-sage-600">
            Email {editing && <em className="text-sage-400 not-italic">(immutable)</em>}
          </span>
          <input
            type="email"
            className="input-pill w-full mt-1 font-mono disabled:opacity-60"
            placeholder="person@example.com"
            value={editing ? email : emailNew}
            onChange={(e) => setEmailNew(e.target.value)}
            disabled={editing}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Name</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Role</span>
          <select
            className="input-pill w-full mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="owner">owner</option>
            <option value="zonal_admin">zonal_admin</option>
            <option value="admin">admin</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        {role === "zonal_admin" && (
          <label className="block">
            <span className="text-[12px] font-semibold text-sage-600">Zone</span>
            <select
              className="input-pill w-full mt-1 font-mono"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">— pick a zone —</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
              ))}
            </select>
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className="text-[12px] font-semibold text-sage-600">
            {editing ? "New password (leave blank to keep current)" : "Initial password (optional)"}
          </span>
          <input
            type="password"
            className="input-pill w-full mt-1"
            placeholder="Min 8 chars"
            value={password}
            minLength={password ? 8 : 0}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>
      {error && <p className="text-[12px] text-ruby-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update admin" : "Save admin"}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
