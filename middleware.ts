import { NextResponse, type NextRequest } from "next/server";

// Cookie name matches what the backend service issues on /api/auth/login.
// This gate only checks PRESENCE for fast redirects — HMAC verification and
// role enforcement happen in the AaspaasBazaarBackend service on every call.
const SESSION_COOKIE = "ab_session";

const PUBLIC_PATHS = new Set<string>(["/login"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/_next/", "/favicon"];

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
