import { backendFetch } from "@/lib/backend";
import type { Item, Vendor, Category } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { ItemsTable } from "@/components/ItemsTable";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const [items, vendors, categories] = await Promise.all([
    backendFetch<Item[]>("/api/admin/items"),
    backendFetch<Vendor[]>("/api/admin/vendors"),
    backendFetch<Category[]>("/api/admin/categories"),
  ]);
  return (
    <>
      <Topbar title="Items" subtitle="Catalogue across all vendors" />
      <div className="flex-1 overflow-auto p-8">
        <ItemsTable initial={items} vendors={vendors} categories={categories} />
      </div>
    </>
  );
}
