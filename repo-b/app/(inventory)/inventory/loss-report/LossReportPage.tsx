"use client";
import { useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type LossReason = "Expired" | "Returned";
type LossStatus = "Pending" | "Processed";

type LossRecord = {
  id: number;
  lossId: string;
  productName: string;
  brand: string;
  size: string;
  quantity: number;
  unitCost: number;
  reason: LossReason;
  customer: string;
  store: string;
  date: string;
  status: LossStatus;
  notes: string;
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  warning: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  box: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  dollar: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>),
  clock: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  check: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  search: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  close: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  calendar: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  user: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  store: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  report: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>),
  eye: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  sun: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>),
  week: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>),
  month: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
};

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: LossRecord[] = [
  { id: 1,  lossId: "L-0001", productName: "Coca Cola",     brand: "CCBPI",        size: "1.5L",  quantity: 24, unitCost: 40,  reason: "Returned", customer: "Maria Santos", store: "Main Street Branch", date: "2026-04-22", status: "Processed", notes: "Cracked caps on delivery." },
  { id: 2,  lossId: "L-0002", productName: "Orange Juice",  brand: "Citrus Fresh",  size: "1L",    quantity: 12, unitCost: 60,  reason: "Expired",  customer: "—",            store: "Main Street Branch", date: "2026-04-21", status: "Processed", notes: "Found during monthly audit." },
  { id: 3,  lossId: "L-0003", productName: "Pepsi",         brand: "PCPPI",         size: "500mL", quantity: 4,  unitCost: 30,  reason: "Returned", customer: "Jose Reyes",   store: "Santos Mini Mart",   date: "2026-04-19", status: "Processed", notes: "Wrong item delivered." },
  { id: 4,  lossId: "L-0004", productName: "Mtn Dew",       brand: "PCPPI",         size: "1.5L",  quantity: 6,  unitCost: 38,  reason: "Expired",  customer: "—",            store: "Warehouse A",        date: "2026-04-18", status: "Pending",   notes: "Storage temperature issue." },
  { id: 5,  lossId: "L-0005", productName: "Red Bull",      brand: "Red Bull GmbH", size: "250mL", quantity: 12, unitCost: 120, reason: "Returned", customer: "Ana Cruz",     store: "Downtown Store",     date: "2026-04-17", status: "Pending",   notes: "Customer complained of off taste." },
  { id: 6,  lossId: "L-0006", productName: "Gatorade",      brand: "PepsiCo",       size: "500mL", quantity: 18, unitCost: 55,  reason: "Expired",  customer: "—",            store: "Eastside Outlet",    date: "2026-04-15", status: "Pending",   notes: "" },
  { id: 7,  lossId: "L-0007", productName: "Sprite",        brand: "CCBPI",         size: "1L",    quantity: 8,  unitCost: 35,  reason: "Expired",  customer: "—",            store: "Main Street Branch", date: "2026-05-06", status: "Pending",   notes: "Near-expiry stock." },
  { id: 8,  lossId: "L-0008", productName: "Mineral Water", brand: "Wilkins",       size: "500mL", quantity: 6,  unitCost: 18,  reason: "Returned", customer: "Ben Torres",   store: "Santos Mini Mart",   date: "2026-05-05", status: "Pending",   notes: "Leaking bottles." },
  { id: 9,  lossId: "L-0009", productName: "Iced Tea",      brand: "C2",            size: "330mL", quantity: 15, unitCost: 22,  reason: "Expired",  customer: "—",            store: "Warehouse A",        date: "2026-05-04", status: "Processed", notes: "" },
  { id: 10, lossId: "L-0010", productName: "Energy Drink",  brand: "Sting",         size: "250mL", quantity: 10, unitCost: 28,  reason: "Returned", customer: "Lea Gomez",    store: "Downtown Store",     date: "2026-05-01", status: "Pending",   notes: "Wrong flavor delivered." },
];

const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekNumber(dateStr: string) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmtD = (x: Date) => x.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return `${fmtD(mon)} – ${fmtD(sun)}, ${sun.getFullYear()}`;
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  arr.forEach((item) => {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  return map;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const TD: React.CSSProperties = {
  padding: "13px 14px", fontSize: "13px", color: "#374151",
  borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: "6px",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function LossReportPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [records, setRecords] = useState<LossRecord[]>(SEED);
  const [search, setSearch] = useState("");
  const [statusFil, setStatusFil] = useState<"All" | LossStatus>("All");
  const [reasonFil, setReasonFil] = useState<"All" | LossReason>("All");
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [viewItem, setViewItem] = useState<LossRecord | null>(null);

  // ── Tab date labels ────────────────────────────────────────────────────────
  const tabDates = useMemo(() => {
    const dailyDate = today.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmtD = (x: Date) => x.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const weeklyDate = `${fmtD(weekStart)} – ${fmtD(weekEnd)}`;
    const monthlyDate = today.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    return { dailyDate, weeklyDate, monthlyDate };
  }, []);

  // ── Filter base ────────────────────────────────────────────────────────────
  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      (statusFil === "All" || r.status === statusFil) &&
      (reasonFil === "All" || r.reason === reasonFil) &&
      (r.lossId.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.store.toLowerCase().includes(q))
    );
  }, [records, search, statusFil, reasonFil]);

  // ── Period filter ──────────────────────────────────────────────────────────
  const periodData = useMemo(() => {
    if (activeTab === "daily") {
      return baseFiltered.filter((r) => r.date === todayStr);
    } else if (activeTab === "weekly") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return baseFiltered.filter((r) => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd;
      });
    } else {
      const month = today.toISOString().slice(0, 7);
      return baseFiltered.filter((r) => r.date.startsWith(month));
    }
  }, [baseFiltered, activeTab, todayStr]);

  // ── Overall stats ──────────────────────────────────────────────────────────
  const totalLoss = records.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const expiredCount = records.filter((r) => r.reason === "Expired").length;
  const returnedCount = records.filter((r) => r.reason === "Returned").length;
  const pendingCount = records.filter((r) => r.status === "Pending").length;

  // ── Period stats ───────────────────────────────────────────────────────────
  const periodLoss = periodData.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const periodExpired = periodData.filter((r) => r.reason === "Expired").length;
  const periodReturned = periodData.filter((r) => r.reason === "Returned").length;

  // ── Group period data ──────────────────────────────────────────────────────
  const groupedData = useMemo(() => {
    let keyFn: (r: LossRecord) => string;
    let labelFn: (k: string, rows: LossRecord[]) => string;

    if (activeTab === "daily") {
      keyFn = (r) => r.date;
      labelFn = (k) => new Date(k).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (activeTab === "weekly") {
      keyFn = (r) => `${new Date(r.date).getFullYear()}-W${String(getWeekNumber(r.date)).padStart(2, "0")}`;
      labelFn = (_k, rows) => getWeekRange(rows[0].date);
    } else {
      keyFn = (r) => r.date.slice(0, 7);
      labelFn = (_k, rows) => getMonthLabel(rows[0].date);
    }

    const map = groupBy(periodData, keyFn);
    const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([k, rows]) => ({ key: k, label: labelFn(k, rows), rows }));
  }, [periodData, activeTab]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const markProcessed = (id: number) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Processed" } : r)));
    setViewItem((v) => (v && v.id === id ? { ...v, status: "Processed" } : v));
  };

  // ── TH helper ─────────────────────────────────────────────────────────────
  const TH = (label: string) => (
    <th key={label} style={{ padding: "11px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
      {label}
    </th>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .loss-row:hover { background: #fafbff !important; }
      `}</style>

      <div style={{ padding: "28px 32px", background: "#f4f6fb", minHeight: "100vh" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "28px", animation: "fadeUp 0.4s ease" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                {Icons.report}
              </div>
              <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Loss Report
              </h1>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, paddingLeft: "46px" }}>
              Records of all returned and expired products considered as business losses
            </p>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px", animation: "fadeUp 0.5s ease" }}>
          {[
            { label: "Total Records",    value: String(records.length), icon: Icons.box,     accent: "#4f46e5", light: "#eef2ff" },
            { label: "Expired Items",    value: String(expiredCount),   icon: Icons.warning,  accent: "#b45309", light: "#fef3c7" },
            { label: "Returned Items",   value: String(returnedCount),  icon: Icons.check,    accent: "#0891b2", light: "#ecfeff" },
            { label: "Pending Action",   value: String(pendingCount),   icon: Icons.clock,    accent: "#dc2626", light: "#fee2e2" },
            { label: "Total Loss Value", value: fmt(totalLoss),         icon: Icons.dollar,   accent: "#dc2626", light: "#fee2e2", wide: true },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "18px 20px", gridColumn: (s as { wide?: boolean }).wide ? "span 2" : "span 1", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "3px 0 0", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Period Tabs ── */}
        <div style={{ marginBottom: "16px", animation: "fadeUp 0.5s ease" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
            View by Period
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {([
              { key: "daily",   label: "Daily",   date: tabDates.dailyDate,   icon: Icons.sun },
              { key: "weekly",  label: "Weekly",  date: tabDates.weeklyDate,  icon: Icons.week },
              { key: "monthly", label: "Monthly", date: tabDates.monthlyDate, icon: Icons.month },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 18px", borderRadius: "9px", cursor: "pointer",
                  border: activeTab === tab.key ? "none" : "1px solid #e2e8f0",
                  background: activeTab === tab.key ? "#0f172a" : "#fff",
                  color: activeTab === tab.key ? "#fff" : "#64748b",
                  fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                }}
              >
                {tab.icon}
                {tab.label}
                <span style={{ fontSize: "11px", opacity: 0.6, fontWeight: 400 }}>{tab.date}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Period Summary Strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "Records This Period", value: String(periodData.length) },
            { label: "Expired / Returned",  value: `${periodExpired} / ${periodReturned}` },
            { label: "Period Loss Value",    value: fmt(periodLoss), red: true },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #eaecf4", padding: "12px 16px" }}>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: s.red ? "#dc2626" : "#0f172a", margin: "3px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "14px 18px", marginBottom: "16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>{Icons.search}</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, product, customer, store..."
              style={{ padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "#fff", color: "#0f172a", width: "240px" }}
            />
          </div>
          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["All", "Pending", "Processed"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFil(s)}
                style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", border: "none", background: statusFil === s ? "#fff" : "transparent", color: statusFil === s ? "#0f172a" : "#64748b", boxShadow: statusFil === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["All", "Expired", "Returned"] as const).map((r) => (
              <button key={r} onClick={() => setReasonFil(r)}
                style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", border: "none", background: reasonFil === r ? "#fff" : "transparent", color: reasonFil === r ? "#0f172a" : "#64748b", boxShadow: reasonFil === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {r}
              </button>
            ))}
          </div>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            {periodData.length} record{periodData.length !== 1 ? "s" : ""} in this period
          </span>
        </div>

        {/* ── Grouped Tables ── */}
        {groupedData.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "64px", textAlign: "center" }}>
            <div style={{ color: "#cbd5e1", display: "flex", justifyContent: "center", marginBottom: "12px" }}>{Icons.report}</div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#475569", margin: 0 }}>No records for this period</p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0" }}>Try switching to a different period or adjusting your filters.</p>
          </div>
        ) : (
          groupedData.map(({ key, label, rows }) => {
            const groupTotal = rows.reduce((s, r) => s + r.quantity * r.unitCost, 0);
            const groupExpired = rows.filter((r) => r.reason === "Expired").length;
            const groupReturned = rows.filter((r) => r.reason === "Returned").length;
            const groupPending = rows.filter((r) => r.status === "Pending").length;

            return (
              <div key={key} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", overflow: "hidden", marginBottom: "16px", animation: "fadeUp 0.4s ease" }}>
                {/* Group Header */}
                <div style={{ padding: "11px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {Icons.calendar} {label}
                  </span>
                  <span style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#92400e" }}>⚠ {groupExpired} expired</span>
                    <span style={{ fontSize: "11px", color: "#0e7490" }}>↩ {groupReturned} returned</span>
                    {groupPending > 0 && <span style={{ fontSize: "11px", color: "#c2410c", fontWeight: 600 }}>⏱ {groupPending} pending</span>}
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626" }}>{fmt(groupTotal)}</span>
                  </span>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                    <thead>
                      <tr>{["Loss ID", "Product", "Brand", "Qty", "Reason", "Customer", "Store", "Status", ""].map(TH)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="loss-row" style={{ transition: "background 0.12s" }}>
                          <td style={TD}>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "3px 9px", borderRadius: "5px" }}>{r.lossId}</span>
                          </td>
                          <td style={{ ...TD, fontWeight: 600, color: "#0f172a" }}>
                            {r.productName} <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>{r.size}</span>
                          </td>
                          <td style={{ ...TD, color: "#64748b" }}>{r.brand}</td>
                          <td style={{ ...TD, textAlign: "center" }}>
                            <span style={{ fontWeight: 800, fontSize: "14px", color: "#dc2626" }}>{r.quantity}</span>
                          </td>
                          <td style={TD}>
                            <span style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: r.reason === "Expired" ? "#fef3c7" : "#ecfeff", color: r.reason === "Expired" ? "#92400e" : "#0e7490" }}>
                              {r.reason}
                            </span>
                          </td>
                          <td style={{ ...TD, color: r.customer === "—" ? "#cbd5e1" : "#374151" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ color: "#cbd5e1" }}>{Icons.user}</span>{r.customer}
                            </div>
                          </td>
                          <td style={TD}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ color: "#cbd5e1" }}>{Icons.store}</span>
                              <span style={{ fontSize: "12px" }}>{r.store}</span>
                            </div>
                          </td>
                          <td style={TD}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: r.status === "Processed" ? "#f0fdf4" : "#fff7ed", color: r.status === "Processed" ? "#15803d" : "#c2410c" }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: r.status === "Processed" ? "#16a34a" : "#ea580c", flexShrink: 0 }} />
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Group Footer */}
                <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                    <strong style={{ color: "#0f172a" }}>{rows.length}</strong> record{rows.length !== 1 ? "s" : ""}
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626", margin: 0 }}>
                    Subtotal: {fmt(groupTotal)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div onClick={() => setViewItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 40, backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "16px", width: "min(96vw, 520px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", animation: "fadeUp 0.25s ease" }}>

            {/* Modal Header */}
            <div style={{ background: viewItem.reason === "Expired" ? "#78350f" : "#0c4a6e", borderRadius: "16px 16px 0 0", padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: "5px" }}>{viewItem.lossId}</span>
                    <span style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: viewItem.status === "Processed" ? "#d1fae5" : "#fef3c7", color: viewItem.status === "Processed" ? "#065f46" : "#92400e" }}>
                      {viewItem.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0 }}>{viewItem.productName}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: "3px 0 0" }}>{viewItem.brand} · {viewItem.size}</p>
                </div>
                <button onClick={() => setViewItem(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Icons.close}
                </button>
              </div>

              <div style={{ marginTop: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Total Loss Value</p>
                  <p style={{ fontSize: "28px", fontWeight: 900, color: "#fff", margin: "4px 0 0", letterSpacing: "-0.02em" }}>{fmt(viewItem.quantity * viewItem.unitCost)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Units Lost</p>
                  <p style={{ fontSize: "28px", fontWeight: 900, color: "rgba(255,255,255,0.85)", margin: "4px 0 0" }}>{viewItem.quantity}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>@ {fmt(viewItem.unitCost)} each</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "22px 24px" }}>
              <div style={{ marginBottom: "18px" }}>
                <span style={{ padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: viewItem.reason === "Expired" ? "#fef3c7" : "#ecfeff", color: viewItem.reason === "Expired" ? "#92400e" : "#0e7490" }}>
                  {viewItem.reason === "Expired" ? "⚠ Expired Product" : "↩ Returned by Customer"}
                </span>
              </div>

              <p style={labelStyle}>Record Details</p>
              <div style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "18px", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                {[
                  ["Product",    `${viewItem.productName} ${viewItem.size}`],
                  ["Brand",      viewItem.brand],
                  ["Quantity",   `${viewItem.quantity} units`],
                  ["Unit Cost",  viewItem.unitCost > 0 ? fmt(viewItem.unitCost) : "—"],
                  ["Total Loss", viewItem.quantity * viewItem.unitCost > 0 ? fmt(viewItem.quantity * viewItem.unitCost) : "—"],
                  ...(viewItem.reason === "Returned" ? [["Customer", viewItem.customer]] : []),
                  ["Store",      viewItem.store],
                  ["Date",       viewItem.date],
                ].map(([label, value], i, arr) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: label === "Total Loss" ? 800 : 600, color: label === "Total Loss" ? "#dc2626" : "#0f172a" }}>{value}</span>
                  </div>
                ))}
              </div>

              {viewItem.notes && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "9px", padding: "13px 15px", marginBottom: "18px" }}>
                  <p style={labelStyle}>Notes</p>
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