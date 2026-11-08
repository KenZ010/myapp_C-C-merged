"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Theme (same as the Cashier pages) ─────────────────────────────────────────
const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels / card headers
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons

// ── Types ─────────────────────────────────────────────────────────────────────
type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type ExpiryStatus = "Fresh/Valid" | "Expiring Soon" | "Expired" | "No Expiry";

type ApiProduct = {
  id: string;
  productName: string;
  category: string;
  size: string;
  price: number;
  stock: number;
  status: string;
  createdAt: string;
  supplier: { supplierName: string } | null;
  finalPrice: number;
};

type StockBatch = {
  id: string;
  productId: string;
  remaining: number;
  expiryDate: string | null;
  deliveryItem: {
    delivery: { id: string; deliveryDate: string };
  };
  product?: { productName: string; size?: string };
};

type Product = {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  remainingStock: number;
  stockStatus: StockStatus;
  earliestExpiry: string | null;
  expiryStatus: ExpiryStatus;
};

type Pill = { bg: string; color: string; border: string };

const stockStyle: Record<StockStatus, Pill> = {
  "In Stock":     { bg: GREEN_LIGHT, color: GREEN,     border: "#b7dcbd" },
  "Low Stock":    { bg: "#fffbeb",   color: "#b45309", border: "#fde68a" },
  "Out of Stock": { bg: "#fef2f2",   color: "#b91c1c", border: "#fecaca" },
};

const expiryStyle: Record<ExpiryStatus, Pill> = {
  "Fresh/Valid":   { bg: GREEN_LIGHT, color: GREEN,     border: "#b7dcbd" },
  "Expiring Soon": { bg: "#fff7ed",   color: "#c2410c", border: "#fed7aa" },
  "Expired":       { bg: "#fef2f2",   color: "#b91c1c", border: "#fecaca" },
  "No Expiry":     { bg: "#eff6ff",   color: "#1d4ed8", border: "#bfdbfe" },
};

const pillStyle = (p: Pill): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "20px",
  fontSize: "11.5px", fontWeight: 600, background: p.bg, color: p.color, border: `1px solid ${p.border}`,
  whiteSpace: "nowrap",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "No Expiry";
  const exp = new Date(expiryDate);
  const now = new Date();
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Fresh/Valid";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No Expiry";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  grid: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps} strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>),
  refresh: (<svg width="15" height="15" viewBox="0 0 24 24" {...svgProps}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  layers: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  box: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  boxSm: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  warning: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  warningSm: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  clock: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  clockSm: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  xCircle: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  trend: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  pie: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>),
  search: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  check: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>),
  emptyState: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 12"/></svg>),
};

// ── Pie chart ─────────────────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 60, cx = 75, cy = 75;
  const slices = data.reduce<{ label: string; color: string; pct: number; d: string }[]>(
    (acc, d) => {
      const prev = acc.reduce((s, x) => s + x.pct / 100, 0);
      const start = prev, end = prev + d.pct / 100;
      const startAngle = start * 2 * Math.PI - Math.PI / 2;
      const endAngle   = end   * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
      const large = d.pct > 50 ? 1 : 0;
      return [...acc, { ...d, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z` }];
    }, []
  );
  return (
    <svg viewBox="0 0 150 150" width="130" height="130" style={{ flexShrink: 0 }}>
      {slices.map((s) => (
        <path key={s.label} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  SOFTDRINKS:   "#4a90d9",
  BEER:         "#7c3aed",
  ENERGY_DRINK: "#e65100",
  JUICE:        "#2d7a3a",
  WATER:        "#00acc1",
  OTHER:        "#f5c842",
};

// ── Skeletons ─────────────────────────────────────────────────────────────────
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#eef5ef 25%,#dfeae2 50%,#eef5ef 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

function SkeletonStatCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "20px 22px" }}>
      <div style={{ ...shimmerBg, height: "11px", width: "80px", borderRadius: "6px", marginBottom: "12px" }} />
      <div style={{ ...shimmerBg, height: "28px", width: "60px", borderRadius: "6px" }} />
    </div>
  );
}

function SkeletonPanel({ height }: { height: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "18px 20px" }}>
      <div style={{ ...shimmerBg, height: "13px", width: "120px", borderRadius: "6px", marginBottom: "16px" }} />
      <div style={{ ...shimmerBg, height: `${height}px`, borderRadius: "10px" }} />
    </div>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({
  icon, title, right, children,
}: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" }}>
      <div style={{ padding: "13px 18px", borderBottom: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT, display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: GREEN, minWidth: 0 }}>
          {icon}
          <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: INK }}>{title}</p>
        </div>
        {right}
      </div>
      <div style={{ padding: "14px 18px 16px" }}>{children}</div>
    </div>
  );
}

function AllGood({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "18px 0", color: GREEN }}>
      {Icon.check}
      <p style={{ fontSize: "12.5px", fontWeight: 600, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryMonitoringPage() {
  const [search,          setSearch]          = useState("");
  const [items,           setItems]           = useState<Product[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [expiringBatches, setExpiringBatches] = useState<StockBatch[]>([]);
  const [expiredBatches,  setExpiredBatches]  = useState<StockBatch[]>([]);
  const [writingOff,      setWritingOff]      = useState(false);
  const [toast,           setToast]           = useState("");
  const [activeTab,       setActiveTab]       = useState<"expiring" | "expired">("expiring");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [products, expiring, expired] = await Promise.all([
        fetch("https://backend-production-dcaab.up.railway.app/api/products").then(r => r.json()),
        api.getExpiringBatches(30).catch((e: unknown) => {
          console.error("expiring batches fetch failed:", e);
          return [] as StockBatch[];
        }),
        api.getExpiredBatches().catch((e: unknown) => {
          console.error("expired batches fetch failed:", e);
          return [] as StockBatch[];
        }),
      ]);

      const expiryMap: Record<string, string | null> = {};
      [...expiring, ...expired].forEach((b: StockBatch) => {
        if (!b.expiryDate) return;
        const existing = expiryMap[b.productId];
        if (!existing || new Date(b.expiryDate) < new Date(existing)) {
          expiryMap[b.productId] = b.expiryDate;
        }
      });

      setItems((products as ApiProduct[]).map((p) => {
        const earliestExpiry = expiryMap[p.id] ?? null;
        return {
          id:             p.id,
          name:           p.productName,
          category:       p.category,
          totalStock:     p.stock,
          remainingStock: p.stock,
          stockStatus:    getStockStatus(p.stock),
          earliestExpiry,
          expiryStatus:   getExpiryStatus(earliestExpiry),
        };
      }));

      setExpiringBatches(expiring);
      setExpiredBatches(expired);
    } catch (e) {
      console.error("fetchAll failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleWriteOff = async () => {
    const raw = localStorage.getItem("employee") || localStorage.getItem("user") || "{}";
    const employee = JSON.parse(raw);
    const employeeId = employee?.id ?? employee?.employeeId ?? null;
    if (!employeeId) { showToast("No employee session found."); return; }
    if (!confirm(`Write off ${expiredBatches.length} expired batch(es)? This cannot be undone.`)) return;
    try {
      setWritingOff(true);
      const result = await api.writeOffExpiredBatches(employeeId);
      showToast(`Wrote off ${result.written} batch(es), ${result.totalQty} units total.`);
      await fetchAll();
    } catch (_e) {
      showToast("Failed to write off expired batches.");
    } finally {
      setWritingOff(false);
    }
  };

  const filtered = useMemo(
    () => items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const lowStock    = items.filter((p) => p.stockStatus === "Low Stock").length;
  const outOfStock  = items.filter((p) => p.stockStatus === "Out of Stock").length;
  const expiring    = expiringBatches.length;
  const expired     = expiredBatches.length;

  const topStocked = [...items].sort((a, b) => b.remainingStock - a.remainingStock).slice(0, 5);
  const maxStock   = topStocked[0]?.remainingStock || 1;

  const categoryMap: Record<string, number> = {};
  items.forEach((p) => { categoryMap[p.category] = (categoryMap[p.category] || 0) + 1; });
  const total        = items.length || 1;
  const categoryData = Object.entries(categoryMap).map(([label, count], i) => ({
    label,
    pct:   Math.round((count / total) * 100),
    color: CATEGORY_COLORS[label] ?? ["#4a90d9","#7c3aed","#2d7a3a","#e65100","#f5c842"][i % 5],
  }));

  const statCards = [
    { label: "Total Products",  count: items.length,                                       icon: Icon.layers,  accent: GREEN,     light: GREEN_LIGHT, highlight: true  },
    { label: "Total Cases",     count: items.reduce((s, p) => s + p.remainingStock, 0),    icon: Icon.box,     accent: "#2563eb", light: "#eff6ff",   highlight: false },
    { label: "Low / No Stock",  count: lowStock + outOfStock,                              icon: Icon.warning, accent: "#d97706", light: "#fffbeb",   highlight: false },
    { label: "Expiring Soon",   count: expiring,                                           icon: Icon.clock,   accent: "#ea580c", light: "#fff7ed",   highlight: false },
    { label: "Expired Batches", count: expired,                                            icon: Icon.xCircle, accent: "#dc2626", light: "#fef2f2",   highlight: false },
  ];

  const alertItems = items.filter((p) => p.stockStatus !== "In Stock").slice(0, 6);
  const batchList  = activeTab === "expiring" ? expiringBatches : expiredBatches;

  const thStyle: React.CSSProperties = {
    padding: "12px 16px", textAlign: "left", fontSize: "11px", color: MUTED, fontWeight: 700,
    whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes toastIn { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }
        .btn-outline:hover { background: ${GREEN_TINT} !important; border-color: ${GREEN} !important; }
        .row-hover:hover { background: ${GREEN_TINT} !important; }
        .search-input:focus { border-color: ${GREEN} !important; box-shadow: 0 0 0 3px rgba(46,125,62,0.12); }
        .writeoff-btn:hover:not(:disabled) { background: #991b1b !important; }
        .monitoring-page button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
      `}</style>

      <div className="monitoring-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 60, background: GREEN_DARK, color: "#fff", padding: "12px 18px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(31,95,45,0.35)", fontSize: "13px", fontWeight: 600, animation: "toastIn 0.2s ease-out", display: "flex", alignItems: "center", gap: "8px" }}>
            {Icon.check} {toast}
          </div>
        )}

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", flexShrink: 0 }}>
              {Icon.grid}
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.02em" }}>Inventory Monitoring</h1>
              <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>Track stock levels, batch expiry and category mix</p>
            </div>
          </div>

          <button onClick={() => fetchAll()} className="btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, transition: "all 0.15s" }}>
            <span style={{ display: "flex" }}>{Icon.refresh}</span> Refresh
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((s) => (
                <div key={s.label}
                  style={{
                    position: "relative", overflow: "hidden", borderRadius: "14px", padding: "20px 22px",
                    background: s.highlight ? `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` : "#fff",
                    border: s.highlight ? "none" : `1px solid ${GREEN_BORDER}`,
                    boxShadow: s.highlight ? "0 6px 18px rgba(46,125,62,0.25)" : "none",
                  }}>
                  {!s.highlight && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: s.accent }} />}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: s.highlight ? "rgba(255,255,255,0.8)" : MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.highlight ? "rgba(255,255,255,0.18)" : s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.highlight ? "#fff" : s.accent }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: s.highlight ? "#fff" : INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {s.count}
                  </p>
                </div>
              ))}
        </div>

        {loading ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <SkeletonPanel height={140} />
              <SkeletonPanel height={140} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <SkeletonPanel height={150} />
              <SkeletonPanel height={150} />
            </div>
            <SkeletonPanel height={260} />
          </>
        ) : (
          <>
            {/* ── Alerts Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "16px", alignItems: "start" }}>

              {/* Low / No Stock */}
              <Panel
                icon={Icon.warningSm}
                title="Low / No Stock"
                right={
                  <span style={{ ...pillStyle(stockStyle["Low Stock"]), padding: "1px 9px", fontSize: "11px", fontWeight: 700 }}>
                    {lowStock + outOfStock}
                  </span>
                }
              >
                {alertItems.length === 0 ? (
                  <AllGood text="All products sufficiently stocked" />
                ) : (
                  <div>
                    {alertItems.map((p, i) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: i < alertItems.length - 1 ? `1px solid ${GREEN_LIGHT}` : "none" }}>
                        <p style={{ flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 500, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                        <span style={{ ...pillStyle(stockStyle[p.stockStatus]), fontWeight: 700, flexShrink: 0 }}>
                          {p.remainingStock} left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Batch Expiry */}
              <Panel
                icon={Icon.clockSm}
                title="Batch Expiry"
                right={
                  expired > 0 ? (
                    <button onClick={handleWriteOff} disabled={writingOff} className="writeoff-btn"
                      style={{ padding: "6px 13px", borderRadius: "8px", border: "none", background: writingOff ? "#9ca3af" : "#b91c1c", color: "#fff", fontSize: "11.5px", fontWeight: 700, cursor: writingOff ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                      {writingOff ? "Writing off…" : `Write Off (${expired})`}
                    </button>
                  ) : undefined
                }
              >
                {/* Tabs */}
                <div style={{ display: "flex", gap: "2px", marginBottom: "12px", background: GREEN_LIGHT, borderRadius: "10px", padding: "3px", width: "fit-content" }}>
                  {([
                    { key: "expiring", label: `Expiring (${expiring})` },
                    { key: "expired",  label: `Expired (${expired})`  },
                  ] as const).map((t) => {
                    const isActive = activeTab === t.key;
                    return (
                      <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", background: isActive ? GREEN : "transparent", color: isActive ? "#fff" : MUTED, boxShadow: isActive ? "0 2px 8px rgba(46,125,62,0.3)" : "none", transition: "all 0.15s" }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {batchList.length === 0 ? (
                  <AllGood text={activeTab === "expiring" ? "No batches expiring in 30 days" : "No expired batches"} />
                ) : (
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {batchList.map((b, i) => {
                      const daysLeft = b.expiryDate
                        ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const pill: Pill =
                        activeTab === "expired" || (daysLeft !== null && daysLeft <= 7)
                          ? expiryStyle["Expired"]
                          : expiryStyle["Expiring Soon"];
                      return (
                        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: i < batchList.length - 1 ? `1px solid ${GREEN_LIGHT}` : "none" }}>
                          <p style={{ flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 500, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.product?.productName ?? b.productId}
                          </p>
                          <span style={{ ...pillStyle(pill), fontWeight: 700, flexShrink: 0 }}>
                            {activeTab === "expired" ? "Expired" : daysLeft !== null ? `${daysLeft}d` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            {/* ── Charts Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px", alignItems: "start" }}>
              <Panel icon={Icon.trend} title="Top Stocked Products">
                <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                  {topStocked.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: FAINT, width: "18px", textAlign: "right" }}>#{i + 1}</span>
                      <p style={{ fontSize: "12.5px", color: INK, width: "96px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{p.name}</p>
                      <div style={{ flex: 1, height: "14px", background: GREEN_LIGHT, borderRadius: "7px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(p.remainingStock / maxStock) * 100}%`, background: i === 0 ? GREEN_DARK : i === 1 ? GREEN : i === 2 ? GREEN_MID : "#a9d3b1", borderRadius: "7px", transition: "width 0.4s ease" }} />
                      </div>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: GREEN_DARK, width: "44px", textAlign: "right" }}>{p.remainingStock}</span>
                    </div>
                  ))}
                  {topStocked.length === 0 && (
                    <p style={{ fontSize: "12.5px", color: FAINT, textAlign: "center", margin: 0, padding: "12px 0" }}>No products yet.</p>
                  )}
                </div>
              </Panel>

              <Panel icon={Icon.pie} title="Inventory by Category">
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <PieChart data={categoryData} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {categoryData.map((c) => (
                      <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "11px", height: "11px", borderRadius: "3px", background: c.color, flexShrink: 0 }} />
                        <p style={{ fontSize: "12.5px", color: MUTED, margin: 0 }}>{c.label}: <strong style={{ color: INK }}>{c.pct}%</strong></p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>

            {/* ── Search + count ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, maxWidth: "300px", minWidth: "200px" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", color: FAINT }}>{Icon.search}</span>
                <input
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 34px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", fontSize: "13px", outline: "none", color: INK, transition: "border-color 0.15s, box-shadow 0.15s" }}
                />
              </div>
              <span style={{ fontSize: "12.5px", color: MUTED, fontWeight: 600, marginLeft: "auto" }}>
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Table ── */}
            {filtered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "14px", padding: "56px 24px", textAlign: "center", border: `1px dashed ${GREEN_BORDER}` }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {Icon.emptyState}
                  </div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>No products found</p>
                  <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>Try a different search term.</p>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: GREEN_TINT, borderBottom: `1px solid ${GREEN_BORDER}` }}>
                      {["Product Name", "Category", "Stock", "Earliest Expiry", "Expiry Status", "Stock Status"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const exp = getExpiryStatus(p.earliestExpiry);
                      return (
                        <tr key={p.id} className="row-hover"
                          style={{ borderBottom: `1px solid ${GREEN_LIGHT}`, background: p.stockStatus === "Out of Stock" ? "#fffafa" : "#fff", transition: "background 0.12s" }}>
                          <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: INK }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.boxSm}</div>
                              {p.name}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: GREEN_TINT, color: GREEN_DARK, border: `1px solid ${GREEN_BORDER}`, padding: "3px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 600 }}>{p.category}</span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 800, color: p.remainingStock === 0 ? "#b91c1c" : p.remainingStock <= 10 ? "#b45309" : GREEN }}>
                            {p.remainingStock}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "12.5px", fontWeight: 600, color: p.earliestExpiry ? (exp === "Expired" ? "#b91c1c" : exp === "Expiring Soon" ? "#c2410c" : GREEN) : FAINT }}>
                            {formatDate(p.earliestExpiry)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={pillStyle(expiryStyle[p.expiryStatus])}>{p.expiryStatus}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={pillStyle(stockStyle[p.stockStatus])}>{p.stockStatus}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}