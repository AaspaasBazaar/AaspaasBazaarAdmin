import { listAdmins, addAdmin } from "@/lib/db/admins";
import { AdminCreate } from "@/lib/schemas";
import { ok, err, badRequest, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listAdmins());
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req);
    const payload = AdminCreate.parse(body);
    const result = await addAdmin(payload);
    if (!result.ok) return err("DUPLICATE", "Admin already exists", 409);
    return ok(result.admin, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
}
