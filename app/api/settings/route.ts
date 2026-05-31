import { getSettings, saveSettings } from "@/lib/db/settings";
import { SettingsPatch } from "@/lib/schemas";
import { ok, badRequest, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getSettings());
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req);
    const patch = SettingsPatch.parse(body);
    const merged = await saveSettings(patch);
    return ok({ success: true, settings: merged });
  } catch (e) {
    return badRequest(e);
  }
}
