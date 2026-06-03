import { backendFetch } from "@/lib/backend";
import type { Category } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { CategoriesPanel } from "@/components/CategoriesPanel";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await backendFetch<Category[]>("/api/admin/categories");
  return (
    <>
      <Topbar title="Categories" subtitle="Tags that group vendors and items" />
      <div className="flex-1 overflow-auto p-8">
        <CategoriesPanel initial={categories} />
      </div>
    </>
  );
}
