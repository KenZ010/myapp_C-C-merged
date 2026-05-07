"use client";
import { useState, useMemo, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ReturnStatus  = "Pending" | "Processed";
type ReturnReason  = "Damaged" | "Defective" | "Wrong Item" | "Customer Return";
type CustomerType  = "Existing" | "New";
type Disposition   = "Restock" | "Write-Off" | "Return to Supplier";

type ExistingCustomer = {
  id: string;
  name: string;
  phone: string;
  store: string;
};

type ReturnRecord = {
  id: number;
  returnId: string;
  productName: string;
  brand: string;
  size: string;
  quantity: number;
  unitCost: number;
  reason: ReturnReason;
  disposition: Disposition;
  customerType: CustomerType;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  store: string;
  date: string;
  status: ReturnStatus;
  notes: string;
  imageUrl: string | null;
  stockAdjusted: boolean;
};

// ── Mock existing customers ───────────────────────────────────────────────────
const EXISTING_CUSTOMERS: ExistingCustomer[] = [
  { id: "C-001", name: "Maria Santos",  phone: "09171234567", store: "Santos Mini Mart"   },
  { id: "C-002", name: "Jose Reyes",    phone: "09281234567", store: "Reyes Sari-Sari"    },
  { id: "C-003", name: "Ana Cruz",      phone: "09391234567", store: "Cruz Convenience"   },
  { id: "C-004", name: "Pedro Lim",     phone: "09451234567", store: "Lim General Store"  },
  { id: "C-005", name: "Luisa Gomez",   phone: "09561234567", store: "Gomez Retail Shop"  },
];

// ── Seed data ─────────────────────────────────────────────────────────────────
let _counter = 5;
const nextId = () => `RET-${String(_counter++).padStart(4, "0")}`;

const SEED: ReturnRecord[] = [
  { id: 1, returnId: "RET-0001", productName: "Coca Cola",    brand: "CCBPI",         size: "1.5L",  quantity: 24, unitCost: 40,  reason: "Defective",      disposition: "Return to Supplier", customerType: "Existing", customerId: "C-001", customerName: "Maria Santos", customerPhone: "09171234567", store: "Santos Mini Mart",  date: "2026-04-22", status: "Processed", notes: "Cracked bottle caps on delivery.", imageUrl: null, stockAdjusted: true  },
  { id: 2, returnId: "RET-0002", productName: "Pepsi",        brand: "PCPPI",         size: "500mL", quantity: 4,  unitCost: 30,  reason: "Wrong Item",     disposition: "Restock",            customerType: "Existing", customerId: "C-002", customerName: "Jose Reyes",   customerPhone: "09281234567", store: "Reyes Sari-Sari",   date: "2026-04-19", status: "Processed", notes: "Wrong variant delivered.", imageUrl: null, stockAdjusted: true  },
  { id: 3, returnId: "RET-0003", productName: "Red Bull",     brand: "Red Bull GmbH", size: "250mL", quantity: 12, unitCost: 120, reason: "Customer Return", disposition: "Write-Off",           customerType: "New",      customerId: null,    customerName: "Rhea Villanueva", customerPhone: "09612345678", store: "Eastside Market",  date: "2026-04-17", status: "Pending",   notes: "Customer complained of off taste.", imageUrl: null, stockAdjusted: false },
  { id: 4, returnId: "RET-0004", productName: "Gatorade",     brand: "PepsiCo",       size: "500mL", quantity: 6,  unitCost: 55,  reason: "Damaged",        disposition: "Write-Off",           customerType: "Existing", customerId: "C-003", customerName: "Ana Cruz",     customerPhone: "09391234567", store: "Cruz Convenience", date: "2026-04-15", status: "Pending",   notes: "Bottles crushed during transit.", imageUrl: null, stockAdjusted: false },
];

const REASONS: ReturnReason[]   = ["Damaged", "Defective", "Wrong Item", "Customer Return"];
const DISPOSITIONS: Disposition[] = ["Restock", "Write-Off", "Return to Supplier"];

const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  return: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>,
  plus:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  close:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  eye:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  user:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  store:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  box:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  check:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  clock:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  dollar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  photo:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  phone:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.72 19.79 19.79 0 0 1 1.07 3.1 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>,
  alert:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Reason / Disposition color maps ──────────────────────────────────────────
const reasonColor: Record<ReturnReason, { bg: string; text: string }> = {
  "Damaged":        { bg: "#fff7ed", text: "#c2410c" },
  "Defective":      { bg: "#fef2f2", text: "#dc2626" },
  "Wrong Item":     { bg: "#eff6ff", text: "#1d4ed8" },
  "Customer Return":{ bg: "#f5f3ff", text: "#7c3aed" },
};
const dispositionColor: Record<Disposition, { bg: string; text: string }> = {
  "Restock":             { bg: "#f0fdf4", text: "#15803d" },
  "Write-Off":           { bg: "#fef2f2", text: "#dc2626" },
  "Return to Supplier":  { bg: "#eff6ff", text: "#1d4ed8" },
};

// ── Shared input style ────────────────────────────────────────────────────────
const IS: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: "8px",
  border: "1px solid #e2e8f0", fontSize: "13px", outline: "none",
  background: "#fff", boxSizing: "border-box", color: "#0f172a",
};
const LBL: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: "6px",
};
const TD: React.CSSProperties = {
  padding: "13px 14px", fontSize: "13px", color: "#374151",
  borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ReturnPage() {
  const [records,   setRecords]   = useState<ReturnRecord[]>(SEED);
  const [search,    setSearch]    = useState("");
  const [statusFil, setStatusFil] = useState<"All" | ReturnStatus>("All");
  const [reasonFil, setReasonFil] = useState<ReturnReason | "All">("All");
  const [viewItem,  setViewItem]  = useState<ReturnRecord | null>(null);
  const [showForm,  setShowForm]  = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const emptyForm = {
    productName: "", brand: "", size: "",
    quantity: "", unitCost: "",
    reason: "Damaged" as ReturnReason,
    disposition: "Write-Off" as Disposition,
    customerType: "Existing" as CustomerType,
    selectedCustomerId: "",
    newCustomerName: "", newCustomerPhone: "",
    store: "", notes: "",
    imageUrl: null as string | null,
  };
  const [form,        setForm]        = useState({ ...emptyForm });
  const [custSearch,  setCustSearch]  = useState("");
  const [showCustDrop,setShowCustDrop]= useState(false);
  const formImgRef = useRef<HTMLInputElement>(null);
  const viewImgRef = useRef<HTMLInputElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    records.filter(r => {
      const q = search.toLowerCase();
      return (
        (statusFil === "All" || r.status === statusFil) &&
        (reasonFil === "All" || r.reason === reasonFil) &&
        (r.returnId.toLowerCase().includes(q) ||
         r.productName.toLowerCase().includes(q) ||
         r.brand.toLowerCase().includes(q) ||
         r.customerName.toLowerCase().includes(q) ||
         r.store.toLowerCase().includes(q))
      );
    }), [records, search, statusFil, reasonFil]);

  const totalValue  = records.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const pendingCnt  = records.filter(r => r.status === "Pending").length;
  const processedCt = records.filter(r => r.status === "Processed").length;
  const restockCnt  = records.filter(r => r.disposition === "Restock" && r.status === "Processed").length;

  // ── Filtered customer suggestions ───────────────────────────────────────────
  const custSuggestions = EXISTING_CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.store.toLowerCase().includes(custSearch.toLowerCase())
  );

  const selectedCust = EXISTING_CUSTOMERS.find(c => c.id === form.selectedCustomerId) ?? null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const markProcessed = (id: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Processed", stockAdjusted: r.disposition === "Restock" } : r));
    setViewItem(v => v && v.id === id ? { ...v, status: "Processed", stockAdjusted: v.disposition === "Restock" } : v);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>, target: "form" | "view") => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (target === "form") setForm(f => ({ ...f, imageUrl: url }));
      else if (viewItem) {
        const u = { ...viewItem, imageUrl: url };
        setViewItem(u);
        setRecords(prev => prev.map(r => r.id === u.id ? u : r));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const custName  = form.customerType === "Existing" ? (selectedCust?.name ?? "—") : (form.newCustomerName || "—");
    const custPhone = form.customerType === "Existing" ? (selectedCust?.phone ?? "—") : (form.newCustomerPhone || "—");
    const store     = form.customerType === "Existing" ? (selectedCust?.store ?? form.store) : form.store;

    if (!form.productName || !form.brand || !form.quantity) return;
    const rec: ReturnRecord = {
      id: Date.now(), returnId: nextId(),
      productName: form.productName, brand: form.brand,
      size: form.size || "—", quantity: Number(form.quantity),
      unitCost: Number(form.unitCost) || 0,
      reason: form.reason, disposition: form.disposition,
      customerType: form.customerType,
      customerId: form.customerType === "Existing" ? form.selectedCustomerId : null,
      customerName: custName, customerPhone: custPhone,
      store: store || "—",
      date: new Date().toISOString().split("T")[0],
      status: "Pending", notes: form.notes, imageUrl: form.imageUrl,
      stockAdjusted: false,
    };
    setRecords(prev => [rec, ...prev]);
    setForm({ ...emptyForm }); setCustSearch(""); setShowCustDrop(false);
    setShowForm(false);
  };

  const canSubmit = form.productName && form.brand && form.quantity &&
    (form.customerType === "New" || form.selectedCustomerId);

  // ── Table header ─────────────────────────────────────────────────────────────
  const TH = (label: string) => (
    <th key={label} style={{ padding: "11px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
      {label}
    </th>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ret-row:hover { background:#f8faff !important; }
        .cust-opt:hover { background:#f1f5f9; }
        .modal-scroll::-webkit-scrollbar { width:5px; }
        .modal-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
      `}</style>

      <div style={{ padding: "28px 32px", background: "#f4f6fb", minHeight: "100vh" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "14px", animation: "fadeUp 0.35s ease" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
                {Icons.return}
              </div>
              <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Return Module</h1>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, paddingLeft: "46px" }}>
              Track returned and damaged/defective items — stock is adjusted automatically upon processing
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "9px", border: "none", background: "#0f172a", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.2)" }}>
            {Icons.plus} Create Return
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "14px", marginBottom: "22px", animation: "fadeUp 0.45s ease" }}>
          {[
            { label: "Total Returns",   value: String(records.length), icon: Icons.box,    accent: "#4f46e5", light: "#eef2ff" },
            { label: "Pending",         value: String(pendingCnt),     icon: Icons.clock,  accent: "#ea580c", light: "#fff7ed" },
            { label: "Processed",       value: String(processedCt),    icon: Icons.check,  accent: "#16a34a", light: "#f0fdf4" },
            { label: "Restocked Items", value: String(restockCnt),     icon: Icons.return, accent: "#0891b2", light: "#ecfeff" },
            { label: "Total Value",     value: fmt(totalValue),        icon: Icons.dollar, accent: "#dc2626", light: "#fee2e2" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "17px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "2px 0 0", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "13px 16px", marginBottom: "14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>{Icons.search}</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, product, customer, store..."
              style={{ ...IS, paddingLeft: "34px", width: "260px" }} />
          </div>

          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["All","Pending","Processed"] as const).map(s => (
              <button key={s} onClick={() => setStatusFil(s)}
                style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", border: "none", background: statusFil === s ? "#fff" : "transparent", color: statusFil === s ? "#0f172a" : "#64748b", boxShadow: statusFil === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.14s" }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["All",...REASONS] as const).map(r => (
              <button key={r} onClick={() => setReasonFil(r as ReturnReason | "All")}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", background: reasonFil === r ? "#fff" : "transparent", color: reasonFil === r ? "#0f172a" : "#64748b", boxShadow: reasonFil === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.14s", whiteSpace: "nowrap" }}>
                {r}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            {filtered.length} of {records.length} records
          </span>
        </div>

        {/* ── Table ── */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", overflow: "hidden", animation: "fadeUp 0.5s ease" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1050px" }}>
              <thead>
                <tr>{["Return ID","Product","Brand","Qty","Reason","Disposition","Customer","Store","Date","Stock","Status",""].map(TH)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} style={{ padding: "64px", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div style={{ color: "#cbd5e1" }}>{Icons.box}</div>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#475569", margin: 0 }}>No return records found</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Create a return to get started.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(r => {
                  const rc = reasonColor[r.reason];
                  const dc = dispositionColor[r.disposition];
                  return (
                    <tr key={r.id} className="ret-row" style={{ transition: "background 0.12s" }}>
                      <td style={TD}><span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "3px 9px", borderRadius: "5px" }}>{r.returnId}</span></td>
                      <td style={TD}>
                        <p style={{ fontWeight: 600, color: "#0f172a", margin: 0 }}>{r.productName}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>{r.size}</p>
                      </td>
                      <td style={{ ...TD, color: "#64748b" }}>{r.brand}</td>
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "15px", color: "#dc2626" }}>{r.quantity}</span>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>units</p>
                      </td>
                      <td style={TD}><span style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: rc.bg, color: rc.text }}>{r.reason}</span></td>
                      <td style={TD}><span style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 600, background: dc.bg, color: dc.text }}>{r.disposition}</span></td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ color: "#cbd5e1" }}>{Icons.user}</span>
                          <div>
                            <p style={{ fontSize: "12.5px", fontWeight: 500, color: "#0f172a", margin: 0 }}>{r.customerName}</p>
                            <p style={{ fontSize: "10.5px", color: "#94a3b8", margin: 0 }}>
                              {r.customerType === "Existing" ? "Existing" : "New Customer"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ color: "#cbd5e1" }}>{Icons.store}</span>
                          <span style={{ fontSize: "12px" }}>{r.store}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{r.date}</td>
                      <td style={TD}>
                        {r.stockAdjusted
                          ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: 700, color: "#15803d", background: "#f0fdf4", padding: "3px 9px", borderRadius: "5px" }}>{Icons.check} Adjusted</span>
                          : <span style={{ fontSize: "11.5px", color: "#94a3b8", background: "#f8fafc", padding: "3px 9px", borderRadius: "5px" }}>Pending</span>
                        }
                      </td>
                      <td style={TD}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: r.status === "Processed" ? "#f0fdf4" : "#fff7ed", color: r.status === "Processed" ? "#15803d" : "#c2410c" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: r.status === "Processed" ? "#16a34a" : "#ea580c" }} />
                          {r.status}
                        </span>
                      </td>
                      <td style={TD}>
                        <button onClick={() => setViewItem(r)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                          {Icons.eye} View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Showing <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> records</p>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626", margin: 0 }}>
              Filtered value: {fmt(filtered.reduce((s, r) => s + r.quantity * r.unitCost, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE RETURN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <>
          <div onClick={() => { setShowForm(false); setCustSearch(""); setShowCustDrop(false); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 40, backdropFilter: "blur(3px)" }} />
          <div className="modal-scroll" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "16px", width: "min(96vw,580px)", maxHeight: "93vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", animation: "fadeUp 0.25s ease" }}>

            {/* Header */}
            <div style={{ background: "#0f172a", borderRadius: "16px 16px 0 0", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: "#94a3b8" }}>{Icons.return}</div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>Create Return Record</p>
                  <p style={{ fontSize: "11.5px", color: "#64748b", margin: 0 }}>Record a return or damage event</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setCustSearch(""); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {Icons.close}
              </button>
            </div>

            <div style={{ padding: "22px 24px" }}>

              {/* ── Section: Product ── */}
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Product Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px", marginBottom: "22px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={LBL}>Product Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Coca Cola" style={IS} />
                </div>
                <div>
                  <label style={LBL}>Brand <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. CCBPI" style={IS} />
                </div>
                <div>
                  <label style={LBL}>Size / Volume</label>
                  <input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="e.g. 1.5L" style={IS} />
                </div>
                <div>
                  <label style={LBL}>Quantity <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 12" style={IS} />
                </div>
                <div>
                  <label style={LBL}>Unit Cost (₱)</label>
                  <input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} placeholder="e.g. 40" style={IS} />
                </div>
              </div>

              {/* ── Section: Return Details ── */}
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Return Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px", marginBottom: "22px" }}>
                <div>
                  <label style={LBL}>Reason <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value as ReturnReason })} style={{ ...IS, cursor: "pointer" }}>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Disposition <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={form.disposition} onChange={e => setForm({ ...form, disposition: e.target.value as Disposition })} style={{ ...IS, cursor: "pointer" }}>
                    {DISPOSITIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* Disposition hint */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ background: form.disposition === "Restock" ? "#f0fdf4" : form.disposition === "Write-Off" ? "#fef2f2" : "#eff6ff", borderRadius: "8px", padding: "10px 13px", display: "flex", alignItems: "flex-start", gap: "8px", border: `1px solid ${form.disposition === "Restock" ? "#bbf7d0" : form.disposition === "Write-Off" ? "#fecaca" : "#bfdbfe"}` }}>
                    <span style={{ color: form.disposition === "Restock" ? "#16a34a" : form.disposition === "Write-Off" ? "#dc2626" : "#2563eb", marginTop: "1px" }}>{Icons.alert}</span>
                    <p style={{ fontSize: "12.5px", color: form.disposition === "Restock" ? "#166534" : form.disposition === "Write-Off" ? "#991b1b" : "#1e40af", margin: 0, lineHeight: 1.5 }}>
                      {form.disposition === "Restock" && "Items will be returned to inventory stock upon processing."}
                      {form.disposition === "Write-Off" && "Items will be written off and removed from inventory permanently."}
                      {form.disposition === "Return to Supplier" && "Items will be flagged for supplier return — stock deducted upon processing."}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Section: Customer ── */}
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Customer Information</p>

              {/* Customer type toggle */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                {(["Existing", "New"] as CustomerType[]).map(t => (
                  <button key={t} onClick={() => { setForm({ ...form, customerType: t, selectedCustomerId: "", newCustomerName: "", newCustomerPhone: "" }); setCustSearch(""); }}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${form.customerType === t ? "#0f172a" : "#e2e8f0"}`, background: form.customerType === t ? "#0f172a" : "#fff", color: form.customerType === t ? "#fff" : "#64748b", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {t === "Existing" ? "👤 Existing Customer" : "➕ New Customer"}
                  </button>
                ))}
              </div>

              {/* Existing customer lookup */}
              {form.customerType === "Existing" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={LBL}>Search Customer <span style={{ color: "#dc2626" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>{Icons.search}</span>
                    <input
                      value={custSearch}
                      onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); setForm(f => ({ ...f, selectedCustomerId: "" })); }}
                      onFocus={() => setShowCustDrop(true)}
                      placeholder="Search by name or store..."
                      style={{ ...IS, paddingLeft: "34px" }}
                    />
                    {showCustDrop && custSuggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: "9px", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 60, overflow: "hidden", marginTop: "4px" }}>
                        {custSuggestions.map(c => (
                          <div key={c.id} className="cust-opt" onClick={() => { setForm(f => ({ ...f, selectedCustomerId: c.id, store: c.store })); setCustSearch(c.name); setShowCustDrop(false); }}
                            style={{ padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0 }}>{c.name}</p>
                                <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>{c.store}</p>
                              </div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace" }}>{c.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Selected customer card */}
                  {selectedCust && (
                    <div style={{ marginTop: "10px", background: "#f0fdf4", borderRadius: "9px", padding: "11px 14px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{Icons.user}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#166534", margin: 0 }}>{selectedCust.name}</p>
                        <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                          <span style={{ fontSize: "11.5px", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>{Icons.phone} {selectedCust.phone}</span>
                          <span style={{ fontSize: "11.5px", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>{Icons.store} {selectedCust.store}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#15803d", background: "#dcfce7", padding: "3px 8px", borderRadius: "4px" }}>{selectedCust.id}</span>
                    </div>
                  )}
                </div>
              )}

              {/* New customer fields */}
              {form.customerType === "New" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px", marginBottom: "14px" }}>
                  <div>
                    <label style={LBL}>Customer Name</label>
                    <input value={form.newCustomerName} onChange={e => setForm({ ...form, newCustomerName: e.target.value })} placeholder="Full name" style={IS} />
                  </div>
                  <div>
                    <label style={LBL}>Phone Number</label>
                    <input value={form.newCustomerPhone} onChange={e => setForm({ ...form, newCustomerPhone: e.target.value })} placeholder="09XXXXXXXXX" style={IS} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={LBL}>Store / Location</label>
                    <input value={form.store} onChange={e => setForm({ ...form, store: e.target.value })} placeholder="Store or branch name" style={IS} />
                  </div>
                </div>
              )}

              {/* ── Evidence & Notes ── */}
              <div style={{ marginBottom: "6px" }}>
                <label style={LBL}>Evidence Photo</label>
                <input ref={formImgRef} type="file" accept="image/*" onChange={e => handleImage(e, "form")} style={{ display: "none" }} />
                {form.imageUrl ? (
                  <div style={{ position: "relative", borderRadius: "9px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <img src={form.imageUrl} alt="evidence" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", display: "block" }} />
                    <button onClick={() => setForm({ ...form, imageUrl: null })} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(15,23,42,0.7)", border: "none", borderRadius: "6px", width: "28px", height: "28px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.close}</button>
                  </div>
                ) : (
                  <button onClick={() => formImgRef.current?.click()} style={{ width: "100%", padding: "16px", border: "2px dashed #e2e8f0", borderRadius: "9px", background: "#f8fafc", color: "#94a3b8", fontSize: "13px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#cbd5e1" }}>{Icons.photo}</span>
                    Click to upload evidence photo
                  </button>
                )}
              </div>

              <div style={{ marginTop: "14px", marginBottom: "4px" }}>
                <label style={LBL}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional context about this return..." style={{ ...IS, resize: "none" }} />
              </div>

              {/* Loss preview */}
              {Number(form.quantity) > 0 && Number(form.unitCost) > 0 && (
                <div style={{ background: "#fee2e2", borderRadius: "9px", padding: "12px 16px", marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 600 }}>Estimated Return Value</span>
                  <span style={{ fontSize: "19px", fontWeight: 800, color: "#b91c1c" }}>{fmt(Number(form.quantity) * Number(form.unitCost))}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button onClick={() => { setShowForm(false); setCustSearch(""); setForm({ ...emptyForm }); }}
                  style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!canSubmit}
                  style={{ flex: 2, padding: "11px", borderRadius: "8px", border: "none", background: canSubmit ? "#0f172a" : "#e2e8f0", color: canSubmit ? "#fff" : "#94a3b8", fontSize: "13px", fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                  Submit Return Record
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div onClick={() => setViewItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 40, backdropFilter: "blur(3px)" }} />
          <div className="modal-scroll" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "16px", width: "min(96vw,520px)", maxHeight: "93vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", animation: "fadeUp 0.25s ease" }}>

            {/* Header */}
            <div style={{ background: "#0f172a", borderRadius: "16px 16px 0 0", padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#94a3b8", background: "rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: "5px" }}>{viewItem.returnId}</span>
                    <span style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: viewItem.status === "Processed" ? "#d1fae5" : "#fef3c7", color: viewItem.status === "Processed" ? "#065f46" : "#92400e" }}>{viewItem.status}</span>
                  </div>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0 }}>{viewItem.productName}</p>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "3px 0 0" }}>{viewItem.brand} · {viewItem.size}</p>
                </div>
                <button onClick={() => setViewItem(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.close}</button>
              </div>

              <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Return Value</p>
                  <p style={{ fontSize: "26px", fontWeight: 900, color: "#fff", margin: "4px 0 0", letterSpacing: "-0.02em" }}>{fmt(viewItem.quantity * viewItem.unitCost)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Qty Returned</p>
                  <p style={{ fontSize: "26px", fontWeight: 900, color: "rgba(255,255,255,0.85)", margin: "4px 0 0" }}>{viewItem.quantity}</p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>@ {fmt(viewItem.unitCost)} each</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "22px 24px" }}>
              {/* Tags */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
                <span style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: reasonColor[viewItem.reason].bg, color: reasonColor[viewItem.reason].text }}>{viewItem.reason}</span>
                <span style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: dispositionColor[viewItem.disposition].bg, color: dispositionColor[viewItem.disposition].text }}>{viewItem.disposition}</span>
                {viewItem.stockAdjusted && <span style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: "#f0fdf4", color: "#15803d", display: "flex", alignItems: "center", gap: "5px" }}>{Icons.check} Stock Adjusted</span>}
              </div>

              {/* Product details */}
              <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>Return Details</p>
              <div style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "18px", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                {[
                  ["Product",   `${viewItem.productName} ${viewItem.size}`],
                  ["Brand",     viewItem.brand],
                  ["Quantity",  `${viewItem.quantity} units`],
                  ["Unit Cost", viewItem.unitCost > 0 ? fmt(viewItem.unitCost) : "—"],
                  ["Total",     viewItem.quantity * viewItem.unitCost > 0 ? fmt(viewItem.quantity * viewItem.unitCost) : "—"],
                  ["Store",     viewItem.store],
                  ["Date",      viewItem.date],
                ].map(([l, v], i, arr) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{l}</span>
                    <span style={{ fontSize: "13px", fontWeight: l === "Total" ? 800 : 600, color: l === "Total" ? "#dc2626" : "#0f172a" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Customer info */}
              <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>Customer Information</p>
              <div style={{ background: viewItem.customerType === "Existing" ? "#f0fdf4" : "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px", border: `1px solid ${viewItem.customerType === "Existing" ? "#bbf7d0" : "#f1f5f9"}`, display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: viewItem.customerType === "Existing" ? "#16a34a" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{Icons.user}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{viewItem.customerName}</p>
                    <span style={{ fontSize: "10.5px", fontWeight: 600, color: viewItem.customerType === "Existing" ? "#15803d" : "#64748b", background: viewItem.customerType === "Existing" ? "#dcfce7" : "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
                      {viewItem.customerType}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>{Icons.phone} {viewItem.customerPhone}</span>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>{Icons.store} {viewItem.store}</span>
                  </div>
                  {viewItem.customerId && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0", fontFamily: "monospace" }}>ID: {viewItem.customerId}</p>}
                </div>
              </div>

              {/* Evidence image */}
              <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>Evidence Photo</p>
              <input ref={viewImgRef} type="file" accept="image/*" onChange={e => handleImage(e, "view")} style={{ display: "none" }} />
              {viewItem.imageUrl ? (
                <div style={{ position: "relative", borderRadius: "9px", overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                  <img src={viewItem.imageUrl} alt="evidence" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", display: "block" }} />
                  <button onClick={() => viewImgRef.current?.click()} style={{ position: "absolute", bottom: "8px", right: "8px", padding: "6px 12px", borderRadius: "6px", background: "rgba(15,23,42,0.7)", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Replace</button>
                </div>
              ) : (
                <button onClick={() => viewImgRef.current?.click()} style={{ width: "100%", padding: "16px", border: "2px dashed #e2e8f0", borderRadius: "9px", background: "#f8fafc", color: "#94a3b8", fontSize: "13px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                  <span style={{ color: "#cbd5e1" }}>{Icons.photo}</span>
                  Upload evidence photo
                </button>
              )}

              {viewItem.notes && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "9px", padding: "12px 14px", marginBottom: "16px" }}>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px" }}>Notes</p>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, margin: 0 }}>{viewItem.notes}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setViewItem(null)} style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Close</button>
                {viewItem.status === "Pending" && (
                  <button onClick={() => markProcessed(viewItem.id)} style={{ flex: 2, padding: "11px", borderRadius: "8px", border: "none", background: "#0f172a", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    {Icons.check} Mark as Processed
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}