import { listCategories, addCategory } from "@/lib/db/categories";
import { CategoryCreate } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async () => ok(await listCategories()));

export const POST = withAuth(["owner", "admin"], async (_session, req: Request) => {
  try {
    const body = await parseJson(req);
    const payload = CategoryCreate.parse(body);
    const result = await addCategory(payload);
    if (!result.ok) return err("DUPLICATE", "Category already exists", 409);
    return ok(result.category, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
