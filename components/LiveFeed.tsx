import type { Order } from "@/lib/schemas";

const SWATCHES = [
  { bg: "bg-rose-50",   dot: "bg-rose-600" },
  { bg: "bg-leaf-50",   dot: "bg-leaf-500" },
  { bg: "bg-ocean-50",  dot: "bg-ocean-600" },
  { bg: "bg-orange-50", dot: "bg-orange-600" },
  { bg: "bg-amber-50",  dot: "bg-amber-600" },
];

export function LiveFeed({ orders }: { orders: Order[] }) {
  return (
    <div className="card p-5 min-h-[300px] flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-bold text-ink-600">Live order feed</h2>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-leaf-600" />
          <span className="text-[11.5px] font-bold text-leaf-600 tracking-wide">LIVE</span>
        </div>
      </div>
      <ul className="mt-3 space-y-2 overflow-auto pr-1">
        {orders.length === 0 && (
          <li className="text-center text-sage-400 text-sm py-8">No orders yet</li>
        )}
        {orders.map((o, i) => {
          const s = SWATCHES[i % SWATCHES.length];
          return (
            <li
              key={o.id}
              className="flex items-center rounded-[10px] bg-leaf-50/60 px-3 py-2.5 gap-3"
            >
              <div className={`h-10 w-10 rounded-[11px] ${s.bg} grid place-items-center`}>
                <span className={`h-3.5 w-3.5 rounded-full ${s.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-ink-600">Order #{o.id}</div>
                <div className="text-[12px] text-sage-600 truncate">
                  {o.vendor_name} → {o.customer_code}
                </div>
              </div>
              <div className="font-mono text-[13.5px] font-bold text-ink-600">₹{o.amount}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
