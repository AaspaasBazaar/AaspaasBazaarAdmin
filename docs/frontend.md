# Frontend

## Design system

| Layer | Choice | Reason |
|-------|--------|--------|
| Styling | Tailwind CSS v4 | Utility-first, zero-runtime |
| Primitives | shadcn/ui (Radix under the hood) | Owned, themeable, accessible |
| Icons | Lucide React | Tree-shakable, consistent stroke |
| Charts | Recharts | React-first, simple API |
| Forms | React Hook Form + Zod resolver | Shares schemas with API |
| Tables | TanStack Table v8 | Headless, server-pagination-friendly |
| Toasts | Sonner | shadcn-preferred |
| Data | Native `fetch` + Server Components; SWR for client revalidation | No Redux, no Zustand |
| Real-time | Firestore `onSnapshot` (client SDK, read-only via custom token) for the orders feed | Cheaper than long-poll |

## Pages

| Route | Title | Description |
|-------|-------|-------------|
| `/login` | Login | NextAuth (Google) sign-in. Public. |
| `/` | Dashboard | Tiles: vendors total/open, orders today, revenue today, pending orders. Weekly totals bar chart. Live order feed (last 10). |
| `/vendors` | Vendors | Table: name, owner, phone, categories, rating, open, delivery. Actions: toggle open, edit, delete. "Add vendor" button → dialog. |
| `/vendors/[id]` | Vendor detail | Full profile + map (Leaflet) + that vendor's items + recent orders. |
| `/items` | Items | Table: name, vendor, category, price, unit, status. Filter by vendor/category/status. Stock toggles. |
| `/orders` | Orders | Table: id, vendor, customer, amount, type, status, time. Filters + status updates. |
| `/settings` | Settings | Form: discovery radius, default delivery fee, order model. Save → POST `/api/settings`. |

## Layout

```
┌──────────────────────────────────────────────┐
│  Sidebar (fixed)        │   Topbar           │
│  ─ Dashboard            │   search · profile │
│  ─ Vendors              ├────────────────────┤
│  ─ Items                │                    │
│  ─ Orders               │   Page content     │
│  ─ Settings             │                    │
│                         │                    │
└──────────────────────────────────────────────┘
```

Implemented as `app/(admin)/layout.tsx`. The `(admin)` route group is wrapped in an auth guard that redirects unauthenticated users to `/login`.

## Component conventions

- **Server components by default.** Add `"use client"` only when you need state, effects, or browser APIs.
- **One component per file.** Filename matches the exported symbol (`VendorTable.tsx`).
- **Co-locate** small helpers and types next to the component until reused elsewhere.
- **Forms** use React Hook Form + a Zod schema imported from `lib/schemas.ts`. No ad-hoc validation.
- **Tables** use TanStack Table's column definitions; rows from server-paginated API.

Example column def (`components/vendors/columns.tsx`):

```tsx
"use client";
import { ColumnDef } from "@tanstack/react-table";
import type { Vendor } from "@/lib/schemas";

export const vendorColumns: ColumnDef<Vendor>[] = [
  { accessorKey: "name", header: "Vendor" },
  { accessorKey: "owner", header: "Owner" },
  { accessorKey: "rating", header: "Rating",
    cell: ({ getValue }) => (getValue<number>()).toFixed(1) },
  { id: "open", header: "Open?",
    cell: ({ row }) => <ToggleOpenButton vendor={row.original} /> },
];
```

## Data fetching pattern

### Server Component (preferred for initial render)

```tsx
// app/(admin)/vendors/page.tsx
import { listVendors } from "@/lib/db/vendors";
import { VendorTable } from "@/components/vendors/VendorTable";

export const revalidate = 30;   // ISR

export default async function Page() {
  const vendors = await listVendors();
  return <VendorTable initialData={vendors} />;
}
```

### Client mutation + revalidate

```tsx
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ToggleOpenButton({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        await fetch(`/api/vendors/${vendor.id}/toggle`, { method: "POST" });
        router.refresh();
      })}
    >
      {vendor.open ? "Open" : "Closed"}
    </button>
  );
}
```

## Accessibility

- shadcn primitives wrap Radix → keyboard nav and ARIA roles out of the box.
- All form inputs have associated `<label>`.
- Colour contrast checked against WCAG AA in both light and dark themes.
- Toasts (Sonner) announce via `aria-live="polite"`.

## Theming

Tailwind v4 CSS variables in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 142 70% 45%;     /* bazaar green */
  --accent:  35 100% 55%;     /* bazaar saffron */
  /* ... */
}
.dark { /* overrides */ }
```

Theme toggle in topbar persists to `localStorage` and a cookie so SSR renders the right palette.
