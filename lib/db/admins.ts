import { AdminSchema, type Admin } from "@/lib/schemas";
import {
  storageMode,
  listFirestore,
  getFirestoreDoc,
  setFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  mutateJson,
  readJsonOnce,
} from "@/lib/storage";
import { hashPassword } from "@/lib/password";

const COL = "admins";

export async function listAdmins(): Promise<Admin[]> {
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Admin>(COL)
      : ((await readJsonOnce()).admins as unknown as Admin[]);
  return [...rows].sort((a, b) => a.email.localeCompare(b.email));
}

export async function getAdmin(email: string): Promise<Admin | null> {
  const id = email.trim().toLowerCase();
  if (!id) return null;
  if (storageMode() === "firestore") {
    return getFirestoreDoc<Admin>(COL, id);
  }
  const db = await readJsonOnce();
  return (db.admins.find((a) => (a.email as string).toLowerCase() === id) as Admin) ?? null;
}

export async function addAdmin(
  input: Omit<Admin, "created_at" | "password_hash" | "password_salt"> & { password?: string },
): Promise<{ ok: true; admin: Admin } | { ok: false; code: "DUPLICATE" }> {
  const { password, ...rest } = input;
  const base = { ...rest, created_at: Date.now() };
  const withHash = password ? { ...base, ...hashPassword(password) } : base;
  const candidate = AdminSchema.parse(withHash);
  const existing = await getAdmin(candidate.email);
  if (existing) return { ok: false, code: "DUPLICATE" };

  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, candidate.email, candidate);
  } else {
    await mutateJson(async (db) => {
      db.admins.push(candidate);
    });
  }
  return { ok: true, admin: candidate };
}

export async function updateAdmin(
  email: string,
  patch: Partial<Omit<Admin, "email" | "created_at">> & { password?: string },
): Promise<Admin | null> {
  const id = email.trim().toLowerCase();
  const cur = await getAdmin(id);
  if (!cur) return null;
  const { password, ...rest } = patch;
  const merged: Partial<Admin> = { ...rest };
  if (password) Object.assign(merged, hashPassword(password));

  const next = AdminSchema.parse({ ...cur, ...merged });

  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, id, merged as Record<string, unknown>);
  } else {
    await mutateJson(async (db) => {
      const a = db.admins.find((x) => (x.email as string).toLowerCase() === id);
      if (a) Object.assign(a, merged);
    });
  }
  return next;
}

/**
 * Set the initial password for an admin that does not yet have one.
 * Returns false if a password is already set (refuses to overwrite without auth).
 */
export async function setInitialPassword(email: string, password: string): Promise<Admin | null> {
  const cur = await getAdmin(email);
  if (!cur) return null;
  if (cur.password_hash) return null;
  return updateAdmin(email, { password });
}

export async function toggleAdmin(email: string): Promise<{ email: string; active: boolean } | null> {
  const cur = await getAdmin(email);
  if (!cur) return null;
  const next = await updateAdmin(email, { active: !cur.active });
  return next ? { email: next.email, active: next.active } : null;
}

export async function deleteAdmin(
  email: string,
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "LAST_OWNER" }> {
  const id = email.trim().toLowerCase();
  const all = await listAdmins();
  const target = all.find((a) => a.email === id);
  if (!target) return { ok: false, code: "NOT_FOUND" };

  if (target.role === "owner" && target.active) {
    const activeOwners = all.filter((a) => a.role === "owner" && a.active);
    if (activeOwners.length <= 1) return { ok: false, code: "LAST_OWNER" };
  }

  if (storageMode() === "firestore") {
    await deleteFirestoreDoc(COL, id);
  } else {
    await mutateJson(async (db) => {
      db.admins = db.admins.filter((a) => (a.email as string).toLowerCase() !== id);
    });
  }
  return { ok: true };
}
