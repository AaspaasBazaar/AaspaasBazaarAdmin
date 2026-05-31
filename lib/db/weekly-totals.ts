import { WeeklyTotalsSchema, type WeeklyTotals } from "@/lib/schemas";
import { storageMode, getFirestoreDoc, readJsonOnce } from "@/lib/storage";

const DEFAULTS: WeeklyTotals = {
  Mon: 87, Tue: 112, Wed: 98, Thu: 124, Fri: 119, Sat: 150, Sun: 140,
};

export async function getWeeklyTotals(): Promise<WeeklyTotals> {
  if (storageMode() === "firestore") {
    const cur = await getFirestoreDoc<WeeklyTotals>("config", "weekly_totals");
    return cur ? WeeklyTotalsSchema.parse({ ...DEFAULTS, ...cur }) : DEFAULTS;
  }
  const db = await readJsonOnce();
  return WeeklyTotalsSchema.parse({ ...DEFAULTS, ...db.weekly_totals });
}
