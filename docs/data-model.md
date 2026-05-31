# Data Model

All collections live in Firestore. Document IDs are strings; for entities that have a stable numeric ID in the current `db.json` (vendors, items, orders) we store the numeric ID as a string and also keep it as a typed field for queries.

## TypeScript types (`lib/schemas.ts`)

```ts
import { z } from "zod";

export const VendorSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  owner: z.string().min(1),
  phone: z.string().regex(/^\+?[\d\s-]{7,20}$/),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  categories: z.array(z.string()).min(1),
  distance: z.string().optional(),            // derived display value
  rating: z.number().min(0).max(5),
  open: z.boolean(),
  delivery: z.boolean(),
  delivery_radius: z.number().int().nonnegative(),   // metres
});
export type Vendor = z.infer<typeof VendorSchema>;

export const ItemStatus = z.enum(["In stock", "Low stock", "Out of stock"]);
export const ItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  vendor_id: z.number().int().positive(),
  vendor_name: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  unit: z.string(),                                  // e.g. "per kg"
  status: ItemStatus,
});
export type Item = z.infer<typeof ItemSchema>;

export const OrderType = z.enum(["Delivery", "Pickup"]);
export const OrderStatus = z.enum([
  "Pending", "Accepted", "Preparing", "Out for delivery",
  "Completed", "Cancelled",
]);
export const OrderSchema = z.object({
  id: z.number().int().positive(),
  vendor_id: z.number().int().positive(),
  vendor_name: z.string(),
  customer_name: z.string(),
  customer_code: z.string().max(4),
  amount: z.number().nonnegative(),
  items_count: z.number().int().nonnegative(),
  type: OrderType,
  status: OrderStatus,
  time: z.string(),                                  // human display ("Just now")
  created_at: z.number().int(),                      // unix ms — for sort/index
  day: z.enum(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]),
});
export type Order = z.infer<typeof OrderSchema>;

export const SettingsSchema = z.object({
  discovery_radius: z.number().positive(),           // km
  default_delivery_fee: z.number().nonnegative(),    // INR
  order_model: z.enum(["Pickup", "Delivery", "Pickup + Delivery"]),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const WeeklyTotalsSchema = z.record(
  z.enum(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]),
  z.number().nonnegative(),
);
export type WeeklyTotals = z.infer<typeof WeeklyTotalsSchema>;

export const AdminRole = z.enum(["owner", "admin", "viewer"]);
export const AdminSchema = z.object({
  email: z.string().email().max(254).transform(s => s.toLowerCase()),
  name: z.string().min(1).max(120),
  role: AdminRole,
  active: z.boolean().default(true),
  created_at: z.number().int().nonnegative(),     // unix ms
});
export type Admin = z.infer<typeof AdminSchema>;
```

## Firestore collections

| Collection | Doc ID | Fields | Notes |
|------------|--------|--------|-------|
| `vendors` | `String(id)` | `Vendor` | Source of truth for vendor metadata |
| `items` | `String(id)` | `Item` | Denormalized `vendor_name` for list views |
| `orders` | `String(id)` | `Order` | Append-only; status updated in place |
| `settings` | `global` | `Settings` | Single doc holding platform config |
| `weeklyTotals` | `current` | `WeeklyTotals` | Rolling 7-day buckets; resets weekly |
| `admins` | lowercase email | `Admin` | Allowlist + role for every admin-panel user. `email` is the doc ID. |

## Indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    { "collectionGroup": "orders", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status",     "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    { "collectionGroup": "orders", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendor_id",  "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    { "collectionGroup": "items", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendor_id", "order": "ASCENDING" },
        { "fieldPath": "status",    "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Invariants

- `items.vendor_id` must reference an existing `vendors.id`. Enforced server-side in `lib/db/items.ts` before write.
- `orders.vendor_id` must reference an existing `vendors.id`. Same enforcement.
- When a vendor is deleted, its items are deleted in the same batched write. Past orders are kept (audit trail) but flagged via `vendor_name` snapshot already present.
- `vendors.delivery_radius` stored in **metres** (existing convention); UI converts to km/m for display.
- `settings.discovery_radius` stored in **km**.

## Derived / display fields

| Field | Computed where | How |
|-------|----------------|-----|
| `vendor.distance` | Server, per request | Haversine between user coords and vendor lat/lng. Stored only when seeded; ideally computed at read time. |
| `order.time` | Server | `formatRelative(now, created_at)` (date-fns). |
| `order.day` | Server | `format(created_at, 'EEE')`. |
| Dashboard `stats` | API `/api/stats` | Counts + sums across collections. |

## Migration from `db.json`

See [migration.md](./migration.md). One-off script `scripts/seed-from-dbjson.ts` reads `db.json` and writes each top-level array/object to Firestore in batches of 500.
