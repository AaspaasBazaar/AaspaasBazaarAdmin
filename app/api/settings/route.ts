import { getSettings, saveSettings } from "@/lib/db/settings";
import { SettingsPatch } from "@/lib/schemas";
import { ok, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async () => ok(await getSettings()));

export const POST = withAuth(["owner", "admin"], async (_session, req: Request) => {
  try {
    const body = await parseJson(req);
    const patch = SettingsPatch.parse(body);
    const merged = await saveSettings(patch);
    return ok({ success: true, settings: merged });
  } catch (e) {
    return badRequest(e);
  }
});
