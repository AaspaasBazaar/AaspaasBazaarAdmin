const CAT_COLORS: Record<string, string> = {
  Vegetables: "bg-leaf-500",
  Fruits:     "bg-orange-600",
  Dairy:      "bg-ocean-400",
  Bakery:     "bg-amber-600",
  Groceries:  "bg-ocean-600",
  Meat:       "bg-ruby-600",
  Stationery: "bg-aqua-400",
  Pharmacy:   "bg-rose-600",
};

export function CategoryBadge({ name }: { name: string }) {
  const cls = CAT_COLORS[name] ?? "bg-sage-500";
  return <span className={`badge-soft ${cls}`}>{name}</span>;
}
