import type { WeeklyTotals } from "@/lib/schemas";

const DAYS: Array<keyof WeeklyTotals> = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyChart({ totals }: { totals: WeeklyTotals }) {
  const max = Math.max(1, ...DAYS.map((d) => totals[d] ?? 0));
  return (
    <div className="card p-5 min-h-[300px] flex flex-col">
      <div>
        <h2 className="font-display text-[16px] font-bold text-ink-600">Orders this week</h2>
        <p className="text-[12px] text-sage-600 mt-0.5">Daily completed orders across all vendors</p>
      </div>
      <div className="flex-1 mt-6 grid grid-cols-7 gap-3 items-end">
        {DAYS.map((d) => {
          const v = totals[d] ?? 0;
          const h = Math.max(8, Math.round((v / max) * 100));
          return (
            <div key={d} className="flex flex-col items-center justify-end gap-2 h-full">
              <div className="w-full rounded-md bg-leaf-600/95" style={{ height: `${h}%` }} />
              <div className="text-[11px] text-sage-600">{d}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
