"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const navItems = [
  { label: "Dashboard",             icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance",  icon: "📊" },
  { label: "Sales Reports",         icon: "🌐" },
  { label: "Transaction Logs",      icon: "▦", active: true },
  { label: "Product Management",    icon: "🗒️" },
  { label: "Account Management",    icon: "👤" },
  { label: "Purchase Order",        icon: "📋" },
  { label: "Promo Management",      icon: "🎁" },
];

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤", ENERGY_DRINK: "⚡", BEER: "🍺",
  JUICE: "🍹", WATER: "💧", OTHER: "🛒",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";

function getPeriodLabel(period: string): string {
  const now = new Date();
  if (period === "Daily") return now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  if (period === "Weekly") {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return now.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

type OrderLine = {
  productName: string; category: string;
  quantity: number; price: number; subtotal: number;
};

type Transaction = {
  id: string; customer: string; customerId: string | null;
  cashier: string; total: number; paymentMethod: string;
  createdAt: string; orderLines: OrderLine[];
};

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  return {
    id:            String(o.id ?? ""),
    customer:      customer ? String(customer.name ?? "Guest") : "Walk-in",
    customerId:    customer ? String(customer.id ?? "") : null,
    cashier:       employee ? String(employee.name ?? "—") : "—",
    total:         Number(o.totalAmount ?? 0),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    createdAt:     String(o.createdAt ?? o.saleDate ?? ""),
    orderLines:    rawLines.map(l => {
      const product = l.product as Record<string, unknown> | null;
      return {
        productName: product ? String(product.productName ?? "Item") : "Item",
        category:    product ? String(product.category ?? "")     : "",
        quantity:    Number(l.quantity ?? 0),
        price:       Number(l.price    ?? 0),
        subtotal:    Number(l.subtotal ?? 0),
      };
    }),
  };
}

function fmtDate(str: string) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function getPeriodKey(dateStr: string): "Today" | "Week" | "Month" | "Older" {
  if (!dateStr) return "Older";
  const date = new Date(dateStr);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const days = (now.getTime() - date.getTime()) / 86400000;
  if (days <= 7)  return "Week";
  if (days <= 30) return "Month";
  return "Older";
}

export default function TransactionLogsPage() {
  const router = useRouter();
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activePeriod,   setActivePeriod]   = useState("Daily");
  const [search,         setSearch]         = useState("");
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedTx,     setSelectedTx]     = useState<Transaction | null>(null);

  const navigate = (label: string) => {
    const routes: Record<string, string> = {
      "Dashboard": "/dashboard", "Inventory Maintenance": "/inventory",
      "Supplier Maintenance": "/supplier", "Sales Reports": "/sales",
      "Transaction Logs": "/transaction", "Product Management": "/product",
      "Account Management": "/account", "Purchase Order": "/purchase-order",
      "Promo Management": "/promo",
    };
    if (routes[label]) router.push(routes[label]);
    setShowMobileMenu(false);
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await api.getCompletedOrders();
      if (data?.message) { setError(data.message); return; }
      setTransactions((Array.isArray(data) ? data : []).map(normalizeTransaction));
    } catch (err) { setError((err as Error).message || "Failed to load transactions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const periodKey = activePeriod === "Daily" ? "Today" : activePeriod === "Weekly" ? "Week" : "Month";

  const filtered = transactions.filter(t => {
    const matchPeriod  = getPeriodKey(t.createdAt) === periodKey;
    const q            = search.toLowerCase();
    const matchSearch  = !q || t.id.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.cashier.toLowerCase().includes(q);
    return matchPeriod && matchSearch;
  });

  const sectionLabel = activePeriod === "Daily" ? "Today" : activePeriod === "Weekly" ? "This Week" : "This Month";
  const totalRevenue = filtered.reduce((s, t) => s + t.total, 0);
  const cashCount    = filtered.filter(t => t.paymentMethod === "CASH").length;
  const onlineCount  = filtered.filter(t => t.paymentMethod !== "CASH").length;

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <div key={item.label} onClick={() => navigate(item.label)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${item.active ? "text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
              <div className="relative flex items-center gap-2 w-full">
                <span>{item.icon}</span><span>{item.label}</span>
                {item.active && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Transaction Logs</h1>
          <div className="flex items-center gap-2">
            <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map(item => (
              <div key={item.label} onClick={() => navigate(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${item.active ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="bg-white rounded-2xl p-4 shadow-sm">

            {/* ✅ Period tabs + date label + Search — NO refresh button */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                {["Daily", "Weekly", "Monthly"].map(tab => (
                  <button key={tab} onClick={() => setActivePeriod(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePeriod === tab ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg">
                  📅 {getPeriodLabel(activePeriod)}
                </span>
              </div>

              {/* ✅ Search with solid text — no refresh button */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                <input
                  type="text"
                  placeholder="Search order, customer, cashier..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none w-64 text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white"
                />
              </div>
            </div>

            {/* Summary Stats */}
            {!loading && !error && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, color: "text-indigo-700", bg: "bg-indigo-50" },
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
            {error && (
              <div className="flex flex-col items-center gap-3 py-10">
                <p className="text-sm text-red-500">⚠️ {error}</p>
                <button onClick={fetchTransactions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Retry</button>
              </div>
            )}

            {!loading && !error && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-700">{sectionLabel}</span>
                  <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {getPeriodLabel(activePeriod)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {search ? "No results match your search." : "No completed transactions for this period."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filtered.map(t => (
                      <div key={t.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-indigo-700 text-base">
                              {t.customerId ? t.customer : "Walk-in Customer"}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {t.customerId ? "🌐 Online Order" : `👤 Cashier: ${t.cashier}`}
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
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* RECEIPT MODAL */}
      {selectedTx && (
        <>
          <div onClick={() => setSelectedTx(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 50, width: "400px", background: "#fff", borderRadius: "20px",
            overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ background: "linear-gradient(135deg,#1a3c2e,#2d7a3a)", padding: "24px 28px", textAlign: "center", position: "relative" }}>
              <button onClick={() => setSelectedTx(null)}
                style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#fff", fontSize: "14px" }}>✕</button>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "24px" }}>🧾</div>
              <p style={{ color: "#fff", fontSize: "18px", fontWeight: 800, margin: "0 0 2px" }}>Julieta Soft Drinks</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", margin: 0 }}>Official Receipt</p>
            </div>
            <div style={{ height: "12px", background: "linear-gradient(135deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(225deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(315deg,#2d7a3a 25%,transparent 25%),linear-gradient(45deg,#2d7a3a 25%,transparent 25%)", backgroundSize: "20px 12px", backgroundRepeat: "repeat-x" }} />
            <div style={{ padding: "20px 28px" }}>
              {[
                ["Order ID",  selectedTx.id],
                ["Customer", selectedTx.customer],
                ["Cashier",  selectedTx.cashier],
                ["Date",     fmtDate(selectedTx.createdAt)],
                ["Payment",  selectedTx.paymentMethod],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>{value}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Ordered</p>
              {selectedTx.orderLines.map((line, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "#333", margin: 0 }}>{getEmoji(line.category)} {line.productName}</p>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>x{line.quantity} × ₱{line.price.toLocaleString()}.00</p>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>₱{line.subtotal.toLocaleString()}.00</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />
              <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>TOTAL</span>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c2e" }}>₱{selectedTx.total.toLocaleString()}.00</span>
              </div>
              <div style={{ textAlign: "center", paddingTop: "14px", borderTop: "1px dashed #e0e0e0" }}>
                <p style={{ fontSize: "12px", color: "#2d7a3a", fontWeight: 600, marginBottom: "4px" }}>Thank you for your purchase! 🎉</p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>Julieta Soft Drink Store • TECHNOLOGIA @2026</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}