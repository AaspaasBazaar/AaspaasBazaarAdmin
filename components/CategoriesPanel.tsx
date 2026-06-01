"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/schemas";

const PRESET_COLORS = [
  "#2E9E4F", "#F0682E", "#4FA3C7", "#C98A11", "#3B6FB0",
  "#C5453B", "#2BB3A3", "#E26FA0", "#1B8A5A", "#6E8A7A",
];

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; original: Category };

export function CategoriesPanel({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  function openCreate() {
    setMode({ kind: "create" });
  }
  function openEdit(c: Category) {
    setMode({ kind: "edit", original: c });
  }
  function close() {
    setMode({ kind: "closed" });
  }

  function remove(slug: string) {
    if (!confirm(`Delete category "${slug}"?`)) return;
    start(async () => {
      const res = await fetch(`/api/categories/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center px-5 py-4 border-b border-sage-100">
          <h2 className="font-display text-[16px] font-bold text-ink-600">Categories</h2>
          <button
            className="ml-auto btn-primary"
            onClick={() => (mode.kind === "closed" ? openCreate() : close())}
            disabled={pending}
          >
            {mode.kind === "closed" ? "+ Add category" : "Cancel"}
          </button>
        </div>

        {mode.kind !== "closed" && (
          <CategoryForm
            mode={mode}
            onCancel={close}
            onSaved={() => {
              close();
              router.refresh();
            }}
          />
        )}

        <table className="w-full text-sm">
          <thead className="bg-sage-50/40">
            <tr className="text-left text-[11px] uppercase tracking-wider text-sage-600">
              <th className="px-5 py-3 font-bold">Category</th>
              <th className="px-5 py-3 font-bold">Slug</th>
              <th className="px-5 py-3 font-bold">Vendors</th>
              <th className="px-5 py-3 font-bold">Created</th>
              <th className="px-5 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sage-400">
                  No categories yet
                </td>
              </tr>
            )}
            {initial.map((c) => (
              <tr key={c.slug} className="border-t border-sage-100/80">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md" style={{ background: c.color }} />
                    <span className="text-[13.5px] font-semibold text-ink-600">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-[12.5px] text-sage-600">{c.slug}</td>
                <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink-600">{c.vendor_count}</td>
                <td className="px-5 py-3 font-mono text-[12px] text-sage-600">
                  {new Date(c.created_at).toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(c)}
                      disabled={pending}
                      title="Edit category"
                      className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-sage-600 hover:bg-sage-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => remove(c.slug)}
                      disabled={pending}
                      title="Delete category"
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
    </div>
  );
}

function CategoryForm({
  mode,
  onCancel,
  onSaved,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit";
  const original = editing ? mode.original : null;
  const [pending, start] = useTransition();
  const [name, setName] = useState(original?.name ?? "");
  const [slug, setSlug] = useState(original?.slug ?? "");
  const [color, setColor] = useState(original?.color ?? PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  function autoSlug(v: string) {
    setName(v);
    if (!editing) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = editing
        ? await fetch(`/api/categories/${encodeURIComponent(original!.slug)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
          })
        : await fetch(`/api/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug, color }),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Name</span>
          <input
            className="input-pill w-full mt-1"
            placeholder="Vegetables"
            value={name}
            onChange={(e) => autoSlug(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">
            Slug {editing && <em className="text-sage-400 not-italic">(immutable)</em>}
          </span>
          <input
            className="input-pill w-full mt-1 font-mono disabled:opacity-60"
            placeholder="vegetables"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={editing}
          />
        </label>
      </div>
      <div>
        <span className="text-[12px] font-semibold text-sage-600">Color</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-md border-2 ${
                color === c ? "border-ink-600" : "border-transparent"
              }`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
      {error && <p className="text-[12px] text-ruby-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending || !name || !slug}>
          {pending ? "Saving…" : editing ? "Update category" : "Save category"}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
