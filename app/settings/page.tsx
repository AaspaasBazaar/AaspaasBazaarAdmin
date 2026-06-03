import { backendFetch } from "@/lib/backend";
import type { Settings } from "@/lib/schemas";
import { Topbar } from "@/components/Topbar";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await backendFetch<Settings>("/api/admin/settings");
  return (
    <>
      <Topbar title="Settings" subtitle="Platform-wide configuration" />
      <div className="flex-1 overflow-auto p-8">
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
