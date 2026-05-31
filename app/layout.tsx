import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AaspaasBazaar Admin",
  description: "Admin panel for the AaspaasBazaar hyperlocal marketplace",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/vendors", label: "Vendors" },
  { href: "/items", label: "Items" },
  { href: "/orders", label: "Orders" },
  { href: "/settings", label: "Settings" },
  { href: "/admins", label: "Admins" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex">
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-bazaar-green font-semibold">AaspaasBazaar</div>
            <div className="text-xs text-slate-500">Admin Panel</div>
          </div>
          <nav className="p-3 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="block px-3 py-2 rounded hover:bg-slate-100 text-sm text-slate-700"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
