"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

type Period = "today" | "weekly" | "monthly" | "custom";
type Tab = "Transactions" | "Sales Reports";

type OrderLine = {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: { productName: string; category: string };
};

type Transaction = {
  id: string;
  date: string;
  rawDate: Date | null;
  customer: string;
  employeeName: string;
  total: number;
  payment: string;
  items: OrderLine[];
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icon = {
  receipt: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>),
  search: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  refresh: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  download: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  trendUp: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  barChart: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>),
  calendar: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  warning: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  user: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  badge: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>),
  clock: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  box: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  creditCard: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  pdf: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>),
  csv: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18"/></svg>),
  emptyState: (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  SOFTDRINKS:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  ENERGY_DRINK: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  BEER:         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.44.5-3 .5V17a5 5 0 0 0 5 5h1a5 5 0 0 0 5-5v-9c-1 0-1.99.5-3 .5z"/><path d="M5 8V5a1 1 0 0 1 1-1h2"/><path d="M13 4h2a1 1 0 0 1 1 1v3"/></svg>,
  JUICE:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l1 7H7L8 2z"/><path d="M7 9l-1 11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1L17 9"/><path d="M10 4a2 2 0 0 0 4 0"/></svg>,
  WATER:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
  OTHER:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
};
const getCatIcon = (cat?: string) => CATEGORY_ICON[cat?.toUpperCase() || ""] ?? CATEGORY_ICON.OTHER;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: Date) {
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getPeriodRange(period: Period, customFrom: string, customTo: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now); start.setHours(0,0,0,0);
    const end   = new Date(now); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (period === "weekly") {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(now); start.setDate(now.getDate() + diffToMon); start.setHours(0,0,0,0);
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23,59,59,999);
    return { start, end };
  }
  // custom
  const start = customFrom ? new Date(customFrom + "T00:00:00") : new Date(0);
  const end   = customTo   ? new Date(customTo   + "T23:59:59") : new Date();
  return { start, end };
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getPeriodLabel(period: Period, customFrom: string, customTo: string): string {
  const now = new Date();
  if (period === "today")   return fmt(now);
  if (period === "weekly")  { const { start, end } = getPeriodRange("weekly","",""); return `${fmt(start)} – ${fmt(end)}`; }
  if (period === "monthly") return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (period === "custom") {
    if (customFrom && customTo) return `${fmt(new Date(customFrom + "T00:00"))} – ${fmt(new Date(customTo + "T00:00"))}`;
    if (customFrom) return `From ${fmt(new Date(customFrom + "T00:00"))}`;
    return "Pick dates";
  }
  return "";
}

// ── Normalize ─────────────────────────────────────────────────────────────────
function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  const rawDateStr = o.createdAt ? String(o.createdAt) : "";
  const parsedDate = rawDateStr ? new Date(rawDateStr) : null;
  return {
    id:           String(o.id ?? ""),
    date:         parsedDate
      ? parsedDate.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    rawDate:      parsedDate,
    customer:     customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    employeeName: employee ? String(employee.name ?? "—") : "—",
    total:        Number(o.totalAmount ?? 0),
    payment:      payment ? String(payment.method ?? "CASH") : "CASH",
    items:        rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        id:       String(l.id ?? ""),
        quantity: Number(l.quantity ?? 0),
        price:    Number(l.price ?? 0),
        subtotal: Number(l.subtotal ?? 0),
        product:  {
          productName: product ? String(product.productName ?? "Item") : "Item",
          category:    product ? String(product.category ?? "") : "",
        },
      };
    }),
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[120,100,100,80,70,80].map((w,i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div style={{ height:"12px", width:`${w}px`, borderRadius:"6px", background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
        </td>
      ))}
    </tr>
  );
}
function SkeletonStatCard() {
  return (
    <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #eaecf4", padding:"20px 22px" }}>
      <div style={{ height:"11px", width:"80px", borderRadius:"6px", marginBottom:"12px", background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
      <div style={{ height:"28px", width:"120px", borderRadius:"6px", background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
    </div>
  );
}

// ── Shared FilterBar ──────────────────────────────────────────────────────────
function FilterBar({
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
}: {
  period: Period; setPeriod: (p: Period) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
}) {
  const PILLS: { key: Period; label: string }[] = [
    { key: "today",   label: "Today"   },
    { key: "weekly",  label: "Weekly"  },
    { key: "monthly", label: "Monthly" },
    { key: "custom",  label: "Custom"  },
  ];
  const periodLabel = getPeriodLabel(period, customFrom, customTo);

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Pills + badge row */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
        <span style={{ fontSize:"12px", color:"#64748b", display:"flex", alignItems:"center", gap:"5px", fontWeight:500 }}>
          {Icon.calendar} Period:
        </span>
        <div style={{ display:"flex", gap:"4px", background:"#f1f5f9", borderRadius:"8px", padding:"3px" }}>
          {PILLS.map(({ key, label }) => {
            const isActive = period === key;
            return (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  padding:"6px 16px", borderRadius:"6px", fontSize:"12.5px",
                  fontWeight: isActive ? 700 : 500, cursor:"pointer", border:"none",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "#1e1b4b" : "#64748b",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition:"all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Date label badge for non-custom */}
        {period !== "custom" && (
          <span style={{
            fontSize:"12px", fontWeight:600, color:"#4f46e5",
            background:"#eef2ff", borderRadius:"20px", padding:"5px 14px",
            border:"1px solid #c7d2fe", whiteSpace:"nowrap",
          }}>
            📅 {periodLabel}
          </span>
        )}
      </div>

      {/* Custom date picker */}
      {period === "custom" && (
        <div style={{
          display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap",
          marginTop:"12px", background:"#fff", borderRadius:"10px",
          padding:"12px 16px", border:"1px solid #e2e8f0",
          width:"fit-content", boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <span style={{ fontSize:"12px", fontWeight:600, color:"#64748b" }}>From</span>
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{ fontFamily:"inherit", fontSize:"12px", border:"1px solid #d0d0d0", borderRadius:"7px", padding:"6px 10px", color:"#333", background:"#fff", outline:"none", cursor:"pointer" }}
          />
          <span style={{ fontSize:"12px", fontWeight:600, color:"#64748b" }}>To</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{ fontFamily:"inherit", fontSize:"12px", border:"1px solid #d0d0d0", borderRadius:"7px", padding:"6px 10px", color:"#333", background:"#fff", outline:"none", cursor:"pointer" }}
          />
          {(customFrom || customTo) && (
            <button
              onClick={() => { setCustomFrom(""); setCustomTo(""); }}
              style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:"7px", padding:"5px 10px", fontSize:"11px", color:"#888", cursor:"pointer" }}
            >
              Clear
            </button>
          )}
          {customFrom && customTo && (
            <span style={{
              fontSize:"12px", fontWeight:600, color:"#4f46e5",
              background:"#eef2ff", borderRadius:"20px", padding:"5px 12px",
              border:"1px solid #c7d2fe",
            }}>
              📅 {periodLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CashierTransactionsPage() {
  const [activeTab,      setActiveTab]      = useState<Tab>("Transactions");
  const [period,         setPeriod]         = useState<Period>("today");
  const [customFrom,     setCustomFrom]     = useState("");
  const [customTo,       setCustomTo]       = useState("");
  const [search,         setSearch]         = useState("");
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedTx,     setSelectedTx]     = useState<Transaction | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await api.getCompletedOrders();
      if (data?.message) { setError(data.message); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      setTransactions(raw.map(normalizeTransaction));
    } catch (err) {
      setError((err as Error).message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const periodFiltered = useMemo(() => {
    const { start, end } = getPeriodRange(period, customFrom, customTo);
    return transactions.filter(
      (tx) => tx.rawDate !== null && tx.rawDate >= start && tx.rawDate <= end,
    );
  }, [transactions, period, customFrom, customTo]);

  const searchFiltered = useMemo(() =>
    periodFiltered.filter((tx) => {
      const q = search.toLowerCase();
      return tx.id.toLowerCase().includes(q) ||
             tx.customer.toLowerCase().includes(q) ||
             tx.employeeName.toLowerCase().includes(q);
    }),
  [periodFiltered, search]);

  const totalSales  = periodFiltered.reduce((s, t) => s + t.total, 0);
  const cashSales   = periodFiltered.filter((t) => t.payment === "CASH").reduce((s, t) => s + t.total, 0);
  const onlineSales = periodFiltered.filter((t) => t.payment !== "CASH").reduce((s, t) => s + t.total, 0);
  const txCount     = periodFiltered.length;
  const avgOrder    = txCount > 0 ? Math.round(totalSales / txCount) : 0;

  const productMap: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
  periodFiltered.forEach((tx) => {
    tx.items.forEach((line) => {
      const key = line.product.productName;
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0, category: line.product.category };
      productMap[key].qty     += line.quantity;
      productMap[key].revenue += line.subtotal;
    });
  });
  const topSelling = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8).map((p, i) => ({ ...p, rank: i + 1 }));

  const statCards = [
    { label: "Total Sales",   value: `₱${totalSales.toLocaleString()}`,  icon: Icon.trendUp,    accent: "#4f46e5", light: "#eef2ff" },
    { label: "Transactions",  value: String(txCount),                    icon: Icon.receipt,    accent: "#0891b2", light: "#ecfeff" },
    { label: "Cash Sales",    value: `₱${cashSales.toLocaleString()}`,   icon: Icon.creditCard, accent: "#059669", light: "#ecfdf5" },
    { label: "Online Sales",  value: `₱${onlineSales.toLocaleString()}`, icon: Icon.barChart,   accent: "#d97706", light: "#fffbeb" },
  ];

  const thStyle: React.CSSProperties = {
    padding:"11px 16px", textAlign:"left", fontSize:"11px", fontWeight:700,
    color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em",
    background:"#f8fafc", borderBottom:"1px solid #eaecf4",
  };
  const tdStyle: React.CSSProperties = {
    padding:"14px 16px", fontSize:"13px", color:"#374151",
    borderBottom:"1px solid #f1f5f9", verticalAlign:"middle",
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .tx-row:hover { background: #fafbff !important; }
        .btn-outline:hover { background: #f8fafc !important; }
        .export-opt:hover { background: #f8fafc !important; }
        .tx-table-wrap { overflow-x: auto; width: 100%; }
        .date-inp:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 2px rgba(79,70,229,0.12); }
      `}</style>

      <div style={{ padding:"28px 32px", width:"100%", boxSizing:"border-box" }}>

        {/* Page Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"16px" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px" }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", color:"#4f46e5" }}>
                {Icon.receipt}
              </div>
              <h1 style={{ fontSize:"22px", fontWeight:700, color:"#0f172a", margin:0, letterSpacing:"-0.02em" }}>
                Transaction History
              </h1>
            </div>
            <p style={{ fontSize:"13px", color:"#94a3b8", margin:0 }}>
              Sales reports, top products &amp; completed transaction records
            </p>
          </div>
          <button onClick={fetchTransactions} className="btn-outline"
            style={{ display:"flex", alignItems:"center", gap:"7px", padding:"9px 16px", borderRadius:"8px", fontSize:"13px", fontWeight:600, cursor:"pointer", border:"1px solid #e2e8f0", background:"#fff", color:"#475569", transition:"background 0.15s" }}>
            <span style={{ color:"#64748b" }}>{Icon.refresh}</span> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"2px", marginBottom:"24px", background:"#f1f5f9", borderRadius:"10px", padding:"3px", width:"fit-content" }}>
          {(["Transactions", "Sales Reports"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding:"8px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:600, cursor:"pointer", border:"none", background: activeTab===t ? "#fff" : "transparent", color: activeTab===t ? "#1e1b4b" : "#64748b", boxShadow: activeTab===t ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition:"all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"#fef2f2", borderRadius:"10px", padding:"13px 18px", marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #fecaca" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", color:"#b91c1c" }}>
              {Icon.warning}
              <p style={{ fontSize:"13px", fontWeight:600, margin:0 }}>{error}</p>
            </div>
            <button onClick={fetchTransactions} style={{ background:"#b91c1c", color:"#fff", border:"none", borderRadius:"7px", padding:"6px 14px", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>Retry</button>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "Transactions" && (
          <div style={{ width:"100%" }}>
            <FilterBar
              period={period} setPeriod={setPeriod}
              customFrom={customFrom} setCustomFrom={setCustomFrom}
              customTo={customTo} setCustomTo={setCustomTo}
            />

            {/* Search */}
            <div style={{ position:"relative", marginBottom:"20px", maxWidth:"420px", width:"100%" }}>
              <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}>{Icon.search}</span>
              <input type="text" placeholder="Search by order ID, customer, or cashier..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width:"100%", padding:"10px 14px 10px 38px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", outline:"none", background:"#fff", color:"#0f172a", boxSizing:"border-box" }} />
            </div>

            {/* Table */}
            <div className="tx-table-wrap" style={{ background:"#fff", borderRadius:"12px", border:"1px solid #eaecf4", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"700px" }}>
                <thead>
                  <tr>
                    {["Order ID","Customer","Cashier","Date","Items","Payment","Total",""].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : searchFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding:"60px", textAlign:"center" }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" }}>
                          {Icon.emptyState}
                          <p style={{ fontSize:"15px", fontWeight:600, color:"#334155", margin:0 }}>No transactions found</p>
                          <p style={{ fontSize:"13px", color:"#94a3b8", margin:0 }}>{search ? "Try a different search term." : "No completed orders in this period."}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    searchFiltered.map((tx) => (
                      <tr key={tx.id} className="tx-row" style={{ transition:"background 0.12s", cursor:"default" }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily:"monospace", fontSize:"12px", fontWeight:600, color:"#4f46e5", background:"#eef2ff", padding:"3px 8px", borderRadius:"5px" }}>
                            {tx.id.slice(0,12)}…
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                            <span style={{ color:"#94a3b8" }}>{Icon.user}</span>
                            <span style={{ fontWeight:500, color:"#0f172a" }}>{tx.customer}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                            <span style={{ color:"#94a3b8" }}>{Icon.badge}</span>
                            <span>{tx.employeeName}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <span style={{ color:"#94a3b8" }}>{Icon.clock}</span>
                            <span style={{ fontSize:"12px" }}>{tx.date}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <span style={{ color:"#94a3b8" }}>{Icon.box}</span>
                            <span>{tx.items.length}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"11.5px", fontWeight:600, background: tx.payment==="CASH" ? "#ecfdf5" : "#eff6ff", color: tx.payment==="CASH" ? "#059669" : "#2563eb" }}>
                            {tx.payment}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight:700, color:"#0f172a" }}>
                          ₱{tx.total.toLocaleString()}.00
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => setSelectedTx(tx)}
                            style={{ padding:"6px 14px", borderRadius:"7px", fontSize:"12px", fontWeight:600, cursor:"pointer", border:"1px solid #e2e8f0", background:"#fff", color:"#374151" }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && searchFiltered.length > 0 && (
              <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"10px", textAlign:"right" }}>
                Showing {searchFiltered.length} transaction{searchFiltered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* ── SALES REPORTS TAB ── */}
        {activeTab === "Sales Reports" && (
          <>
            <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", marginBottom:"8px" }}>
              <FilterBar
                period={period} setPeriod={setPeriod}
                customFrom={customFrom} setCustomFrom={setCustomFrom}
                customTo={customTo} setCustomTo={setCustomTo}
              />

              <div style={{ position:"relative" }}>
                <button onClick={() => setShowExportMenu(!showExportMenu)}
                  style={{ display:"flex", alignItems:"center", gap:"7px", padding:"9px 16px", borderRadius:"8px", border:"1px solid #e2e8f0", background:"#fff", color:"#374151", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                  {Icon.download} Export
                </button>
                {showExportMenu && (
                  <div style={{ position:"absolute", top:"44px", right:0, background:"#fff", borderRadius:"10px", border:"1px solid #e2e8f0", boxShadow:"0 8px 24px rgba(0,0,0,0.1)", overflow:"hidden", zIndex:10, minWidth:"168px" }}>
                    {[{ label:"Export as PDF", icon:Icon.pdf }, { label:"Export as CSV", icon:Icon.csv }].map((opt) => (
                      <button key={opt.label} onClick={() => setShowExportMenu(false)} className="export-opt"
                        style={{ display:"flex", alignItems:"center", gap:"9px", width:"100%", padding:"11px 16px", background:"none", border:"none", textAlign:"left", fontSize:"13px", color:"#374151", cursor:"pointer", transition:"background 0.12s" }}>
                        <span style={{ color:"#64748b" }}>{opt.icon}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"14px", marginBottom:"24px" }}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
                : statCards.map((s) => (
                    <div key={s.label} style={{ background:"#fff", borderRadius:"12px", border:"1px solid #eaecf4", padding:"20px 22px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                        <p style={{ fontSize:"12px", fontWeight:600, color:"#64748b", margin:0, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</p>
                        <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:s.light, display:"flex", alignItems:"center", justifyContent:"center", color:s.accent }}>
                          {s.icon}
                        </div>
                      </div>
                      <p style={{ fontSize:"26px", fontWeight:800, color:"#0f172a", margin:0, letterSpacing:"-0.02em" }}>{s.value}</p>
                    </div>
                  ))
              }
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"20px" }}>
              {/* Top Selling */}
              <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #eaecf4", overflow:"hidden" }}>
                <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", color:"#4f46e5" }}>
                    {Icon.trendUp}
                    <p style={{ fontSize:"14px", fontWeight:700, color:"#0f172a", margin:0 }}>Top Selling Items</p>
                  </div>
                </div>
                {loading ? (
                  <div style={{ padding:"16px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height:"13px", borderRadius:"6px", marginBottom:"10px", background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
                    ))}
                  </div>
                ) : topSelling.length === 0 ? (
                  <p style={{ fontSize:"13px", color:"#94a3b8", textAlign:"center", padding:"32px" }}>No sales data for this period.</p>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        {["#","Product","Qty","Revenue"].map((h) => (
                          <th key={h} style={{ ...thStyle, fontSize:"10.5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSelling.map((item) => {
                        const rankColors = ["#f59e0b","#94a3b8","#b45309","#64748b","#64748b","#64748b","#64748b","#64748b"];
                        return (
                          <tr key={item.rank} style={{ borderBottom:"1px solid #f8fafc" }}>
                            <td style={{ ...tdStyle, width:"40px" }}>
                              <div style={{ width:"22px", height:"22px", borderRadius:"6px", background: item.rank<=3 ? rankColors[item.rank-1] : "#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:700, color: item.rank<=3 ? "#fff" : "#64748b" }}>
                                {item.rank}
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontWeight:500, color:"#0f172a" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                <span style={{ color:"#94a3b8" }}>{getCatIcon(item.category)}</span>
                                {item.name}
                              </div>
                            </td>
                            <td style={{ ...tdStyle, color:"#475569" }}>{item.qty}</td>
                            <td style={{ ...tdStyle, fontWeight:700, color:"#059669" }}>₱{item.revenue.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Quick Stats */}
              <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #eaecf4", overflow:"hidden" }}>
                <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:"8px", color:"#0891b2" }}>
                  {Icon.barChart}
                  <p style={{ fontSize:"14px", fontWeight:700, color:"#0f172a", margin:0 }}>Quick Stats</p>
                </div>
                <div style={{ padding:"8px 20px" }}>
                  {[
                    { label:"Avg Order Value",     value:`₱${avgOrder.toLocaleString()}` },
                    { label:"Total Transactions",  value:String(txCount) },
                    { label:"Cash Transactions",   value:String(periodFiltered.filter((t) => t.payment==="CASH").length) },
                    { label:"Online Transactions", value:String(periodFiltered.filter((t) => t.payment!=="CASH").length) },
                    { label:"Top Product",         value:topSelling[0]?.name ?? "—" },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom: i<arr.length-1 ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontSize:"13px", color:"#64748b" }}>{s.label}</span>
                      <span style={{ fontSize:"13px", fontWeight:700, color:"#0f172a" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipt Modal — thermal paper style */}
      {selectedTx && (() => {
        const TAX_RATE = 0.12;
        const subtotal = selectedTx.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const tax      = subtotal * TAX_RATE;
        const totalDue = selectedTx.total || subtotal + tax;

        return (
          <>
            <div onClick={() => setSelectedTx(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:40 }} />

            <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:50, width:"clamp(300px,90vw,380px)", maxHeight:"90vh", overflowY:"auto", overflowX:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)", borderRadius:"2px" }}>
              {/* Torn top */}
              <div style={{ height:"14px", background:"linear-gradient(135deg,#f0ede6 25%,transparent 25%) -8px 0,linear-gradient(225deg,#f0ede6 25%,transparent 25%) -8px 0,linear-gradient(315deg,#f0ede6 25%,transparent 25%),linear-gradient(45deg,#f0ede6 25%,transparent 25%)", backgroundSize:"16px 14px", backgroundRepeat:"repeat-x", backgroundColor:"#e8e4da" }} />

              {/* Receipt body */}
              <div style={{ background:"#f7f4ee", fontFamily:"'Courier New',Courier,monospace", fontSize:"13px", color:"#1a1a1a", padding:"18px 24px 10px", lineHeight:1.55, position:"relative" }}>
                <button onClick={() => setSelectedTx(null)} style={{ position:"absolute", top:"18px", right:"14px", background:"rgba(0,0,0,0.08)", border:"none", borderRadius:"50%", width:"26px", height:"26px", cursor:"pointer", fontSize:"12px", color:"#555", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

                <div style={{ textAlign:"center", marginBottom:"12px" }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:"15px", letterSpacing:"0.5px" }}>Julieta SoftDrink Store</p>
                  <p style={{ margin:"2px 0 0", fontSize:"11px", color:"#555" }}>3065 JP Rizal St.</p>
                  <p style={{ margin:"1px 0 0", fontSize:"11px", color:"#555" }}>Camarin Caloocan City</p>
                  <p style={{ margin:"1px 0 0", fontSize:"11px", color:"#555" }}>Phone: +63 929 141 0133</p>
                </div>

                <Dash />

                <p style={{ margin:"0 0 1px" }}><span style={{ color:"#555" }}>Order ID: </span><span style={{ fontWeight:700 }}>{selectedTx.id}</span></p>
                <p style={{ margin:"0 0 1px" }}><span style={{ color:"#555" }}>Date: </span>{selectedTx.date}</p>
                <p style={{ margin:"0 0 1px" }}><span style={{ color:"#555" }}>Customer: </span>{selectedTx.customer}</p>
                <p style={{ margin:"0 0 1px" }}><span style={{ color:"#555" }}>Payment: </span>{selectedTx.payment}</p>
                <p style={{ margin:"0 0 10px" }}><span style={{ color:"#555" }}>Cashier: </span>{selectedTx.employeeName}</p>

                <Dash />

                <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 80px", fontSize:"12px", fontWeight:700, padding:"4px 0", color:"#333" }}>
                  <span>Description</span>
                  <span style={{ textAlign:"center" }}>Qty</span>
                  <span style={{ textAlign:"right" }}>Price</span>
                </div>

                <Dash />

                {selectedTx.items.map((line, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px 80px", padding:"3px 0", fontSize:"12px", alignItems:"start" }}>
                    <span style={{ wordBreak:"break-word", paddingRight:"6px" }}>{line.product.productName}</span>
                    <span style={{ textAlign:"center" }}>{line.quantity}</span>
                    <span style={{ textAlign:"right" }}>₱{line.price.toFixed(2)}</span>
                  </div>
                ))}

                <Dash />

                <ThermalRow label="Subtotal:" value={`₱${subtotal.toFixed(2)}`} />
                <ThermalRow label="Tax (12%):" value={`₱${tax.toFixed(2)}`} />

                <Dash />

                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:"15px", padding:"4px 0 6px" }}>
                  <span>Total:</span>
                  <span>₱{totalDue.toFixed(2)}</span>
                </div>

                <Dash />

                <div style={{ textAlign:"center", paddingTop:"6px" }}>
                  <p style={{ fontSize:"12px", fontWeight:700, margin:"0 0 2px" }}>Thank you for your purchase!</p>
                  <p style={{ fontSize:"10px", color:"#777", margin:0 }}>Julieta Store • TECHNOLOGIA © 2026</p>
                </div>
              </div>

              {/* Torn bottom */}
              <div style={{ height:"14px", background:"linear-gradient(135deg,transparent 25%,#f7f4ee 25%) -8px 0,linear-gradient(225deg,transparent 25%,#f7f4ee 25%) -8px 0,linear-gradient(315deg,transparent 25%,#f7f4ee 25%),linear-gradient(45deg,transparent 25%,#f7f4ee 25%)", backgroundSize:"16px 14px", backgroundRepeat:"repeat-x", backgroundColor:"#e8e4da" }} />
            </div>
          </>
        );
      })()}
    </>
  );
}

/* ── Helpers ── */
function Dash() {
  return <div style={{ borderTop:"1px dashed #bbb", margin:"8px 0" }} />;
}
function ThermalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", padding:"1px 0" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}