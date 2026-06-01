import { listZones, addZone } from "@/lib/db/zones";
import { ZoneCreate } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async () => ok(await listZones()));

export const POST = withAuth(["owner"], async (_session, req: Request) => {
  try {
    const body = await parseJson(req);
    const payload = ZoneCreate.parse(body);
    const result = await addZone(payload);
    if (!result.ok) return err("DUPLICATE", "Zone already exists", 409);
    return ok(result.zone, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
