import { NextResponse, type NextRequest } from "next/server";

// Inlined (not imported) because middleware runs on the Edge runtime and
// importing lib/session.ts would pull in node:crypto which is not supported.
const SESSION_COOKIE = "ab_session";

const PUBLIC_PATHS = new Set<string>(["/login"]);
// /api/app/* = public app surface (user + vendor apps). These authenticate with
// a Firebase ID token Bearer header, verified per-route in lib/auth-token.ts —
// not the admin cookie. So they skip this cookie gate, NOT auth itself.
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/app/", "/_next/", "/favicon"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);

  if (isPublic(pathname)) return res;

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ?? ""));
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
