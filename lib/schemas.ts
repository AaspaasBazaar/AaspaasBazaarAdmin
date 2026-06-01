import { z } from "zod";

export const Day = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
export type Day = z.infer<typeof Day>;

// ----- shared validators -----
const Pincode = z.string().regex(/^\d{6}$/, "6-digit Indian pincode");
const PhoneE164ish = z.string().regex(/^\+?[\d\s-]{7,20}$/, "phone like +91 9876543210");
const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "hex color like #2E9E4F");
const Hhmm = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM");

// ----- zones -----
export const ZoneSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  pincodes: z.array(Pincode).min(1, "at least one pincode"),
  center_lat: z.number().min(-90).max(90).optional(),
  center_lng: z.number().min(-180).max(180).optional(),
  zonal_admin_email: z.string().email().max(254).optional()
    .transform((s) => (s ? s.toLowerCase() : s)),
  active: z.boolean().default(true),
  created_at: z.number().int().nonnegative(),
});
export type Zone = z.infer<typeof ZoneSchema>;
export const ZoneCreate = ZoneSchema.omit({ created_at: true });
export const ZonePatch = ZoneSchema.omit({ id: true, created_at: true }).partial();

// ----- vendors -----
export const VendorStatus = z.enum(["pending", "approved", "rejected", "suspended"]);
export const PaymentMethod = z.enum(["upi", "cash", "card", "wallet"]);

const DayHours = z.object({
  closed: z.boolean().default(false),
  open: Hhmm.default("09:00"),
  close: Hhmm.default("21:00"),
});
export const BusinessHoursSchema = z.object({
  Mon: DayHours, Tue: DayHours, Wed: DayHours,
  Thu: DayHours, Fri: DayHours, Sat: DayHours, Sun: DayHours,
});
export const DEFAULT_HOURS = {
  Mon: { closed: false, open: "09:00", close: "21:00" },
  Tue: { closed: false, open: "09:00", close: "21:00" },
  Wed: { closed: false, open: "09:00", close: "21:00" },
  Thu: { closed: false, open: "09:00", close: "21:00" },
  Fri: { closed: false, open: "09:00", close: "21:00" },
  Sat: { closed: false, open: "09:00", close: "21:00" },
  Sun: { closed: true,  open: "09:00", close: "21:00" },
};

export const VendorSchema = z.object({
  // identity
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  owner: z.string().max(120).default(""),
  description: z.string().max(500).default(""),
  specialty: z.string().max(120).default(""),

  // contact
  phone: PhoneE164ish.default(""),
  whatsapp: z.string().max(40).default(""),
  email: z.string().email().max(254).optional()
    .transform((s) => (s ? s.toLowerCase() : s)),

  // location
  address: z.string().max(240).default(""),
  pincode: Pincode.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distance: z.string().optional(),

  // taxonomy
  categories: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(4.5),

  // operations (set per-vendor)
  open: z.boolean().default(true),
  pickup_available: z.boolean().default(true),
  delivery_available: z.boolean().default(true),
  delivery: z.boolean().default(true), // legacy alias — keep for backward compatibility
  delivery_radius: z.number().int().nonnegative().default(2000),     // metres — per-vendor
  delivery_fee: z.number().nonnegative().default(25),                // INR — per-vendor
  min_order_amount: z.number().nonnegative().default(0),             // INR
  prep_time_minutes: z.number().int().nonnegative().default(20),
  payment_methods: z.array(PaymentMethod).default(["upi", "cash"]),
  business_hours: BusinessHoursSchema.default(DEFAULT_HOURS),

  // compliance (optional in India)
  gst_number: z.string().max(20).optional(),
  fssai_license: z.string().max(20).optional(),

  // payouts
  bank_account_name: z.string().max(120).optional(),
  bank_account_number: z.string().max(40).optional(),
  ifsc_code: z.string().max(20).optional(),
  upi_id: z.string().max(80).optional(),

  // platform / approval workflow
  zone_id: z.string().min(1).optional(),
  status: VendorStatus.default("pending"),
  approved_by: z.string().email().optional(),
  approved_at: z.number().int().nonnegative().optional(),
  rejection_reason: z.string().max(500).optional(),
  notes: z.string().max(1000).default(""),
  created_at: z.number().int().nonnegative().default(0),
});
export type Vendor = z.infer<typeof VendorSchema>;
export const VendorCreate = VendorSchema.omit({
  id: true,
  distance: true,
  rating: true,
  status: true,
  approved_by: true,
  approved_at: true,
  rejection_reason: true,
  created_at: true,
});
export const VendorPatch = VendorSchema
  .omit({ id: true, distance: true, created_at: true })
  .partial();

// ----- items -----
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
export const ItemCreate = ItemSchema.omit({ id: true, vendor_name: true });
export const ItemPatch = ItemSchema.omit({ id: true, vendor_name: true }).partial();

// ----- orders -----
export const OrderType = z.enum(["Delivery", "Pickup"]);
export const OrderStatus = z.enum([
  "Pending", "Accepted", "Preparing", "Out for delivery", "Completed", "Cancelled",
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
  // Firebase uid of the customer who placed it via the app. Optional because
  // admin-created / simulated orders use the anonymous code-based model and
  // carry no user account. Required for per-user scoping + the /orders realtime
  // read rule in firestore.rules.
  user_id: z.string().min(1).optional(),
});
export type Order = z.infer<typeof OrderSchema>;

// ----- settings (platform-wide defaults; vendor overrides win) -----
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

// ----- categories -----
export const CategorySchema = z.object({
  slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  name: z.string().min(1).max(80),
  color: HexColor.default("#2E9E4F"),
  vendor_count: z.number().int().nonnegative().default(0),
  created_at: z.number().int().nonnegative(),
});
export type Category = z.infer<typeof CategorySchema>;
export const CategoryCreate = CategorySchema.omit({ created_at: true, vendor_count: true });
export const CategoryPatch = CategorySchema
  .omit({ slug: true, created_at: true, vendor_count: true })
  .partial();

// ----- admins -----
export const AdminRole = z.enum(["owner", "zonal_admin", "admin", "viewer"]);
export const AdminSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase()),
  name: z.string().min(1).max(120),
  role: AdminRole.default("admin"),
  active: z.boolean().default(true),
  zone_id: z.string().min(1).optional(), // required at app-level when role === "zonal_admin"
  created_at: z.number().int().nonnegative(),
  password_hash: z.string().optional(),
  password_salt: z.string().optional(),
});
export type Admin = z.infer<typeof AdminSchema>;
export const AdminCreate = AdminSchema
  .omit({ created_at: true, password_hash: true, password_salt: true })
  .extend({ password: z.string().min(8).max(128).optional() });
export const AdminPatch = AdminSchema
  .omit({ email: true, created_at: true, password_hash: true, password_salt: true })
  .partial()
  .extend({ password: z.string().min(8).max(128).optional() });

// ----- app users (customers of the user app) -----
// Keyed by Firebase uid. Identity is owned by Firebase Auth; this record holds
// the marketplace profile. No password fields — auth is delegated to Firebase.
export const UserSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(20).optional(),
  default_address: z.string().max(500).optional(),
  default_pincode: z.string().max(10).optional(),
  active: z.boolean().default(true),
  created_at: z.number().int().nonnegative(),
});
export type User = z.infer<typeof UserSchema>;
// Fields a client may set when creating/patching its own profile. uid, active,
// and created_at are server-controlled (uid from the verified token).
export const UserCreate = UserSchema.omit({ uid: true, active: true, created_at: true });
export const UserPatch = UserCreate.partial();
