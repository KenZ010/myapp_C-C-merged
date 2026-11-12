"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ── Theme (same green design as the other pages) ──────────────────────────────
const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels / table headers
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons

// ─── CASE UNIT SYSTEM ─────────────────────────────────────────────────────────
type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: {
  value: CaseUnit;
  label: string;
  short: string;
  bottlesPerCase: number | null;
  detail: string;
}[] = [
  { value: "case_24", label: "Case (24 pcs)", short: "24-cs", bottlesPerCase: 24, detail: "1 case = 24 bottles" },
  { value: "case_12", label: "Case (12 pcs)", short: "12-cs", bottlesPerCase: 12, detail: "1 case = 12 bottles" },
  { value: "case_6",  label: "Case (6 pcs)",  short: "6-cs",  bottlesPerCase: 6,  detail: "1 case = 6 bottles"  },
  { value: "btl",     label: "Bottles",        short: "btl",   bottlesPerCase: null, detail: "Individual bottle" },
  { value: "pcs",     label: "Pieces",         short: "pcs",   bottlesPerCase: null, detail: "Single piece"      },
];

const getUnit      = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];
const getUnitShort = (u?: string) => getUnit(u).short;

function getCaseBreakdown(qty: number, unit?: string): string | null {
  const u = getUnit(unit);
  if (!u.bottlesPerCase) return null;
  return `${qty} × ${u.bottlesPerCase} = ${qty * u.bottlesPerCase} btl`;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type POStatus = "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
type POStep = "receiving" | "create" | "history";

type DeliveryItem = {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  returnedQty: number;
  costPrice: number;
  expiryDate?: string | null;
  unit?: string;
  product?: { id: string; productName: string; price: number; stockUnit?: string; size?: string | null };
};

type Delivery = {
  id: string;
  supplierId: string;
  deliveryDate: string;
  status: POStatus;
  totalItems: number;
  notes?: string;
  createdAt: string;
  receiptNumber?: string;
  supplier?: { id: string; supplierName: string };
  items: DeliveryItem[];
};

// Matches api.receiveDelivery items param exactly
type ReceiveQty = {
  deliveryItemId: string;
  receivedQty: number;
  expiryDate: string; // must be non-empty before submission
};

// ── Create-order types ──
type Supplier = { id: string; supplierName: string };

type Product = {
  id: string;
  productName: string;
  price: number;
  costPrice?: number | null;
  supplierId?: string;
  supplier?: { id: string; supplierName: string } | string;
  status?: string;
  stockUnit?: string;
  stockQuantity?: number;
  size?: string | null;
};

type LineItem = {
  productId: string;
  productName: string;
  size?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  unit: CaseUnit;
};

type DeliveryForm = { supplierId: string; lineItems: LineItem[]; notes: string; deliveryDate: string };

// Reorder suggestion shape returned by GET /api/reorder/suggestions
type ReorderSuggestion = {
  productId: string;
  supplierId?: string;
  productName: string;
  size?: string | null;
  stock: number;
  availableStock: number;
  netUnitsSold: number;
  dailyVelocity: number;
  daysOfStockLeft: number | null;
  needsReorder: boolean;
  urgency: "high" | "medium" | "low";
  unitProfit: number | null;
  totalProfitWindow: number | null;
  suggestedUnits: number;
  suggestedCases: number | null;
};

const emptyLineItem = (): LineItem => ({ productId: "", productName: "", quantity: 1, unitPrice: 0, unit: "case_24" });
const makeEmptyForm = (): DeliveryForm => ({
  supplierId: "",
  lineItems: [emptyLineItem()],
  notes: "",
  deliveryDate: new Date().toISOString().split("T")[0],
});

// Works with whichever key the login flow stores the employee under
function getEmployeeId(): string {
  const direct = localStorage.getItem("userId");
  if (direct) return direct;
  for (const key of ["employee", "user"]) {
    try {
      const o = JSON.parse(localStorage.getItem(key) || "{}");
      const id = o?.id ?? o?.employeeId ?? o?._id ?? o?.userId;
      if (id) return String(id);
    } catch { /* ignore */ }
  }
  return "";
}

// Top 3 sellers (by units sold) among the given products
function isTopSeller(id: string, products: Product[], sales: Record<string, number>) {
  const count = sales[id] ?? 0;
  const top = products.map((x) => sales[x.id] ?? 0).sort((a, b) => b - a).filter((v) => v > 0);
  return count > 0 && top.length > 0 && count >= (top[Math.min(2, top.length - 1)] ?? 0);
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const sp = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  truck:      (<svg width="20" height="20" viewBox="0 0 24 24" {...sp} strokeWidth={1.8}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  box:        (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  receipt:    (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
  receiptLg:  (<svg width="20" height="20" viewBox="0 0 24 24" {...sp}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
  building:   (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/></svg>),
  calendar:   (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  search:     (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  clock:      (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  check:      (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>),
  checkCircle:(<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  alert:      (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  alertLg:    (<svg width="24" height="24" viewBox="0 0 24 24" {...sp}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  x:          (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  xCircle:    (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  eye:        (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  download:   (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  refresh:    (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  plus:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  minus:      (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  chevDown:   (<svg width="10" height="10" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>),
  chevUp:     (<svg width="10" height="10" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><polyline points="18 15 12 9 6 15"/></svg>),
  tag:        (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
  clipboard:  (<svg width="16" height="16" viewBox="0 0 24 24" {...sp}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>),
  bulb:       (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>),
  send:       (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>),
  pointer:    (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>),
  emptyBox:   (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusTheme: Record<POStatus, { bg: string; color: string; border: string; accent: string }> = {
  PENDING:            { bg: "#fffbeb",   color: "#b45309",  border: "#fde68a", accent: "#d97706" },
  PARTIALLY_RECEIVED: { bg: "#eff6ff",   color: "#1d4ed8",  border: "#bfdbfe", accent: "#2563eb" },
  DELIVERED:          { bg: GREEN_LIGHT, color: GREEN_DARK, border: "#b7dcbd", accent: GREEN_MID },
  CANCELLED:          { bg: "#fef2f2",   color: "#b91c1c",  border: "#fecaca", accent: "#dc2626" },
};

const statusIcons: Record<POStatus, React.ReactNode> = {
  PENDING:            Icon.clock,
  PARTIALLY_RECEIVED: Icon.box,
  DELIVERED:          Icon.checkCircle,
  CANCELLED:          Icon.xCircle,
};

const statusPill = (s: POStatus, size: "sm" | "md" = "md"): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "5px",
  padding: size === "sm" ? "3px 10px" : "4px 12px", borderRadius: "20px",
  fontSize: size === "sm" ? "11px" : "11.5px", fontWeight: 600,
  background: statusTheme[s].bg, color: statusTheme[s].color, border: `1px solid ${statusTheme[s].border}`,
  whiteSpace: "nowrap",
});

const STATUS_LABEL: Record<POStatus, string> = {
  PENDING:            "Pending",
  PARTIALLY_RECEIVED: "Partial",
  DELIVERED:          "Delivered",
  CANCELLED:          "Cancelled",
};

const ITEMS_PER_PAGE = 8;

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}` };
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px",
  display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px",
};
const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: GREEN_DARK,
  textTransform: "uppercase", letterSpacing: "0.06em", background: GREEN_TINT,
  borderBottom: `1px solid ${GREEN_BORDER}`, whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "13px 16px", fontSize: "13px", color: INK, borderBottom: `1px solid ${GREEN_LIGHT}`, verticalAlign: "middle",
};
const chip = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "5px", background: bg, color, border: `1px solid ${border}`,
  padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap",
});
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#eef5ef 25%,#dfeae2 50%,#eef5ef 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};
const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`,
  fontSize: "13px", color: INK, background: "#fff", boxSizing: "border-box", transition: "all 0.15s",
};
const errorBanner: React.CSSProperties = {
  background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px",
  fontSize: "12.5px", fontWeight: 600, color: "#b91c1c", display: "flex", alignItems: "flex-start", gap: "8px",
};

const CSS = `
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes toastIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
  .btn-outline:hover:not(:disabled) { background: ${GREEN_TINT} !important; border-color: ${GREEN} !important; }
  .btn-green:hover:not(:disabled) { background: ${GREEN_DARK} !important; }
  .btn-red:hover:not(:disabled) { background: #fee2e2 !important; }
  .btn-red-solid:hover:not(:disabled) { background: #be123c !important; }
  .tab-btn:hover { color: ${GREEN_DARK} !important; }
  .row-hover:hover { background: ${GREEN_TINT} !important; }
  .opt-hover:hover:not(:disabled) { background: ${GREEN_TINT} !important; }
  .restock-card:hover { border-color: #b7dcbd !important; background: ${GREEN_TINT} !important; }
  .po-card { transition: box-shadow 0.18s, border-color 0.18s; }
  .po-card:hover { box-shadow: 0 8px 24px rgba(31,95,45,0.10); border-color: #b7dcbd !important; }
  .green-input:focus { border-color: ${GREEN} !important; box-shadow: 0 0 0 3px rgba(46,125,62,0.14); outline: none; }
  .po-page button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
`;

// ─── PAGINATION (module level so it never remounts) ───────────────────────────
function PaginationBar({
  page, totalPages, setPage, total, label,
}: { page: number; totalPages: number; setPage: (p: number) => void; total: number; label: string }) {
  if (totalPages <= 1) return null;
  const navBtn = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: "8px", border: `1px solid ${GREEN_BORDER}`, background: "#fff",
    fontSize: "12px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", color: MUTED, opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap", gap: "8px" }}>
      <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>
        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {label}
      </p>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        <button className="btn-outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={navBtn(page === 1)}>← Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => setPage(p)}
            style={{ padding: "6px 11px", borderRadius: "8px", border: page === p ? `1px solid ${GREEN}` : `1px solid ${GREEN_BORDER}`, background: page === p ? GREEN : "#fff", color: page === p ? "#fff" : MUTED, fontSize: "12px", cursor: "pointer", fontWeight: 700, boxShadow: page === p ? "0 2px 8px rgba(46,125,62,0.3)" : "none" }}>{p}</button>
        ))}
        <button className="btn-outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={navBtn(page === totalPages)}>Next →</button>
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose, right }: { icon?: React.ReactNode; title: string; subtitle?: string; onClose?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {icon && (
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.18)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>{title}</p>
          {subtitle && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", margin: "2px 0 0", fontFamily: subtitle.length > 20 ? "monospace" : "inherit", wordBreak: "break-all" }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {right}
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.x}</button>
        )}
      </div>
    </div>
  );
}

// Small numbered step header used in the Create Order tab
function StepHeader({ n, title, active = true, right }: { n: number | string; title: React.ReactNode; active?: boolean; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: active ? GREEN : "#c5d3c8", color: "#fff", fontSize: "12px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: 0 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

// Unit pill, e.g. "3 24-cs"
function UnitPill({ unit, qty }: { unit?: string; qty?: number }) {
  const u = getUnit(unit);
  return (
    <span style={chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>
      {qty != null && <strong style={{ color: INK }}>{qty}</strong>}
      <span>{u.short}</span>
    </span>
  );
}

// ─── CUSTOM SUPPLIER DROPDOWN ─────────────────────────────────────────────────
function SupplierSelect({
  value, onChange, suppliers, hint, lowStockCount, search = "",
}: {
  value: string;
  onChange: (id: string) => void;
  suppliers: Supplier[];
  hint?: string;
  lowStockCount?: number;
  search?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = suppliers.find((s) => s.id === value);
  const filtered = suppliers.filter((s) =>
    s.supplierName.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => { if (search) setOpen(true); }, [search]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const avatar = (name: string, active: boolean): React.CSSProperties => ({
    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
    background: active ? GREEN : GREEN_LIGHT, color: active ? "#fff" : GREEN_DARK,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800,
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="green-input"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${open ? GREEN : GREEN_BORDER}`, background: "#fff", textAlign: "left", cursor: "pointer", fontSize: "13px", boxSizing: "border-box" }}
      >
        {selected ? (
          <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={avatar(selected.supplierName, true)}>{selected.supplierName.charAt(0).toUpperCase()}</span>
            <span style={{ fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.supplierName}</span>
          </span>
        ) : (
          <span style={{ color: FAINT }}>Select a supplier...</span>
        )}
        <span style={{ color: FAINT, display: "flex", flexShrink: 0 }}>{Icon.chevDown}</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", boxShadow: "0 12px 32px rgba(31,95,45,0.16)", zIndex: 30, maxHeight: "260px", overflowY: "auto" }}>
          {suppliers.length === 0 ? (
            <div style={{ padding: "14px", fontSize: "13px", color: FAINT, textAlign: "center" }}>No suppliers found</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "14px", fontSize: "13px", color: FAINT, textAlign: "center" }}>No suppliers match your search</div>
          ) : (
            filtered.map((s) => {
              const active = value === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="opt-hover"
                  onClick={() => { onChange(s.id); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", border: "none", borderBottom: `1px solid ${GREEN_LIGHT}`, background: active ? GREEN_LIGHT : "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={avatar(s.supplierName, active)}>{s.supplierName.charAt(0).toUpperCase()}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "13px", fontWeight: active ? 700 : 500, color: active ? GREEN_DARK : INK }}>
                    {s.supplierName}
                    {active && lowStockCount != null && lowStockCount > 0 && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#b45309", fontWeight: 700 }}>{lowStockCount} low stock</span>
                    )}
                  </span>
                  {active && <span style={{ color: GREEN, display: "flex" }}>{Icon.check}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
      {hint && <p style={{ fontSize: "12px", margin: "6px 0 0", color: GREEN, fontWeight: 500 }}>{hint}</p>}
    </div>
  );
}

// ─── CUSTOM PRODUCT DROPDOWN ──────────────────────────────────────────────────
function ProductSelect({
  value, onChange, products, usedIds, productSales,
}: {
  value: string;
  onChange: (id: string) => void;
  products: Product[];
  usedIds: string[];
  productSales: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="green-input"
        style={{ ...fieldStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", textAlign: "left", cursor: "pointer", border: `1px solid ${open ? GREEN : GREEN_BORDER}` }}
      >
        {selected ? (
          <span style={{ color: INK, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.productName}{selected.size ? ` ${selected.size}` : ""}
          </span>
        ) : (
          <span style={{ color: FAINT }}>Select product</span>
        )}
        <span style={{ color: FAINT, display: "flex", flexShrink: 0 }}>{Icon.chevDown}</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, minWidth: "240px", background: "#fff", border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", boxShadow: "0 12px 32px rgba(31,95,45,0.16)", zIndex: 30, maxHeight: "240px", overflowY: "auto" }}>
          {products.length === 0 ? (
            <div style={{ padding: "14px", fontSize: "12px", color: FAINT, textAlign: "center" }}>No products</div>
          ) : (
            products.map((p) => {
              const isUsed       = usedIds.includes(p.id) && p.id !== value;
              const isOutOfStock = (p.stockQuantity ?? 0) === 0;
              const stockLabel   = p.stockQuantity != null ? `${p.stockQuantity} ${getUnitShort(p.stockUnit)} left` : null;
              const top          = isTopSeller(p.id, products, productSales);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isUsed}
                  className="opt-hover"
                  onClick={() => { if (!isUsed) { onChange(p.id); setOpen(false); } }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "10px 14px", border: "none", borderBottom: `1px solid ${GREEN_LIGHT}`, background: value === p.id ? GREEN_LIGHT : "#fff", cursor: isUsed ? "not-allowed" : "pointer", opacity: isUsed ? 0.45 : 1, textAlign: "left" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "12.5px", fontWeight: 600, color: value === p.id ? GREEN_DARK : INK, margin: 0 }}>
                      {p.productName}
                      {p.size && <span style={{ color: FAINT, fontWeight: 400, marginLeft: "4px" }}>{p.size}</span>}
                      {top && <span style={{ ...chip("#fff7ed", "#c2410c", "#fed7aa"), marginLeft: "6px", padding: "1px 7px", fontSize: "10px" }}>Top seller</span>}
                    </p>
                    {stockLabel && !isOutOfStock && <p style={{ fontSize: "11.5px", color: FAINT, margin: "2px 0 0" }}>{stockLabel}</p>}
                    {isOutOfStock && <p style={{ fontSize: "11.5px", color: "#dc2626", fontWeight: 600, margin: "2px 0 0" }}>No stock</p>}
                    {isUsed && <p style={{ fontSize: "11.5px", color: "#b45309", fontWeight: 600, margin: "2px 0 0" }}>Already added — adjust quantity</p>}
                  </div>
                  {value === p.id && <span style={{ color: GREEN, display: "flex", flexShrink: 0 }}>{Icon.check}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [step, setStep] = useState<POStep>("create");

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [receiptModal, setReceiptModal] = useState<{
    show: boolean;
    delivery: Delivery | null;
    receiptNumber: string;
    error: string;
  }>({ show: false, delivery: null, receiptNumber: "", error: "" });

  const [receivingDelivery, setReceivingDelivery] = useState<Delivery | null>(null);
  const [receiveQtys,       setReceiveQtys]       = useState<ReceiveQty[]>([]);
  const [receiving,         setReceiving]         = useState(false);
  const [receiveError,      setReceiveError]      = useState("");
  const [receivingSearch,   setReceivingSearch]   = useState("");
  const [receivePage,       setReceivePage]       = useState(1);

  const [searchHistory,  setSearchHistory]  = useState("");
  const [historyStatus,  setHistoryStatus]  = useState<string>("All");
  const [historyPage,    setHistoryPage]    = useState(1);
  const [viewDelivery,   setViewDelivery]   = useState<Delivery | null>(null);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const statusDropRef = useRef<HTMLDivElement>(null);

  // ── Create order state ──
  const [suppliers,          setSuppliers]          = useState<Supplier[]>([]);
  const [allProducts,        setAllProducts]        = useState<Product[]>([]);
  const [productSales,       setProductSales]       = useState<Record<string, number>>({});
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loadingReorder,     setLoadingReorder]     = useState(false);
  const [form,               setForm]               = useState<DeliveryForm>(makeEmptyForm());
  const [supplierSearch,     setSupplierSearch]     = useState("");
  const [saving,             setSaving]             = useState(false);
  const [createError,        setCreateError]        = useState("");
  const [previewModal,       setPreviewModal]       = useState(false);

  const [toast, setToast] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm: () => void }>({
    show: false, message: "", onConfirm: () => {},
  });

  const pendingDeliveries = deliveries.filter(
    (d) => d.status === "PENDING" || d.status === "PARTIALLY_RECEIVED"
  );

  const filteredReceiving = pendingDeliveries.filter(
    (d) =>
      d.id.toLowerCase().includes(receivingSearch.toLowerCase()) ||
      (d.supplier?.supplierName || "").toLowerCase().includes(receivingSearch.toLowerCase())
  );
  const receiveTotalPages  = Math.ceil(filteredReceiving.length / ITEMS_PER_PAGE);
  const paginatedReceiving = filteredReceiving.slice(
    (receivePage - 1) * ITEMS_PER_PAGE, receivePage * ITEMS_PER_PAGE
  );

  const filteredHistory = deliveries.filter(
    (d) =>
      (d.id.toLowerCase().includes(searchHistory.toLowerCase()) ||
        (d.supplier?.supplierName || "").toLowerCase().includes(searchHistory.toLowerCase())) &&
      (historyStatus === "All" || d.status === historyStatus)
  );
  const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory  = filteredHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE
  );

  // ── Create order derived data ──
  const supplierProducts = form.supplierId
    ? allProducts
        .filter((p) => p.supplierId === form.supplierId && p.status !== "INACTIVE")
        .sort((a, b) => (productSales[b.id] ?? 0) - (productSales[a.id] ?? 0))
    : [];

  const lowStockProducts = form.supplierId
    ? supplierProducts.filter((p) => { const s = p.stockQuantity ?? 0; return s > 0 && s <= 10; })
    : [];

  const productQuery = supplierSearch.trim().toLowerCase();
  const filteredProductResults = form.supplierId && productQuery
    ? supplierProducts.filter((p) => `${p.productName} ${p.size ?? ""}`.toLowerCase().includes(productQuery))
    : [];

  const validLineItems = form.lineItems.filter((i) => i.productId);
  const calculateTotal = (items: LineItem[]) =>
    items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const selectedSupplierName = suppliers.find((s) => s.id === form.supplierId)?.supplierName;

  // Suggestions do not always carry a supplierId, so resolve each product's supplier locally
  const supplierIdByProduct: Record<string, string> = {};
  allProducts.forEach((p) => { supplierIdByProduct[p.id] = p.supplierId || ""; });
  const supplierIdFor = (s: ReorderSuggestion) => s.supplierId || supplierIdByProduct[s.productId] || "";

  // Only the items the reorder engine flags, sorted by profit
  const flaggedFor = (supplierId: string) =>
    reorderSuggestions
      .filter((s) => s.needsReorder && supplierIdFor(s) === supplierId)
      .sort((a, b) => (b.totalProfitWindow ?? -Infinity) - (a.totalProfitWindow ?? -Infinity));

  const flaggedSuggestions = form.supplierId ? flaggedFor(form.supplierId) : [];

  // One entry per supplier that actually needs restocking, heaviest first
  const restockBySupplier = suppliers
    .map((sup) => ({ supplier: sup, items: flaggedFor(sup.id) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node))
        setShowStatusDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  // Reorder suggestions for every supplier — scoped client-side
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingReorder(true);
        const res = await api.getReorderSuggestions();
        if (!cancelled) setReorderSuggestions(Array.isArray(res?.suggestions) ? res.suggestions : []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setReorderSuggestions([]);
      } finally {
        if (!cancelled) setLoadingReorder(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      // Extra lookups fail soft so the Receiving / History tabs never break because of them
      const [d, s, p, orders] = await Promise.all([
        api.getDeliveries(),
        api.getSuppliers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getCompletedOrders().catch(() => []),
      ]);
      setDeliveries(Array.isArray(d) ? d : []);
      setSuppliers((Array.isArray(s) ? s : []).filter((sup: { status?: string }) => sup.status !== "INACTIVE"));

      const normalized: Product[] = (Array.isArray(p) ? p : []).map((prod: Product) => ({
        ...prod,
        supplierId: prod.supplierId || (typeof prod.supplier === "object" ? prod.supplier?.id : prod.supplier) || "",
        stockQuantity: Number(prod.stockQuantity ?? (prod as unknown as { stock?: number }).stock ?? 0),
        stockUnit: (prod.stockUnit as CaseUnit) || "case_24",
        costPrice: prod.costPrice != null ? Number(prod.costPrice) : null,
      }));
      setAllProducts(normalized);

      // Units sold per product from completed orders (used to rank top sellers)
      const sales: Record<string, number> = {};
      for (const order of Array.isArray(orders) ? orders : []) {
        const lines = (order as { orderLines?: unknown[] }).orderLines ?? [];
        if (!Array.isArray(lines)) continue;
        for (const line of lines as Record<string, unknown>[]) {
          const product  = line.product as Record<string, unknown> | null;
          const prodId   = product?.id ? String(product.id) : null;
          const prodName = product?.productName ? String(product.productName) : null;
          const qty      = Number(line.quantity ?? 0);
          if (prodId) {
            sales[prodId] = (sales[prodId] ?? 0) + qty;
          } else if (prodName) {
            const match = normalized.find((np) => np.productName === prodName);
            if (match) sales[match.id] = (sales[match.id] ?? 0) + qty;
          }
        }
      }
      setProductSales(sales);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openReceiptModal = (delivery: Delivery) => {
    setReceiptModal({ show: true, delivery, receiptNumber: "", error: "" });
  };

  const handleReceiptConfirm = () => {
    const trimmed = receiptModal.receiptNumber.trim();
    if (!trimmed) {
      setReceiptModal((m) => ({ ...m, error: "Please enter the supplier receipt number." }));
      return;
    }
    const delivery = receiptModal.delivery!;
    setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" });
    openReceiving(delivery, trimmed);
  };

  const openReceiving = (delivery: Delivery, receiptNumber?: string) => {
    // Merge receiptNumber into the delivery object so handleReceive can access it
    const enriched: Delivery = receiptNumber
      ? { ...delivery, receiptNumber }
      : delivery;

    setReceivingDelivery(enriched);
    setReceiveError("");
    setReceiveQtys(
      delivery.items.map((item) => ({
        deliveryItemId: item.id,
        // Default to the remaining qty for this item
        receivedQty: item.orderedQty - item.receivedQty,
        expiryDate: "",
      }))
    );
  };

  const handleReceive = async () => {
    if (!receivingDelivery) return;

    // Only send items where receivedQty > 0
    const itemsToReceive = receiveQtys.filter((r) => r.receivedQty > 0);

    if (itemsToReceive.length === 0) {
      setReceiveError("Please enter at least one received quantity greater than 0.");
      return;
    }

    // All items being received must have an expiry date
    const missingExpiry = itemsToReceive.filter((r) => !r.expiryDate || r.expiryDate.trim() === "");
    if (missingExpiry.length > 0) {
      setReceiveError("Please enter the expiry date for all items being received.");
      return;
    }

    // Resolve employeeId from localStorage — try common key shapes
    const raw = localStorage.getItem("employee") || localStorage.getItem("user") || "{}";
    let employee: Record<string, unknown> = {};
    try { employee = JSON.parse(raw); } catch { /* ignore */ }

    const employeeId =
      (employee?.id as string) ??
      (employee?.employeeId as string) ??
      (employee?._id as string) ??
      (employee?.userId as string) ??
      null;

    if (!employeeId) {
      const keys = Object.keys(employee);
      setReceiveError(
        keys.length === 0
          ? "No employee session found. Please log in again."
          : `Employee ID not found. Session fields: ${keys.join(", ")}`
      );
      return;
    }

    try {
      setReceiving(true);
      setReceiveError("");

      // 1. Receive the items — pass expiryDate per item as the API expects
      await api.receiveDelivery(
        receivingDelivery.id,
        employeeId,
        itemsToReceive.map((r) => ({
          deliveryItemId: r.deliveryItemId,
          receivedQty:    r.receivedQty,
          expiryDate:     r.expiryDate, // ISO date string e.g. "2026-12-01"
        })),
      );

      // 2. If a receipt number was captured, patch it in the same round-trip
      //    Uses a separate PATCH since receiveDelivery endpoint doesn't accept receiptNumber
      if (receivingDelivery.receiptNumber) {
        await api.updateDelivery(receivingDelivery.id, {
          receiptNumber: receivingDelivery.receiptNumber,
        });
      }

      setReceivingDelivery(null);
      setReceiveQtys([]);
      await fetchAll();
      setToast("Items received and stock updated!");
      setTimeout(() => setToast(""), 3000);
      setStep("history");
    } catch (e: unknown) {
      setReceiveError((e as Error).message || "Failed to receive items.");
    } finally {
      setReceiving(false);
    }
  };

  // ── Create order handlers ──
  const handleSupplierChange = (supplierId: string) => {
    setForm({ ...form, supplierId, lineItems: [emptyLineItem()] });
    setSupplierSearch("");
    setCreateError("");
  };

  const addLineItem = () => {
    if (!form.supplierId) { setCreateError("Please select a supplier first."); return; }
    setForm({ ...form, lineItems: [...form.lineItems, emptyLineItem()] });
  };

  const removeLineItem = (idx: number) =>
    setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const items = [...form.lineItems];
    if (field === "productId") {
      const p = supplierProducts.find((x) => x.id === value);
      items[idx] = {
        ...items[idx],
        productId: String(value),
        productName: p?.productName || "",
        size: p?.size || null,
        unitPrice: p?.costPrice ?? 0,
        unit: (p?.stockUnit as CaseUnit) || "case_24",
      };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm({ ...form, lineItems: items });
  };

  // Drops the empty placeholder row (if any) and appends the new item
  const appendItem = (item: LineItem) => {
    if (form.lineItems.some((i) => i.productId === item.productId)) return;
    const existing = form.lineItems.filter((i) => i.productId);
    setForm({ ...form, lineItems: [...existing, item] });
  };

  const addProductFromList = (productId: string) => {
    const p = supplierProducts.find((x) => x.id === productId);
    if (!p) return;
    appendItem({
      productId, productName: p.productName, size: p.size, quantity: 1,
      unitPrice: p.costPrice ?? 0, unit: (p.stockUnit as CaseUnit) || "case_24",
    });
  };

  const addProductFromSearch = (productId: string) => {
    addProductFromList(productId);
    setSupplierSearch("");
  };

  const addSuggestedItem = (s: ReorderSuggestion) => {
    const p = supplierProducts.find((x) => x.id === s.productId);
    appendItem({
      productId: s.productId, productName: s.productName, size: s.size,
      quantity: s.suggestedCases ?? Math.max(1, s.suggestedUnits),
      unitPrice: p?.costPrice ?? 0, unit: (p?.stockUnit as CaseUnit) || "case_24",
    });
  };

  // Picking a supplier from the restock overview pre-fills the whole order
  const applyRestock = (supplierId: string) => {
    const items = flaggedFor(supplierId);
    if (items.length === 0) {
      setForm({ ...form, supplierId, lineItems: [emptyLineItem()] });
      return;
    }
    setForm({
      ...form,
      supplierId,
      lineItems: items.map((s) => {
        const p = allProducts.find((x) => x.id === s.productId);
        return {
          productId: s.productId,
          productName: s.productName,
          size: s.size,
          quantity: s.suggestedCases ?? Math.max(1, s.suggestedUnits),
          unitPrice: p?.costPrice ?? 0,
          unit: (p?.stockUnit as CaseUnit) || "case_24",
        };
      }),
    });
    setSupplierSearch("");
    setCreateError("");
  };

  const openPreview = () => {
    if (!form.supplierId) { setCreateError("Please select a supplier."); return; }
    if (validLineItems.length === 0) { setCreateError("Please add at least one product."); return; }
    if (validLineItems.some((i) => !(Number(i.quantity) > 0))) {
      setCreateError("Every item needs a quantity of at least 1.");
      return;
    }
    setCreateError("");
    setPreviewModal(true);
  };

  const handleCreate = async () => {
    if (!form.supplierId) { setCreateError("Please select a supplier."); return; }
    if (validLineItems.length === 0) { setCreateError("Please add at least one product."); return; }

    const employeeId = getEmployeeId();
    if (!employeeId) { setCreateError("No employee session found. Please log in again."); return; }

    try {
      setSaving(true);
      setCreateError("");
      const res = await api.createDelivery({
        supplierId: form.supplierId,
        employeeId,
        deliveryDate: form.deliveryDate,
        totalItems: validLineItems.reduce((s, i) => s + Number(i.quantity), 0),
        notes: form.notes || "",
        items: validLineItems.map((i) => ({
          productId: i.productId,
          quantity:  Number(i.quantity) || 1,
          costPrice: Number(i.unitPrice) || 0,
          unit:      i.unit || "case_24",
        })),
      });
      if (res?.error || res?.message?.toLowerCase().includes("error")) {
        setCreateError(res.message || "Failed to create purchase order.");
        return;
      }
      setForm(makeEmptyForm());
      setSupplierSearch("");
      await fetchAll();
      setToast("Purchase order created! It's now waiting in Receiving.");
      setTimeout(() => setToast(""), 3500);
    } catch (e) {
      console.error(e);
      setCreateError((e as Error)?.message || "Failed to create purchase order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const showConfirm = (msg: string, fn: () => void) =>
    setConfirmModal({ show: true, message: msg, onConfirm: fn });

  const handleCancel = (id: string) =>
    showConfirm("Are you sure you want to cancel this delivery?", async () => {
      try {
        // api.updateDelivery expects (id, data) — status is a valid field
        await api.updateDelivery(id, { status: "CANCELLED" });
        await fetchAll();
        setConfirmModal({ show: false, message: "", onConfirm: () => {} });
      } catch (e) { console.error(e); }
    });

  const handleExport = () => {
    const headers = ["ID", "Supplier", "Delivery Date", "Total Items", "Status", "Receipt No.", "Notes"];
    const rows = deliveries.map((d) => [
      d.id,
      d.supplier?.supplierName || d.supplierId,
      new Date(d.deliveryDate).toLocaleDateString(),
      d.totalItems,
      d.status,
      d.receiptNumber || "",
      d.notes || "",
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([[headers, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv" })
    );
    a.download = "purchase-orders.csv";
    a.click();
  };

  const tabs: { key: POStep; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "create", label: "Create Order",    icon: Icon.clipboard },
    { key: "receiving",    label: "Receiving", icon: Icon.box,  badge: pendingDeliveries.length },
    { key: "history",   label: "PO History",   icon: Icon.clock },
  ];

  return (
    <div className="po-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>
      <style>{CSS}</style>

      {/* ── Receipt Number Modal ── */}
      {receiptModal.show && (
        <>
          <div onClick={() => setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" })}
            style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(92vw, 400px)", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", overflow: "hidden", border: `1px solid ${GREEN_BORDER}` }}>
            <ModalHeader icon={Icon.receiptLg} title="Supplier Receipt Number" subtitle={receiptModal.delivery?.supplier?.supplierName || ""} />
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "13px", color: MUTED, margin: "0 0 16px", lineHeight: 1.6 }}>
                Please enter the <strong style={{ color: INK }}>receipt or delivery note number</strong> provided by the supplier.
              </p>
              <label style={labelStyle}>Receipt / DR Number *</label>
              <input
                type="text" value={receiptModal.receiptNumber}
                onChange={(e) => setReceiptModal((m) => ({ ...m, receiptNumber: e.target.value, error: "" }))}
                onKeyDown={(e) => e.key === "Enter" && handleReceiptConfirm()}
                placeholder="e.g. DR-2024-00123" autoFocus
                className="green-input"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: receiptModal.error ? "1px solid #ef4444" : `1px solid ${GREEN_BORDER}`, fontSize: "15px", fontWeight: 600, color: INK, background: "#fff", boxSizing: "border-box", fontFamily: "monospace" }}
              />
              {receiptModal.error && (
                <p style={{ fontSize: "12px", color: "#b91c1c", margin: "8px 0 0", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>{Icon.alert} {receiptModal.error}</p>
              )}
              <div style={{ height: "1px", background: GREEN_LIGHT, margin: "20px 0" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-outline" onClick={() => setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" })}
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>Cancel</button>
                <button className="btn-green" onClick={handleReceiptConfirm}
                  style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                  {Icon.box} Proceed to Receive
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <>
          <div onClick={() => setConfirmModal({ show: false, message: "", onConfirm: () => {} })}
            style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(92vw, 360px)", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", padding: "28px", textAlign: "center", border: `1px solid ${GREEN_BORDER}` }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>{Icon.alertLg}</div>
            <p style={{ fontSize: "14px", color: INK, margin: "0 0 20px", fontWeight: 500, lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setConfirmModal({ show: false, message: "", onConfirm: () => {} })}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: MUTED, transition: "all 0.15s" }}>Cancel</button>
              <button className="btn-red-solid" onClick={confirmModal.onConfirm}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#e11d48", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#fff", boxShadow: "0 4px 12px rgba(225,29,72,0.28)", transition: "background 0.15s" }}>Confirm</button>
            </div>
          </div>
        </>
      )}

      {/* ── Order Preview Modal (Create Order) ── */}
      {previewModal && (
        <>
          <div onClick={() => setPreviewModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(92vw, 520px)", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${GREEN_BORDER}` }}>
            <ModalHeader icon={Icon.clipboard} title="Order Preview" subtitle="Please review before submitting" onClose={() => setPreviewModal(false)} />
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: GREEN_LIGHT, border: "1px solid #b7dcbd", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: GREEN, display: "flex" }}>{Icon.building}</span>
                  <div>
                    <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Supplier</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, margin: "2px 0 0" }}>{selectedSupplierName}</p>
                  </div>
                </div>
                <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: FAINT, display: "flex" }}>{Icon.calendar}</span>
                  <div>
                    <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Date Created</p>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: "2px 0 0" }}>
                      {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "12px", fontWeight: 700, color: INK, margin: "0 0 8px" }}>Order Items ({validLineItems.length})</p>
              <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "4px 14px", maxHeight: "260px", overflowY: "auto", marginBottom: "14px" }}>
                {validLineItems.map((item, idx) => {
                  const breakdown = getCaseBreakdown(Number(item.quantity), item.unit);
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: idx < validLineItems.length - 1 ? `1px solid ${GREEN_BORDER}` : "none" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: 0 }}>
                          {item.productName}{item.size ? <span style={{ color: FAINT, fontWeight: 400 }}> {item.size}</span> : null}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                          <UnitPill unit={item.unit} qty={Number(item.quantity)} />
                          <span style={{ fontSize: "12px", color: MUTED }}>× ₱{Number(item.unitPrice).toLocaleString()}</span>
                        </div>
                        {breakdown && <p style={{ fontSize: "11.5px", color: GREEN, fontWeight: 600, margin: "3px 0 0" }}>{breakdown}</p>}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, whiteSpace: "nowrap" }}>
                        ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginBottom: "14px" }}>
                <div>
                  <p style={{ fontSize: "11px", margin: 0, opacity: 0.8 }}>Total Amount</p>
                  <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>({validLineItems.reduce((s, i) => s + Number(i.quantity), 0)} cases / units)</p>
                </div>
                <p style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>₱{calculateTotal(validLineItems).toLocaleString()}</p>
              </div>

              {form.notes && (
                <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "14px" }}>
                  <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Notes</p>
                  <p style={{ fontSize: "13px", color: INK, margin: 0 }}>{form.notes}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-outline" onClick={() => setPreviewModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>Back</button>
                <button className="btn-green" onClick={() => { setPreviewModal(false); handleCreate(); }}
                  style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                  {Icon.check} Confirm Order
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 60, background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, color: "#fff", padding: "12px 20px", borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,95,45,0.35)", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 600, animation: "toastIn 0.2s ease" }}>
          <span style={{ display: "flex", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>{Icon.check}</span>
          {toast}
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", flexShrink: 0 }}>
            {Icon.truck}
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.02em" }}>Restocking</h1>
            <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>Create purchase orders, receive supplier deliveries and track history</p>
          </div>
        </div>
        <button className="btn-outline" onClick={fetchAll}
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, transition: "all 0.15s" }}>
          <span style={{ display: "flex", animation: loading ? "spin 0.8s linear infinite" : "none" }}>{Icon.refresh}</span> Refresh
        </button>
      </div>

      {/* ── Step Tabs ── */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "24px", background: GREEN_LIGHT, borderRadius: "12px", padding: "4px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const active = step === t.key;
          return (
            <button key={t.key} onClick={() => setStep(t.key)} className={active ? undefined : "tab-btn"}
              style={{ padding: "8px 20px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", background: active ? GREEN : "transparent", color: active ? "#fff" : MUTED, boxShadow: active ? "0 2px 8px rgba(46,125,62,0.3)" : "none", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}>
              <span style={{ display: "flex" }}>{t.icon}</span>
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span style={{ background: active ? "rgba(255,255,255,0.25)" : GREEN, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "20px" }}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE ORDER TAB
      ══════════════════════════════════════════════════════════════════ */}
      {step === "create" && (
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) minmax(300px,360px)", gap: "24px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>

            {/* Restock overview — every supplier's restock needs in one place */}
            <div style={{ ...card, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.bulb}</span>
                  <h2 style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: 0 }}>Restock Needs by Supplier</h2>
                  {restockBySupplier.length > 0 && (
                    <span style={chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>{restockBySupplier.length} supplier{restockBySupplier.length > 1 ? "s" : ""}</span>
                  )}
                </div>
                <span style={{ fontSize: "12px", color: FAINT }}>Based on last 30 days</span>
              </div>

              {loadingReorder ? (
                <p style={{ fontSize: "12.5px", color: FAINT, textAlign: "center", padding: "20px 0", margin: 0 }}>Calculating suggestions...</p>
              ) : restockBySupplier.length === 0 ? (
                <p style={{ fontSize: "12.5px", color: FAINT, textAlign: "center", padding: "20px 0", margin: 0 }}>
                  Nothing needs restocking right now — stock levels look healthy across all suppliers.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "10px" }}>
                  {restockBySupplier.map(({ supplier, items }) => {
                    const isActive = form.supplierId === supplier.id;
                    const worst = items.some((s) => s.urgency === "high") ? "high"
                      : items.some((s) => s.urgency === "medium") ? "medium" : "low";
                    const dot = { high: "#dc2626", medium: "#d97706", low: GREEN_MID }[worst];
                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        className="restock-card"
                        onClick={() => applyRestock(supplier.id)}
                        style={{ textAlign: "left", borderRadius: "12px", border: `1px solid ${isActive ? GREEN : GREEN_BORDER}`, background: isActive ? GREEN_LIGHT : "#fff", padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
                            <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{supplier.supplierName}</p>
                          </div>
                          <span style={{ ...chip("#fff", MUTED, GREEN_BORDER), flexShrink: 0, fontSize: "11px", padding: "2px 8px" }}>{items.length} to restock</span>
                        </div>
                        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                          {items.slice(0, 3).map((s) => (
                            <li key={s.productId} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}>
                              <span style={{ color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.productName}{s.size ? ` ${s.size}` : ""}</span>
                              <span style={{ color: FAINT, flexShrink: 0 }}>{s.suggestedCases != null ? `${s.suggestedCases} cs` : `${s.suggestedUnits} u`}</span>
                            </li>
                          ))}
                          {items.length > 3 && <li style={{ fontSize: "12px", color: FAINT }}>+{items.length - 3} more</li>}
                        </ul>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: GREEN, margin: "10px 0 0" }}>
                          {isActive ? "Loaded ✓ — review below" : "Review & pre-fill order →"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 1 — Supplier + product search */}
            <div style={{ ...card, padding: "20px 22px" }}>
              <StepHeader n={1} title="Select Supplier" />

              {createError && (
                <div style={{ ...errorBanner, marginBottom: "14px", alignItems: "center" }}>
                  <span style={{ display: "flex", flexShrink: 0 }}>{Icon.alert}</span>
                  <span style={{ flex: 1 }}>{createError}</span>
                  <button onClick={() => setCreateError("")} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", display: "flex", padding: 0 }}>{Icon.x}</button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Supplier <span style={{ color: "#dc2626" }}>*</span></label>
                  <SupplierSelect
                    value={form.supplierId}
                    onChange={handleSupplierChange}
                    suppliers={suppliers}
                    search={form.supplierId ? "" : supplierSearch}
                    lowStockCount={lowStockProducts.length}
                    hint={form.supplierId
                      ? supplierProducts.length > 0
                        ? `${supplierProducts.length} product${supplierProducts.length > 1 ? "s" : ""} available from ${selectedSupplierName}`
                        : `No active products found for ${selectedSupplierName}`
                      : undefined}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>{form.supplierId ? "Search Product" : "Search Supplier"}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: FAINT, display: "flex" }}>{Icon.search}</span>
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder={form.supplierId ? `Search ${selectedSupplierName}'s products...` : "Type to search suppliers..."}
                      className="green-input"
                      style={{ ...fieldStyle, padding: "10px 34px 10px 38px" }}
                    />
                    {supplierSearch && (
                      <button type="button" onClick={() => setSupplierSearch("")} aria-label="Clear search"
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: FAINT, cursor: "pointer", display: "flex", padding: 0 }}>{Icon.x}</button>
                    )}
                  </div>

                  {form.supplierId && productQuery && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", boxShadow: "0 12px 32px rgba(31,95,45,0.16)", zIndex: 30, maxHeight: "260px", overflowY: "auto" }}>
                      {filteredProductResults.length === 0 ? (
                        <div style={{ padding: "14px", fontSize: "13px", color: FAINT, textAlign: "center" }}>No products match your search</div>
                      ) : (
                        filteredProductResults.map((p) => {
                          const inCart = form.lineItems.some((i) => i.productId === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={inCart}
                              className="opt-hover"
                              onClick={() => addProductFromSearch(p.id)}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 14px", border: "none", borderBottom: `1px solid ${GREEN_LIGHT}`, background: "#fff", cursor: inCart ? "default" : "pointer", opacity: inCart ? 0.6 : 1, textAlign: "left" }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.productName}{p.size ? ` ${p.size}` : ""}
                                </p>
                                <p style={{ fontSize: "11.5px", color: FAINT, margin: "2px 0 0" }}>
                                  {p.stockQuantity != null ? `${p.stockQuantity} ${getUnitShort(p.stockUnit)} left` : ""}
                                  {p.costPrice != null ? ` · ₱${p.costPrice}` : ""}
                                </p>
                              </div>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: inCart ? GREEN : GREEN_DARK, flexShrink: 0 }}>{inCart ? "Added ✓" : "Add +"}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suggested reorders — only once a supplier is picked */}
            {form.supplierId && (
              <div style={{ ...card, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.bulb}</span>
                    <h2 style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: 0 }}>Suggested Reorders</h2>
                    {flaggedSuggestions.length > 0 && (
                      <span style={chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>{flaggedSuggestions.length} item{flaggedSuggestions.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <span style={{ fontSize: "12px", color: FAINT }}>Based on last 30 days</span>
                </div>

                {loadingReorder ? (
                  <p style={{ fontSize: "12.5px", color: FAINT, textAlign: "center", padding: "16px 0", margin: 0 }}>Calculating suggestions...</p>
                ) : flaggedSuggestions.length === 0 ? (
                  <p style={{ fontSize: "12.5px", color: FAINT, textAlign: "center", padding: "16px 0", margin: 0 }}>No reorder suggestions right now — stock levels look healthy.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {flaggedSuggestions.map((s) => {
                      const urgency = {
                        high:   { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#dc2626" },
                        medium: { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#d97706" },
                        low:    { bg: GREEN_LIGHT, color: GREEN_DARK, border: "#b7dcbd", dot: GREEN_MID },
                      }[s.urgency];
                      const inCart = form.lineItems.some((i) => i.productId === s.productId);
                      return (
                        <div key={s.productId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderRadius: "12px", padding: "12px 14px", border: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: urgency.dot, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: 0 }}>{s.productName}{s.size ? ` ${s.size}` : ""}</p>
                                <span style={chip(urgency.bg, urgency.color, urgency.border)}>
                                  {s.daysOfStockLeft !== null ? `${s.daysOfStockLeft}d left` : "no recent sales"}
                                </span>
                              </div>
                              <p style={{ fontSize: "12px", color: FAINT, margin: "3px 0 0" }}>
                                {s.netUnitsSold} sold/30d
                                {s.unitProfit != null && ` · ₱${s.unitProfit.toFixed(2)} profit/unit`}
                                {s.totalProfitWindow != null && ` · ₱${s.totalProfitWindow.toLocaleString()} earned`}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: "11px", color: FAINT, margin: 0 }}>Suggested</p>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: "1px 0 6px" }}>
                              {s.suggestedCases != null ? `${s.suggestedCases} 24-cs` : `${s.suggestedUnits} units`}
                            </p>
                            <button
                              className={inCart ? undefined : "btn-green"}
                              onClick={() => addSuggestedItem(s)}
                              disabled={inCart}
                              style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: inCart ? GREEN_LIGHT : GREEN, color: inCart ? GREEN_DARK : "#fff", fontSize: "12px", fontWeight: 700, cursor: inCart ? "default" : "pointer", transition: "background 0.15s" }}
                            >
                              {inCart ? "Added ✓" : "Add to Order"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Top sellers */}
            {form.supplierId && (() => {
              const topProducts = supplierProducts.filter((p) => (productSales[p.id] ?? 0) > 0).slice(0, 5);
              if (topProducts.length === 0) return null;
              return (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "14px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", margin: 0 }}>Top Seller Products</h2>
                    <span style={chip("#fef3c7", "#b45309", "#fde68a")}>{topProducts.length} product{topProducts.length > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                    {topProducts.map((p) => {
                      const stock = p.stockQuantity ?? 0;
                      const out = stock === 0;
                      const inCart = form.lineItems.some((i) => i.productId === p.id);
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", borderRadius: "12px", padding: "10px 12px", border: `1px solid ${out ? "#fecaca" : "#fde68a"}`, background: out ? "#fef2f2" : "#fff" }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: "12.5px", fontWeight: 700, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}{p.size ? ` ${p.size}` : ""}</p>
                            <p style={{ fontSize: "11.5px", color: MUTED, margin: "3px 0 0" }}>
                              ₱{p.costPrice ?? "—"} ·{" "}
                              {out ? <span style={{ color: "#dc2626", fontWeight: 600 }}>Out of stock</span> : `${stock} ${getUnitShort(p.stockUnit)}`}
                              {" "}· <span style={{ color: "#c2410c", fontWeight: 600 }}>{productSales[p.id]} sold</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={inCart}
                            onClick={() => addProductFromList(p.id)}
                            style={{ flexShrink: 0, padding: "6px 12px", borderRadius: "8px", border: "none", background: inCart ? GREEN_LIGHT : "#ea580c", color: inCart ? GREEN_DARK : "#fff", fontSize: "12px", fontWeight: 700, cursor: inCart ? "default" : "pointer" }}
                          >
                            {inCart ? "Added ✓" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Step 2 — Products */}
            <div style={{ ...card, padding: "20px 22px", opacity: form.supplierId ? 1 : 0.55, pointerEvents: form.supplierId ? "auto" : "none", transition: "opacity 0.15s" }}>
              <StepHeader
                n={2}
                active={!!form.supplierId}
                title={<>Select Products{selectedSupplierName && <span style={{ ...chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8"), marginLeft: "8px", fontWeight: 600 }}>from {selectedSupplierName}</span>}</>}
                right={
                  <button className="btn-outline" onClick={addLineItem} disabled={!form.supplierId || supplierProducts.length === 0}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "9px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: !form.supplierId || supplierProducts.length === 0 ? 0.45 : 1, transition: "all 0.15s" }}>
                    {Icon.plus} Add Item
                  </button>
                }
              />

              {!form.supplierId && (
                <div style={{ textAlign: "center", padding: "32px 16px", border: `2px dashed ${GREEN_BORDER}`, borderRadius: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "center", color: "#a9d3b1", marginBottom: "8px" }}>{Icon.emptyBox}</div>
                  <p style={{ fontSize: "13px", color: FAINT, fontWeight: 600, margin: 0 }}>Select a supplier first</p>
                </div>
              )}

              {form.supplierId && supplierProducts.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 16px", border: "2px dashed #fde68a", background: "#fffbeb", borderRadius: "12px" }}>
                  <p style={{ fontSize: "13px", color: "#b45309", fontWeight: 600, margin: 0 }}>No products found for this supplier</p>
                </div>
              )}

              {form.supplierId && supplierProducts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {form.lineItems.map((item, idx) => {
                    const breakdown = getCaseBreakdown(Number(item.quantity), item.unit);
                    const usedIds = form.lineItems.filter((_, i) => i !== idx).map((li) => li.productId).filter(Boolean);
                    return (
                      <div key={idx} style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                          <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                            <label style={labelStyle}>Product</label>
                            <ProductSelect
                              value={item.productId}
                              onChange={(id) => updateLineItem(idx, "productId", id)}
                              products={supplierProducts}
                              usedIds={usedIds}
                              productSales={productSales}
                            />
                          </div>
                          <div style={{ flex: "0 1 90px" }}>
                            <label style={labelStyle}>Cases</label>
                            <input type="number" min="1" value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                              className="green-input"
                              style={{ ...fieldStyle, textAlign: "center", fontWeight: 700 }} />
                          </div>
                          <div style={{ flex: "0 1 110px" }}>
                            <label style={labelStyle}>Cost (₱)</label>
                            <input type="number" min="0" step="0.01" value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                              className="green-input"
                              style={fieldStyle} placeholder="₱0" />
                          </div>
                          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "10px", paddingBottom: "9px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, whiteSpace: "nowrap" }}>
                              ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                            </span>
                            {form.lineItems.length > 1 && (
                              <button onClick={() => removeLineItem(idx)} aria-label="Remove item"
                                style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.x}</button>
                            )}
                          </div>
                        </div>
                        {breakdown && item.productId && (
                          <p style={{ fontSize: "12px", color: GREEN, fontWeight: 600, margin: "8px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                            {Icon.box} {item.quantity} {getUnitShort(item.unit)} = {breakdown.split("= ")[1]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3 — Notes */}
            <div style={{ ...card, padding: "20px 22px", opacity: form.supplierId ? 1 : 0.55, pointerEvents: form.supplierId ? "auto" : "none", transition: "opacity 0.15s" }}>
              <StepHeader n={3} active={!!form.supplierId} title="Notes (Optional)" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3} className="green-input"
                style={{ ...fieldStyle, resize: "none", fontFamily: "inherit" }}
                placeholder="Optional notes about this order..." />
            </div>

            {/* Stock overview */}
            {form.supplierId && supplierProducts.length > 0 && (
              <div style={{ ...card, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: 0 }}>Stock Overview</h2>
                  <span style={chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8")}>{supplierProducts.length} product{supplierProducts.length > 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "8px" }}>
                  {supplierProducts.map((p) => {
                    const stock = p.stockQuantity ?? 0;
                    const out = stock === 0;
                    const low = stock > 0 && stock <= 10;
                    const t = out
                      ? { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", dot: "#dc2626", label: "Out of stock" }
                      : low
                      ? { bg: "#fffbeb", border: "#fde68a", color: "#b45309", dot: "#d97706", label: "Low stock" }
                      : { bg: GREEN_TINT, border: GREEN_BORDER, color: GREEN_DARK, dot: GREEN_MID, label: "In stock" };
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", borderRadius: "10px", padding: "10px 12px", border: `1px solid ${t.border}`, background: t.bg }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
                            <p style={{ fontSize: "12.5px", fontWeight: 600, color: INK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}{p.size ? ` ${p.size}` : ""}</p>
                            {isTopSeller(p.id, supplierProducts, productSales) && (
                              <span style={{ ...chip("#fff7ed", "#c2410c", "#fed7aa"), padding: "1px 7px", fontSize: "10px" }}>Top seller</span>
                            )}
                          </div>
                          <p style={{ fontSize: "11.5px", fontWeight: 600, color: t.color, margin: "3px 0 0 15px" }}>{t.label}</p>
                        </div>
                        <span style={{ ...chip("#fff", t.color, t.border), flexShrink: 0 }}>
                          {out ? "—" : `${stock} ${getUnitShort(p.stockUnit)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary sidebar */}
          <div style={{ ...card, padding: "22px", position: isNarrow ? "static" : "sticky", top: "20px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: INK, margin: "0 0 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "30px", height: "30px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.clipboard}</span>
              Order Summary
            </p>

            {form.supplierId ? (
              <div style={{ background: GREEN_LIGHT, border: "1px solid #b7dcbd", borderRadius: "12px", padding: "10px 14px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: GREEN, display: "flex" }}>{Icon.building}</span>
                <div>
                  <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Supplier</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, margin: "2px 0 0" }}>{selectedSupplierName}</p>
                </div>
              </div>
            ) : (
              <div style={{ border: `1px dashed ${GREEN_BORDER}`, borderRadius: "12px", padding: "10px 14px", marginBottom: "10px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: FAINT, margin: 0 }}>No supplier selected</p>
              </div>
            )}

            <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: FAINT, display: "flex" }}>{Icon.calendar}</span>
              <div>
                <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Date Created</p>
                <p style={{ fontSize: "12.5px", fontWeight: 600, color: INK, margin: "2px 0 0" }}>
                  {new Date().toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            {validLineItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "26px 10px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>{Icon.pointer}</div>
                <p style={{ fontSize: "12.5px", color: MUTED, margin: 0 }}>No items yet.</p>
              </div>
            ) : (
              <div style={{ marginBottom: "14px" }}>
                {validLineItems.map((item, idx) => {
                  const breakdown = getCaseBreakdown(Number(item.quantity), item.unit);
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "9px 0", borderBottom: `1px solid ${GREEN_LIGHT}` }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "12.5px", fontWeight: 600, color: INK, margin: 0 }}>
                          {item.productName}{item.size ? <span style={{ color: FAINT, fontWeight: 400 }}> {item.size}</span> : null}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                          <UnitPill unit={item.unit} qty={Number(item.quantity)} />
                          <span style={{ fontSize: "11.5px", color: MUTED }}>× ₱{Number(item.unitPrice).toLocaleString()}</span>
                        </div>
                        {breakdown && <p style={{ fontSize: "11.5px", color: GREEN, fontWeight: 600, margin: "3px 0 0" }}>{breakdown}</p>}
                      </div>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: GREEN_DARK, whiteSpace: "nowrap" }}>
                        ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: MUTED }}>Total</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: INK }}>₱{calculateTotal(validLineItems).toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              className="btn-green"
              onClick={openPreview}
              disabled={saving || validLineItems.length === 0 || !form.supplierId}
              style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: saving || validLineItems.length === 0 || !form.supplierId ? "#c5d3c8" : GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: saving || validLineItems.length === 0 || !form.supplierId ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: validLineItems.length === 0 || !form.supplierId ? "none" : "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}
            >
              {saving ? "Submitting..." : <>{Icon.send} Review &amp; Submit</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RECEIVING TAB
      ══════════════════════════════════════════════════════════════════ */}
      {step === "receiving" && (
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) minmax(300px,380px)", gap: "24px", alignItems: "start" }}>
          {/* Left: pending list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ position: "relative", maxWidth: "420px", width: "100%" }}>
              <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: FAINT, display: "flex" }}>{Icon.search}</span>
              <input value={receivingSearch} onChange={(e) => { setReceivingSearch(e.target.value); setReceivePage(1); }} placeholder="Search delivery ID or supplier..."
                className="green-input"
                style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", color: INK, background: "#fff", boxSizing: "border-box", transition: "all 0.15s" }} />
            </div>
            <p style={{ fontSize: "13px", color: MUTED, margin: 0, fontWeight: 500 }}>Select a Purchase Order to process receiving:</p>

            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ ...card, padding: "20px 24px" }}>
                    <div style={{ ...shimmerBg, height: "14px", width: "40%", borderRadius: "6px", marginBottom: "12px" }} />
                    <div style={{ ...shimmerBg, height: "12px", width: "60%", borderRadius: "6px", marginBottom: "8px" }} />
                    <div style={{ ...shimmerBg, height: "12px", width: "45%", borderRadius: "6px" }} />
                  </div>
                ))}
              </>
            ) : paginatedReceiving.length === 0 ? (
              <div style={{ ...card, padding: "56px 24px", textAlign: "center", borderStyle: "dashed" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.emptyBox}</div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>No pending deliveries</p>
                  <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>All purchase orders have been received or cancelled</p>
                  <button className="btn-green" onClick={() => setStep("create")}
                    style={{ marginTop: "6px", padding: "10px 20px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(46,125,62,0.25)", transition: "background 0.15s" }}>
                    {Icon.plus} Create a Purchase Order
                  </button>
                </div>
              </div>
            ) : paginatedReceiving.map((delivery) => {
              const selected = receivingDelivery?.id === delivery.id;
              const itemCount = delivery.items?.length || 0;
              return (
                <div key={delivery.id} className="po-card" style={{ ...card, border: selected ? `1px solid ${GREEN}` : `1px solid ${GREEN_BORDER}`, boxShadow: selected ? `0 0 0 2px ${GREEN}` : "none", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span title={delivery.id} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: GREEN_DARK, background: GREEN_LIGHT, border: "1px solid #c3e0c8", padding: "3px 9px", borderRadius: "6px" }}>{delivery.id.slice(0, 12)}…</span>
                      <span style={statusPill(delivery.status, "sm")}>{statusIcons[delivery.status]}{STATUS_LABEL[delivery.status]}</span>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: GREEN, display: "flex" }}>{Icon.building}</span>{delivery.supplier?.supplierName || delivery.supplierId}
                    </p>
                    <p style={{ fontSize: "12.5px", color: MUTED, margin: 0, display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: FAINT, display: "flex" }}>{Icon.calendar}</span>
                      {new Date(delivery.deliveryDate).toLocaleDateString()} • {itemCount} item{itemCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn-green" onClick={() => openReceiptModal(delivery)}
                      style={{ padding: "9px 18px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", boxShadow: "0 4px 12px rgba(46,125,62,0.25)", transition: "background 0.15s" }}>
                      {Icon.box} {selected ? "Selected" : "Receive"}
                    </button>
                    <button className="btn-red" onClick={() => handleCancel(delivery.id)}
                      style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}>Cancel</button>
                  </div>
                </div>
              );
            })}
            <PaginationBar page={receivePage} totalPages={receiveTotalPages} setPage={setReceivePage} total={filteredReceiving.length} label="deliveries" />
          </div>

          {/* Right: receive form */}
          <div style={{ ...card, padding: "24px", position: "sticky", top: "20px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: INK, margin: "0 0 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "30px", height: "30px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.box}</span>
              Receiving Summary
            </p>

            {!receivingDelivery ? (
              <div style={{ textAlign: "center", padding: "36px 20px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{Icon.pointer}</div>
                <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>Click &quot;Receive&quot; on a delivery to confirm quantities</p>
              </div>
            ) : (
              <>
                {receiveError && (
                  <div style={{ ...errorBanner, marginBottom: "12px" }}>
                    <span style={{ display: "flex", marginTop: "1px", flexShrink: 0 }}>{Icon.alert}</span>{receiveError}
                  </div>
                )}

                <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0 }}>{receivingDelivery.supplier?.supplierName || receivingDelivery.supplierId}</p>
                  <p style={{ fontSize: "12px", color: MUTED, margin: "3px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: FAINT, display: "flex" }}>{Icon.calendar}</span>{new Date(receivingDelivery.deliveryDate).toLocaleDateString()}
                  </p>
                </div>

                {receivingDelivery.receiptNumber && (
                  <div style={{ background: GREEN_LIGHT, border: "1px solid #b7dcbd", borderRadius: "12px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#fff", color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.receipt}</span>
                    <div>
                      <p style={{ fontSize: "10.5px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Supplier Receipt No.</p>
                      <p style={{ fontSize: "14px", fontWeight: 800, color: GREEN_DARK, fontFamily: "monospace", margin: "2px 0 0" }}>{receivingDelivery.receiptNumber}</p>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: "11.5px", fontWeight: 700, color: MUTED, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Enter Received Quantities &amp; Expiry Dates
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                  {receivingDelivery.items.map((item) => {
                    const rq        = receiveQtys.find((r) => r.deliveryItemId === item.id);
                    // remaining = how many are still left to receive for this item
                    const remaining = item.orderedQty - item.receivedQty;
                    const unitInfo  = getUnit(item.unit || item.product?.stockUnit);
                    const diff      = (rq?.receivedQty ?? 0) - remaining; // vs remaining, not orderedQty
                    const receivedBtl = rq?.receivedQty && unitInfo.bottlesPerCase
                      ? rq.receivedQty * unitInfo.bottlesPerCase : null;
                    const willReceive = (rq?.receivedQty ?? 0) > 0;

                    return (
                      <div key={item.id} style={{ background: GREEN_TINT, borderRadius: "12px", padding: "14px", border: diff < 0 ? "1px solid #fde68a" : `1px solid ${GREEN_BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: 0 }}>
                              {item.product?.productName || item.productId}
                              {item.product?.size && <span style={{ color: FAINT, fontWeight: 400 }}> {item.product.size}</span>}
                            </p>
                            <p style={{ fontSize: "12px", color: MUTED, margin: "3px 0 0", lineHeight: 1.5 }}>
                              Ordered: <strong style={{ color: INK }}>{item.orderedQty}</strong> {unitInfo.short} •
                              Already received: <strong style={{ color: INK }}>{item.receivedQty}</strong> •
                              Remaining: <strong style={{ color: GREEN }}>{remaining}</strong>
                            </p>
                          </div>
                          {diff < 0 && (
                            <span style={{ ...chip("#fffbeb", "#b45309", "#fde68a"), flexShrink: 0, fontSize: "11px", fontWeight: 700 }}>{Icon.alert}{Math.abs(diff)} short</span>
                          )}
                          {diff === 0 && (rq?.receivedQty ?? 0) > 0 && (
                            <span style={{ ...chip(GREEN_LIGHT, GREEN_DARK, "#b7dcbd"), flexShrink: 0, fontSize: "11px", fontWeight: 700 }}>{Icon.check}Complete</span>
                          )}
                        </div>

                        {/* Quantity input — capped at remaining */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: MUTED, flexShrink: 0, fontWeight: 600 }}>Receiving now:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              aria-label="Decrease"
                              onClick={() => setReceiveQtys((prev) => prev.map((r) =>
                                r.deliveryItemId === item.id ? { ...r, receivedQty: Math.max(0, r.receivedQty - 1) } : r
                              ))}
                              style={{ width: "30px", height: "30px", borderRadius: "50%", border: `1px solid ${GREEN_BORDER}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN }}>{Icon.minus}</button>
                            <input
                              type="number" min={0} max={remaining}
                              value={rq?.receivedQty ?? 0}
                              className="green-input"
                              onChange={(e) => {
                                const val = Math.min(Math.max(0, Number(e.target.value)), remaining);
                                setReceiveQtys((prev) => prev.map((r) =>
                                  r.deliveryItemId === item.id ? { ...r, receivedQty: val } : r
                                ));
                              }}
                              style={{ width: "58px", textAlign: "center", padding: "6px", borderRadius: "8px", border: `1px solid ${GREEN_BORDER}`, fontSize: "14px", fontWeight: 800, color: INK, background: "#fff" }}
                            />
                            <button
                              aria-label="Increase"
                              onClick={() => setReceiveQtys((prev) => prev.map((r) =>
                                r.deliveryItemId === item.id ? { ...r, receivedQty: Math.min(r.receivedQty + 1, remaining) } : r
                              ))}
                              style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: GREEN, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{Icon.plus}</button>
                            <span style={{ fontSize: "12px", color: MUTED }}>{unitInfo.short}</span>
                          </div>
                          {receivedBtl !== null && receivedBtl > 0 && (
                            <span style={{ fontSize: "12px", color: GREEN, fontWeight: 700 }}>= {receivedBtl} btl</span>
                          )}
                        </div>

                        {/* Expiry Date — only shown when receiving qty > 0 */}
                        {willReceive && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                              <span style={{ color: GREEN, display: "flex" }}>{Icon.calendar}</span> Expiry Date <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <input
                              type="date"
                              value={rq?.expiryDate ?? ""}
                              min={new Date().toISOString().split("T")[0]}
                              className="green-input"
                              onChange={(e) => setReceiveQtys((prev) => prev.map((r) =>
                                r.deliveryItemId === item.id ? { ...r, expiryDate: e.target.value } : r
                              ))}
                              style={{
                                padding: "9px 12px", borderRadius: "10px",
                                border: willReceive && !rq?.expiryDate ? "1px solid #fcd34d" : `1px solid ${GREEN_BORDER}`,
                                fontSize: "13px", color: INK,
                                background: "#fff", width: "100%", boxSizing: "border-box",
                                cursor: "pointer",
                              }}
                            />
                            {willReceive && !rq?.expiryDate && (
                              <p style={{ fontSize: "11.5px", color: "#b45309", margin: 0, display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>{Icon.alert} Required — check the box/label</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Per-item receive summary */}
                {receivingDelivery.items.map((item) => {
                  const rq        = receiveQtys.find((r) => r.deliveryItemId === item.id);
                  const remaining = item.orderedQty - item.receivedQty;
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "7px 0", borderBottom: `1px solid ${GREEN_LIGHT}` }}>
                      <span style={{ fontSize: "12px", color: MUTED }}>{item.product?.productName || item.productId}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", color: (rq?.receivedQty ?? 0) < remaining ? "#b45309" : GREEN }}>
                        {rq?.receivedQty ?? 0}/{remaining} remaining
                      </span>
                    </div>
                  );
                })}

                <div style={{ height: "1px", background: GREEN_LIGHT, margin: "14px 0" }} />

                {receiveQtys.some((r) => {
                  const item = receivingDelivery.items.find((i) => i.id === r.deliveryItemId);
                  const remaining = item ? item.orderedQty - item.receivedQty : 0;
                  return item && r.receivedQty < remaining;
                }) && (
                  <div style={{ background: "#fffbeb", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", border: "1px solid #fde68a" }}>
                    <p style={{ fontSize: "12px", color: "#b45309", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>{Icon.alert} Some items are short. This will be recorded as a discrepancy.</p>
                  </div>
                )}

                <button className="btn-green" onClick={handleReceive} disabled={receiving}
                  style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: receiving ? "#c5d3c8" : GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: receiving ? "not-allowed" : "pointer", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: receiving ? "none" : "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                  {receiving ? "Processing..." : <>{Icon.check} Confirm Receiving</>}
                </button>
                <button className="btn-outline" onClick={() => { setReceivingDelivery(null); setReceiveQtys([]); }}
                  style={{ width: "100%", padding: "11px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>← Back</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PO HISTORY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {step === "history" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "22px" }}>
            {(["PENDING", "PARTIALLY_RECEIVED", "DELIVERED", "CANCELLED"] as POStatus[]).map((status) => {
              const count = deliveries.filter((d) => d.status === status).length;
              const t = statusTheme[status];
              return (
                <div key={status} style={{ position: "relative", overflow: "hidden", ...card, padding: "20px 22px" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: t.accent }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{STATUS_LABEL[status]}</p>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: t.bg, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>{statusIcons[status]}</div>
                  </div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{count}</p>
                </div>
              );
            })}
          </div>

          <div style={{ ...card, padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: FAINT, display: "flex" }}>{Icon.search}</span>
              <input value={searchHistory} onChange={(e) => { setSearchHistory(e.target.value); setHistoryPage(1); }} placeholder="Search ID or supplier..."
                className="green-input"
                style={{ padding: "10px 14px 10px 38px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", width: "250px", maxWidth: "100%", color: INK, background: "#fff", boxSizing: "border-box", transition: "all 0.15s" }} />
            </div>
            <div ref={statusDropRef} style={{ position: "relative" }}>
              <button onClick={() => setShowStatusDrop(!showStatusDrop)} className={historyStatus === "All" ? "btn-outline" : undefined}
                style={{ padding: "10px 14px", borderRadius: "10px", border: historyStatus !== "All" ? `1px solid ${GREEN}` : `1px solid ${GREEN_BORDER}`, background: historyStatus !== "All" ? GREEN_LIGHT : "#fff", color: GREEN_DARK, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}>
                <span style={{ color: GREEN, display: "flex" }}>{Icon.tag}</span>
                {historyStatus === "All" ? "All Status" : STATUS_LABEL[historyStatus as POStatus] || historyStatus}
                <span style={{ display: "flex" }}>{showStatusDrop ? Icon.chevUp : Icon.chevDown}</span>
              </button>
              {showStatusDrop && (
                <div style={{ position: "absolute", top: "46px", left: 0, background: "#fff", borderRadius: "12px", border: `1px solid ${GREEN_BORDER}`, boxShadow: "0 12px 32px rgba(31,95,45,0.16)", zIndex: 20, overflow: "hidden", minWidth: "190px" }}>
                  {(["All", "PENDING", "PARTIALLY_RECEIVED", "DELIVERED", "CANCELLED"] as const).map((opt) => (
                    <button key={opt} className="row-hover" onClick={() => { setHistoryStatus(opt); setHistoryPage(1); setShowStatusDrop(false); }}
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: "13px", fontWeight: historyStatus === opt ? 700 : 500, color: historyStatus === opt ? GREEN_DARK : MUTED, background: historyStatus === opt ? GREEN_LIGHT : "#fff", border: "none", cursor: "pointer", borderBottom: `1px solid ${GREEN_LIGHT}` }}>
                      {opt === "All" ? "All Status" : STATUS_LABEL[opt]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {historyStatus !== "All" && (
              <button className="btn-red" onClick={() => { setHistoryStatus("All"); setHistoryPage(1); }}
                style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>{Icon.x} Clear</button>
            )}
            <button className="btn-outline" onClick={handleExport}
              style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s" }}>{Icon.download} Export</button>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: MUTED, fontWeight: 500 }}>{filteredHistory.length} purchase order{filteredHistory.length !== 1 ? "s" : ""}</span>
          </div>

          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                <thead>
                  <tr>
                    {["Delivery ID", "Supplier", "Date", "Items", "Receipt No.", "Status", "Action"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {[90, 120, 90, 60, 90, 80, 120].map((w, j) => (
                          <td key={j} style={tdStyle}><div style={{ ...shimmerBg, height: "12px", width: `${w}px`, borderRadius: "6px" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : paginatedHistory.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "64px 24px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.emptyBox}</div>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>No deliveries found</p>
                        <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>Try a different search or filter</p>
                      </div>
                    </td></tr>
                  ) : paginatedHistory.map((delivery) => {
                    const itemCount = delivery.items?.length || 0;
                    return (
                      <tr key={delivery.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                        <td style={tdStyle}>
                          <span title={delivery.id} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: GREEN_DARK, background: GREEN_LIGHT, border: "1px solid #c3e0c8", padding: "3px 9px", borderRadius: "6px" }}>{delivery.id.slice(0, 8)}…</span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{delivery.supplier?.supplierName || delivery.supplierId}</td>
                        <td style={tdStyle}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: MUTED }}>
                            <span style={{ color: FAINT, display: "flex" }}>{Icon.calendar}</span>{new Date(delivery.deliveryDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: MUTED }}>{itemCount} item{itemCount > 1 ? "s" : ""}</td>
                        <td style={tdStyle}>
                          {delivery.receiptNumber ? (
                            <span style={{ ...chip(GREEN_TINT, GREEN_DARK, GREEN_BORDER), fontFamily: "monospace", fontWeight: 700 }}>{Icon.receipt}{delivery.receiptNumber}</span>
                          ) : (
                            <span style={{ fontSize: "12px", color: FAINT }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={statusPill(delivery.status)}>{statusIcons[delivery.status]}{STATUS_LABEL[delivery.status]}</span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button className="btn-outline" onClick={() => setViewDelivery(delivery)}
                              style={{ padding: "6px 12px", borderRadius: "8px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}>{Icon.eye} View</button>
                            {(delivery.status === "PENDING" || delivery.status === "PARTIALLY_RECEIVED") && (
                              <>
                                <button className="btn-green" onClick={() => { openReceiptModal(delivery); setStep("receiving"); }}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: GREEN, color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(46,125,62,0.25)", transition: "background 0.15s" }}>{Icon.box} Receive</button>
                                <button className="btn-red" onClick={() => handleCancel(delivery.id)}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}>Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {historyTotalPages > 1 && (
              <div style={{ padding: "4px 20px 14px", borderTop: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT }}>
                <PaginationBar page={historyPage} totalPages={historyTotalPages} setPage={setHistoryPage} total={filteredHistory.length} label="purchase orders" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View Delivery Modal ── */}
      {viewDelivery && (
        <>
          <div onClick={() => setViewDelivery(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "18px", width: "min(92vw, 540px)", boxShadow: "0 24px 70px rgba(10,30,15,0.3)", maxHeight: "88vh", overflowY: "auto", border: `1px solid ${GREEN_BORDER}` }}>
            <ModalHeader
              title="Delivery Details"
              subtitle={viewDelivery.id}
              onClose={() => setViewDelivery(null)}
              right={<span style={statusPill(viewDelivery.status)}>{statusIcons[viewDelivery.status]}{STATUS_LABEL[viewDelivery.status]}</span>}
            />
            <div style={{ padding: "24px" }}>
              <div style={{ background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, borderRadius: "12px", padding: "6px 16px", marginBottom: "20px" }}>
                {([
                  ["Delivery ID", viewDelivery.id],
                  ["Supplier",    viewDelivery.supplier?.supplierName || viewDelivery.supplierId],
                  ["Date",        new Date(viewDelivery.deliveryDate).toLocaleDateString()],
                  ["Total Items", String(viewDelivery.totalItems)],
                  ...(viewDelivery.receiptNumber ? [["Receipt No.", viewDelivery.receiptNumber]] : []),
                  ...(viewDelivery.notes ? [["Notes", viewDelivery.notes]] : []),
                ] as string[][]).map(([label, value], i, arr) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 0", flexWrap: "wrap", rowGap: "4px", borderBottom: i < arr.length - 1 ? `1px solid ${GREEN_BORDER}` : "none" }}>
                    <span style={{ fontSize: "12px", color: FAINT }}>{label}</span>
                    {label === "Receipt No." ? (
                      <span style={{ ...chip(GREEN_LIGHT, GREEN_DARK, "#b7dcbd"), fontFamily: "monospace", fontWeight: 700 }}>{Icon.receipt}{value}</span>
                    ) : (
                      <span style={{ fontSize: "13px", fontWeight: 600, color: INK, wordBreak: "break-all", textAlign: "right" }}>{value}</span>
                    )}
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "13px", fontWeight: 700, color: INK, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: GREEN, display: "flex" }}>{Icon.box}</span> Items Ordered
              </p>
              <div style={{ borderRadius: "12px", overflowX: "auto", border: `1px solid ${GREEN_BORDER}`, marginBottom: "20px" }}>
                <table style={{ minWidth: "480px", borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {["Product", "Cost", "Ordered", "Received", "Expiry", "Status"].map((h) => (
                        <th key={h} style={{ ...thStyle, padding: "10px 12px", fontSize: "10.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewDelivery.items?.map((item) => {
                      const diff = item.receivedQty - item.orderedQty;
                      return (
                        <tr key={item.id} className="row-hover">
                          <td style={{ ...tdStyle, padding: "10px 12px", fontWeight: 600 }}>
                            {item.product?.productName || item.productId}
                            {item.product?.size && <span style={{ color: FAINT, fontWeight: 400 }}> {item.product.size}</span>}
                          </td>
                          <td style={{ ...tdStyle, padding: "10px 12px", fontSize: "12px", color: GREEN, fontWeight: 700 }}>₱{item.costPrice}</td>
                          <td style={{ ...tdStyle, padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>{item.orderedQty}</td>
                          <td style={{ ...tdStyle, padding: "10px 12px", fontWeight: 700, textAlign: "center", color: item.receivedQty === 0 ? FAINT : item.receivedQty < item.orderedQty ? "#b45309" : GREEN }}>
                            {item.receivedQty === 0 ? "—" : item.receivedQty}
                          </td>
                          <td style={{ ...tdStyle, padding: "10px 12px" }}>
                            {item.expiryDate ? (
                              <span style={{ ...chip(GREEN_LIGHT, GREEN_DARK, "#c3e0c8"), fontSize: "11px" }}>
                                {Icon.calendar} {new Date(item.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", color: FAINT }}>—</span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, padding: "10px 12px" }}>
                            {item.receivedQty === 0 ? (
                              <span style={{ fontSize: "11px", color: FAINT }}>Pending</span>
                            ) : diff < 0 ? (
                              <span style={{ ...chip("#fffbeb", "#b45309", "#fde68a"), fontSize: "11px" }}>-{Math.abs(diff)} short</span>
                            ) : (
                              <span style={{ ...chip(GREEN_LIGHT, GREEN_DARK, "#b7dcbd"), fontSize: "11px" }}>Complete</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button className="btn-outline" onClick={() => setViewDelivery(null)}
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: MUTED, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}