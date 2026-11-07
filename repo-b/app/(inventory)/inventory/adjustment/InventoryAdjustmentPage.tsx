"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Theme (same as the Pending / Transaction / Inventory pages) ───────────────
const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels / table headers
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons

// ── Types matching Prisma schema ──────────────────────────────────────────────
type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
type CategoryType  = "SOFTDRINKS" | "ENERGY_DRINK" | "BEER" | "JUICE" | "WATER" | "OTHER";
type TabKey        = "adjustment" | "expiration";
type ExpiryStatus  = "Expired" | "Expiring Soon" | "Good" | "No Date";

type Product = {
  id:            string;
  productName:   string;
  category:      CategoryType;
  size:          string | null;
  barcode:       string | null;
  price:         number;
  stock:         number;
  piecesPerCase: number;
  reservedStock: number;
  expiryDate:    string | null;
  batchId:       string | null; // earliest dated active batch (edited by the Expiration tab)
  image:         string | null;
  status:        ProductStatus;
  supplierId:    string;
  supplierName:  string;
  createdAt:     string;
  updatedAt:     string;
};

const PIECES_PER_CASE_DEFAULT = 24;
const EXPIRING_SOON_DAYS      = 30; // products expiring within this many days are flagged

// Reasons that can only DEDUCT stock (no addition allowed)
const DEDUCT_ONLY_REASONS = ["Expired", "Damaged"];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const sp = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  inventory:   (<svg width="20" height="20" viewBox="0 0 24 24" {...sp} strokeWidth={1.8}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  box:         (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  calendar:    (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  search:      (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  refresh:     (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  layers:      (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  checkCircle: (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  alert:       (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  alertSm:     (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  xCircle:     (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  ban:         (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>),
  hourglass:   (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/></svg>),
  help:        (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  tag:         (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
  chart:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  x:           (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  edit:        (<svg width="13" height="13" viewBox="0 0 24 24" {...sp}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  plus:        (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  minus:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  trash:       (<svg width="22" height="22" viewBox="0 0 24 24" {...sp}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>),
  clipboard:   (<svg width="13" height="13" viewBox="0 0 24 24" {...sp}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>),
  check:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>),
  clock:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  emptyState:  (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPiecesPerCase(p: Product): number {
  return p.piecesPerCase || PIECES_PER_CASE_DEFAULT;
}

function totalPieces(p: Product): number {
  return p.stock * getPiecesPerCase(p);
}

function deriveStockStatus(stock: number): "In Stock" | "Low Stock" | "Out of Stock" {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function fmtDate(str: string | null): string {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(str: string | null): { date: string; time: string } {
  if (!str) return { date: "—", time: "" };
  const d = new Date(str);
  if (isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }),
  };
}

function fmtPrice(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// ── Expiration helpers ────────────────────────────────────────────────────────
// Days from today until the expiry date (negative = already expired). Null if no date.
function daysUntilExpiry(str: string | null): number | null {
  if (!str) return null;
  const e = new Date(str);
  if (isNaN(e.getTime())) return null;
  const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  const now  = new Date();
  const tDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((eDay - tDay) / 86_400_000);
}

function getExpiryStatus(str: string | null): ExpiryStatus {
  const days = daysUntilExpiry(str);
  if (days === null) return "No Date";
  if (days < 0) return "Expired";
  if (days <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Good";
}

const expiryStyle: Record<ExpiryStatus, { bg: string; color: string; dot: string; border: string }> = {
  "Expired":       { bg: "#fef2f2",   color: "#b91c1c",  dot: "#ef4444", border: "#fecaca" },
  "Expiring Soon": { bg: "#fffbeb",   color: "#b45309",  dot: "#f59e0b", border: "#fde68a" },
  "Good":          { bg: GREEN_LIGHT, color: GREEN_DARK, dot: GREEN_MID, border: "#b7dcbd" },
  "No Date":       { bg: "#f1f5f2",   color: MUTED,      dot: "#b6c4ba", border: "#dbe5dd" },
};

function daysLabel(days: number | null): string {
  if (days === null) return "—";
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Today";
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// "2026-12-31T00:00:00.000Z" -> "2026-12-31" (value for <input type="date">)
function toDateInput(str: string | null): string {
  if (!str) return "";
  return str.slice(0, 10);
}

// Today + N months, formatted for <input type="date">
function dateInMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const statusStyle = {
  "In Stock":     { bg: GREEN_LIGHT, color: GREEN_DARK, dot: GREEN_MID, border: "#b7dcbd" },
  "Low Stock":    { bg: "#fffbeb",   color: "#b45309",  dot: "#f59e0b", border: "#fde68a" },
  "Out of Stock": { bg: "#fef2f2",   color: "#b91c1c",  dot: "#ef4444", border: "#fecaca" },
};

const categoryLabels: Record<CategoryType, string> = {
  SOFTDRINKS:   "Softdrinks",
  ENERGY_DRINK: "Energy Drink",
  BEER:         "Beer",
  JUICE:        "Juice",
  WATER:        "Water",
  OTHER:        "Other",
};

const productStatusStyle: Record<ProductStatus, { bg: string; color: string; border: string }> = {
  ACTIVE:       { bg: GREEN_LIGHT, color: GREEN_DARK, border: "#b7dcbd" },
  INACTIVE:     { bg: "#f1f5f2",   color: MUTED,      border: "#dbe5dd" },
  OUT_OF_STOCK: { bg: "#fef2f2",   color: "#b91c1c",  border: "#fecaca" },
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase",
  letterSpacing: "0.5px", display: "block", marginBottom: "6px",
};
const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: GREEN_DARK,
  textTransform: "uppercase", letterSpacing: "0.06em", background: GREEN_TINT,
  borderBottom: `1px solid ${GREEN_BORDER}`, whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "13px 16px", fontSize: "13px", color: INK, borderBottom: `1px solid ${GREEN_LIGHT}`, verticalAlign: "middle",
};
const pill = (bg: string, color: string, border?: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px",
  fontSize: "11.5px", fontWeight: 600, background: bg, color, border: `1px solid ${border ?? "transparent"}`, whiteSpace: "nowrap",
});
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#eef5ef 25%,#dfeae2 50%,#eef5ef 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

const CSS = `
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .btn-outline:hover { background: ${GREEN_TINT} !important; border-color: ${GREEN} !important; }
  .btn-green:hover:not(:disabled) { background: ${GREEN_DARK} !important; }
  .btn-red:hover:not(:disabled) { background: #be123c !important; }
  .btn-ghost:hover:not(:disabled) { background: ${GREEN_TINT} !important; }
  .tab-btn:hover { color: ${GREEN_DARK} !important; }
  .row-hover:hover { background: ${GREEN_TINT} !important; }
  .stat-btn:hover { box-shadow: 0 6px 18px rgba(31,95,45,0.12) !important; }
  .green-input:focus { border-color: ${GREEN} !important; box-shadow: 0 0 0 3px rgba(46,125,62,0.14); outline: none; }
  .adj-page button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
`;

// ── Small reusable pieces (module level so inputs keep focus while typing) ───
const ProductThumb = ({ p }: { p: Product }) =>
  p.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.image} alt="" style={{ width: "38px", height: "38px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, border: `1px solid ${GREEN_BORDER}` }} />
  ) : (
    <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.box}</div>
  );

const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div style={{ position: "relative" }}>
    <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: FAINT, display: "flex" }}>{Icon.search}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="green-input"
      style={{ padding: "10px 14px 10px 38px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", width: "250px", maxWidth: "100%", color: INK, background: "#fff", boxSizing: "border-box", transition: "all 0.15s" }}
    />
  </div>
);

const SelectBox = ({ icon, value, onChange, children }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: `1px solid ${GREEN_BORDER}`, borderRadius: "10px", padding: "0 10px 0 12px" }}>
    <span style={{ color: GREEN, display: "flex" }}>{icon}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="green-input"
      style={{ border: "none", background: "transparent", fontSize: "13px", color: GREEN_DARK, cursor: "pointer", fontWeight: 600, padding: "10px 4px" }}>
      {children}
    </select>
  </div>
);

const EmptyRow = ({ cols, text }: { cols: number; text: string }) => (
  <tr>
    <td colSpan={cols} style={{ padding: "64px 24px", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.emptyState}</div>
        <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>{text}</p>
        <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>Try a different search or filter</p>
      </div>
    </td>
  </tr>
);

const Banner = ({ kind, children }: { kind: "error" | "success" | "warn"; children: React.ReactNode }) => {
  const s = kind === "error"
    ? { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" }
    : kind === "warn"
    ? { bg: "#fffbeb", border: "#fde68a", color: "#b45309" }
    : { bg: GREEN_LIGHT, border: "#b7dcbd", color: GREEN_DARK };
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: s.color, display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <span style={{ display: "flex", marginTop: "1px", flexShrink: 0 }}>{kind === "success" ? Icon.check : Icon.alertSm}</span>
      <span>{children}</span>
    </div>
  );
};

const ModalCloseBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} aria-label="Close" style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {Icon.x}
  </button>
);

const FilterCard: React.CSSProperties = { background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const TableCard: React.CSSProperties  = { background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" };

export default function InventoryAdjustmentPage() {
  const [tab,        setTab]        = useState<TabKey>("adjustment");
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState<"All" | CategoryType>("All");
  const [statFilter, setStatFilter] = useState<"All" | ProductStatus>("All");
  const [detailProd, setDetailProd] = useState<Product | null>(null);

  const [adjQty,     setAdjQty]     = useState(0);
  const [adjUnit,    setAdjUnit]    = useState<"cases" | "pieces">("cases");
  const [adjReason,  setAdjReason]  = useState("Received");
  const [adjNote,    setAdjNote]    = useState("");
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError,   setAdjError]   = useState<string | null>(null);
  const [adjSuccess, setAdjSuccess] = useState(false);

  // Confirmation dialogs (shown before anything is saved)
  const [showAdjConfirm, setShowAdjConfirm] = useState(false);
  const [expConfirm,     setExpConfirm]     = useState<null | "save" | "clear">(null);

  // Expired / Damaged → deduct only (no addition)
  const isDeductOnly = DEDUCT_ONLY_REASONS.includes(adjReason);

  // ── Expiration tab state ──
  const [expSearch,  setExpSearch]  = useState("");
  const [expFilter,  setExpFilter]  = useState<"All" | ExpiryStatus>("All");
  const [expProd,    setExpProd]    = useState<Product | null>(null);
  const [expDate,    setExpDate]    = useState("");
  const [expLoading, setExpLoading] = useState(false);
  const [expError,   setExpError]   = useState<string | null>(null);

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [productsData, suppliersData, batches] = await Promise.all([
        api.getProducts(),
        api.getSuppliers(),
        // If the batches endpoint is unavailable, the page still loads (all show "No Date")
        api.getAllStockBatches().catch(() => [] as any[]),
      ]);

      // Earliest dated active batch per product → drives the expiry column
      // (an undated batch is used only when the product has no dated one)
      const earliest: Record<string, { id: string; expiryDate: string | null }> = {};
      for (const b of batches || []) {
        const cur = earliest[b.productId];
        if (!b.expiryDate) {
          if (!cur) earliest[b.productId] = { id: String(b.id), expiryDate: null };
          continue;
        }
        if (!cur || !cur.expiryDate || b.expiryDate < cur.expiryDate) {
          earliest[b.productId] = { id: String(b.id), expiryDate: String(b.expiryDate) };
        }
      }
      const supplierMap = (suppliersData || []).reduce((acc: Record<string, string>, s: any) => {
        acc[s.id] = s.supplierName;
        return acc;
      }, {});
      setProducts((productsData || []).map((p: any): Product => ({
        id:            String(p.id),
        productName:   String(p.productName),
        category:      (p.category ?? "OTHER") as CategoryType,
        size:          p.size ?? null,
        barcode:       p.barcode ?? null,
        price:         Number(p.price ?? 0),
        stock:         Number(p.stock ?? 0),
        piecesPerCase: Number(p.piecesPerCase ?? PIECES_PER_CASE_DEFAULT),
        reservedStock: Number(p.reservedStock ?? 0),
        expiryDate:    earliest[p.id]?.expiryDate ?? null,
        batchId:       earliest[p.id]?.id ?? null,
        image:        p.image ?? null,
        status:        (p.status ?? "ACTIVE") as ProductStatus,
        supplierId:    String(p.supplierId ?? ""),
        supplierName:  supplierMap[p.supplierId] || p.supplier?.supplierName || "—",
        createdAt:     String(p.createdAt ?? ""),
        updatedAt:     String(p.updatedAt ?? p.createdAt ?? ""),
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = useMemo(() =>
    products
      .filter((p) => {
        const q = search.toLowerCase();
        const matchSearch = !q || p.productName.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchCat    = catFilter  === "All" || p.category === catFilter;
        const matchStat   = statFilter === "All" || p.status   === statFilter;
        return matchSearch && matchCat && matchStat;
      })
      .sort((a, b) => b.stock - a.stock),
  [products, search, catFilter, statFilter]);

  const counts = useMemo(() => ({
    total:  products.length,
    active: products.filter(p => p.status === "ACTIVE").length,
    low:    products.filter(p => deriveStockStatus(p.stock) === "Low Stock").length,
    out:    products.filter(p => p.stock === 0).length,
  }), [products]);

  // ── Expiration derived data ──
  const expCounts = useMemo(() => ({
    expired:  products.filter(p => getExpiryStatus(p.expiryDate) === "Expired").length,
    soon:     products.filter(p => getExpiryStatus(p.expiryDate) === "Expiring Soon").length,
    good:     products.filter(p => getExpiryStatus(p.expiryDate) === "Good").length,
    noDate:   products.filter(p => getExpiryStatus(p.expiryDate) === "No Date").length,
  }), [products]);

  const expFiltered = useMemo(() => {
    const priority: Record<ExpiryStatus, number> = { "Expired": 0, "Expiring Soon": 1, "Good": 2, "No Date": 3 };
    return products
      .filter((p) => {
        const q = expSearch.toLowerCase();
        const matchSearch = !q || p.productName.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
        const matchStat   = expFilter === "All" || getExpiryStatus(p.expiryDate) === expFilter;
        return matchSearch && matchStat;
      })
      .sort((a, b) => {
        const pa = priority[getExpiryStatus(a.expiryDate)];
        const pb = priority[getExpiryStatus(b.expiryDate)];
        if (pa !== pb) return pa - pb;
        const da = daysUntilExpiry(a.expiryDate) ?? Infinity;
        const db = daysUntilExpiry(b.expiryDate) ?? Infinity;
        return da - db;
      });
  }, [products, expSearch, expFilter]);

  const openDetail = (p: Product) => {
    setDetailProd({ ...p });
    setAdjQty(0);
    setAdjUnit("cases");
    setAdjReason("Received");
    setAdjNote("");
    setAdjError(null);
    setAdjSuccess(false);
  };

  // Change reason; Expired / Damaged can only deduct, so flip any positive qty to negative
  const selectReason = (r: string) => {
    setAdjReason(r);
    setAdjSuccess(false);
    setAdjError(null);
    if (DEDUCT_ONLY_REASONS.includes(r)) {
      setAdjQty((v) => (v > 0 ? -v : v));
    }
  };

  const caseDelta = detailProd
    ? adjUnit === "cases" ? adjQty : adjQty / getPiecesPerCase(detailProd)
    : 0;

  const previewCases  = detailProd ? Math.max(0, detailProd.stock + caseDelta) : 0;
  const previewPieces = detailProd ? Math.round(previewCases * getPiecesPerCase(detailProd)) : 0;

  const adjPiecesAbs = detailProd
    ? adjUnit === "cases"
      ? Math.abs(adjQty) * getPiecesPerCase(detailProd)
      : Math.abs(adjQty)
    : 0;

  // Step 1: validate, then ask the user to confirm
  const requestAdjustment = () => {
    if (!detailProd || adjQty === 0) return;

    // Safety net: Expired / Damaged must never add stock
    if (isDeductOnly && adjQty > 0) {
      setAdjError(`"${adjReason}" can only deduct stock.`);
      return;
    }
    setAdjError(null);
    setAdjSuccess(false);
    setShowAdjConfirm(true);
  };

  // Step 2: runs only after the user presses "Confirm"
  const applyAdjustment = async () => {
    setShowAdjConfirm(false);
    if (!detailProd || adjQty === 0) return;
    if (isDeductOnly && adjQty > 0) return;

    setAdjLoading(true);
    setAdjError(null);
    setAdjSuccess(false);
    try {
      const employeeId = JSON.parse(localStorage.getItem("user") || "null")?.id ?? "";

      const quantityInCases = adjUnit === "cases"
        ? adjQty
        : adjQty / getPiecesPerCase(detailProd);

      await api.adjustStock({
        productId:  detailProd.id,
        quantity:   quantityInCases,
        reason:     `${adjReason}${adjNote ? `: ${adjNote}` : ""}`,
        employeeId,
      });

      setAdjQty(0);
      setAdjNote("");
      setAdjSuccess(true);
      await fetchProducts(); // ← re-fetch from server so table reflects DB truth
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setAdjLoading(false);
    }
  };

  // ── Expiration actions ──
  const openExpiry = (p: Product) => {
    setExpProd(p);
    setExpDate(toDateInput(p.expiryDate));
    setExpError(null);
  };

  const closeExpiry = () => {
    setExpProd(null);
    setExpDate("");
    setExpError(null);
  };

  // Step 1: validate, then ask the user to confirm
  const requestExpiry = (clear = false) => {
    if (!expProd) return;
    if (!clear && !expDate) { setExpError("Please choose an expiration date."); return; }
    setExpError(null);
    setExpConfirm(clear ? "clear" : "save");
  };

  // Step 2: runs only after the user presses "Confirm"
  const saveExpiry = async (clear = false) => {
    setExpConfirm(null);
    if (!expProd) return;
    if (!clear && !expDate) { setExpError("Please choose an expiration date."); return; }

    setExpLoading(true);
    setExpError(null);
    try {
      const newExpiry = clear ? null : new Date(`${expDate}T00:00:00.000Z`).toISOString();

      if (!expProd.batchId) {
        throw new Error("This product has no stock batch yet. Receive it through a delivery first.");
      }
      await api.updateBatchExpiry(expProd.batchId, newExpiry);

      // Re-read from the server without the loading skeleton
      await fetchProducts(true);
      closeExpiry();
    } catch (e) {
      setExpError(e instanceof Error ? e.message : "Failed to save expiration date");
    } finally {
      setExpLoading(false);
    }
  };

  // ── Loading ──
  if (loading) return (
    <div className="adj-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "26px" }}>
        <div style={{ ...shimmerBg, width: "44px", height: "44px", borderRadius: "12px" }} />
        <div>
          <div style={{ ...shimmerBg, width: "200px", height: "16px", borderRadius: "6px", marginBottom: "8px" }} />
          <div style={{ ...shimmerBg, width: "260px", height: "11px", borderRadius: "6px" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "20px 22px" }}>
            <div style={{ ...shimmerBg, height: "11px", width: "80px", borderRadius: "6px", marginBottom: "12px" }} />
            <div style={{ ...shimmerBg, height: "28px", width: "60px", borderRadius: "6px" }} />
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "16px" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...shimmerBg, height: "14px", borderRadius: "6px", marginBottom: "16px" }} />
        ))}
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="adj-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>
      <style>{CSS}</style>
      <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", border: "1px solid #fecaca" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c" }}>
          {Icon.alertSm}
          <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{error}</p>
        </div>
        <button onClick={() => fetchProducts()} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "adjustment", label: "Inventory Adjustment", icon: Icon.box },
    { key: "expiration", label: "Expiration Adjustment", icon: Icon.calendar, badge: expCounts.expired + expCounts.soon },
  ];


  return (
    <div className="adj-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>
      <style>{CSS}</style>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", flexShrink: 0 }}>
            {Icon.inventory}
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.02em" }}>Inventory Adjustment</h1>
            <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>Adjust stock levels and manage product expiration dates</p>
          </div>
        </div>
        <button onClick={() => fetchProducts()} className="btn-outline"
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, transition: "all 0.15s" }}>
          <span style={{ display: "flex" }}>{Icon.refresh}</span> Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "24px", background: GREEN_LIGHT, borderRadius: "12px", padding: "4px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={active ? undefined : "tab-btn"}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 18px", borderRadius: "9px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 600,
                background: active ? GREEN : "transparent",
                color: active ? "#fff" : MUTED,
                boxShadow: active ? "0 2px 8px rgba(46,125,62,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              <span style={{ display: "flex" }}>{t.icon}</span>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span style={{ background: active ? "#facc15" : "#e53935", color: active ? GREEN_DARK : "#fff", fontSize: "10.5px", fontWeight: 800, borderRadius: "999px", padding: "1px 8px" }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════ TAB: INVENTORY ADJUSTMENT ════════════════ */}
      {tab === "adjustment" && (
        <>
          {/* ── Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Total Products", value: counts.total,  icon: Icon.layers,      accent: GREEN,     light: GREEN_LIGHT, highlight: true  },
              { label: "Active",         value: counts.active, icon: Icon.checkCircle, accent: GREEN_MID, light: GREEN_LIGHT, highlight: false },
              { label: "Low Stock",      value: counts.low,    icon: Icon.alert,       accent: "#d97706", light: "#fffbeb",   highlight: false },
              { label: "Out of Stock",   value: counts.out,    icon: Icon.xCircle,     accent: "#dc2626", light: "#fef2f2",   highlight: false },
            ].map((s) => (
              <div key={s.label} style={{
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
                <p style={{ fontSize: "28px", fontWeight: 800, color: s.highlight ? "#fff" : INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div style={FilterCard}>
            <SearchBox value={search} onChange={setSearch} placeholder="Search name, barcode, ID..." />
            <SelectBox icon={Icon.tag} value={catFilter} onChange={(v) => setCatFilter(v as any)}>
              <option value="All">Category: All</option>
              {(Object.keys(categoryLabels) as CategoryType[]).map(c => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </SelectBox>
            <SelectBox icon={Icon.chart} value={statFilter} onChange={(v) => setStatFilter(v as any)}>
              <option value="All">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </SelectBox>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: MUTED, fontWeight: 500 }}>
              {filtered.length} of {products.length} products
            </span>
          </div>

          {/* ── Table ── */}
          <div style={TableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                <thead>
                  <tr>
                    {["Product", "Category", "Barcode", "Supplier", "Price / pc", "Stock (cases)", "Stock (pcs)", "Reserved", "Expiry Date", "Status", "Action"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <EmptyRow cols={11} text="No products found" />
                  ) : filtered.map((p) => {
                    const stockStatus = deriveStockStatus(p.stock);
                    const st          = statusStyle[stockStatus];
                    const pcs = totalPieces(p);
                    const pct = p.stock > 0 ? Math.min(100, Math.round((p.stock / Math.max(p.stock, 10)) * 100)) : 0;
                    const ps  = productStatusStyle[p.status];
                    return (
                      <tr key={p.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <ProductThumb p={p} />
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0 }}>{p.productName}</p>
                              {p.size && <p style={{ fontSize: "11px", color: FAINT, margin: "2px 0 0" }}>{p.size}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={pill(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>{categoryLabels[p.category] ?? p.category}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ background: "#f1f5f2", color: MUTED, padding: "3px 9px", borderRadius: "6px", fontSize: "11.5px", fontFamily: "monospace", fontWeight: 600 }}>
                            {p.barcode ?? "—"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={pill("#eff6ff", "#1d4ed8", "#bfdbfe")}>{p.supplierName}</span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: GREEN }}>{fmtPrice(p.price)}</td>
                        <td style={tdStyle}>
                          <p style={{ fontSize: "15px", fontWeight: 800, color: st.color, margin: 0 }}>{p.stock}</p>
                          <div style={{ width: "60px", height: "5px", borderRadius: "10px", background: GREEN_LIGHT, marginTop: "5px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: st.dot, borderRadius: "10px" }} />
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: MUTED }}>{pcs} pcs</td>
                        <td style={{ ...tdStyle, color: p.reservedStock > 0 ? "#b45309" : FAINT, fontWeight: p.reservedStock > 0 ? 700 : 400 }}>
                          {p.reservedStock}
                        </td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: MUTED }}>{fmtDate(p.expiryDate)}</td>
                        <td style={tdStyle}>
                          <span style={pill(ps.bg, ps.color, ps.border)}>{p.status}</span>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => openDetail(p)} className="btn-green"
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "9px", border: "none", background: GREEN, color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(46,125,62,0.25)", transition: "background 0.15s" }}>
                            {Icon.clipboard} Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT }}>
              <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>
                Showing <strong style={{ color: INK }}>{filtered.length}</strong> of <strong style={{ color: INK }}>{products.length}</strong> products
              </p>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ TAB: EXPIRATION ════════════════ */}
      {tab === "expiration" && (
        <>
          {/* ── Summary Cards (click to filter) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {([
              { label: "Expired",       value: expCounts.expired, icon: Icon.ban,         status: "Expired"       as ExpiryStatus, accent: "#dc2626", light: "#fef2f2" },
              { label: "Expiring Soon", value: expCounts.soon,    icon: Icon.hourglass,   status: "Expiring Soon" as ExpiryStatus, accent: "#d97706", light: "#fffbeb" },
              { label: "Good",          value: expCounts.good,    icon: Icon.checkCircle, status: "Good"          as ExpiryStatus, accent: GREEN_MID, light: GREEN_LIGHT },
              { label: "No Date Set",   value: expCounts.noDate,  icon: Icon.help,        status: "No Date"       as ExpiryStatus, accent: "#8fa596", light: "#f1f5f2" },
            ]).map((s) => {
              const active = expFilter === s.status;
              return (
                <button
                  key={s.label}
                  className="stat-btn"
                  onClick={() => setExpFilter(active ? "All" : s.status)}
                  style={{ position: "relative", overflow: "hidden", textAlign: "left", background: active ? GREEN_TINT : "#fff", borderRadius: "14px", border: `1px solid ${active ? GREEN : GREEN_BORDER}`, padding: "20px 22px", boxShadow: active ? `0 0 0 2px ${GREEN}` : "none", cursor: "pointer", transition: "all 0.15s" }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: s.accent }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                </button>
              );
            })}
          </div>

          {/* ── Filter Bar ── */}
          <div style={FilterCard}>
            <SearchBox value={expSearch} onChange={setExpSearch} placeholder="Search name or barcode..." />
            <SelectBox icon={Icon.calendar} value={expFilter} onChange={(v) => setExpFilter(v as any)}>
              <option value="All">Expiry: All</option>
              <option value="Expired">Expired</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Good">Good</option>
              <option value="No Date">No Date Set</option>
            </SelectBox>
            <span style={{ fontSize: "11.5px", color: FAINT }}>
              “Expiring Soon” = within {EXPIRING_SOON_DAYS} days
            </span>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: MUTED, fontWeight: 500 }}>
              {expFiltered.length} of {products.length} products
            </span>
          </div>

          {/* ── Expiration Table ── */}
          <div style={TableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr>
                    {["Date & Time", "Product", "Category", "Unit Type", "Total Bottles", "Expiration Date", "Action"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expFiltered.length === 0 ? (
                    <EmptyRow cols={7} text="No products found" />
                  ) : expFiltered.map((p) => {
                    const es   = getExpiryStatus(p.expiryDate);
                    const est  = expiryStyle[es];
                    const days = daysUntilExpiry(p.expiryDate);
                    const hasDate = !!p.expiryDate;
                    const dt = fmtDateTime(p.updatedAt || p.createdAt);
                    return (
                      <tr key={p.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                        {/* Date & Time */}
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <p style={{ fontSize: "12.5px", fontWeight: 600, color: INK, margin: 0 }}>{dt.date}</p>
                          <p style={{ fontSize: "11px", color: FAINT, margin: "2px 0 0" }}>{dt.time}</p>
                        </td>

                        {/* Product */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <ProductThumb p={p} />
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0 }}>{p.productName}</p>
                              {p.size && <p style={{ fontSize: "11px", color: FAINT, margin: "2px 0 0" }}>{p.size}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={tdStyle}>
                          <span style={pill(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>{categoryLabels[p.category] ?? p.category}</span>
                        </td>

                        {/* Unit Type */}
                        <td style={tdStyle}>
                          <span style={{ background: "#f1f5f2", color: MUTED, padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Case · {getPiecesPerCase(p)} pcs
                          </span>
                        </td>

                        {/* Total Bottles */}
                        <td style={tdStyle}>
                          <p style={{ fontSize: "14px", fontWeight: 800, color: INK, margin: 0 }}>{totalPieces(p).toLocaleString()}</p>
                          <p style={{ fontSize: "11px", color: FAINT, margin: "2px 0 0" }}>{p.stock} case{p.stock !== 1 ? "s" : ""}</p>
                        </td>

                        {/* Expiration Date */}
                        <td style={tdStyle}>
                          <p style={{ fontSize: "13px", fontWeight: hasDate ? 700 : 400, color: hasDate ? INK : FAINT, margin: 0 }}>
                            {fmtDate(p.expiryDate)}
                          </p>
                          <span style={{ ...pill(est.bg, est.color, est.border), marginTop: "5px", fontSize: "10.5px", fontWeight: 700, padding: "2px 9px" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: est.dot }} />
                            {es}{hasDate ? ` · ${daysLabel(days)}` : ""}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={tdStyle}>
                          <button onClick={() => openExpiry(p)} disabled={!p.batchId}
                            className={hasDate ? "btn-ghost" : "btn-green"}
                            title={p.batchId ? undefined : "No stock batch yet — receive this product through a delivery first"}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 600, cursor: p.batchId ? "pointer" : "not-allowed", opacity: p.batchId ? 1 : 0.45, whiteSpace: "nowrap", border: hasDate ? `1px solid ${GREEN_BORDER}` : "none", background: hasDate ? "#fff" : GREEN, color: hasDate ? GREEN : "#fff", boxShadow: hasDate ? "none" : "0 2px 8px rgba(46,125,62,0.25)", transition: "all 0.15s" }}>
                            {hasDate ? <>{Icon.edit} Adjust</> : <>{Icon.plus} Add Date</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT }}>
              <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>
                Showing <strong style={{ color: INK }}>{expFiltered.length}</strong> of <strong style={{ color: INK }}>{products.length}</strong> products
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Expiration Modal ── */}
      {expProd && (
        <>
          <div onClick={closeExpiry} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(94vw, 440px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", border: `1px solid ${GREEN_BORDER}` }}>

            <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px", fontWeight: 700 }}>
                  {expProd.expiryDate ? "Edit Expiration" : "Add Expiration"}
                </p>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>{expProd.productName}</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", margin: "3px 0 0" }}>
                  {expProd.size && `${expProd.size} · `}{categoryLabels[expProd.category]} · {expProd.stock} cases in stock
                </p>
              </div>
              <ModalCloseBtn onClick={closeExpiry} />
            </div>

            <div style={{ padding: "24px 26px" }}>
              {expProd.expiryDate && (
                <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <div>
                    <p style={{ fontSize: "10.5px", color: FAINT, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, margin: "0 0 3px" }}>Current Expiry</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: 0 }}>{fmtDate(expProd.expiryDate)}</p>
                  </div>
                  <span style={pill(expiryStyle[getExpiryStatus(expProd.expiryDate)].bg, expiryStyle[getExpiryStatus(expProd.expiryDate)].color, expiryStyle[getExpiryStatus(expProd.expiryDate)].border)}>
                    {getExpiryStatus(expProd.expiryDate)}
                  </span>
                </div>
              )}

              <label style={labelStyle}>Expiration Date</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="green-input"
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "15px", fontWeight: 600, color: INK, background: "#fff", boxSizing: "border-box", marginBottom: "14px" }}
              />

              <p style={{ fontSize: "11.5px", color: MUTED, margin: "0 0 8px", fontWeight: 600 }}>Quick set (from today)</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                {[
                  { label: "+3 months", months: 3 },
                  { label: "+6 months", months: 6 },
                  { label: "+1 year",   months: 12 },
                  { label: "+2 years",  months: 24 },
                ].map((q) => (
                  <button key={q.label} onClick={() => setExpDate(dateInMonths(q.months))} className="btn-outline"
                    style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT, color: GREEN_DARK, cursor: "pointer", transition: "all 0.15s" }}>
                    {q.label}
                  </button>
                ))}
              </div>

              {expDate && (
                <p style={{ fontSize: "12.5px", marginTop: "12px", marginBottom: 0, color: expiryStyle[getExpiryStatus(expDate)].color, fontWeight: 600, display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ display: "flex" }}>{getExpiryStatus(expDate) === "Good" ? Icon.check : getExpiryStatus(expDate) === "Expiring Soon" ? Icon.clock : Icon.alertSm}</span>
                  {getExpiryStatus(expDate) === "Expired"
                    ? "This date is in the past — the product will be marked Expired."
                    : getExpiryStatus(expDate) === "Expiring Soon"
                    ? `Expires in ${daysUntilExpiry(expDate)} day(s) — will be flagged as Expiring Soon.`
                    : `Expires in ${daysUntilExpiry(expDate)} days.`}
                </p>
              )}

              {expError && (
                <div style={{ marginTop: "14px" }}><Banner kind="error">{expError}</Banner></div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={closeExpiry} disabled={expLoading} className="btn-outline"
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  Cancel
                </button>
                <button onClick={() => requestExpiry(false)} disabled={expLoading || !expDate} className="btn-green"
                  style={{ flex: 1.4, padding: "12px", borderRadius: "10px", border: "none", background: expLoading || !expDate ? "#e5ece6" : GREEN, color: expLoading || !expDate ? FAINT : "#fff", fontSize: "14px", fontWeight: 700, cursor: expLoading || !expDate ? "not-allowed" : "pointer", boxShadow: expLoading || !expDate ? "none" : "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                  {expLoading ? "Saving…" : expProd.expiryDate ? "Save Changes" : "Save Expiration"}
                </button>
              </div>

              {expProd.expiryDate && (
                <button onClick={() => requestExpiry(true)} disabled={expLoading}
                  style={{ width: "100%", marginTop: "10px", padding: "10px", borderRadius: "10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
                  Remove expiration date
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Detail + Adjust Modal ── */}
      {detailProd && (
        <>
          <div onClick={() => setDetailProd(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(96vw, 580px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", border: `1px solid ${GREEN_BORDER}` }}>

            {/* Modal Header */}
            <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                    {detailProd.barcode && (
                      <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace", fontWeight: 700 }}>
                        {detailProd.barcode}
                      </span>
                    )}
                    <span style={pill(productStatusStyle[detailProd.status].bg, productStatusStyle[detailProd.status].color, productStatusStyle[detailProd.status].border)}>
                      {detailProd.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 2px", letterSpacing: "-0.01em" }}>{detailProd.productName}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", margin: 0 }}>
                    {detailProd.size && `${detailProd.size} · `}{categoryLabels[detailProd.category]} · {detailProd.supplierName}
                  </p>
                </div>
                <ModalCloseBtn onClick={() => setDetailProd(null)} />
              </div>
              <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.18)", borderRadius: "14px", padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px", fontWeight: 600 }}>Current Stock</p>
                    <p style={{ fontSize: "36px", fontWeight: 800, color: "#fff", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>{detailProd.stock}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>
                      cases · {totalPieces(detailProd)} total pcs · {detailProd.piecesPerCase} pcs/case
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {(() => {
                      const ss = deriveStockStatus(detailProd.stock);
                      const st = statusStyle[ss];
                      return (
                        <span style={{ ...pill(st.bg, st.color, st.border), padding: "5px 14px", fontSize: "12px", fontWeight: 700 }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: st.dot }} />
                          {ss}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Product Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
                {[
                  ["Category",       categoryLabels[detailProd.category]],
                  ["Supplier",       detailProd.supplierName],
                  ["Price / piece",  fmtPrice(detailProd.price)],
                  ["Price / case",   fmtPrice(detailProd.price * detailProd.piecesPerCase)],
                  ["Expiry Date",    fmtDate(detailProd.expiryDate)],
                  ["Reserved Stock", `${detailProd.reservedStock} pcs`],
                  ["Pieces / Case",  String(detailProd.piecesPerCase)],
                  ["Total Pieces",   `${totalPieces(detailProd)} pcs`],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "10.5px", color: FAINT, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px", fontWeight: 700 }}>{label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Adjustment Panel */}
              <div style={{ background: GREEN_TINT, borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "20px", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 800, color: GREEN_DARK, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "flex", color: GREEN }}>{Icon.clipboard}</span> Adjust Stock
                </p>
                <p style={{ fontSize: "12px", color: isDeductOnly ? "#b91c1c" : MUTED, fontWeight: isDeductOnly ? 600 : 400, margin: "0 0 16px" }}>
                  {isDeductOnly
                    ? `"${adjReason}" can only deduct stock — addition is disabled.`
                    : "Positive = add stock · Negative = deduct stock"}
                </p>

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Reason</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["Received", "Expired", "Damaged", "Audit Correction"].map((r) => (
                      <button key={r} onClick={() => selectReason(r)}
                        style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjReason === r ? `1px solid ${GREEN}` : `1px solid ${GREEN_BORDER}`, background: adjReason === r ? GREEN : "#fff", color: adjReason === r ? "#fff" : MUTED, cursor: "pointer", transition: "all 0.15s", boxShadow: adjReason === r ? "0 2px 8px rgba(46,125,62,0.25)" : "none" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Unit</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {(["cases", "pieces"] as const).map((u) => (
                      <button key={u} onClick={() => { setAdjUnit(u); setAdjQty(0); }}
                        style={{ padding: "6px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjUnit === u ? `1px solid ${GREEN}` : `1px solid ${GREEN_BORDER}`, background: adjUnit === u ? GREEN : "#fff", color: adjUnit === u ? "#fff" : MUTED, cursor: "pointer", transition: "all 0.15s", boxShadow: adjUnit === u ? "0 2px 8px rgba(46,125,62,0.25)" : "none" }}>
                        {u === "cases" ? `Cases (×${detailProd.piecesPerCase} pcs)` : "Pieces"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Quantity ({adjUnit})</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={() => setAdjQty(v => v - 1)} aria-label="Decrease"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c", flexShrink: 0 }}>
                      {Icon.minus}
                    </button>
                    <input
                      type="number"
                      value={adjQty}
                      max={isDeductOnly ? 0 : undefined}
                      className="green-input"
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        // Expired / Damaged: always store as a negative (deduction)
                        setAdjQty(isDeductOnly ? (n === 0 ? 0 : -Math.abs(n)) : n);
                      }}
                      style={{ width: "90px", textAlign: "center", padding: "8px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "18px", fontWeight: 800, background: "#fff", color: adjQty < 0 ? "#b91c1c" : adjQty > 0 ? GREEN : INK }}
                    />
                    <button
                      onClick={() => setAdjQty(v => isDeductOnly ? Math.min(0, v + 1) : v + 1)}
                      disabled={isDeductOnly && adjQty >= 0}
                      aria-label="Increase"
                      title={isDeductOnly ? `"${adjReason}" can only deduct stock` : undefined}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: isDeductOnly && adjQty >= 0 ? "#e5ece6" : GREEN, cursor: isDeductOnly && adjQty >= 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isDeductOnly && adjQty >= 0 ? FAINT : "#fff", flexShrink: 0 }}>
                      {Icon.plus}
                    </button>
                    <div style={{ fontSize: "13px", color: MUTED }}>
                      → New stock: <strong style={{ color: GREEN, fontSize: "15px" }}>{Math.round(previewCases)}</strong> cases
                      <span style={{ fontSize: "11px", color: FAINT }}> ({previewPieces} pcs)</span>
                    </div>
                  </div>
                  {adjUnit === "cases" && adjQty !== 0 && (
                    <p style={{ fontSize: "11.5px", color: GREEN, margin: "8px 0 0" }}>
                      = {Math.abs(adjQty)} cases × {detailProd.piecesPerCase} pcs = <strong>{Math.abs(adjQty) * detailProd.piecesPerCase} pieces</strong>
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Note (Optional)</label>
                  <input
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder="e.g. Received from supplier delivery DR-0012..."
                    className="green-input"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", color: INK, background: "#fff", boxSizing: "border-box" }}
                  />
                </div>

                {adjError && <div style={{ marginBottom: "12px" }}><Banner kind="error">{adjError}</Banner></div>}
                {adjSuccess && <div style={{ marginBottom: "12px" }}><Banner kind="success">Stock adjusted successfully!</Banner></div>}

                <button
                  onClick={requestAdjustment}
                  disabled={adjQty === 0 || adjLoading}
                  className={adjQty < 0 ? "btn-red" : "btn-green"}
                  style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: adjQty === 0 || adjLoading ? "#e5ece6" : adjQty < 0 ? "#e11d48" : GREEN, color: adjQty === 0 || adjLoading ? FAINT : "#fff", fontSize: "14px", fontWeight: 700, cursor: adjQty === 0 || adjLoading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: adjQty === 0 || adjLoading ? "none" : adjQty < 0 ? "0 4px 12px rgba(225,29,72,0.28)" : "0 4px 12px rgba(46,125,62,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {adjLoading ? "Saving…" : adjQty > 0
                    ? <>{Icon.plus} Add {adjQty} {adjUnit} ({adjPiecesAbs} pcs)</>
                    : adjQty < 0
                    ? <>{Icon.minus} Deduct {Math.abs(adjQty)} {adjUnit} ({adjPiecesAbs} pcs)</>
                    : "Enter an adjustment"}
                </button>
              </div>

              <button onClick={() => setDetailProd(null)} className="btn-outline"
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Confirm: Expiration change ── */}
      {expProd && expConfirm && (
        <>
          <div onClick={() => setExpConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.6)", zIndex: 60, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 70, background: "#fff", borderRadius: "18px", width: "min(92vw, 400px)", padding: "26px", boxShadow: "0 24px 70px rgba(10,30,15,0.35)", border: `1px solid ${GREEN_BORDER}` }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: expConfirm === "clear" ? "#fef2f2" : GREEN_LIGHT, color: expConfirm === "clear" ? "#dc2626" : GREEN, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              {expConfirm === "clear" ? Icon.trash : <svg width="22" height="22" viewBox="0 0 24 24" {...sp}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            </div>
            <p style={{ fontSize: "17px", fontWeight: 800, color: INK, textAlign: "center", margin: "0 0 6px" }}>
              {expConfirm === "clear" ? "Remove expiration date?" : "Save expiration date?"}
            </p>
            <p style={{ fontSize: "13px", color: MUTED, textAlign: "center", margin: "0 0 16px" }}>
              {expProd.productName}{expProd.size ? ` · ${expProd.size}` : ""}
            </p>
            <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "18px", fontSize: "13px", color: INK, display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: FAINT }}>Current</span>
                <strong>{fmtDate(expProd.expiryDate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: FAINT }}>New</span>
                <strong style={{ color: expConfirm === "clear" ? "#b91c1c" : GREEN }}>
                  {expConfirm === "clear" ? "No date" : fmtDate(new Date(`${expDate}T00:00:00.000Z`).toISOString())}
                </strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setExpConfirm(null)} className="btn-outline"
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                Cancel
              </button>
              <button onClick={() => saveExpiry(expConfirm === "clear")} className={expConfirm === "clear" ? "btn-red" : "btn-green"}
                style={{ flex: 1.3, padding: "12px", borderRadius: "10px", border: "none", background: expConfirm === "clear" ? "#e11d48" : GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}>
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Confirm: Stock adjustment ── */}
      {detailProd && showAdjConfirm && (() => {
        const isDeduct   = adjQty < 0;
        const rawNew     = detailProd.stock + caseDelta;
        const overDeduct = rawNew < 0;
        return (
          <>
            <div onClick={() => setShowAdjConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.6)", zIndex: 60, backdropFilter: "blur(2px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 70, background: "#fff", borderRadius: "18px", width: "min(92vw, 420px)", padding: "26px", boxShadow: "0 24px 70px rgba(10,30,15,0.35)", border: `1px solid ${GREEN_BORDER}` }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: isDeduct ? "#fef2f2" : GREEN_LIGHT, color: isDeduct ? "#dc2626" : GREEN, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                {isDeduct
                  ? <svg width="22" height="22" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              </div>
              <p style={{ fontSize: "17px", fontWeight: 800, color: INK, textAlign: "center", margin: "0 0 6px" }}>
                Confirm stock adjustment?
              </p>
              <p style={{ fontSize: "13px", color: MUTED, textAlign: "center", margin: "0 0 16px" }}>
                {detailProd.productName}{detailProd.size ? ` · ${detailProd.size}` : ""}
              </p>

              <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "14px", marginBottom: "14px", fontSize: "13px", color: INK, display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: FAINT }}>Reason</span>
                  <strong>{adjReason}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: FAINT }}>{isDeduct ? "Deduct" : "Add"}</span>
                  <strong style={{ color: isDeduct ? "#b91c1c" : GREEN }}>
                    {Math.abs(adjQty)} {adjUnit} ({adjPiecesAbs} pcs)
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: FAINT }}>Stock</span>
                  <strong>
                    {detailProd.stock} → <span style={{ color: GREEN }}>{Math.round(previewCases)}</span> cases
                  </strong>
                </div>
                {adjNote && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ color: FAINT }}>Note</span>
                    <strong style={{ textAlign: "right", wordBreak: "break-word" }}>{adjNote}</strong>
                  </div>
                )}
              </div>

              {overDeduct && (
                <div style={{ marginBottom: "14px" }}>
                  <Banner kind="warn">This deducts more than the current stock. The result will be 0 cases.</Banner>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowAdjConfirm(false)} className="btn-outline"
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  Cancel
                </button>
                <button onClick={applyAdjustment} className={isDeduct ? "btn-red" : "btn-green"}
                  style={{ flex: 1.3, padding: "12px", borderRadius: "10px", border: "none", background: isDeduct ? "#e11d48" : GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}>
                  Confirm
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}