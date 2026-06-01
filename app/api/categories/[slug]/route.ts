import { deleteCategory, getCategory, updateCategory } from "@/lib/db/categories";
import { CategoryPatch } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async (_session, _req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const c = await getCategory(slug);
  if (!c) return err("NOT_FOUND", "Category not found", 404);
  return ok(c);
});

export const PATCH = withAuth(["owner", "admin"], async (_session, req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  try {
    const body = await parseJson(req);
    const patch = CategoryPatch.parse(body);
    const updated = await updateCategory(slug, patch);
    if (!updated) return err("NOT_FOUND", "Category not found", 404);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});

export const DELETE = withAuth(["owner", "admin"], async (_session, _req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const removed = await deleteCategory(slug);
  if (!removed) return err("NOT_FOUND", "Category not found", 404);
  return ok({ success: true, slug });
});
