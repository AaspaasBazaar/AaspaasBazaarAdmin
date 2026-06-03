import { type NextRequest } from "next/server";
import { apiBase } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * Thin same-origin proxy → AaspaasBazaarBackend (the only Firestore writer).
 *
 * Browser code keeps calling `/api/...` on this app's origin (so the HMAC
 * session cookie travels first-party, no CORS), and every request is forwarded
 * verbatim to the backend service:
 *
 *   /api/auth/*        → {API_BASE_URL}/api/auth/*
 *   /api/health        → {API_BASE_URL}/api/health
 *   /api/simulate-order→ {API_BASE_URL}/api/admin/simulate-order
 *   /api/<anything>    → {API_BASE_URL}/api/admin/<anything>
 *
 * Auth, validation, role + zone scoping all happen in the backend — this file
 * deliberately contains zero business logic.
 */
function backendPath(segments: string[]): string {
  const [head] = segments;
  if (head === "auth" || head === "health") return `/api/${segments.join("/")}`;
  if (head === "simulate-order") return "/api/admin/simulate-order";
  return `/api/admin/${segments.join("/")}`;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(backendPath(path), apiBase());
  url.search = req.nextUrl.search;

  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const res = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const out = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType) out.set("content-type", resContentType);
  // Forward session cookies (login/logout) back to the browser, first-party.
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);

  return new Response(await res.arrayBuffer(), { status: res.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
