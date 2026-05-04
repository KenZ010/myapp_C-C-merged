"use client";
import { useState, useMemo, useEffect, useRef } from "react";

type LossStatus = "Pending" | "Processed";
type LossReason = "Damaged" | "Defective" | "Expired" | "Wrong Item" | "Theft" | "Spoilage";
type LossType   = "Write-Off" | "Return to Supplier" | "Customer Return" | "Internal Waste";

type LossItem = {
  id: number;
  lossId: string;
  product: string;
  size: string;
  brand: string;
  qtyBottles: number;
  reason: LossReason;
  lossType: LossType;
  customer: string;
  store: string;
  date: string;
  status: LossStatus;
  unitCost: number;
  imageUrl: string | null;
  notes: string;
};

// ── Style maps ────────────────────────────────────────────────────────────────
const reasonStyle: Record<LossReason, { bg: string; color: string }> = {
  Damaged:      { bg: "#fff3e0", color: "#e65100" },
  Defective:    { bg: "#ffebee", color: "#c62828" },
  Expired:      { bg: "#f3e5f5", color: "#6a1b9a" },
  "Wrong Item": { bg: "#fce4ec", color: "#880e4f" },
  Theft:        { bg: "#212121", color: "#fff"    },
  Spoilage:     { bg: "#e8f5e9", color: "#2e7d32" },
};

const lossTypeStyle: Record<LossType, { bg: string; color: string }> = {
  "Write-Off":            { bg: "#ffebee", color: "#b71c1c" },
  "Return to Supplier":   { bg: "#e3f2fd", color: "#1565c0" },
  "Customer Return":      { bg: "#f3e5f5", color: "#6a1b9a" },
  "Internal Waste":       { bg: "#fafafa", color: "#555"    },
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const seed: LossItem[] = [
  { id: 1, lossId: "L-0001", product: "Coca Cola",   size: "1.5L",  brand: "CCBPI",       qtyBottles: 24,  reason: "Defective",    lossType: "Return to Supplier", customer: "—",         store: "Main Street",    date: "2026-01-22", status: "Processed", unitCost: 40,  imageUrl: null, notes: "Batch had cracked caps." },
  { id: 2, lossId: "L-0002", product: "Greek Yogurt", size: "200g",  brand: "Protein Plus", qtyBottles: 5,   reason: "Damaged",      lossType: "Write-Off",          customer: "—",         store: "Downtown Store", date: "2026-01-23", status: "Pending",   unitCost: 85,  imageUrl: null, notes: "" },
  { id: 3, lossId: "L-0003", product: "Orange Juice", size: "1L",    brand: "Citrus Fresh", qtyBottles: 12,  reason: "Expired",      lossType: "Write-Off",          customer: "—",         store: "Main Street",    date: "2026-01-21", status: "Processed", unitCost: 60,  imageUrl: null, notes: "Found during audit." },
  { id: 4, lossId: "L-0004", product: "Pepsi",        size: "500mL", brand: "PCPPI",        qtyBottles: 4,   reason: "Wrong Item",   lossType: "Customer Return",    customer: "Maria S.",  store: "Santos Mini Mart", date: "2026-01-19", status: "Processed", unitCost: 30, imageUrl: null, notes: "" },
  { id: 5, lossId: "L-0005", product: "Mtn Dew",      size: "1.5L",  brand: "PCPPI",        qtyBottles: 6,   reason: "Spoilage",     lossType: "Internal Waste",     customer: "—",         store: "Warehouse A",    date: "2026-01-18", status: "Pending",   unitCost: 38,  imageUrl: null, notes: "Storage temperature issue." },
  { id: 6, lossId: "L-0006", product: "Red Bull",     size: "250mL", brand: "Red Bull GmbH",qtyBottles: 48,  reason: "Theft",        lossType: "Write-Off",          customer: "—",         store: "Downtown Store", date: "2026-01-17", status: "Pending",   unitCost: 120, imageUrl: null, notes: "CCTV reported, case filed." },
];

const REASONS:    LossReason[] = ["Damaged","Defective","Expired","Wrong Item","Theft","Spoilage"];
const LOSS_TYPES: LossType[]   = ["Write-Off","Return to Supplier","Customer Return","Internal Waste"];

let idCounter = seed.length + 1;
const nextLossId = () => `L-${String(idCounter++).padStart(4, "0")}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────────────────────
export default function LossPage() {
  const [items,      setItems]      = useState<LossItem[]>(seed);
  const [filter,     setFilter]     = useState<"All" | LossStatus>("All");
  const [search,     setSearch]     = useState("");
  const [reasonFil,  setReasonFil]  = useState<LossReason | "All">("All");
  const [typeFil,    setTypeFil]    = useState<LossType | "All">("All");
  const [viewItem,   setViewItem]   = useState<LossItem | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [isNarrow,   setIsNarrow]   = useState(false);

  // ── form ──
  const emptyForm = {
    product: "", size: "", brand: "", qtyBottles: "",
    reason: "Damaged" as LossReason, lossType: "Write-Off" as LossType,
    customer: "", store: "", unitCost: "", notes: "",
    imageUrl: null as string | null,
  };
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1000);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── derived ──
  const filtered = useMemo(() =>
    items.filter((r) => {
      const q = search.toLowerCase();
      return (
        (filter    === "All" || r.status   === filter)    &&
        (reasonFil === "All" || r.reason   === reasonFil) &&
        (typeFil   === "All" || r.lossType === typeFil)   &&
        (r.lossId.toLowerCase().includes(q) ||
         r.product.toLowerCase().includes(q) ||
         r.brand.toLowerCase().includes(q)   ||
         r.store.toLowerCase().includes(q))
      );
    }),
    [items, filter, search, reasonFil, typeFil]
  );

  const totalLoss   = items.reduce((s, r) => s + r.qtyBottles * r.unitCost, 0);
  const pendingLoss = items.filter((r) => r.status === "Pending").reduce((s, r) => s + r.qtyBottles * r.unitCost, 0);
  const pending     = items.filter((r) => r.status === "Pending").length;
  const processed   = items.filter((r) => r.status === "Processed").length;

  const markProcessed = (id: number) => {
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, status: "Processed" } : r));
    if (viewItem?.id === id) setViewItem((v) => v ? { ...v, status: "Processed" } : v);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "form" | "view") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (target === "form") setForm((f) => ({ ...f, imageUrl: reader.result as string }));
      else if (viewItem) {
        const updated = { ...viewItem, imageUrl: reader.result as string };
        setViewItem(updated);
        setItems((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.product || !form.brand || !form.qtyBottles) return;
    const newItem: LossItem = {
      id: Date.now(),
      lossId: nextLossId(),
      product: form.product,
      size: form.size || "—",
      brand: form.brand,
      qtyBottles: Number(form.qtyBottles),
      reason: form.reason,
      lossType: form.lossType,
      customer: form.customer || "—",
      store: form.store || "—",
      date: new Date().toISOString().split("T")[0],
      status: "Pending",
      unitCost: Number(form.unitCost) || 0,
      imageUrl: form.imageUrl,
      notes: form.notes,
    };
    setItems((prev) => [newItem, ...prev]);
    setForm({ ...emptyForm });
    setShowForm(false);
  };

  // ── input style ──
  const IS: React.CSSProperties = {
    width: "100%", padding: "9px 14px", borderRadius: "10px",
    border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none",
    background: "#fff", boxSizing: "border-box", color: "#1a1a1a",
  };

  return (
    <div style={{ padding: "28px", background: "#f7f8fa", minHeight: "100vh" }}>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Records",   value: items.length, sub: "",            icon: "📋", bg: "#f0faf2", color: "#1a3c2e" },
          { label: "Pending",         value: pending,      sub: fmt(pendingLoss) + " exposure", icon: "⏳", bg: "#fff8e1", color: "#e65100" },
          { label: "Processed",       value: processed,    sub: "",            icon: "✅", bg: "#e8f5e9", color: "#2e7d32" },
          { label: "Total Loss Value",value: "",           sub: fmt(totalLoss), icon: "💸", bg: "#ffebee", color: "#c62828" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{s.icon}</div>
            <div>
              {s.value !== "" && <p style={{ fontSize: "26px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>}
              {s.sub && <p style={{ fontSize: s.value === "" ? "18px" : "11px", fontWeight: s.value === "" ? 800 : 400, color: s.value === "" ? s.color : "#999", marginTop: "2px" }}>{s.sub}</p>}
              <p style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, product, store..." style={{ ...IS, paddingLeft: "34px", borderRadius: "20px", width: "220px" }} />
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: "5px", background: "#f5f5f5", borderRadius: "20px", padding: "3px" }}>
          {(["All", "Pending", "Processed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: filter === f ? 700 : 500, cursor: "pointer", border: "none", background: filter === f ? "#1a3c2e" : "transparent", color: filter === f ? "#fff" : "#666", transition: "all 0.15s" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Reason filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f5f5f5", borderRadius: "20px", padding: "5px 12px" }}>
          <span style={{ fontSize: "12px" }}>⚠️</span>
          <select value={reasonFil} onChange={(e) => setReasonFil(e.target.value as LossReason | "All")} style={{ border: "none", background: "transparent", fontSize: "12px", outline: "none", color: "#444", cursor: "pointer" }}>
            <option value="All">Reason: All</option>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Loss type filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f5f5f5", borderRadius: "20px", padding: "5px 12px" }}>
          <span style={{ fontSize: "12px" }}>🏷</span>
          <select value={typeFil} onChange={(e) => setTypeFil(e.target.value as LossType | "All")} style={{ border: "none", background: "transparent", fontSize: "12px", outline: "none", color: "#444", cursor: "pointer" }}>
            <option value="All">Type: All</option>
            {LOSS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button onClick={() => setShowForm(true)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "7px", padding: "9px 20px", borderRadius: "20px", border: "none", background: "#1a3c2e", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(26,60,46,0.3)" }}>
          + Log Loss
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1020px" }}>
            <thead>
              <tr style={{ background: "#1a3c2e" }}>
                {["Loss ID","Product / Size","Brand","Qty (Bottles)","Reason","Loss Type","Customer","Store","Date","Status","Action"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: "60px", textAlign: "center", color: "#bbb" }}>
                  <div style={{ fontSize: "38px", marginBottom: "10px" }}>📭</div>
                  <p style={{ fontSize: "14px" }}>No loss records found</p>
                </td></tr>
              ) : filtered.map((r, idx) => {
                const rs = reasonStyle[r.reason];
                const ts = lossTypeStyle[r.lossType];
                return (
                  <tr key={r.id}
                    style={{ borderBottom: "0.5px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                  >
                    {/* Loss ID */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#1a3c2e", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace", fontWeight: 700 }}>{r.lossId}</span>
                    </td>
                    {/* Product / Size */}
                    <td style={{ padding: "13px 16px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{r.product}</p>
                      <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{r.size}</p>
                    </td>
                    {/* Brand */}
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#555" }}>{r.brand}</td>
                    {/* Qty */}
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#c62828" }}>{r.qtyBottles}</span>
                      <p style={{ fontSize: "10px", color: "#bbb" }}>btl</p>
                    </td>
                    {/* Reason */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: rs.bg, color: rs.color }}>{r.reason}</span>
                    </td>
                    {/* Loss Type */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ts.bg, color: ts.color }}>{r.lossType}</span>
                    </td>
                    {/* Customer */}
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "#666" }}>{r.customer}</td>
                    {/* Store */}
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "#666" }}>{r.store}</td>
                    {/* Date */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#f5f5f5", color: "#666", padding: "3px 10px", borderRadius: "20px", fontSize: "11px" }}>📅 {r.date}</span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: r.status === "Processed" ? "#e8f5e9" : "#fff8e1", color: r.status === "Processed" ? "#2e7d32" : "#e65100" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: r.status === "Processed" ? "#4caf50" : "#ff9800" }} />
                        {r.status}
                      </span>
                    </td>
                    {/* Action */}
                    <td style={{ padding: "13px 16px" }}>
                      <button onClick={() => setViewItem(r)} style={{ padding: "7px 16px", borderRadius: "20px", border: "none", background: "#e8f0fe", color: "#1565c0", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                        👁 View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "12px", color: "#aaa" }}>Showing <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong> of <strong style={{ color: "#1a1a1a" }}>{items.length}</strong> records</p>
          <p style={{ fontSize: "12px", color: "#c62828", fontWeight: 700 }}>Filtered loss: {fmt(filtered.reduce((s, r) => s + r.qtyBottles * r.unitCost, 0))}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LOG LOSS FORM MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "22px", width: "min(96vw, 540px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 28px 80px rgba(0,0,0,0.22)" }}>
            {/* header */}
            <div style={{ background: "linear-gradient(135deg, #1a3c2e 0%, #2e7d32 100%)", borderRadius: "22px 22px 0 0", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>📋 Log New Loss</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>Record a product loss or return event</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#fff", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Product */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Product Name *</label>
                  <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="e.g. Coca Cola" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Size</label>
                  <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 1.5L" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Brand *</label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. CCBPI" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Qty (Bottles) *</label>
                  <input type="number" value={form.qtyBottles} onChange={(e) => setForm({ ...form, qtyBottles: e.target.value })} placeholder="e.g. 24" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Unit Cost (₱)</label>
                  <input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} placeholder="e.g. 40" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Reason *</label>
                  <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as LossReason })} style={{ ...IS, cursor: "pointer" }}>
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Loss Type *</label>
                  <select value={form.lossType} onChange={(e) => setForm({ ...form, lossType: e.target.value as LossType })} style={{ ...IS, cursor: "pointer" }}>
                    {LOSS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Customer</label>
                  <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" style={IS} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Store / Location</label>
                  <input value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} placeholder="Store name" style={IS} />
                </div>

                {/* Image upload */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Evidence / Photo</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "form")} style={{ display: "none" }} />
                  {form.imageUrl ? (
                    <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "2px solid #a5d6a7" }}>
                      <img src={form.imageUrl} alt="evidence" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", display: "block" }} />
                      <button onClick={() => setForm({ ...form, imageUrl: null })} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: "28px", height: "28px", color: "#fff", cursor: "pointer", fontSize: "13px" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "20px", border: "2px dashed #d0d0d0", borderRadius: "12px", background: "#fafafa", color: "#aaa", fontSize: "13px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "28px" }}>📷</span>
                      <span>Click to upload evidence photo</span>
                    </button>
                  )}
                </div>

                {/* Notes */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional context about this loss..." style={{ ...IS, resize: "none" }} />
                </div>
              </div>

              {/* Total preview */}
              {Number(form.qtyBottles) > 0 && Number(form.unitCost) > 0 && (
                <div style={{ background: "#ffebee", borderRadius: "12px", padding: "14px 18px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#c62828", fontWeight: 600 }}>💸 Estimated Total Loss</span>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#c62828" }}>{fmt(Number(form.qtyBottles) * Number(form.unitCost))}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#555" }}>Cancel</button>
                <button onClick={handleSubmit} disabled={!form.product || !form.brand || !form.qtyBottles} style={{ flex: 2, padding: "12px", borderRadius: "20px", border: "none", background: (!form.product || !form.brand || !form.qtyBottles) ? "#ccc" : "#1a3c2e", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: (!form.product || !form.brand || !form.qtyBottles) ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(26,60,46,0.25)" }}>
                  📋 Submit Loss Record
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {viewItem && (() => {
        const rs = reasonStyle[viewItem.reason];
        const ts = lossTypeStyle[viewItem.lossType];
        const totalLossVal = viewItem.qtyBottles * viewItem.unitCost;
        const viewFileRef = { current: null as HTMLInputElement | null };
        return (
          <>
            <div onClick={() => setViewItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40, backdropFilter: "blur(3px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "24px", width: "min(96vw, 560px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 100px rgba(0,0,0,0.25)" }}>

              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #b71c1c 0%, #c62828 100%)", borderRadius: "24px 24px 0 0", padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 12px", borderRadius: "20px", fontSize: "12px", fontFamily: "monospace", fontWeight: 800 }}>{viewItem.lossId}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: viewItem.status === "Processed" ? "#e8f5e9" : "#fff8e1", color: viewItem.status === "Processed" ? "#2e7d32" : "#e65100" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: viewItem.status === "Processed" ? "#4caf50" : "#ff9800" }} />
                        {viewItem.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "22px", fontWeight: 900, color: "#fff" }}>{viewItem.product}</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>{viewItem.size} · {viewItem.brand}</p>
                  </div>
                  <button onClick={() => setViewItem(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>

                {/* Loss value highlight */}
                <div style={{ marginTop: "18px", background: "rgba(0,0,0,0.2)", borderRadius: "14px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Loss Value</p>
                    <p style={{ fontSize: "32px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{fmt(totalLossVal)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>Bottles Lost</p>
                    <p style={{ fontSize: "28px", fontWeight: 900, color: "rgba(255,255,255,0.9)" }}>{viewItem.qtyBottles}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>@ {fmt(viewItem.unitCost)} each</p>
                  </div>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>

                {/* Tags row */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                  <span style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: rs.bg, color: rs.color }}>⚠️ {viewItem.reason}</span>
                  <span style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: ts.bg, color: ts.color }}>🏷 {viewItem.lossType}</span>
                </div>

                {/* Details grid */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Record Details</p>
                <div style={{ background: "#f9f9f9", borderRadius: "14px", padding: "6px 0", marginBottom: "20px" }}>
                  {[
                    ["Loss ID",     viewItem.lossId],
                    ["Product",     `${viewItem.product} ${viewItem.size}`],
                    ["Brand",       viewItem.brand],
                    ["Qty (Bottles)", `${viewItem.qtyBottles} btl`],
                    ["Unit Cost",   viewItem.unitCost > 0 ? fmt(viewItem.unitCost) : "—"],
                    ["Total Loss",  totalLossVal > 0 ? fmt(totalLossVal) : "—"],
                    ["Customer",    viewItem.customer],
                    ["Store",       viewItem.store],
                    ["Date",        viewItem.date],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "0.5px solid #f0f0f0", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>{label}</span>
                      <span style={{
                        fontSize: "13px", fontWeight: 700, color: label === "Total Loss" ? "#c62828" : "#1a1a1a",
                        background: label === "Total Loss" && totalLossVal > 0 ? "#ffebee" : "transparent",
                        padding: label === "Total Loss" ? "2px 10px" : "0",
                        borderRadius: "20px",
                      }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Evidence image */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Evidence / Photo</p>
                <input
                  type="file" accept="image/*" style={{ display: "none" }}
                  ref={(el) => { viewFileRef.current = el; }}
                  onChange={(e) => handleImageUpload(e, "view")}
                />
                {viewItem.imageUrl ? (
                  <div style={{ borderRadius: "14px", overflow: "hidden", border: "1.5px solid #e0e0e0", marginBottom: "20px", position: "relative" }}>
                    <img src={viewItem.imageUrl} alt="evidence" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }} />
                    <button
                      onClick={() => { viewFileRef.current?.click(); }}
                      style={{ position: "absolute", bottom: "10px", right: "10px", padding: "6px 14px", borderRadius: "20px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                    >📷 Replace</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { viewFileRef.current?.click(); }}
                    style={{ width: "100%", padding: "20px", border: "2px dashed #d0d0d0", borderRadius: "14px", background: "#fafafa", color: "#aaa", fontSize: "13px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "20px" }}
                  >
                    <span style={{ fontSize: "28px" }}>📷</span>
                    <span>Upload evidence photo</span>
                  </button>
                )}

                {/* Notes */}
                {viewItem.notes && (
                  <div style={{ background: "#fffde7", border: "1.5px solid #fff176", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>📝 Notes</p>
                    <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>{viewItem.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setViewItem(null)} style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Close</button>
                  {viewItem.status === "Pending" && (
                    <button onClick={() => markProcessed(viewItem.id)} style={{ flex: 2, padding: "12px", borderRadius: "14px", border: "none", background: "#1a3c2e", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(26,60,46,0.3)" }}>
                      ✅ Mark as Processed
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}