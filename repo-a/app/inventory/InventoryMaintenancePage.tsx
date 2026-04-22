"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

// ─── CASE UNIT SYSTEM ────────────────────────────────────────────────────────
type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: {
  value: CaseUnit; label: string; abbr: string; short: string; bottlesPerCase: number | null;
}[] = [
  { value: "case_24", label: "Case (24 pcs)", abbr: "case/24", short: "24-cs", bottlesPerCase: 24 },
  { value: "case_12", label: "Case (12 pcs)", abbr: "case/12", short: "12-cs", bottlesPerCase: 12 },
  { value: "case_6",  label: "Case (6 pcs)",  abbr: "case/6",  short: "6-cs",  bottlesPerCase: 6  },
  { value: "btl",     label: "Bottles",        abbr: "btl",     short: "btl",   bottlesPerCase: null },
  { value: "pcs",     label: "Pieces",         abbr: "pcs",     short: "pcs",   bottlesPerCase: null },
];

const getUnit      = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];
const getUnitShort = (u?: string) => getUnit(u).short;

function getCaseBreakdown(qty: number, unit?: string): string | null {
  const u = getUnit(unit);
  if (!u.bottlesPerCase) return null;
  return `${qty} × ${u.bottlesPerCase} = ${qty * u.bottlesPerCase} btl`;
}

function UnitPill({ unit }: { unit?: string }) {
  const u = getUnit(unit);
  return (
    <span className="inline-flex items-center text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      {u.short}
    </span>
  );
}

function CaseBadge({ quantity, unit }: { quantity: number; unit?: string }) {
  const u         = getUnit(unit);
  const breakdown = getCaseBreakdown(quantity, unit);
  const color     = quantity === 0
    ? "bg-red-100 text-red-700 border-red-200"
    : quantity <= 3
    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-green-100 text-green-700 border-green-200";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${color}`}>
        {quantity} <span className="font-normal opacity-80">{u.short}</span>
      </span>
      {breakdown && <span className="text-xs text-indigo-500 font-medium">{breakdown}</span>}
    </div>
  );
}

// ─── TYPES ──────────
type InventoryItem = {
  id: string; barcode: string; productName: string; category: string;
  size?: string | null; expiryDate: string; stock: number; stockUnit?: string; status: string;
};

type LogType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "RETURN_IN" | "RETURN_OUT";

type InventoryLog = {
  id: string; productId: string; quantity: number; type: LogType;
  reason: string | null; referenceId: string | null; referenceType: string | null;
  createdAt: string;
  product: { productName: string; category: string; stockUnit?: string; size?: string | null };
  employee: { name: string; role: string };
};

type OrderLine = {
  id: string; quantity: number; price: number; subtotal: number;
  product: { productName: string; category: string };
};

type Transaction = {
  id: string; date: string; customer: string; employeeName: string;
  total: number; payment: string; items: OrderLine[];
};

type Period = "Daily" | "Weekly" | "Monthly";

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤", ENERGY_DRINK: "⚡", BEER: "🍺",
  JUICE: "🍹", WATER: "💧", OTHER: "🛒",
};
const getEmoji   = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";
const rankColors = ["#e53935","#fb8c00","#f9a825","#aaa","#aaa","#aaa","#aaa","#aaa"];

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  return {
    id: String(o.id ?? ""),
    date: o.createdAt ? new Date(String(o.createdAt)).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—",
    customer: customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    employeeName: employee ? String(employee.name ?? "—") : "—",
    total: Number(o.totalAmount ?? 0),
    payment: payment ? String(payment.method ?? "CASH") : "CASH",
    items: rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        id: String(l.id ?? ""), quantity: Number(l.quantity ?? 0),
        price: Number(l.price ?? 0), subtotal: Number(l.subtotal ?? 0),
        product: {
          productName: product ? String(product.productName ?? "Item") : "Item",
          category: product ? String(product.category ?? "") : "",
        },
      };
    }),
  };
}

function filterByPeriod(txs: Transaction[], period: Period): Transaction[] {
  const now = new Date();
  return txs.filter((tx) => {
    const d = new Date(tx.date);
    if (period === "Daily")  return d.toDateString() === now.toDateString();
    if (period === "Weekly") { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

const LOG_TYPE_STYLE: Record<LogType, { label: string; bg: string; color: string }> = {
  STOCK_IN:   { label: "Stock In",   bg: "#e8f5e9", color: "#2e7d32" },
  STOCK_OUT:  { label: "Stock Out",  bg: "#ffebee", color: "#c62828" },
  ADJUSTMENT: { label: "Adjustment", bg: "#e3f2fd", color: "#1565c0" },
  RETURN_IN:  { label: "Return In",  bg: "#f3e5f5", color: "#6a1b9a" },
  RETURN_OUT: { label: "Return Out", bg: "#fff3e0", color: "#e65100" },
};

const LOGS_PER_PAGE = 10;

const navItems = [
  { label: "Dashboard",             icon: "🏠", path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: "📊", path: "/supplier"       },
  { label: "Sales Reports",         icon: "🌐", path: "/sales"          },
  { label: "Transaction Logs",      icon: "▦",  path: "/transaction"    },
  { label: "Product Management",    icon: "🗒️", path: "/product"        },
  { label: "Account Management",    icon: "👤", path: "/account"        },
  { label: "Purchase Order",        icon: "📋", path: "/purchase-order" },
  { label: "Promo Management",      icon: "🎁", path: "/promo"          },
];

function fmtDate(str: string) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

// ─── LOG DETAIL MODAL ────────────────────────────────────────────────────────
function LogDetailModal({ log, onClose }: { log: InventoryLog; onClose: () => void }) {
  const style    = LOG_TYPE_STYLE[log.type];
  const isIn     = log.type === "STOCK_IN"  || log.type === "RETURN_IN";
  const isOut    = log.type === "STOCK_OUT" || log.type === "RETURN_OUT";
  const sign     = isIn ? "+" : isOut ? "-" : "±";
  const qty      = Math.abs(log.quantity);
  const unit     = getUnit(log.product.stockUnit);
  const totalBtl = unit.bottlesPerCase ? qty * unit.bottlesPerCase : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Movement Details</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(log.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
          >✕</button>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{log.product.productName}</p>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: style.bg, color: style.color }}
            >{style.label}</span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold"
              style={{ color: isIn ? "#2e7d32" : isOut ? "#c62828" : "#1565c0" }}>
              {sign}{qty}
            </p>
            <p className="text-xs text-indigo-500 font-medium">
              {totalBtl !== null ? `${qty} × ${unit.bottlesPerCase} = ${totalBtl} btl` : unit.short}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Reason</p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {log.reason && log.reason.trim() !== "" ? log.reason : "No reason provided"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Reference</p>
            {log.referenceId ? (
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium px-2.5 py-1 rounded-lg">
                <span className="text-indigo-400 text-xs">{log.referenceType}:</span>
                {log.referenceId}
              </span>
            ) : (
              <p className="text-sm text-gray-400">No reference</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Approved By</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                {log.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{log.employee.name}</p>
                <p className="text-xs text-gray-400">{log.employee.role}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >Close</button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function InventoryMaintenancePage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [items,          setItems]          = useState<InventoryItem[]>([]);
  const [itemsLoading,   setItemsLoading]   = useState(true);
  const [logs,           setLogs]           = useState<InventoryLog[]>([]);
  const [logsTotal,      setLogsTotal]      = useState(0);
  const [logsPage,       setLogsPage]       = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsLoading,    setLogsLoading]    = useState(true);
  const [logTypeFilter,  setLogTypeFilter]  = useState<string>("ALL");
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedLog,    setSelectedLog]    = useState<InventoryLog | null>(null);

  const logsCache = useRef<Record<string, InventoryLog[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setItemsLoading(true);
        const data = await api.getProducts();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setItems(data.map((p: any) => ({
          id: p.id, barcode: p.barcode ?? "—", productName: p.productName,
          category: p.category, size: p.size ?? null,
          expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "—",
          stock: Number(p.stockQuantity ?? p.stock ?? 0),
          stockUnit: p.stockUnit || "case_24",
          status: p.status,
        })));
      } catch (err) { console.error("Failed to fetch products", err); }
      finally { setItemsLoading(false); }
    };
    fetchData();
  }, []);

  const fetchLogs = useCallback(async (page = 1, type = "ALL") => {
    const cacheKey = `${type}_${page}`;
    if (logsCache.current[cacheKey]) {
      setLogs(logsCache.current[cacheKey]);
      setLogsPage(page);
      setLogsLoading(false);
    } else {
      setLogsLoading(true);
    }
    try {
      const data = await api.getInventoryLogs({
        page, limit: LOGS_PER_PAGE,
        type: type === "ALL" ? undefined : type,
      });
      if (data?.message) return;
      const newLogs = data.logs ?? [];
      logsCache.current[cacheKey] = newLogs;
      setLogs(newLogs);
      setLogsTotal(data.total ?? 0);
      setLogsTotalPages(data.totalPages ?? 1);
      setLogsPage(page);
    } catch (err) { console.error("Failed to fetch logs", err); }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => {
    logsCache.current = {};
    fetchLogs(1, logTypeFilter);
  }, [logTypeFilter, fetchLogs]);

  useEffect(() => {
    if (logsPage < logsTotalPages) {
      const nextKey = `${logTypeFilter}_${logsPage + 1}`;
      if (!logsCache.current[nextKey]) {
        api.getInventoryLogs({
          page: logsPage + 1, limit: LOGS_PER_PAGE,
          type: logTypeFilter === "ALL" ? undefined : logTypeFilter,
        }).then((data) => {
          if (data?.logs) logsCache.current[nextKey] = data.logs;
        }).catch(() => {});
      }
    }
  }, [logsPage, logsTotalPages, logTypeFilter]);

  const stockMap = useMemo(() => {
    const map: Record<string, { stock: number; stockUnit: string; size?: string | null }> = {};
    items.forEach((p) => {
      map[p.productName] = { stock: p.stock, stockUnit: p.stockUnit ?? "case_24", size: p.size };
    });
    return map;
  }, [items]);

  const productStockData = useMemo(() =>
    [...items]
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map((p) => ({ name: p.productName, size: p.size, stock: p.stock, stockUnit: p.stockUnit }))
  , [items]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading,    setTxLoading]    = useState(true);
  const [topPeriod,    setTopPeriod]    = useState<Period>("Monthly");

  useEffect(() => {
    const fetchTx = async () => {
      try {
        setTxLoading(true);
        const data = await api.getCompletedOrders();
        if (data?.message) return;
        setTransactions((Array.isArray(data) ? data : []).map(normalizeTransaction));
      } catch (err) { console.error(err); }
      finally { setTxLoading(false); }
    };
    fetchTx();
  }, []);

  const topSelling = useMemo(() => {
    const pf = filterByPeriod(transactions, topPeriod);
    const pm: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    pf.forEach((tx) => tx.items.forEach((line) => {
      const key = line.product.productName;
      if (!pm[key]) pm[key] = { name: key, qty: 0, revenue: 0, category: line.product.category };
      pm[key].qty += line.quantity; pm[key].revenue += line.subtotal;
    }));
    return Object.values(pm).sort((a, b) => b.qty - a.qty).slice(0, 8).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [transactions, topPeriod]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">
            JULIETA SOFTDRINKS<br />STORE
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}>
                <div className="relative flex items-center gap-2 w-full">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventory Maintenance</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-xl">🔔</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${
                  showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"
                }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Mobile nav ── */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map((item) => (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                  pathname === item.path ? "text-indigo-700 font-semibold" : "text-gray-500"
                }`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">

          {/* ── Inventory Movement Log ── */}
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-base">📋 Inventory Movement Log</h2>
                <p className="text-xs text-gray-400 mt-0.5">{logsTotal} total records</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL","STOCK_IN","STOCK_OUT","ADJUSTMENT","RETURN_IN","RETURN_OUT"].map((t) => (
                  <button key={t} onClick={() => { setLogTypeFilter(t); setLogsPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      logTypeFilter === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {t === "ALL" ? "All" : LOG_TYPE_STYLE[t as LogType]?.label ?? t}
                  </button>
                ))}
                <button
                  onClick={() => { logsCache.current = {}; fetchLogs(logsPage, logTypeFilter); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
                  🔄
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm text-gray-400">No inventory movements recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      {["Date & Time","Product","Category","Transaction","Qty","Unit","Total Bottles","Details"].map((h) => (
                        <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const style     = LOG_TYPE_STYLE[log.type];
                      const isIn      = log.type === "STOCK_IN"  || log.type === "RETURN_IN";
                      const isOut     = log.type === "STOCK_OUT" || log.type === "RETURN_OUT";
                      const sign      = isIn ? "+" : isOut ? "-" : "±";
                      const qty       = Math.abs(log.quantity);
                      const unitInfo  = getUnit(log.product.stockUnit);
                      const totalBtl  = unitInfo.bottlesPerCase ? qty * unitInfo.bottlesPerCase : null;
                      const stockInfo = stockMap[log.product.productName];
                      const size      = log.product.size || stockInfo?.size || null;
                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(log.createdAt)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-gray-800">{log.product.productName}</span>
                              {size && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  {size}
                                </span>
                              )}
                            </div>
                            {stockInfo != null && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {stockInfo.stock} {getUnitShort(stockInfo.stockUnit)} remaining
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                              {log.product.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: style.bg, color: style.color }}>
                              {style.label}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-sm"
                            style={{ color: isIn ? "#2e7d32" : isOut ? "#c62828" : "#1565c0" }}>
                            {sign}{qty}
                          </td>
                          <td className="p-3"><UnitPill unit={log.product.stockUnit} /></td>
                          <td className="p-3 text-xs text-indigo-500 font-medium whitespace-nowrap">
                            {totalBtl !== null ? `${qty} × ${unitInfo.bottlesPerCase} = ${totalBtl} btl` : "—"}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {logsTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                <p className="text-xs text-gray-400">Page {logsPage} of {logsTotalPages} · {logsTotal} records</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <button onClick={() => fetchLogs(logsPage - 1, logTypeFilter)} disabled={logsPage === 1}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(5, logsTotalPages) }, (_, i) => {
                    const p = Math.max(1, logsPage - 2) + i;
                    if (p > logsTotalPages) return null;
                    return (
                      <button key={p} onClick={() => fetchLogs(p, logTypeFilter)}
                        className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                          logsPage === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>{p}</button>
                    );
                  })}
                  <button onClick={() => fetchLogs(logsPage + 1, logTypeFilter)} disabled={logsPage === logsTotalPages}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── Top Stocked Products (bar chart) ── */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-1">📈 Top Stocked Products</h2>
              <p className="text-xs text-gray-400 mb-4">Highest stock levels across all products</p>
              {itemsLoading ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Loading...</div>
              ) : productStockData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">No products found.</div>
              ) : (() => {
                const top5     = [...productStockData].sort((a, b) => b.stock - a.stock).slice(0, 5);
                const maxStock = top5[0]?.stock || 1;
                const barColors = ["#1a3c2e", "#2d7a3a", "#56ab6e", "#a5d6a7", "#c8e6c9"];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {top5.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", width: "18px", textAlign: "right" }}>
                          #{i + 1}
                        </span>
                        <div style={{ width: "100px", flexShrink: 0 }}>
                          <p style={{ fontSize: "12px", color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name}
                          </p>
                          {item.size && (
                            <span style={{ fontSize: "10px", color: "#888", background: "#f0f0f0", padding: "1px 6px", borderRadius: "10px" }}>
                              {item.size}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, height: "24px", background: "#f0f0f0", borderRadius: "6px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${(item.stock / maxStock) * 100}%`,
                            background: barColors[i] ?? "#a5d6a7",
                            borderRadius: "6px",
                            transition: "width 0.5s",
                          }} />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a3c2e", width: "60px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {item.stock} {getUnitShort(item.stockUnit)}
                        </span>
                      </div>
                    ))}
                    <p style={{ fontSize: "11px", color: "#aaa", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#2d7a3a", borderRadius: "3px" }} />
                      Units in Stock
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* ── Top Selling ── */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-lg">📈</span>
                <h2 className="font-bold text-gray-800">Top Selling Items</h2>
                <div className="ml-auto flex gap-1">
                  {(["Daily", "Weekly", "Monthly"] as Period[]).map((p) => (
                    <button key={p} onClick={() => setTopPeriod(p)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        topPeriod === p ? "bg-indigo-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              {txLoading ? (
                <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Loading...</div>
              ) : topSelling.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">No sales data for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Rank","Product","Qty Sold","Revenue"].map((h) => (
                          <th key={h} className="pb-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wide px-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSelling.map((item) => {
                        const si = stockMap[item.name];
                        return (
                          <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: rankColors[item.rank - 1] }}>
                                {item.rank}
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-gray-800">{getEmoji(item.category)} {item.name}</span>
                                {si?.size && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    {si.size}
                                  </span>
                                )}
                              </div>
                              {si && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {si.stock} {getUnitShort(si.stockUnit)} remaining
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-500">{item.qty}</td>
                            <td className="py-2 px-2 font-bold text-indigo-900">₱{item.revenue.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
