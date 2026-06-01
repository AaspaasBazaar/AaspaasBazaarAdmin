import { getSettings } from "@/lib/db/settings";
import { Topbar } from "@/components/Topbar";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <Topbar title="Settings" subtitle="Platform-wide configuration" />
      <div className="flex-1 overflow-auto p-8">
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
