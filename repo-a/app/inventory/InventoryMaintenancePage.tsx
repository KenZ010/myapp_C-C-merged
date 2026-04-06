"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

type InventoryItem = {
  id: string; barcode: string; productName: string; category: string;
  expiryDate: string; stock: number; status: string;
};

type Employee = { id: string; name: string; };

type LogType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "RETURN_IN" | "RETURN_OUT";

type InventoryLog = {
  id: string;
  productId: string;
  quantity: number;
  type: LogType;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  product:  { productName: string; category: string };
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
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";

const rankColors = ["#e53935","#fb8c00","#f9a825","#aaa","#aaa","#aaa","#aaa","#aaa"];

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  return {
    id:           String(o.id ?? ""),
    date:         o.createdAt ? new Date(String(o.createdAt)).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—",
    customer:     customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    employeeName: employee ? String(employee.name ?? "—") : "—",
    total:        Number(o.totalAmount ?? 0),
    payment:      payment ? String(payment.method ?? "CASH") : "CASH",
    items:        rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        id: String(l.id ?? ""), quantity: Number(l.quantity ?? 0),
        price: Number(l.price ?? 0), subtotal: Number(l.subtotal ?? 0),
        product: {
          productName: product ? String(product.productName ?? "Item") : "Item",
          category:    product ? String(product.category ?? "") : "",
        },
      };
    }),
  };
}

function filterByPeriod(txs: Transaction[], period: Period): Transaction[] {
  const now = new Date();
  return txs.filter((tx) => {
    const d = new Date(tx.date);
    if (period === "Daily")   return d.toDateString() === now.toDateString();
    if (period === "Weekly")  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

const LOG_TYPE_STYLE: Record<LogType, { label: string; bg: string; color: string; sign: string }> = {
  STOCK_IN:    { label: "Stock In",    bg: "#e8f5e9", color: "#2e7d32", sign: "+" },
  STOCK_OUT:   { label: "Stock Out",   bg: "#ffebee", color: "#c62828", sign: "-" },
  ADJUSTMENT:  { label: "Adjustment",  bg: "#e3f2fd", color: "#1565c0", sign: "±" },
  RETURN_IN:   { label: "Return In",   bg: "#f3e5f5", color: "#6a1b9a", sign: "+" },
  RETURN_OUT:  { label: "Return Out",  bg: "#fff3e0", color: "#e65100", sign: "-" },
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

export default function InventoryMaintenancePage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [employees,    setEmployees]    = useState<Employee[]>([]);

  // Inventory logs state
  const [logs,           setLogs]           = useState<InventoryLog[]>([]);
  const [logsTotal,      setLogsTotal]      = useState(0);
  const [logsPage,       setLogsPage]       = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsLoading,    setLogsLoading]    = useState(true);
  const [logTypeFilter,  setLogTypeFilter]  = useState<string>("ALL");

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setItemsLoading(true);
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
        const data = await res.json();
        setItems(data.map((p: any) => ({
          id: p.id,
          barcode: p.barcode ?? "—",
          productName: p.productName,
          category: p.category,
          expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "—",
          stock: Number(p.stock ?? 0),
          status: p.status,
        })));
      } catch (err) { console.error("Failed to fetch products", err); }
      finally { setItemsLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees`);
        const data = await res.json();
        setEmployees(data);
      } catch (err) { console.error("Failed to fetch employees", err); }
    };
    fetchEmployees();
  }, []);

  const fetchLogs = useCallback(async (page = 1, type = "ALL") => {
    try {
      setLogsLoading(true);
      const data = await api.getInventoryLogs({
        page,
        limit: LOGS_PER_PAGE,
        type: type === "ALL" ? undefined : type,
      });
      if (data?.message) return;
      setLogs(data.logs ?? []);
      setLogsTotal(data.total ?? 0);
      setLogsTotalPages(data.totalPages ?? 1);
      setLogsPage(page);
    } catch (err) { console.error("Failed to fetch logs", err); }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(1, logTypeFilter); }, [logTypeFilter, fetchLogs]);

  const productStockData = useMemo(() =>
    [...items].sort((a, b) => a.productName.localeCompare(b.productName))
      .map(p => ({ name: p.productName, stock: p.stock }))
  , [items]);

  // ── Top Selling ──
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [txLoading,     setTxLoading]     = useState(true);
  const [topPeriod,     setTopPeriod]     = useState<Period>("Monthly");

  useEffect(() => {
    const fetchTx = async () => {
      try {
        setTxLoading(true);
        const data = await api.getCompletedOrders();
        if (data?.message) return;
        const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
        setTransactions(raw.map(normalizeTransaction));
      } catch (err) { console.error("Failed to fetch transactions", err); }
      finally { setTxLoading(false); }
    };
    fetchTx();
  }, []);

  const topSelling = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, topPeriod);
    const productMap: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    periodFiltered.forEach((tx) => {
      tx.items.forEach((line) => {
        const key = line.product.productName;
        if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0, category: line.product.category };
        productMap[key].qty     += line.quantity;
        productMap[key].revenue += line.subtotal;
      });
    });
    return Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [transactions, topPeriod]);


  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };


  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Sidebar */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                <div className="relative flex items-center gap-2 w-full">
                  <span>{item.icon}</span><span>{item.label}</span>
                  {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">

        {/* Header */}
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

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map(item => (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${pathname === item.path ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">

          {/* Inventory Movement Log */}
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-base">📋 Inventory Movement Log</h2>
                <p className="text-xs text-gray-400 mt-0.5">{logsTotal} total records</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {["ALL","STOCK_IN","STOCK_OUT","ADJUSTMENT","RETURN_IN","RETURN_OUT"].map((t) => (
                  <button key={t} onClick={() => { setLogTypeFilter(t); setLogsPage(1); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${logTypeFilter === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {t === "ALL" ? "All" : LOG_TYPE_STYLE[t as LogType]?.label ?? t}
                  </button>
                ))}
                <button onClick={() => fetchLogs(logsPage, logTypeFilter)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
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
                      {["Date & Time","Product","Category","Type","Qty Change","Reason","Reference","Employee"].map(h => (
                        <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const style   = LOG_TYPE_STYLE[log.type];
                      const isIn    = log.type === "STOCK_IN" || log.type === "RETURN_IN";
                      const isOut   = log.type === "STOCK_OUT" || log.type === "RETURN_OUT";
                      const qtySign = isIn ? "+" : isOut ? "-" : "±";
                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(log.createdAt)}</td>
                          <td className="p-3 font-medium text-gray-800">{log.product.productName}</td>
                          <td className="p-3">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{log.product.category}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                              {style.label}
                            </span>
                          </td>
                          <td className="p-3 font-bold" style={{ color: isIn ? "#2e7d32" : isOut ? "#c62828" : "#1565c0" }}>
                            {qtySign}{Math.abs(log.quantity)}
                          </td>
                          <td className="p-3 text-gray-500 text-xs max-w-[160px] truncate">{log.reason ?? "—"}</td>
                          <td className="p-3 text-xs text-gray-400">
                            {log.referenceId
                              ? <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{log.referenceType}: {log.referenceId}</span>
                              : "—"}
                          </td>
                          <td className="p-3 text-gray-700 text-xs whitespace-nowrap">{log.employee.name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Logs Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-gray-400">
                  Page {logsPage} of {logsTotalPages} · {logsTotal} records
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchLogs(logsPage - 1, logTypeFilter)} disabled={logsPage === 1}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                  {Array.from({ length: Math.min(5, logsTotalPages) }, (_, i) => {
                    const p = Math.max(1, logsPage - 2) + i;
                    if (p > logsTotalPages) return null;
                    return (
                      <button key={p} onClick={() => fetchLogs(p, logTypeFilter)}
                        className={`px-3 py-1 rounded-lg text-sm border transition-colors ${logsPage === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => fetchLogs(logsPage + 1, logTypeFilter)} disabled={logsPage === logsTotalPages}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-1">Product Stock</h2>
              <p className="text-xs text-gray-400 mb-3">Current stock levels from inventory</p>
              {itemsLoading ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Loading...</div>
              ) : productStockData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">No products found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wide px-2">Product</th>
                        <th className="pb-2 text-right text-xs text-gray-400 font-semibold uppercase tracking-wide px-2">Stock</th>
                        <th className="pb-2 text-right text-xs text-gray-400 font-semibold uppercase tracking-wide px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productStockData.map((item, index) => {
                        const status = item.stock === 0 ? { label: "Out of Stock", cls: "bg-red-100 text-red-600" }
                          : item.stock <= 10 ? { label: "Low Stock", cls: "bg-yellow-100 text-yellow-700" }
                          : { label: "In Stock", cls: "bg-green-100 text-green-700" };
                        return (
                          <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium text-gray-800">{item.name}</td>
                            <td className="py-2 px-2 text-right font-bold text-gray-700">{item.stock}</td>
                            <td className="py-2 px-2 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>{status.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-lg">📈</span>
                <h2 className="font-bold text-gray-800">Top Selling Items</h2>
                <div className="ml-auto flex gap-1">
                  {(["Daily", "Weekly", "Monthly"] as Period[]).map((p) => (
                    <button key={p} onClick={() => setTopPeriod(p)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${topPeriod === p ? "bg-indigo-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {p}
                    </button>
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
                        {["Rank", "Product", "Qty Sold", "Revenue"].map((h) => (
                          <th key={h} className="pb-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wide px-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSelling.map((item) => (
                        <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: rankColors[item.rank - 1] }}>
                              {item.rank}
                            </div>
                          </td>
                          <td className="py-2 px-2 font-medium text-gray-800">
                            {getEmoji(item.category)} {item.name}
                          </td>
                          <td className="py-2 px-2 text-gray-500">{item.qty}</td>
                          <td className="py-2 px-2 font-bold text-indigo-900">₱{item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
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
