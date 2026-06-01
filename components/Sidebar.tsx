"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

type Item = { href: string; label: string; badge?: number };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/orders", label: "Orders", badge: 7 },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/vendors", label: "Vendors" },
      { href: "/categories", label: "Categories" },
      { href: "/items", label: "Items" },
    ],
  },
  {
    title: "People & Config",
    items: [
      { href: "/admins", label: "Admins" },
      { href: "/zones", label: "Zones" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

function isActive(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(href + "/");
}

function NavRow({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative mx-3 mb-1 flex h-10 items-center rounded-[10px] px-4 transition-colors ${
        active ? "bg-ink-500 text-white" : "text-sage-400 hover:bg-ink-500/40 hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-leaf-400" />
      )}
      <span
        className={`mr-3 inline-block h-2 w-2 rounded-full ${active ? "bg-white" : "bg-sage-400"}`}
      />
      <span className="text-[14.5px] font-medium">{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto inline-flex h-5 min-w-[28px] items-center justify-center rounded-full bg-leaf-400 px-2 font-mono text-[11px] font-bold text-ink-900">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [pending, start] = useTransition();
  function logout() {
    start(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }
  return (
    <aside className="w-64 shrink-0 bg-ink-800 text-white flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-[11px] bg-leaf-600 grid place-items-center font-display text-[18px] font-extrabold">
          A
        </div>
        <div className="leading-tight">
          <div className="font-display text-[18px] font-extrabold">AaspaasBazaar</div>
          <div className="text-[10px] font-semibold tracking-[0.15em] text-sage-500 uppercase">
            Admin Console
          </div>
        </div>
      </div>

      <nav className="flex-1 mt-2">
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-4">
            <div className="px-6 pb-2 section-label">{sec.title}</div>
            {sec.items.map((it) => (
              <NavRow key={it.href} item={it} active={isActive(pathname, it.href)} />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-[12px] bg-ink-400 p-3">
          <div className="h-9 w-9 rounded-[9px] bg-[#2c4d3b] grid place-items-center font-bold text-leaf-200">
            D
          </div>
          <div className="leading-tight flex-1">
            <div className="text-[13px] font-semibold">Dheeraj</div>
            <div className="text-[11px] text-sage-500">Super Admin</div>
          </div>
          <button
            onClick={logout}
            disabled={pending}
            title="Sign out"
            className="h-8 w-8 rounded-md text-sage-400 hover:text-white hover:bg-ink-500 grid place-items-center"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
