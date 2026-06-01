import { NextResponse } from "next/server";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";

/**
 * Auth for the public app surface (user + vendor mobile/web apps).
 *
 * Unlike the admin panel — which uses an HMAC cookie session (see lib/session.ts)
 * — app clients authenticate with a Firebase Auth ID token sent as a Bearer
 * header. The token is verified server-side via the Admin SDK. Clients never
 * touch Firestore directly; this backend is the only writer.
 *
 * Role is read from a Firebase custom claim ("user" | "vendor") that you set on
 * the account at signup via getAuth().setCustomUserClaims(uid, { role }).
 */
export type AppRole = "user" | "vendor";

export class AppAuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** Extract + verify the Bearer ID token. Throws AppAuthError on any failure. */
export async function verifyBearer(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AppAuthError(401, "Missing bearer token");
  try {
    // checkRevoked = true → rejects tokens for disabled/signed-out accounts
    return await getAuth(getAdminApp()).verifyIdToken(match[1], true);
  } catch {
    throw new AppAuthError(401, "Invalid or expired token");
  }
}

/** Verify the token and, if a role is required, enforce the custom claim. */
export async function requireApp(req: Request, role?: AppRole): Promise<DecodedIdToken> {
  const decoded = await verifyBearer(req);
  if (role) {
    const claim = decoded.role as AppRole | undefined;
    if (claim !== role) throw new AppAuthError(403, `Requires a ${role} account`);
  }
  return decoded;
}

export function respondAppAuthError(e: unknown): NextResponse | null {
  if (e instanceof AppAuthError) {
    return NextResponse.json(
      { error: { code: e.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: e.message } },
      { status: e.status },
    );
  }
  return null;
}

/**
 * Higher-order wrapper mirroring lib/auth-server.ts#withAuth, but for app routes.
 * Handler receives the decoded token as its first arg.
 *
 *   export const POST = withAppAuth("user", async (auth, req) => { ... });
 */
export function withAppAuth<Args extends unknown[]>(
  role: AppRole | undefined,
  handler: (auth: DecodedIdToken, req: Request, ...rest: Args) => Promise<Response> | Response,
): (req: Request, ...rest: Args) => Promise<Response> {
  return async (req: Request, ...rest: Args) => {
    let auth: DecodedIdToken;
    try {
      auth = await requireApp(req, role);
    } catch (e) {
      const r = respondAppAuthError(e);
      if (r) return r;
      throw e;
    }
    return handler(auth, req, ...rest);
  };
}
