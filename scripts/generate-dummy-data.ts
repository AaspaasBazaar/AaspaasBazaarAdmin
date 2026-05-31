/**
 * Deterministic dummy data generator. Writes db.json in the shape the
 * storage layer expects. Re-runs produce identical output (seeded PRNG)
 * so a Firestore seed driven from this file is repeatable.
 *
 *   npx tsx scripts/generate-dummy-data.ts
 *   npx tsx scripts/generate-dummy-data.ts --seed 42
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

// ---------- seeded PRNG (mulberry32) ----------
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}
function intRange(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// ---------- config (Small dataset) ----------
const VENDOR_COUNT = 20;
const ITEM_COUNT = 80;
const ORDER_COUNT = 150;

const ALL_CATEGORIES = [
  "Vegetables", "Fruits", "Dairy", "Bakery", "Groceries",
  "Meat", "Stationery", "Pharmacy",
] as const;

const VENDOR_NAME_PARTS: Array<[string, string]> = [
  ["Amrit", "Dairy"], ["GreenLeaf", "Veggies"], ["Daily Needs", "Store"],
  ["FreshKart", "Mart"], ["Hari", "Provisions"], ["NewTown", "Bakers"],
  ["Sunrise", "Grocers"], ["Maa Tara", "Stores"], ["City", "Pharma"],
  ["BookNest", "Stationers"], ["Krishna", "Meats"], ["Annapurna", "Foods"],
  ["FarmFresh", "Veggies"], ["GoldenWheat", "Bakery"], ["Sweetmilk", "Dairy"],
  ["Aam Aadmi", "Kirana"], ["QuickPick", "Mart"], ["EcoBasket", "Organics"],
  ["LakeView", "Provisions"], ["Sealdah", "Suppliers"],
];

const OWNER_FIRST = ["Suresh", "Ramesh", "Anil", "Priya", "Deepak", "Karan", "Sneha", "Manoj", "Rakesh", "Pooja"];
const OWNER_LAST_INITIAL = ["K", "M", "P", "S", "R", "T", "B", "G"];

const ITEMS_BY_CATEGORY: Record<string, Array<[string, string, [number, number]]>> = {
  Vegetables: [
    ["Green capsicum", "per kg", [35, 60]],
    ["Tomato", "per kg", [20, 45]],
    ["Onion", "per kg", [25, 50]],
    ["Potato", "per kg", [18, 35]],
    ["Spinach", "per bunch", [15, 30]],
    ["Cauliflower", "per piece", [25, 50]],
    ["Carrot", "per kg", [40, 70]],
    ["Ladyfinger", "per kg", [40, 80]],
  ],
  Fruits: [
    ["Banana", "per dozen", [50, 90]],
    ["Apple", "per kg", [120, 220]],
    ["Mango", "per kg", [100, 200]],
    ["Papaya", "per kg", [40, 80]],
    ["Orange", "per kg", [80, 150]],
    ["Pomegranate", "per kg", [180, 280]],
  ],
  Dairy: [
    ["Full cream milk", "per litre", [55, 75]],
    ["Curd", "per 500g", [40, 70]],
    ["Paneer", "per 250g", [80, 130]],
    ["Butter", "per 100g", [55, 90]],
    ["Cheese slices", "per pack", [120, 200]],
  ],
  Bakery: [
    ["White bread", "per loaf", [40, 60]],
    ["Brown bread", "per loaf", [50, 80]],
    ["Croissant", "per piece", [40, 80]],
    ["Pav buns", "per pack", [25, 45]],
  ],
  Groceries: [
    ["Basmati rice", "per kg", [90, 150]],
    ["Toor dal", "per kg", [120, 180]],
    ["Sunflower oil", "per litre", [140, 220]],
    ["Sugar", "per kg", [42, 55]],
    ["Atta", "per kg", [38, 55]],
  ],
  Meat: [
    ["Chicken breast", "per kg", [240, 320]],
    ["Mutton curry cut", "per kg", [720, 900]],
    ["Fish (rohu)", "per kg", [260, 380]],
    ["Eggs", "per dozen", [70, 100]],
  ],
  Stationery: [
    ["A4 notebook", "per piece", [50, 90]],
    ["Ballpoint pen", "per piece", [10, 25]],
    ["Sketch pens", "per pack", [80, 150]],
    ["Sticky notes", "per pack", [60, 110]],
  ],
  Pharmacy: [
    ["Paracetamol 500mg", "per strip", [25, 45]],
    ["Cough syrup", "per bottle", [85, 145]],
    ["ORS sachet", "per piece", [15, 25]],
    ["Hand sanitizer", "per bottle", [60, 120]],
  ],
};

const CUSTOMER_NAMES: Array<[string, string]> = [
  ["Rahul S", "RS"], ["Karan M", "KM"], ["Divya K", "DK"], ["Ananya G", "AG"],
  ["Deepak T", "DT"], ["Sonia P", "SP"], ["Vijay R", "VR"], ["Arjun M", "AM"],
  ["Riya B", "RB"], ["Manish J", "MJ"], ["Tanvi H", "TH"], ["Aakash N", "AN"],
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const ORDER_TYPES = ["Delivery", "Pickup"] as const;
const ORDER_STATUSES = [
  "Pending", "Accepted", "Preparing", "Out for delivery", "Completed", "Cancelled",
] as const;
const ITEM_STATUSES = ["In stock", "In stock", "In stock", "Low stock", "Out of stock"] as const;

// ---------- generation ----------
function parseSeed(argv: string[]): number {
  const idx = argv.indexOf("--seed");
  if (idx >= 0 && argv[idx + 1]) {
    const n = Number(argv[idx + 1]);
    if (Number.isFinite(n)) return n >>> 0;
  }
  return 20260531;
}

function generate(seed: number) {
  const rng = makeRng(seed);

  // ----- vendors -----
  const vendors = Array.from({ length: VENDOR_COUNT }, (_, i) => {
    const id = i + 1;
    const [a, b] = VENDOR_NAME_PARTS[i % VENDOR_NAME_PARTS.length];
    const suffix = i >= VENDOR_NAME_PARTS.length ? ` ${Math.floor(i / VENDOR_NAME_PARTS.length) + 1}` : "";
    const cats = pickN(rng, [...ALL_CATEGORIES], intRange(rng, 1, 3));
    const lat = round1(22.55 + rng() * 0.1);   // around New Town Kolkata
    const lng = round1(88.42 + rng() * 0.1);
    return {
      id,
      name: `${a} ${b}${suffix}`,
      owner: `${pick(rng, OWNER_FIRST)} ${pick(rng, OWNER_LAST_INITIAL)}`,
      phone: `+91 9${intRange(rng, 100000000, 999999999)}`,
      address: `Action Area ${pick(rng, ["I", "II", "III"])}, New Town`,
      latitude: lat,
      longitude: lng,
      categories: cats,
      distance: `${round1(0.3 + rng() * 4)} km`,
      rating: round1(3.8 + rng() * 1.2),
      open: rng() > 0.15,
      delivery: rng() > 0.2,
      delivery_radius: intRange(rng, 1500, 4000),
    };
  });

  // ----- items -----
  const items: Array<{
    id: number; name: string; vendor_id: number; vendor_name: string;
    category: string; price: number; unit: string; status: string;
  }> = [];
  let itemId = 1;
  while (items.length < ITEM_COUNT) {
    const vendor = pick(rng, vendors);
    const cat = pick(rng, vendor.categories);
    const catalog = ITEMS_BY_CATEGORY[cat] ?? [];
    if (!catalog.length) continue;
    const [name, unit, [lo, hi]] = pick(rng, catalog);
    items.push({
      id: itemId++,
      name,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      category: cat,
      price: intRange(rng, lo, hi),
      unit,
      status: pick(rng, [...ITEM_STATUSES]),
    });
  }

  // ----- orders -----
  const orders = Array.from({ length: ORDER_COUNT }, (_, i) => {
    const id = 4900 + i;
    const vendor = pick(rng, vendors);
    const vendorItems = items.filter((x) => x.vendor_id === vendor.id);
    const pool = vendorItems.length ? vendorItems : items;
    const picks = pickN(rng, pool, intRange(rng, 1, 4));
    const items_count = picks.reduce((s) => s + intRange(rng, 1, 4), 0);
    const amount = picks.reduce((s, it) => s + it.price * intRange(rng, 1, 3), 0);
    return {
      id,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      customer_name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length][0],
      customer_code: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length][1],
      amount,
      items_count,
      type: pick(rng, [...ORDER_TYPES]),
      status: pick(rng, [...ORDER_STATUSES]),
      time: `${intRange(rng, 1, 59)} min ago`,
      day: pick(rng, [...DAYS]),
    };
  }).reverse(); // newest first

  // ----- weekly totals -----
  const weekly_totals = DAYS.reduce<Record<string, number>>((acc, d) => {
    acc[d] = orders.filter((o) => o.day === d).length;
    return acc;
  }, {});

  // ----- settings -----
  const settings = {
    discovery_radius: 3.0,
    default_delivery_fee: 25,
    order_model: "Pickup + Delivery",
  };

  // ----- admins (seeded with the owner) -----
  const admins = [
    {
      email: "purchase@ascentspark.com",
      name: "Owner",
      role: "owner",
      active: true,
      created_at: 1780000000000,
    },
  ];

  return { vendors, items, orders, admins, settings, weekly_totals };
}

async function main() {
  const seed = parseSeed(process.argv);
  const data = generate(seed);
  const target = path.join(process.cwd(), "db.json");
  await writeFile(target, JSON.stringify(data, null, 2));
  console.log(
    `[gen] wrote ${target}  seed=${seed}  ` +
      `vendors=${data.vendors.length} items=${data.items.length} orders=${data.orders.length}`,
  );
}
main().catch((e) => {
  console.error("[gen] failed:", e);
  process.exit(1);
});
