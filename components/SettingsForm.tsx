"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/schemas";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [radius, setRadius] = useState(String(initial.discovery_radius));
  const [fee, setFee] = useState(String(initial.default_delivery_fee));
  const [model, setModel] = useState<Settings["order_model"]>(initial.order_model);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const r = parseFloat(radius);
    const f = parseInt(fee, 10);
    if (!Number.isFinite(r) || r <= 0) return setError("Discovery radius must be a positive number");
    if (!Number.isFinite(f) || f < 0) return setError("Delivery fee must be 0 or more");
    start(async () => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discovery_radius: r, default_delivery_fee: f, order_model: model }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      setNotice("Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl">
      <div className="px-5 py-4 border-b border-sage-100">
        <h2 className="font-display text-[16px] font-bold text-ink-600">Marketplace</h2>
        <p className="text-[12px] text-sage-600 mt-0.5">How vendors are discovered and served</p>
      </div>

      <div className="p-5 space-y-4">
        <label className="grid grid-cols-3 items-center gap-3">
          <span className="text-[13px] text-sage-600 col-span-1">Discovery radius (km)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            className="input-pill col-span-2 font-mono"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
        </label>
        <label className="grid grid-cols-3 items-center gap-3">
          <span className="text-[13px] text-sage-600 col-span-1">Default delivery fee (₹)</span>
          <input
            type="number"
            step="1"
            min="0"
            className="input-pill col-span-2 font-mono"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        <label className="grid grid-cols-3 items-center gap-3">
          <span className="text-[13px] text-sage-600 col-span-1">Order model</span>
          <select
            className="input-pill col-span-2"
            value={model}
            onChange={(e) => setModel(e.target.value as Settings["order_model"])}
          >
            <option value="Pickup">Pickup</option>
            <option value="Delivery">Delivery</option>
            <option value="Pickup + Delivery">Pickup + Delivery</option>
          </select>
        </label>

        {error && <p className="text-[12.5px] text-ruby-600">{error}</p>}
        {notice && <p className="text-[12.5px] text-leaf-700">{notice}</p>}

        <div className="pt-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
