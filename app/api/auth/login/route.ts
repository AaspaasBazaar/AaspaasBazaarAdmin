import { z } from "zod";
import { cookies } from "next/headers";
import { getAdmin, setInitialPassword } from "@/lib/db/admins";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/session";
import { ok, err, badRequest, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

const LoginInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

async function issueSession(admin: { email: string; role: "owner" | "zonal_admin" | "admin" | "viewer"; name: string }) {
  const token = signSession({
    email: admin.email,
    role: admin.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req);
    const { email, password } = LoginInput.parse(body);
    const id = email.toLowerCase();
    const admin = await getAdmin(id);
    if (!admin) return err("UNAUTHORIZED", "Invalid credentials", 401);
    if (!admin.active) return err("UNAUTHORIZED", "Admin is deactivated", 401);

    // First-login setup: if the admin has no password_hash yet, the supplied
    // password becomes their password. Mirrors the seeded-owner bootstrap flow.
    if (!admin.password_hash) {
      const updated = await setInitialPassword(id, password);
      if (!updated) return err("UNAUTHORIZED", "Invalid credentials", 401);
      await issueSession(updated);
      return ok({
        success: true,
        email: updated.email,
        role: updated.role,
        name: updated.name,
        initial_setup: true,
      });
    }

    if (!verifyPassword(password, admin)) {
      return err("UNAUTHORIZED", "Invalid credentials", 401);
    }
    await issueSession(admin);
    return ok({ success: true, email: admin.email, role: admin.role, name: admin.name });
  } catch (e) {
    return badRequest(e);
  }
}
