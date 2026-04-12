"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { api } from "@/lib/api";

type Period = "Daily" | "Weekly" | "Monthly";

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
  rawDate: Date;
  customer: string;
  employeeName: string;
  total: number;
  payment: string;
  items: OrderLine[];
};

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

// ✅ Returns human-readable date range for each period
function getPeriodLabel(period: Period): string {
  const now = new Date();
  if (period === "Daily") {
    return now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  if (period === "Weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return now.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  const rawDate  = o.createdAt ? new Date(String(o.createdAt)) : new Date();
  return {
    id:           String(o.id ?? ""),
    date:         rawDate.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    rawDate,
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
  return txs.filter(({ rawDate: d }) => {
    if (period === "Daily")   return d.toDateString() === now.toDateString();
    if (period === "Weekly")  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function buildRevenueChart(txs: Transaction[], period: Period) {
  const map: Record<string, number> = {};
  txs.forEach(({ rawDate: d, total }) => {
    let key: string;
    if (period === "Daily") {
      key = d.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: true });
    } else {
      key = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    }
    map[key] = (map[key] ?? 0) + total;
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue })).slice(-16);
}

function buildTransactionChart(txs: Transaction[], period: Period) {
  const map: Record<string, number> = {};
  txs.forEach(({ rawDate: d }) => {
    let key: string;
    if (period === "Daily") {
      key = d.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: true });
    } else if (period === "Weekly") {
      key = d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    } else {
      key = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    }
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map).map(([date, transactions]) => ({ date, transactions })).slice(-16);
}

function buildTopSelling(txs: Transaction[]) {
  const map: Record<string, { name: string; category: string; units: number; revenue: number }> = {};
  txs.forEach((tx) => {
    tx.items.forEach((line) => {
      const key = line.product.productName;
      if (!map[key]) map[key] = { name: key, category: line.product.category, units: 0, revenue: 0 };
      map[key].units   += line.quantity;
      map[key].revenue += line.subtotal;
    });
  });
  return Object.values(map).sort((a, b) => b.units - a.units);
}

function buildUnpopular(txs: Transaction[]) {
  return buildTopSelling(txs).slice().reverse().slice(0, 5);
}

function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SalesReportsPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [period,         setPeriod]         = useState<Period>("Monthly");
  const [topSearch,      setTopSearch]      = useState("");
  const [unpopSearch,    setUnpopSearch]    = useState("");
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCompletedOrders();
      if (data?.message) { setError(data.message); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      setTransactions(raw.map(normalizeTransaction));
    } catch (err) {
      setError((err as Error).message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered    = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);
  const revenueData = useMemo(() => buildRevenueChart(filtered, period),  [filtered, period]);
  const txChartData = useMemo(() => buildTransactionChart(filtered, period), [filtered, period]);
  const topSelling  = useMemo(() => buildTopSelling(filtered), [filtered]);
  const unpopular   = useMemo(() => buildUnpopular(filtered),  [filtered]);

  const totalSales = useMemo(() => filtered.reduce((s, t) => s + t.total, 0), [filtered]);
  const txCount    = filtered.length;
  const avgOrder   = txCount > 0 ? Math.round(totalSales / txCount) : 0;

  const filteredTop   = useMemo(() => topSelling.filter(i =>
    i.name.toLowerCase().includes(topSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(topSearch.toLowerCase())
  ), [topSelling, topSearch]);

  const filteredUnpop = useMemo(() => unpopular.filter(i =>
    i.name.toLowerCase().includes(unpopSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(unpopSearch.toLowerCase())
  ), [unpopular, unpopSearch]);

  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const exportSales  = () => exportCSV(
    ["Product Name", "Category", "Units Sold", "Revenue (₱)"],
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

        <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
          <div className="text-center mb-10">
            <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
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
          <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
            <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? "✕" : "☰"}
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-800">Sales Reports</h1>
              <p className="text-xs text-gray-400">Administrator Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
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
              {navItems.map((item) => (
                <div key={item.label} onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${pathname === item.path ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 p-3 md:p-4 bg-green-50 flex flex-col gap-4">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
                <button onClick={fetchData} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">Retry</button>
              </div>
            )}

            {/* ✅ Period picker with specific date label */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-400">📅 Report Period:</span>
              {(["Daily", "Weekly", "Monthly"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {p}
                </button>
              ))}
              {/* ✅ Shows exact date / range / month */}
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg">
                📅 {getPeriodLabel(period)}
              </span>
              <button onClick={fetchData} className="ml-auto flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">🔄 Refresh</button>
            </div>

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
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-500 text-lg">🛒</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs text-gray-400">Avg Order Value</p><p className="text-2xl font-bold text-gray-800">₱{avgOrder.toLocaleString()}</p><p className="text-xs text-gray-400">Per transaction</p></div>
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-500 text-lg font-bold">₱</div>
                  </div>
                </>
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
                    <Tooltip formatter={(v) => `₱${Number(v).toLocaleString()}`} />
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
                    <Bar dataKey="transactions" fill="#22c55e" radius={[3, 3, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Selling */}
            <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold text-gray-800">Top Selling Items</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-gray-400 text-xs">🔍</span>
                    <input type="text" placeholder="Search..." value={topSearch} onChange={(e) => setTopSearch(e.target.value)} className="outline-none text-xs text-gray-700 w-28 bg-transparent" />
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
                  <span className="text-gray-400 text-xs">🔍</span>
                  <input type="text" placeholder="Search..." value={unpopSearch} onChange={(e) => setUnpopSearch(e.target.value)} className="outline-none text-xs text-gray-700 w-28 bg-transparent" />
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

          </div>
        </main>
      </div>
    </>
  );
}