import { UserSchema, type User } from "@/lib/schemas";
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

// App customers, keyed by Firebase uid (= Firestore doc id). Auth is owned by
// Firebase; this record is the marketplace profile only.
const COL = "users";

export async function listUsers(): Promise<User[]> {
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<User>(COL)
      : ((await readJsonOnce()).users as unknown as User[]);
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUser(uid: string): Promise<User | null> {
  const id = uid.trim();
  if (!id) return null;
  if (storageMode() === "firestore") {
    return getFirestoreDoc<User>(COL, id);
  }
  const db = await readJsonOnce();
  return (db.users.find((u) => (u.uid as string) === id) as User) ?? null;
}

type ProfileInput = Partial<Omit<User, "uid" | "active" | "created_at">>;

/**
 * Create the profile if absent, otherwise patch it. uid + created_at + active
 * are server-controlled; uid always comes from the verified token, never the body.
 */
export async function upsertUser(uid: string, input: ProfileInput): Promise<User> {
  const id = uid.trim();
  if (!id) throw new Error("uid required");
  const existing = await getUser(id);

  if (!existing) {
    const candidate = UserSchema.parse({
      ...input,
      uid: id,
      active: true,
      created_at: Date.now(),
    });
    if (storageMode() === "firestore") {
      await setFirestoreDoc(COL, id, candidate);
    } else {
      await mutateJson(async (db) => {
        db.users.push(candidate);
      });
    }
    return candidate;
  }

  const next = UserSchema.parse({ ...existing, ...input });
  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, id, input as Record<string, unknown>);
  } else {
    await mutateJson(async (db) => {
      const u = db.users.find((x) => (x.uid as string) === id);
      if (u) Object.assign(u, input);
    });
  }
  return next;
}

export async function setUserActive(uid: string, active: boolean): Promise<User | null> {
  const id = uid.trim();
  const cur = await getUser(id);
  if (!cur) return null;
  const next = UserSchema.parse({ ...cur, active });
  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, id, { active });
  } else {
    await mutateJson(async (db) => {
      const u = db.users.find((x) => (x.uid as string) === id);
      if (u) u.active = active;
    });
  }
  return next;
}

export async function deleteUser(uid: string): Promise<boolean> {
  const id = uid.trim();
  const cur = await getUser(id);
  if (!cur) return false;
  if (storageMode() === "firestore") {
    await deleteFirestoreDoc(COL, id);
  } else {
    await mutateJson(async (db) => {
      db.users = db.users.filter((u) => (u.uid as string) !== id);
    });
  }
  return true;
}
