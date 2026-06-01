import { listItems } from "@/lib/db/items";
import { listVendors } from "@/lib/db/vendors";
import { listCategories } from "@/lib/db/categories";
import { Topbar } from "@/components/Topbar";
import { ItemsTable } from "@/components/ItemsTable";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const [items, vendors, categories] = await Promise.all([
    listItems(),
    listVendors(),
    listCategories(),
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
