import { z } from "zod";

export const Day = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
export type Day = z.infer<typeof Day>;

export const VendorSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  owner: z.string().max(120).default(""),
  phone: z.string().max(40).default(""),
  address: z.string().max(240).default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  categories: z.array(z.string()).default([]),
  distance: z.string().optional(),
  rating: z.number().min(0).max(5).default(4.5),
  open: z.boolean().default(true),
  delivery: z.boolean().default(true),
  delivery_radius: z.number().int().nonnegative().default(2000),
});
export type Vendor = z.infer<typeof VendorSchema>;
export const VendorCreate = VendorSchema.omit({ id: true, distance: true, rating: true });

export const ItemStatus = z.enum(["In stock", "Low stock", "Out of stock"]);
export const ItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  vendor_id: z.number().int().positive(),
  vendor_name: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  unit: z.string(),
  status: ItemStatus.default("In stock"),
});
export type Item = z.infer<typeof ItemSchema>;

export const OrderType = z.enum(["Delivery", "Pickup"]);
export const OrderStatus = z.enum([
  "Pending",
  "Accepted",
  "Preparing",
  "Out for delivery",
  "Completed",
  "Cancelled",
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
  time: z.string(),
  day: Day,
});
export type Order = z.infer<typeof OrderSchema>;

export const SettingsSchema = z.object({
  discovery_radius: z.number().positive(),
  default_delivery_fee: z.number().nonnegative(),
  order_model: z.enum(["Pickup", "Delivery", "Pickup + Delivery"]),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const SettingsPatch = SettingsSchema.partial();

export const WeeklyTotalsSchema = z.object({
  Mon: z.number().nonnegative().default(0),
  Tue: z.number().nonnegative().default(0),
  Wed: z.number().nonnegative().default(0),
  Thu: z.number().nonnegative().default(0),
  Fri: z.number().nonnegative().default(0),
  Sat: z.number().nonnegative().default(0),
  Sun: z.number().nonnegative().default(0),
});
export type WeeklyTotals = z.infer<typeof WeeklyTotalsSchema>;

export const AdminRole = z.enum(["owner", "admin", "viewer"]);
export const AdminSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase()),
  name: z.string().min(1).max(120),
  role: AdminRole.default("admin"),
  active: z.boolean().default(true),
  created_at: z.number().int().nonnegative(),
});
export type Admin = z.infer<typeof AdminSchema>;
export const AdminCreate = AdminSchema.omit({ created_at: true });
export const AdminPatch = AdminSchema.omit({ email: true, created_at: true }).partial();
