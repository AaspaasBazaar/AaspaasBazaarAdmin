import crypto from "node:crypto";

const ITERATIONS = 210000; // OWASP 2024 baseline for PBKDF2-SHA256
const KEYLEN = 32;
const SALT_BYTES = 16;
const DIGEST = "sha256";

export type PasswordRecord = { password_hash: string; password_salt: string };

export function hashPassword(password: string): PasswordRecord {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return { password_hash: key, password_salt: salt };
}

export function verifyPassword(
  password: string,
  record: { password_hash?: string; password_salt?: string },
): boolean {
  if (!record?.password_hash || !record?.password_salt) return false;
  if (typeof password !== "string" || !password) return false;
  const key = crypto
    .pbkdf2Sync(password, record.password_salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
  const a = Buffer.from(key, "hex");
  const b = Buffer.from(record.password_hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
