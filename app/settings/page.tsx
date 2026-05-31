import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Discovery radius</span>
          <span className="font-mono">{settings.discovery_radius} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Default delivery fee</span>
          <span className="font-mono">₹{settings.default_delivery_fee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Order model</span>
          <span className="font-mono">{settings.order_model}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Edit form coming in Phase 2. Use <code className="font-mono">POST /api/settings</code> for now.
      </p>
    </div>
  );
}
