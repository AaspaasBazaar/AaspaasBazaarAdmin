import { listVendors } from "@/lib/db/vendors";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await listVendors();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vendors</h1>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Categories</th>
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Open</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{v.id}</td>
                <td className="px-3 py-2">{v.name}</td>
                <td className="px-3 py-2">{v.owner}</td>
                <td className="px-3 py-2">{v.categories.join(", ")}</td>
                <td className="px-3 py-2">{v.rating.toFixed(1)}</td>
                <td className="px-3 py-2">{v.open ? "Open" : "Closed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
