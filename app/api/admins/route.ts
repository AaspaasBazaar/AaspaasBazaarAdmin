import { listAdmins, addAdmin } from "@/lib/db/admins";
import { AdminCreate } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";
import { withAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = withAuth(undefined, async () => ok(await listAdmins()));

export const POST = withAuth(["owner"], async (_session, req: Request) => {
  try {
    const body = await parseJson(req);
    const payload = AdminCreate.parse(body);
    const result = await addAdmin(payload);
    if (!result.ok) return err("DUPLICATE", "Admin already exists", 409);
    return ok(result.admin, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
});
