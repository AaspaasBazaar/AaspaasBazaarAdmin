import { deleteItem, getItem, updateItem } from "@/lib/db/items";
import { ItemPatch } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET = withAuth(undefined, async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const it = await getItem(n);
  if (!it) return err("NOT_FOUND", `Item ${n} not found`, 404);
  return ok(it);
});

export const PATCH = withAuth(["owner", "admin"], async (_session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  try {
    const body = await parseJson(req);
    const patch = ItemPatch.parse(body);
    const updated = await updateItem(n, patch);
    if (!updated) return err("NOT_FOUND", `Item ${n} not found`, 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});

export const DELETE = withAuth(["owner", "admin"], async (_session, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return err("BAD_REQUEST", "Invalid id", 400);
  const removed = await deleteItem(n);
  if (!removed) return err("NOT_FOUND", `Item ${n} not found`, 404);
  return ok({ success: true, id: n });
});
