"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Vendor, Item, Order } from "@/lib/schemas";

type SearchResults = {
  query: string;
  total_results: number;
  results: { vendors: Vendor[]; items: Item[]; orders: Order[] };
};

type FlatHit =
  | { kind: "vendor"; href: string; primary: string; secondary: string; right?: string }
  | { kind: "item"; href: string; primary: string; secondary: string; right?: string }
  | { kind: "order"; href: string; primary: string; secondary: string; right?: string };

function flatten(r: SearchResults | null): FlatHit[] {
  if (!r) return [];
  const out: FlatHit[] = [];
  for (const v of r.results.vendors) {
    out.push({
      kind: "vendor",
      href: "/vendors",
      primary: v.name,
      secondary: `${v.categories.join(", ") || "—"} · ${v.address || ""}`,
      right: `★ ${v.rating.toFixed(1)}`,
    });
  }
  for (const i of r.results.items) {
    out.push({
      kind: "item",
      href: "/items",
      primary: i.name,
      secondary: `${i.vendor_name} · ${i.category}`,
      right: `₹${i.price}`,
    });
  }
  for (const o of r.results.orders) {
    out.push({
      kind: "order",
      href: "/orders",
      primary: `Order #${o.id}`,
      secondary: `${o.vendor_name} → ${o.customer_name}`,
      right: `₹${o.amount}`,
    });
  }
  return out;
}

const KIND_LABEL: Record<FlatHit["kind"], string> = {
  vendor: "Vendor",
  item: "Item",
  order: "Order",
};
const KIND_TONE: Record<FlatHit["kind"], string> = {
  vendor: "bg-leaf-50 text-leaf-700",
  item: "bg-ocean-50 text-ocean-600",
  order: "bg-orange-50 text-orange-600",
};

export function SearchPalette() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl + K → focus input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
        else setResults(null);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const hits = useMemo(() => flatten(results), [results]);
  useEffect(() => setActiveIdx(0), [hits.length, query]);

  function go(hit: FlatHit) {
    router.push(hit.href);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const hit = hits[activeIdx];
      if (hit) go(hit);
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        className="input-pill w-[280px] pl-9 pr-12"
        placeholder="Search vendors, orders, items…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-6 items-center rounded-md border border-sage-200 bg-white px-1.5 font-mono text-[10px] text-sage-600">
        ⌘K
      </kbd>

      {showDropdown && (
        <div className="absolute right-0 top-[44px] z-50 w-[420px] max-h-[460px] overflow-auto card p-2">
          {loading && (
            <div className="px-3 py-2 text-[12px] text-sage-600">Searching…</div>
          )}
          {!loading && hits.length === 0 && (
            <div className="px-3 py-6 text-center text-sage-400 text-[13px]">
              No matches for "{query}"
            </div>
          )}
          {!loading &&
            hits.map((hit, idx) => (
              <button
                key={`${hit.kind}-${idx}-${hit.primary}`}
                onClick={() => go(hit)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full text-left flex items-center gap-3 rounded-[8px] px-3 py-2 ${
                  idx === activeIdx ? "bg-sage-50" : "bg-white"
                }`}
              >
                <span
                  className={`inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold ${KIND_TONE[hit.kind]}`}
                >
                  {KIND_LABEL[hit.kind]}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-ink-600 truncate">
                    {hit.primary}
                  </span>
                  <span className="block text-[11.5px] text-sage-600 truncate">
                    {hit.secondary}
                  </span>
                </span>
                {hit.right && (
                  <span className="font-mono text-[12px] text-ink-600">{hit.right}</span>
                )}
              </button>
            ))}
          {results && results.total_results > hits.length && (
            <div className="px-3 py-2 text-[11px] text-sage-600 border-t border-sage-100">
              Showing top {hits.length} of {results.total_results} matches.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
