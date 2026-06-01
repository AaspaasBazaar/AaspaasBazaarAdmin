import crypto from "node:crypto";

export const SESSION_COOKIE = "ab_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is required in production (>=32 chars). " +
        "Generate via: openssl rand -base64 32",
    );
  }
  // Dev fallback — stable across reloads so existing cookies still validate
  return "dev-only-session-secret-do-not-use-in-prod-aaaaaaaa";
}

export type SessionPayload = {
  email: string;
  role: "owner" | "zonal_admin" | "admin" | "viewer";
  exp: number; // unix seconds
};

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signSession(payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = crypto.createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

export function verifySession(cookieValue: string | undefined | null): SessionPayload | null {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const [body, sig] = cookieValue.split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", getSecret()).update(body).digest());
  // Timing-safe comparison
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
