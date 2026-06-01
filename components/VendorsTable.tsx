"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Vendor, Category, Zone } from "@/lib/schemas";
import { CategoryBadge } from "@/components/CategoryBadge";

const AVATAR_TONES = [
  "bg-ocean-50", "bg-leaf-50", "bg-orange-50",
  "bg-rose-50", "bg-amber-50", "bg-aqua-50",
];
const AVATAR_DOTS = [
  "bg-ocean-400", "bg-leaf-500", "bg-orange-600",
  "bg-rose-600", "bg-amber-600", "bg-aqua-400",
];
const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-leaf-100 text-leaf-800",
  rejected: "bg-orange-50 text-orange-600",
  suspended: "bg-sage-100 text-sage-600",
};

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; original: Vendor };

export function VendorsTable({
  initial,
  categories,
  zones,
}: {
  initial: Vendor[];
  categories: Category[];
  zones: Zone[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [catFilter, setCatFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  const filtered = useMemo(() => {
    return initial.filter((v) =>
      (catFilter === "All" || v.categories.includes(catFilter)) &&
      (statusFilter === "all" || v.status === statusFilter) &&
      (zoneFilter === "all" || v.zone_id === zoneFilter),
    );
  }, [initial, catFilter, statusFilter, zoneFilter]);

  const chips = ["All", ...categories.map((c) => c.name)];

  function call(method: "POST" | "DELETE" | "PATCH", path: string, body?: unknown) {
    start(async () => {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error?.message ?? `${method} ${path} → HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-sage-100">
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map((f) => (
            <button
              key={f}
              onClick={() => setCatFilter(f)}
              className={catFilter === f ? "chip-active" : "chip"}
            >
              {f}
            </button>
          ))}
        </div>
        <select className="input-pill" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="input-pill" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
          <option value="all">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <div className="ml-auto">
          <button
            className="btn-primary"
            onClick={() => (mode.kind === "closed" ? setMode({ kind: "create" }) : setMode({ kind: "closed" }))}
            disabled={pending}
          >
            {mode.kind === "closed" ? "+ Add vendor" : "Cancel"}
          </button>
        </div>
      </div>

      {mode.kind !== "closed" && (
        <VendorForm
          mode={mode}
          categories={categories}
          zones={zones}
          onCancel={() => setMode({ kind: "closed" })}
          onSaved={() => {
            setMode({ kind: "closed" });
            router.refresh();
          }}
        />
      )}

      <table className="w-full text-sm">
        <thead className="bg-sage-50/40">
          <tr className="text-left text-[11px] uppercase tracking-wider text-sage-600">
            <th className="px-5 py-3 font-bold">Vendor</th>
            <th className="px-5 py-3 font-bold">Categories</th>
            <th className="px-5 py-3 font-bold">Zone</th>
            <th className="px-5 py-3 font-bold">Delivery</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3 font-bold">Open</th>
            <th className="px-5 py-3 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sage-400">
                No vendors match these filters
              </td>
            </tr>
          )}
          {filtered.map((v, i) => (
            <tr key={v.id} className="border-t border-sage-100/80">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-[10px] ${AVATAR_TONES[i % AVATAR_TONES.length]} grid place-items-center`}>
                    <span className={`h-3.5 w-3.5 rounded-full ${AVATAR_DOTS[i % AVATAR_DOTS.length]}`} />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[13.5px] font-semibold text-ink-600">{v.name}</div>
                    <div className="text-[12px] text-sage-600">
                      {v.pincode ? <span className="font-mono">{v.pincode} · </span> : null}
                      {v.address || "—"}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {v.categories.map((c) => <CategoryBadge key={c} name={c} />)}
                </div>
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-sage-600">
                {v.zone_id ?? <span className="text-sage-400">—</span>}
              </td>
              <td className="px-5 py-3 leading-tight">
                <div className="font-mono text-[12.5px] text-ink-600">
                  ₹{v.delivery_fee} · {(v.delivery_radius / 1000).toFixed(1)} km
                </div>
                <div className="text-[11px] text-sage-600">
                  min ₹{v.min_order_amount} · {v.prep_time_minutes} min prep
                </div>
              </td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${STATUS_TONE[v.status] ?? "bg-sage-100 text-sage-600"}`}>
                  {v.status}
                </span>
              </td>
              <td className="px-5 py-3">
                <button
                  onClick={() => call("POST", `/api/vendors/${v.id}/toggle`)}
                  disabled={pending}
                  aria-label="Toggle open"
                  className={`inline-flex h-[22px] w-[38px] items-center rounded-full p-0.5 transition-colors ${
                    v.open ? "justify-end bg-leaf-600" : "justify-start bg-sage-300"
                  }`}
                >
                  <span className="h-[18px] w-[18px] rounded-full bg-white" />
                </button>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {v.status === "pending" && (
                    <>
                      <button
                        onClick={() => call("POST", `/api/vendors/${v.id}/approve`)}
                        disabled={pending}
                        title="Approve vendor"
                        className="h-[30px] rounded-[8px] border border-leaf-200 bg-leaf-50 text-leaf-800 px-2 text-[12px] font-semibold hover:bg-leaf-100"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(`Reason for rejecting "${v.name}":`);
                          if (!reason || reason.length < 3) return;
                          call("POST", `/api/vendors/${v.id}/reject`, { reason });
                        }}
                        disabled={pending}
                        title="Reject vendor"
                        className="h-[30px] rounded-[8px] border border-sage-200 bg-white text-ruby-600 px-2 text-[12px] font-semibold hover:bg-orange-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {v.status === "approved" && (
                    <button
                      onClick={() => {
                        const reason = prompt(`Reason for suspending "${v.name}":`) ?? "";
                        call("POST", `/api/vendors/${v.id}/suspend`, { reason });
                      }}
                      disabled={pending}
                      title="Suspend vendor"
                      className="h-[30px] rounded-[8px] border border-sage-200 bg-white text-amber-600 px-2 text-[12px] font-semibold hover:bg-amber-50"
                    >
                      Suspend
                    </button>
                  )}
                  {(v.status === "rejected" || v.status === "suspended") && (
                    <button
                      onClick={() => call("POST", `/api/vendors/${v.id}/approve`)}
                      disabled={pending}
                      title="Re-approve vendor"
                      className="h-[30px] rounded-[8px] border border-leaf-200 bg-leaf-50 text-leaf-800 px-2 text-[12px] font-semibold hover:bg-leaf-100"
                    >
                      Re-approve
                    </button>
                  )}
                  <button
                    onClick={() => setMode({ kind: "edit", original: v })}
                    title="Edit vendor"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-sage-600 hover:bg-sage-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete vendor "${v.name}" and all its items?`)) return;
                      call("DELETE", `/api/vendors/${v.id}`);
                    }}
                    disabled={pending}
                    title="Delete vendor"
                    className="h-[30px] w-[30px] rounded-[8px] border border-sage-200 bg-white grid place-items-center text-ruby-600 hover:bg-orange-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="section-label">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, mono, type = "text", col = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  col?: 1 | 2 | 3;
}) {
  const span = col === 3 ? "sm:col-span-3" : col === 2 ? "sm:col-span-2" : "";
  return (
    <label className={`block ${span}`}>
      <span className="text-[12px] font-semibold text-sage-600">{label}</span>
      <input
        type={type}
        className={`input-pill w-full mt-1 ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

const PAYMENT_OPTIONS = ["upi", "cash", "card", "wallet"] as const;

function VendorForm({
  mode,
  categories,
  zones,
  onCancel,
  onSaved,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  categories: Category[];
  zones: Zone[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit";
  const original = editing ? mode.original : null;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ----- form state -----
  const [name, setName] = useState(original?.name ?? "");
  const [owner, setOwner] = useState(original?.owner ?? "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [specialty, setSpecialty] = useState(original?.specialty ?? "");

  const [phone, setPhone] = useState(original?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(original?.whatsapp ?? "");
  const [email, setEmail] = useState(original?.email ?? "");

  const [address, setAddress] = useState(original?.address ?? "");
  const [pincode, setPincode] = useState(original?.pincode ?? "");
  const [lat, setLat] = useState(String(original?.latitude ?? "22.5811"));
  const [lng, setLng] = useState(String(original?.longitude ?? "88.4760"));
  const [zoneId, setZoneId] = useState(original?.zone_id ?? "");

  const [picked, setPicked] = useState<string[]>(original?.categories ?? []);

  const [open, setOpen] = useState(original?.open ?? true);
  const [pickup, setPickup] = useState(original?.pickup_available ?? true);
  const [delivery, setDelivery] = useState(original?.delivery_available ?? true);
  const [deliveryRadius, setDeliveryRadius] = useState(String(original?.delivery_radius ?? "2000"));
  const [deliveryFee, setDeliveryFee] = useState(String(original?.delivery_fee ?? "25"));
  const [minOrder, setMinOrder] = useState(String(original?.min_order_amount ?? "0"));
  const [prepTime, setPrepTime] = useState(String(original?.prep_time_minutes ?? "20"));
  const [payments, setPayments] = useState<string[]>(original?.payment_methods ?? ["upi", "cash"]);

  const [gst, setGst] = useState(original?.gst_number ?? "");
  const [fssai, setFssai] = useState(original?.fssai_license ?? "");

  const [bankName, setBankName] = useState(original?.bank_account_name ?? "");
  const [bankAccount, setBankAccount] = useState(original?.bank_account_number ?? "");
  const [ifsc, setIfsc] = useState(original?.ifsc_code ?? "");
  const [upi, setUpi] = useState(original?.upi_id ?? "");

  function togglePick(set: string[], setSet: (v: string[]) => void, name: string) {
    setSet(set.includes(name) ? set.filter((x) => x !== name) : [...set, name]);
  }

  // Auto-pick zone when pincode matches a known zone
  function syncZoneFromPincode(pin: string) {
    setPincode(pin);
    if (!zoneId && /^\d{6}$/.test(pin)) {
      const match = zones.find((z) => z.pincodes.includes(pin));
      if (match) setZoneId(match.id);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name) return setError("Vendor name is required");
    if (!picked.length) return setError("Pick at least one category");
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return setError("Latitude/longitude must be numeric");
    if (pincode && !/^\d{6}$/.test(pincode)) return setError("Pincode must be 6 digits");

    start(async () => {
      const body: Record<string, unknown> = {
        name, owner, description, specialty,
        phone, whatsapp,
        address, latitude: latN, longitude: lngN,
        categories: picked,
        open, pickup_available: pickup, delivery_available: delivery, delivery,
        delivery_radius: parseInt(deliveryRadius, 10) || 0,
        delivery_fee: parseFloat(deliveryFee) || 0,
        min_order_amount: parseFloat(minOrder) || 0,
        prep_time_minutes: parseInt(prepTime, 10) || 0,
        payment_methods: payments,
      };
      if (email) body.email = email;
      if (pincode) body.pincode = pincode;
      if (zoneId) body.zone_id = zoneId;
      if (gst) body.gst_number = gst;
      if (fssai) body.fssai_license = fssai;
      if (bankName) body.bank_account_name = bankName;
      if (bankAccount) body.bank_account_number = bankAccount;
      if (ifsc) body.ifsc_code = ifsc;
      if (upi) body.upi_id = upi;

      const res = editing
        ? await fetch(`/api/vendors/${original!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={submit} className="px-5 py-4 border-b border-sage-100 bg-sage-50/40 space-y-5">
      <Section title="Basics">
        <Field label="Shop name" value={name} onChange={setName} placeholder="Amrit Dairy" col={2} />
        <Field label="Owner name" value={owner} onChange={setOwner} placeholder="Suresh K" />
        <Field label="Tagline / specialty" value={specialty} onChange={setSpecialty} placeholder="Pure Bengali sweets" col={2} />
        <label className="block sm:col-span-3">
          <span className="text-[12px] font-semibold text-sage-600">Description</span>
          <textarea
            className="input-pill w-full mt-1 min-h-[60px] py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Family-run dairy serving New Town since 2008…"
            maxLength={500}
          />
        </label>
        <div className="sm:col-span-3">
          <span className="text-[12px] font-semibold text-sage-600">Categories</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => togglePick(picked, setPicked, c.name)}
                className={`badge-soft cursor-pointer ${picked.includes(c.name) ? "" : "opacity-40"}`}
                style={{ background: c.color }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Contact">
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 9876543210" />
        <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+91 9876543210" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="shop@example.com" />
      </Section>

      <Section title="Location">
        <Field label="Address" value={address} onChange={setAddress} placeholder="Action Area I, New Town" col={2} />
        <Field label="Pincode" value={pincode} onChange={syncZoneFromPincode} placeholder="700156" mono />
        <Field label="Latitude" value={lat} onChange={setLat} mono />
        <Field label="Longitude" value={lng} onChange={setLng} mono />
        <label className="block">
          <span className="text-[12px] font-semibold text-sage-600">Zone</span>
          <select
            className="input-pill w-full mt-1 font-mono"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">— auto / unassigned —</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Operations (vendor-controlled)">
        <Field label="Delivery radius (m)" value={deliveryRadius} onChange={setDeliveryRadius} mono />
        <Field label="Delivery fee (₹)" value={deliveryFee} onChange={setDeliveryFee} mono />
        <Field label="Min order (₹)" value={minOrder} onChange={setMinOrder} mono />
        <Field label="Prep time (min)" value={prepTime} onChange={setPrepTime} mono />
        <div className="flex items-center gap-4 text-[12px] text-sage-600 sm:col-span-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Open now
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} /> Pickup
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /> Delivery
          </label>
        </div>
        <div className="sm:col-span-3">
          <span className="text-[12px] font-semibold text-sage-600">Payment methods</span>
          <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-sage-600">
            {PAYMENT_OPTIONS.map((p) => (
              <label key={p} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={payments.includes(p)}
                  onChange={() => togglePick(payments, setPayments, p)}
                />
                {p.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Compliance">
        <Field label="GST number" value={gst} onChange={setGst} placeholder="22AAAAA0000A1Z5" mono col={2} />
        <Field label="FSSAI licence" value={fssai} onChange={setFssai} placeholder="11522001000000" mono />
      </Section>

      <Section title="Payouts">
        <Field label="Account holder name" value={bankName} onChange={setBankName} placeholder="Amrit Kumar" />
        <Field label="Bank account number" value={bankAccount} onChange={setBankAccount} mono />
        <Field label="IFSC" value={ifsc} onChange={setIfsc} placeholder="HDFC0001234" mono />
        <Field label="UPI ID" value={upi} onChange={setUpi} placeholder="shopname@upi" mono col={3} />
      </Section>

      {error && <p className="text-[12px] text-ruby-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update vendor" : "Save vendor (pending approval)"}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        {!editing && (
          <p className="text-[11.5px] text-sage-600 self-center">
            New vendors enter the queue at <em className="not-italic font-semibold">pending</em>. A zonal admin or owner approves before they go live.
          </p>
        )}
      </div>
    </form>
  );
}
