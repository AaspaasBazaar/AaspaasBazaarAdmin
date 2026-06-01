import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session";

export type Role = SessionPayload["role"];

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/**
 * Read + HMAC-verify the session cookie. Returns the payload or null.
 * Use in server components when a missing session is OK (e.g. /api/auth/me).
 */
export async function readSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}

/**
 * For API route handlers — verify the session and optionally enforce roles.
 * Throws AuthError; route handlers catch and convert via {@link respondAuthError}.
 */
export async function requireSession(roles?: Role[]): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) throw new AuthError(401, "Sign in required");
  if (roles && roles.length > 0 && !roles.includes(session.role)) {
    throw new AuthError(403, `Requires one of: ${roles.join(", ")}`);
  }
  return session;
}

export function respondAuthError(e: unknown): NextResponse | null {
  if (e instanceof AuthError) {
    return NextResponse.json(
      { error: { code: e.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: e.message } },
      { status: e.status },
    );
  }
  return null;
}

/**
 * Higher-order wrapper: gate any route handler behind requireSession().
 * Handler receives the verified session as its first arg.
 *
 *   export const POST = withAuth(["owner"], async (session, req) => { ... });
 */
export function withAuth<Args extends unknown[]>(
  roles: Role[] | undefined,
  handler: (session: SessionPayload, ...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    let session: SessionPayload;
    try {
      session = await requireSession(roles);
    } catch (e) {
      const r = respondAuthError(e);
      if (r) return r;
      throw e;
    }
    return handler(session, ...args);
  };
}
