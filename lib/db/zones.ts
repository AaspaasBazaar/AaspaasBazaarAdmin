import { ZoneSchema, type Zone } from "@/lib/schemas";
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

const COL = "zones";

const DEFAULTS: Zone[] = [
  {
    id: "newtown-aa",
    name: "New Town · Action Area",
    city: "Kolkata",
    pincodes: ["700156", "700157", "700161"],
    center_lat: 22.5811,
    center_lng: 88.4760,
    active: true,
    created_at: 1780000000000,
  },
];

async function seedIfEmpty(): Promise<void> {
  if (storageMode() === "firestore") {
    const existing = await listFirestore<Zone>(COL);
    if (existing.length === 0) {
      for (const z of DEFAULTS) await setFirestoreDoc(COL, z.id, z);
    }
  } else {
    await mutateJson(async (db) => {
      if (!db.zones || db.zones.length === 0) {
        db.zones = DEFAULTS as unknown as DbZone[];
      }
    });
  }
}

type DbZone = Record<string, unknown> & { id: string };

export async function listZones(): Promise<Zone[]> {
  await seedIfEmpty();
  const rows =
    storageMode() === "firestore"
      ? await listFirestore<Zone>(COL)
      : ((await readJsonOnce()).zones as unknown as Zone[]);
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getZone(id: string): Promise<Zone | null> {
  const key = id.trim().toLowerCase();
  if (!key) return null;
  if (storageMode() === "firestore") return getFirestoreDoc<Zone>(COL, key);
  const db = await readJsonOnce();
  return ((db.zones as unknown as Zone[]).find((z) => z.id === key)) ?? null;
}

export function zoneForPincode(zones: Zone[], pincode: string | undefined): Zone | null {
  if (!pincode) return null;
  return zones.find((z) => z.pincodes.includes(pincode)) ?? null;
}

export async function addZone(input: Omit<Zone, "created_at">): Promise<
  { ok: true; zone: Zone } | { ok: false; code: "DUPLICATE" }
> {
  const candidate = ZoneSchema.parse({ ...input, created_at: Date.now() });
  const dup = await getZone(candidate.id);
  if (dup) return { ok: false, code: "DUPLICATE" };
  if (storageMode() === "firestore") {
    await setFirestoreDoc(COL, candidate.id, candidate);
  } else {
    await mutateJson(async (db) => {
      db.zones.push(candidate as unknown as DbZone);
    });
  }
  return { ok: true, zone: candidate };
}

export async function updateZone(
  id: string,
  patch: Partial<Omit<Zone, "id" | "created_at">>,
): Promise<Zone | null> {
  const key = id.trim().toLowerCase();
  const cur = await getZone(key);
  if (!cur) return null;
  const next = ZoneSchema.parse({ ...cur, ...patch });
  if (storageMode() === "firestore") {
    await updateFirestoreDoc(COL, key, patch as Record<string, unknown>);
  } else {
    await mutateJson(async (db) => {
      const z = (db.zones as unknown as Zone[]).find((x) => x.id === key);
      if (z) Object.assign(z, patch);
    });
  }
  return next;
}

export async function deleteZone(id: string): Promise<boolean> {
  const key = id.trim().toLowerCase();
  const cur = await getZone(key);
  if (!cur) return false;
  if (storageMode() === "firestore") await deleteFirestoreDoc(COL, key);
  else {
    await mutateJson(async (db) => {
      db.zones = db.zones.filter((z) => (z.id as string) !== key);
    });
  }
  return true;
}
