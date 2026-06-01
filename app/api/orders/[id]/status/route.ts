import { z } from "zod";
import { updateOrderStatus } from "@/lib/db/orders";
import { OrderStatus } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const Body = z.object({ status: OrderStatus });

export const PATCH = withAuth(["owner", "admin"], async (_session, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return err("BAD_REQUEST", "Invalid id", 400);
  try {
    const body = await parseJson(req);
    const { status } = Body.parse(body);
    const updated = await updateOrderStatus(n, status);
    if (!updated) return err("NOT_FOUND", `Order ${n} not found`, 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});
