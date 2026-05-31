import { listAdmins } from "@/lib/db/admins";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const admins = await listAdmins();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admins</h1>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{a.email}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2">{a.role}</td>
                <td className="px-3 py-2">{a.active ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-slate-500">{new Date(a.created_at).toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        CRUD form coming in Phase 2. Use <code className="font-mono">POST /api/admins</code> for now.
      </p>
    </div>
  );
}
