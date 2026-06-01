import { ok, badRequest, parseJson } from "@/lib/api";
import { withAppAuth } from "@/lib/auth-token";
import { getUser, upsertUser } from "@/lib/db/users";
import { UserPatch } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/app/user/profile — the signed-in customer's own profile.
// Identity comes from the verified token (auth.uid), never the request body.
// On first call (no record yet) we seed from token claims so the app always
// gets a profile back.
export const GET = withAppAuth("user", async (auth) => {
  const existing = await getUser(auth.uid);
  if (existing) return ok(existing);
  const seeded = await upsertUser(auth.uid, {
    name: auth.name ?? "Customer",
    email: auth.email ?? undefined,
    phone: auth.phone_number ?? undefined,
  });
  return ok(seeded);
});

// PUT /api/app/user/profile — update own profile. uid/active/created_at are
// server-controlled; the client may only send the UserPatch fields.
export const PUT = withAppAuth("user", async (auth, req) => {
  try {
    const patch = UserPatch.parse(await parseJson(req));
    const updated = await upsertUser(auth.uid, patch);
    return ok(updated);
  } catch (e) {
    return badRequest(e);
  }
});
