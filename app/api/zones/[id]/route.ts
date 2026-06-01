import { deleteZone, getZone, updateZone } from "@/lib/db/zones";
import { ZonePatch } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const z = await getZone(id);
  if (!z) return err("NOT_FOUND", "Zone not found", 404);
  return ok(z);
});

export const PATCH = withAuth(["owner"], async (_session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  try {
    const body = await parseJson(req);
    const patch = ZonePatch.parse(body);
    const updated = await updateZone(id, patch);
    if (!updated) return err("NOT_FOUND", "Zone not found", 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});

export const DELETE = withAuth(["owner"], async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const removed = await deleteZone(id);
  if (!removed) return err("NOT_FOUND", "Zone not found", 404);
  return ok({ success: true, id });
});
