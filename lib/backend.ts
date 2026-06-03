import { cookies } from "next/headers";

/**
 * Server-side HTTP client for the standalone AaspaasBazaarBackend service.
 * The backend is the ONLY writer to Firestore — this admin app never touches
 * the database directly. All reads from server components and all writes
 * (proxied through app/api/[...path]) go through this base URL.
 */
const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export function apiBase(): string {
  return API_BASE;
}

export class BackendError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Fetch JSON from the backend, forwarding the caller's admin session cookie
 * so the backend can authenticate + zone-scope the request.
 * Use from server components: `await backendFetch<Vendor[]>("/api/admin/vendors")`.
 */
export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...((init?.headers as Record<string, string>) ?? {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new BackendError(
      res.status,
      e?.code ?? "BACKEND_ERROR",
      e?.message ?? `Backend request ${path} failed (${res.status})`,
    );
  }
  return body as T;
}
