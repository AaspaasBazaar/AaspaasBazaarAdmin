import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb, hasAdminCreds } from "./firebase-admin";

export type StorageMode = "firestore" | "json";

export function storageMode(): StorageMode {
  const explicit = process.env.STORAGE_MODE?.toLowerCase();
  if (explicit === "firestore" || explicit === "json") return explicit;
  return hasAdminCreds() ? "firestore" : "json";
}

const DB_FILE = path.join(process.cwd(), "db.json");

type DbShape = {
  vendors: Array<Record<string, unknown> & { id: number }>;
  items: Array<Record<string, unknown> & { id: number }>;
  orders: Array<Record<string, unknown> & { id: number }>;
  admins: Array<Record<string, unknown> & { email: string }>;
  categories: Array<Record<string, unknown> & { slug: string }>;
  zones: Array<Record<string, unknown> & { id: string }>;
  settings: Record<string, unknown>;
  weekly_totals: Record<string, number>;
};

// In-process write mutex so two concurrent route handlers don't clobber db.json
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => undefined);
  return next;
}

async function readJson(): Promise<DbShape> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      vendors: parsed.vendors ?? [],
      items: parsed.items ?? [],
      orders: parsed.orders ?? [],
      admins: parsed.admins ?? [],
      categories: parsed.categories ?? [],
      zones: parsed.zones ?? [],
      settings: parsed.settings ?? {},
      weekly_totals: parsed.weekly_totals ?? {
        Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
      },
    };
  } catch {
    return {
      vendors: [], items: [], orders: [], admins: [], categories: [], zones: [],
      settings: {},
      weekly_totals: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
    };
  }
}

async function writeJson(data: DbShape): Promise<void> {
  await writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

export async function mutateJson<T>(fn: (db: DbShape) => Promise<T> | T): Promise<T> {
  return serialize(async () => {
    const db = await readJson();
    const result = await fn(db);
    await writeJson(db);
    return result;
  });
}

export async function readJsonOnce(): Promise<DbShape> {
  return readJson();
}

// ---------- Firestore helpers ----------

export function firestoreDb() {
  return getDb();
}

export async function listFirestore<T>(collection: string): Promise<T[]> {
  const snap = await firestoreDb().collection(collection).get();
  return snap.docs.map((d) => d.data() as T);
}

export async function getFirestoreDoc<T>(collection: string, id: string): Promise<T | null> {
  const doc = await firestoreDb().collection(collection).doc(id).get();
  return doc.exists ? (doc.data() as T) : null;
}

export async function setFirestoreDoc(
  collection: string,
  id: string,
  data: Record<string, unknown>,
  merge = false,
): Promise<void> {
  await firestoreDb().collection(collection).doc(id).set(data, { merge });
}

export async function updateFirestoreDoc(
  collection: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await firestoreDb().collection(collection).doc(id).update(patch);
}

export async function deleteFirestoreDoc(collection: string, id: string): Promise<void> {
  await firestoreDb().collection(collection).doc(id).delete();
}
