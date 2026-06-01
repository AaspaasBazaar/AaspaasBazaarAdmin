type Tone = "leaf" | "ocean" | "amber" | "orange";

const TONE: Record<Tone, { bg: string; dot: string }> = {
  leaf:   { bg: "bg-leaf-50",   dot: "bg-leaf-600" },
  ocean:  { bg: "bg-ocean-50",  dot: "bg-ocean-600" },
  amber:  { bg: "bg-amber-50",  dot: "bg-amber-600" },
  orange: { bg: "bg-orange-50", dot: "bg-orange-600" },
};

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = "up",
  tone,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: "up" | "down";
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="card p-5 flex flex-col">
      <div className={`h-[38px] w-[38px] rounded-[10px] ${t.bg} grid place-items-center`}>
        <span className={`h-[14px] w-[14px] rounded-full ${t.dot}`} />
      </div>
      <div className="mt-4 text-[12.5px] font-medium text-sage-600">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div className="font-display text-[30px] font-bold text-ink-600 leading-none">{value}</div>
        {delta && (
          <div
            className={`text-[12px] font-semibold ${
              deltaDirection === "down" ? "text-ruby-600" : "text-leaf-800"
            }`}
          >
            {deltaDirection === "down" ? "▼" : "▲"} {delta}
          </div>
        )}
      </div>
    </div>
  );
}
