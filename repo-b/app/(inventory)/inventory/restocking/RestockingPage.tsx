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

const getUnit = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];

// ─── TYPES ────────────────────────────────────────────────────────────────────
type POStatus = "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
type POStep = "receiving" | "history";

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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [step, setStep] = useState<POStep>("receiving");

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

  const fetchAll = async () => {
    try {
      setLoading(true);
      const d = await api.getDeliveries();
      setDeliveries(Array.isArray(d) ? d : []);
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
    { key: "receiving", label: "Receiving",  icon: Icon.box,   badge: pendingDeliveries.length },
    { key: "history",   label: "PO History", icon: Icon.clock },
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
            <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>Receive supplier deliveries and track purchase orders</p>
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
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "12.5px", fontWeight: 600, color: "#b91c1c", display: "flex", alignItems: "flex-start", gap: "8px" }}>
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