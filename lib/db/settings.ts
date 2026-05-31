import { SettingsSchema, type Settings } from "@/lib/schemas";
import {
  storageMode,
  getFirestoreDoc,
  setFirestoreDoc,
  mutateJson,
  readJsonOnce,
} from "@/lib/storage";

const DEFAULTS: Settings = {
  discovery_radius: 3.0,
  default_delivery_fee: 25,
  order_model: "Pickup + Delivery",
};

export async function getSettings(): Promise<Settings> {
  if (storageMode() === "firestore") {
    const cur = await getFirestoreDoc<Settings>("config", "settings");
    return cur ? SettingsSchema.parse(cur) : DEFAULTS;
  }
  const db = await readJsonOnce();
  const merged = { ...DEFAULTS, ...db.settings };
  return SettingsSchema.parse(merged);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = SettingsSchema.parse({ ...current, ...patch });

  if (storageMode() === "firestore") {
    await setFirestoreDoc("config", "settings", merged);
  } else {
    await mutateJson(async (db) => {
      db.settings = merged;
    });
  }
  return merged;
}
