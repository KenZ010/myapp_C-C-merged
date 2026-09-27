"use client";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { api } from "@/lib/api";
import {
  LayoutDashboard, ShoppingCart, Users, BarChart3,
  FileText, Package, User, ClipboardList, AlertTriangle, Gift,
  Coffee, Zap, Beer, Droplets, ShoppingBasket,
  Calendar, Search, Globe, Bell
} from "lucide-react";

type Period = "Daily" | "Weekly" | "Monthly" | "Custom";
type TabKey  = "report" | "logs";

type OrderLine = {
  id: string; productName: string; category: string;
  quantity: number; price: number; subtotal: number;
};

type Transaction = {
  id: string; date: string; rawDate: Date; createdAt: string;
  customer: string; customerId: string | null;
  employeeName: string; total: number; paymentMethod: string;
  orderLines: OrderLine[];
};

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: Users, path: "/supplier"       },
  { label: "Sales Reports",         icon: BarChart3, path: "/sales"          },
  { label: "Product Management",    icon: Package, path: "/product"        },
  { label: "Account Management",    icon: User, path: "/account"        },
  { label: "Purchase Order",        icon: ClipboardList, path: "/purchase-order" },
  { label: "Loss Report", icon: AlertTriangle, path: "/loss-report" },
  { label: "Promo Management",      icon: Gift, path: "/promo" },
];

const CATEGORY_ICONS: Record<string, typeof Coffee> = {
  SOFTDRINKS: Coffee, ENERGY_DRINK: Zap, BEER: Beer,
  JUICE: Droplets, WATER: Droplets, OTHER: ShoppingBasket,
};
const getCategoryIcon = (cat?: string) => CATEGORY_ICONS[cat?.toUpperCase() || ""] || Coffee;

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function getPeriodLabel(period: Period, customDate = ""): string {
  const now = new Date();
  if (period === "Custom") {
    return customDate
      ? new Date(customDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "Pick a date";
  }
  if (period === "Daily") return now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  if (period === "Weekly") {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return now.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function fmtDate(str: string) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  const createdAt = String(o.createdAt ?? o.saleDate ?? "");
  const rawDate   = createdAt ? new Date(createdAt) : new Date();
  return {
    id:            String(o.id ?? ""),
    date:          rawDate.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    rawDate,
    createdAt,
    customer:      customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    customerId:    customer ? String(customer.id ?? "") : null,
    employeeName:  employee ? String(employee.name ?? "—") : "—",
    total:         Number(o.totalAmount ?? 0),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    orderLines:    rawLines.map(l => {
      const product = l.product as Record<string, unknown> | null;
      return {
        id:          String(l.id ?? ""),
        productName: product ? String(product.productName ?? "Item") : "Item",
        category:    product ? String(product.category ?? "")     : "",
        quantity:    Number(l.quantity ?? 0),
        price:       Number(l.price    ?? 0),
        subtotal:    Number(l.subtotal ?? 0),
      };
    }),
  };
}

function filterByPeriod(txs: Transaction[], period: Period, customDate = ""): Transaction[] {
  if (period === "Custom") return customDate ? txs.filter(({ rawDate: d }) => toDateKey(d) === customDate) : txs;
  const now = new Date();
  return txs.filter(({ rawDate: d }) => {
    if (period === "Daily")  return d.toDateString() === now.toDateString();
    if (period === "Weekly") { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function buildRevenueChart(txs: Transaction[], period: Period) {
  const map: Record<string, number> = {};
  txs.forEach(({ rawDate: d, total }) => {
    const key = period === "Daily" || period === "Custom"
      ? d.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: true })
      : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    map[key] = (map[key] ?? 0) + total;
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue })).slice(-16);
}

function buildTransactionChart(txs: Transaction[], period: Period) {
  const map: Record<string, number> = {};
  txs.forEach(({ rawDate: d }) => {
    const key = period === "Daily" || period === "Custom"
      ? d.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: true })
      : period === "Weekly"
      ? d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })
      : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map).map(([date, transactions]) => ({ date, transactions })).slice(-16);
}

function buildTopSelling(txs: Transaction[]) {
  const map: Record<string, { name: string; category: string; units: number; revenue: number }> = {};
  txs.forEach(tx => tx.orderLines.forEach(line => {
    const key = line.productName;
    if (!map[key]) map[key] = { name: key, category: line.category, units: 0, revenue: 0 };
    map[key].units   += line.quantity;
    map[key].revenue += line.subtotal;
  }));
  return Object.values(map).sort((a, b) => b.units - a.units);
}

function buildUnpopular(txs: Transaction[]) {
  return buildTopSelling(txs).slice().reverse().slice(0, 5);
}

function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

// ── DatePicker — portal-based, never clipped by the scrolling content area ─────
function DatePicker({ value, onChange, label }: { value: string; onChange: (val: string) => void; label?: string }) {
  const [show, setShow] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const buttonRef   = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(() => value ? parseInt(value.split("-")[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());

  const openCalendar = () => {
    setViewYear(value  ? parseInt(value.split("-")[0])     : today.getFullYear());
    setViewMonth(value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());
    if (buttonRef.current) {
      const rect  = buttonRef.current.getBoundingClientRect();
      const calW  = 280;
      const calH  = 320;
      let top  = rect.bottom + 6;
      let left = rect.left;
      if (window.innerHeight - rect.bottom < calH && rect.top > calH) top = rect.top - calH - 6;
      if (left + calW > window.innerWidth - 12) left = window.innerWidth - calW - 12;
      setCalendarPos({ top, left });
    }
    setShow(true);
  };

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
          buttonRef.current   && !buttonRef.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const h = () => setShow(false);
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [show]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectDate = (day: number) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setShow(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const selDay   = value ? parseInt(value.split("-")[2]) : null;
  const selMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selYear  = value ? parseInt(value.split("-")[0]) : null;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const calendar = show ? (
    <div ref={calendarRef}
      style={{ position: "fixed", top: calendarPos.top, left: calendarPos.left, width: 280, zIndex: 99999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-medium">‹</button>
        <div className="flex items-center gap-1">
          <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}
            className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <input type="number" value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
            className="w-16 text-sm font-semibold text-gray-800 border border-gray-200 rounded px-1 text-center outline-none focus:border-indigo-400" />
        </div>
        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-medium">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSel   = day === selDay   && viewMonth === selMonth  && viewYear === selYear;
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          return (
            <button key={day} type="button" onClick={() => selectDate(day)}
              className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-colors
                ${isSel ? "bg-indigo-600 text-white font-semibold" : isToday ? "border border-indigo-400 text-indigo-600 font-semibold" : "text-gray-700 hover:bg-indigo-50"}`}>
              {day}
            </button>
          );
        })}
      </div>
      <button type="button"
        onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today.getDate()); }}
        className="w-full mt-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
        Today
      </button>
    </div>
  ) : null;

  return (
    <div className="relative">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <button ref={buttonRef} type="button" onClick={openCalendar}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 text-left hover:border-indigo-400 transition-colors focus:outline-none focus:border-indigo-400 bg-white">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className={`flex-1 truncate ${displayValue ? "text-gray-900" : "text-gray-400"}`}>
          {displayValue || "Select date"}
        </span>
        {value && (
          <span role="button" onClick={e => { e.stopPropagation(); onChange(""); setShow(false); }}
            className="ml-auto text-gray-300 hover:text-gray-500 text-xs leading-none">✕</span>
        )}
      </button>
      {typeof document !== "undefined" && calendar ? createPortal(calendar, document.body) : null}
    </div>
  );
}

// ─── RECEIPT MODAL ───────────────────────────────────────────────────────────
function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 50, width: "400px", background: "#fff", borderRadius: "20px",
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ background: "linear-gradient(135deg,#1a3c2e,#2d7a3a)", padding: "24px 28px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose}
            style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#fff", fontSize: "14px" }}>✕</button>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "24px" }}>🧾</div>
          <p style={{ color: "#fff", fontSize: "18px", fontWeight: 800, margin: "0 0 2px" }}>Julieta Soft Drinks</p>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", margin: 0 }}>Official Receipt</p>
        </div>
        <div style={{ height: "12px", background: "linear-gradient(135deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(225deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(315deg,#2d7a3a 25%,transparent 25%),linear-gradient(45deg,#2d7a3a 25%,transparent 25%)", backgroundSize: "20px 12px", backgroundRepeat: "repeat-x" }} />
        <div style={{ padding: "20px 28px" }}>
          {[
            ["Order ID",  tx.id],
            ["Customer",  tx.customerId ? tx.customer : "Walk-in Customer"],
            ["Cashier",   tx.employeeName],
            ["Date",      fmtDate(tx.createdAt)],
            ["Payment",   tx.paymentMethod],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#aaa" }}>{label}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>{value}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Ordered</p>
          {tx.orderLines.map((line, i) => {
            const Icon = getCategoryIcon(line.category);
            return (
              <div key={line.id || i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <p style={{ fontSize: "13px", color: "#333", margin: 0 }}><Icon className="w-4 h-4 inline mr-1" /> {line.productName}</p>
                  <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>x{line.quantity} × ₱{line.price.toLocaleString()}.00</p>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>₱{line.subtotal.toLocaleString()}.00</span>
              </div>
            );
          })}
          <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />
          <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>TOTAL</span>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c2e" }}>₱{tx.total.toLocaleString()}.00</span>
          </div>
          <div style={{ textAlign: "center", paddingTop: "14px", borderTop: "1px dashed #e0e0e0" }}>
            <p style={{ fontSize: "12px", color: "#2d7a3a", fontWeight: 600, marginBottom: "4px" }}>Thank you for your purchase! 🎉</p>
            <p style={{ fontSize: "11px", color: "#aaa" }}>Julieta Soft Drink Store • TECHNOLOGIA @2026</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SalesReportsPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab,      setActiveTab]      = useState<TabKey>("report");
  const [period,         setPeriod]         = useState<Period>("Monthly");
  const [customDate,     setCustomDate]     = useState("");
  const [topSearch,      setTopSearch]      = useState("");
  const [unpopSearch,    setUnpopSearch]    = useState("");
  const [logSearch,      setLogSearch]      = useState("");
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedTx,     setSelectedTx]     = useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await api.getCompletedOrders();
      if (data?.message) { setError(data.message); return; }
      setTransactions((Array.isArray(data) ? data : []).map(normalizeTransaction));
    } catch (err) { setError((err as Error).message || "Failed to load data."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered    = useMemo(() => filterByPeriod(transactions, period, customDate), [transactions, period, customDate]);
  const revenueData = useMemo(() => buildRevenueChart(filtered, period),  [filtered, period]);
  const txChartData = useMemo(() => buildTransactionChart(filtered, period), [filtered, period]);
  const topSelling  = useMemo(() => buildTopSelling(filtered), [filtered]);
  const unpopular   = useMemo(() => buildUnpopular(filtered),  [filtered]);

  const totalSales = useMemo(() => filtered.reduce((s, t) => s + t.total, 0), [filtered]);
  const txCount    = filtered.length;
  const avgOrder   = txCount > 0 ? Math.round(totalSales / txCount) : 0;

  const filteredTop = useMemo(() => topSelling.filter(i =>
    i.name.toLowerCase().includes(topSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(topSearch.toLowerCase())
  ), [topSelling, topSearch]);

  const filteredUnpop = useMemo(() => unpopular.filter(i =>
    i.name.toLowerCase().includes(unpopSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(unpopSearch.toLowerCase())
  ), [unpopular, unpopSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase();
    if (!q) return filtered;
    return filtered.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q) ||
      t.employeeName.toLowerCase().includes(q)
    );
  }, [filtered, logSearch]);

  const sectionLabel = period === "Daily" ? "Today" : period === "Weekly" ? "This Week" : period === "Custom" ? "Selected Date" : "This Month";
  const logRevenue   = filtered.reduce((s, t) => s + t.total, 0);
  const cashCount    = filtered.filter(t => t.paymentMethod.toUpperCase() === "CASH").length;
  const onlineCount  = filtered.filter(t => t.paymentMethod.toUpperCase() !== "CASH").length;

  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const exportSales  = () => exportCSV(
    ["Product Name","Category","Units Sold","Revenue (₱)"],
    topSelling.map(i => [i.name, i.category, i.units, i.revenue]),
    "sales_report.csv"
  );

  const Skeleton = ({ h, w }: { h: number; w?: string }) => (
    <div style={{ height: h, width: w ?? "100%", borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  );

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="flex min-h-screen bg-gray-50 font-sans">

        {selectedTx && <ReceiptModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}

        <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-0 relative">
            <Image src="/logo-new.png" alt="Logo" fill className="object-cover" sizes="96px" />
          </div>
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide mt-3">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.path;
              return (
                <div key={item.label} onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                  <div className="relative flex items-center gap-2 w-full">
                    <item.icon className="w-4 h-4" /><span>{item.label}</span>
                    {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-auto">
          <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
            <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? "✕" : "☰"}
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg md:text-2xl font-bold text-gray-800">Sales Reports</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${
                  period === "Daily" ? "bg-blue-100 text-blue-700 border-blue-300" :
                  period === "Weekly" ? "bg-purple-100 text-purple-700 border-purple-300" :
                  period === "Custom" ? "bg-amber-100 text-amber-700 border-amber-300" :
                  "bg-green-100 text-green-700 border-green-300"
                }`}>{period} Report</span>
              </div>
              <p className="text-xs text-gray-400">Administrator Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative"><Bell className="w-5 h-5 text-gray-500" /><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">Log Out</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {showMobileMenu && (
            <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
              {navItems.map(item => (
                <div key={item.label} onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${pathname === item.path ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab Bar ── */}
          <div className="bg-white border-b border-gray-100 px-4 md:px-6">
            <div className="flex">
              {([
                { key: "report", label: "Sales Report",     icon: BarChart3 },
                { key: "logs",   label: "Transaction Logs", icon: FileText },
              ] as { key: TabKey; label: string; icon: typeof BarChart3 }[]).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}>
                  <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-3 md:p-4 bg-green-50 flex flex-col gap-4">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
                <button onClick={fetchData} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">Retry</button>
              </div>
            )}

            {/* ✅ Period picker — shared by both tabs */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Report Period:</span>
              {(["Daily", "Weekly", "Monthly", "Custom"] as Period[]).map(p => (
                <button key={p} onClick={() => { setPeriod(p); if (p === "Custom" && !customDate) setCustomDate(toDateKey(new Date())); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {p}
                </button>
              ))}
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {getPeriodLabel(period, customDate)}
              </span>
              {period === "Custom" && (
                <div className="w-full sm:w-72">
                  <DatePicker value={customDate} onChange={setCustomDate} />
                </div>
              )}
            </div>

            {/* ── Sales Report Tab ── */}
            {activeTab === "report" && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm"><Skeleton h={60} /></div>
                    ))
                  ) : (
                    <>
                      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div><p className="text-xs text-gray-400">Total Revenue</p><p className="text-2xl font-bold text-gray-800">₱{totalSales.toLocaleString()}</p></div>
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">₱</div>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div><p className="text-xs text-gray-400">Total Transactions</p><p className="text-2xl font-bold text-gray-800">{txCount.toLocaleString()}</p></div>
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-green-500" />
                      </div>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div><p className="text-xs text-gray-400">Avg Order Value</p><p className="text-2xl font-bold text-gray-800">₱{avgOrder.toLocaleString()}</p><p className="text-xs text-gray-400">Per transaction</p></div>
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-500 text-lg font-bold">₱</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Top Selling */}
                <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="font-bold text-gray-800">Top Selling Items</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                        <Search className="w-3 h-3 text-gray-400" />
                        <input type="text" placeholder="Search..." value={topSearch} onChange={e => setTopSearch(e.target.value)}
                          className="outline-none text-xs text-gray-700 w-28 bg-transparent" />
                      </div>
                      <button onClick={exportSales} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">📤 Export</button>
                    </div>
                  </div>
                  {loading ? <Skeleton h={160} /> : filteredTop.length === 0 ? (
                    <p className="text-center py-6 text-gray-400 text-xs">{topSearch ? `No results for "${topSearch}"` : "No sales data for this period."}</p>
                  ) : (
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                          <th className="py-2 text-left">Product Name</th>
                          <th className="py-2 text-left">Category</th>
                          <th className="py-2 text-right">Units Sold</th>
                          <th className="py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTop.map((item, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 text-gray-700">{item.name}</td>
                            <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                            <td className="py-2 text-right text-gray-700">{item.units}</td>
                            <td className="py-2 text-right font-medium text-green-600">₱{item.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Unpopular Items */}
                <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="font-bold text-gray-800">Unpopular Items <span className="text-red-400 text-sm">(Needs Attention)</span></h2>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                      <Search className="w-3 h-3 text-gray-400" />
                      <input type="text" placeholder="Search..." value={unpopSearch} onChange={e => setUnpopSearch(e.target.value)}
                        className="outline-none text-xs text-gray-700 w-28 bg-transparent" />
                    </div>
                  </div>
                  {loading ? <Skeleton h={120} /> : filteredUnpop.length === 0 ? (
                    <p className="text-center py-6 text-gray-400 text-xs">{unpopSearch ? `No results for "${unpopSearch}"` : "No data for this period."}</p>
                  ) : (
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                          <th className="py-2 text-left">Product Name</th>
                          <th className="py-2 text-left">Category</th>
                          <th className="py-2 text-right">Units Sold</th>
                          <th className="py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnpop.map((item, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 text-gray-700">{item.name}</td>
                            <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                            <td className="py-2 text-right text-red-500 font-medium">{item.units}</td>
                            <td className="py-2 text-right text-gray-500">₱{item.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Revenue Trend</h2>
                  {loading ? <Skeleton h={200} /> : revenueData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No data for this period.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={v => `₱${Number(v).toLocaleString()}`} />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue (₱)" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Transaction Volume */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Transaction Volume</h2>
                  {loading ? <Skeleton h={200} /> : txChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No data for this period.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={txChartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="transactions" fill="#22c55e" radius={[3,3,0,0]} name="Transactions" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}

            {/* ── Transaction Logs Tab ── */}
            {activeTab === "logs" && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{sectionLabel}</span>
                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-lg">
                      {getPeriodLabel(period, customDate)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">{filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search order, customer, cashier..."
                      value={logSearch}
                      onChange={e => setLogSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none w-64 text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white"
                    />
                  </div>
                </div>

                {/* Summary Stats */}
                {!loading && !error && (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Total Revenue", value: `₱${logRevenue.toLocaleString()}`, color: "text-indigo-700", bg: "bg-indigo-50" },
                      { label: "Cash Orders",   value: String(cashCount),                   color: "text-green-700",  bg: "bg-green-50"  },
                      { label: "Online Orders", value: String(onlineCount),                 color: "text-purple-700", bg: "bg-purple-50" },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {loading && <p className="text-sm text-gray-400 text-center py-10">Loading transactions…</p>}

                {!loading && !error && (
                  filteredLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      {logSearch ? "No results match your search." : "No completed transactions for this period."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredLogs.map(t => (
                        <div key={t.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-indigo-700 text-base">
                                {t.customerId ? t.customer : "Walk-in Customer"}
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                                {t.customerId
                                  ? <><Globe className="w-3 h-3" /> Online Order</>
                                  : <><User className="w-3 h-3" /> Cashier: {t.employeeName}</>}
                              </p>
                              <p className="text-sm text-gray-400">{fmtDate(t.createdAt)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{t.id}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-indigo-700 text-base">₱{t.total.toLocaleString()}.00</p>
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-600">
                                Completed ✓
                              </span>
                              <p className="text-xs text-gray-400 mt-1">{t.paymentMethod}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 justify-end">
                            <button onClick={() => setSelectedTx(t)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                              View Receipt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
