import { listVendors, addVendor } from "@/lib/db/vendors";
import { VendorCreate } from "@/lib/schemas";
import { ok, badRequest, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listVendors());
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req);
    const payload = VendorCreate.parse(body);
    const vendor = await addVendor(payload);
    return ok(vendor, { status: 201 });
  } catch (e) {
    return badRequest(e);
  }
}
