import { listItems } from "@/lib/db/items";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const items = await listItems();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Items</h1>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{i.id}</td>
                <td className="px-3 py-2">{i.name}</td>
                <td className="px-3 py-2">{i.vendor_name}</td>
                <td className="px-3 py-2">{i.category}</td>
                <td className="px-3 py-2">₹{i.price} / {i.unit}</td>
                <td className="px-3 py-2">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
