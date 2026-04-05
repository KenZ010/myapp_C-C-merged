"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦", active: true },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
  { label: "Purchase Order", icon: "📋" },
  { label: "Promo Management", icon: "🎁" },
];

type OrderLine = {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Transaction = {
  id: string;
  customer: string;
  customerId: string | null;
  cashier: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  orderLines: OrderLine[];
};

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment = o.payment as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];

  return {
    id: String(o.id ?? ""),
    customer: customer ? String(customer.name ?? "Guest") : "Walk-in",
    customerId: customer ? String(customer.id ?? "") : null,
    cashier: employee ? String(employee.name ?? "—") : "—",
    total: Number(o.totalAmount ?? 0),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    createdAt: String(o.createdAt ?? o.saleDate ?? ""),
    orderLines: rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        productName: product ? String(product.productName ?? "Item") : "Item",
        quantity: Number(l.quantity ?? 0),
        price: Number(l.price ?? 0),
        subtotal: Number(l.subtotal ?? 0),
      };
    }),
  };
}

function getPeriodLabel(dateStr: string): "Today" | "Week" | "Month" | "Older" {
  if (!dateStr) return "Older";
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return "Week";
  if (diffDays <= 30) return "Month";
  return "Older";
}

export default function TransactionLogsPage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activePeriod, setActivePeriod] = useState("Daily");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    if (label === "Product Management") router.push("/product");
    if (label === "Account Management") router.push("/account");
    if (label === "Purchase Order") router.push("/purchase-order");
    if (label === "Promo Management") router.push("/promo");
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await api.getCompletedOrders();
        const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
        setTransactions(raw.map(normalizeTransaction));
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const periodKey = activePeriod === "Daily" ? "Today" : activePeriod === "Weekly" ? "Week" : "Month";
  const filtered = transactions.filter((t) => getPeriodLabel(t.createdAt) === periodKey);

  const sectionLabel =
    activePeriod === "Daily" ? "Today" : activePeriod === "Weekly" ? "This Week" : "This Month";

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">
            JULIETA SOFTDRINKS<br />STORE
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
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
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Transaction Logs</h1>
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
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MOBILE MENU */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map((item) => (
              <div key={item.label} onClick={() => navigate(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${item.active ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="bg-white rounded-2xl p-4 shadow-sm">

            {/* Period tabs */}
            <div className="flex gap-2 mb-6">
              {["Daily", "Weekly", "Monthly"].map((tab) => (
                <button key={tab} onClick={() => setActivePeriod(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePeriod === tab ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Loading / Error */}
            {loading && (
              <p className="text-sm text-gray-400 text-center py-10">Loading transactions…</p>
            )}
            {error && (
              <p className="text-sm text-red-500 text-center py-10">⚠️ {error}</p>
            )}

            {/* Transactions */}
            {!loading && !error && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-700">{sectionLabel}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No completed transactions for this period</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filtered.map((t) => (
                      <div key={t.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-indigo-700 text-base">
                              {t.customerId ? `Customer: ${t.customer}` : "Walk-in Customer"}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">Cashier: {t.cashier}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(t.createdAt).toLocaleString("en-PH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
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
                          <button
                            onClick={() => setSelectedTx(t)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                          >
                            See Order
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

      {/* ORDER DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Order Details</h2>
            <p className="text-xs text-gray-400 mb-4">{selectedTx.id}</p>

            <div className="flex flex-col gap-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer</span>
                <span className="font-medium text-gray-800">{selectedTx.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cashier</span>
                <span className="font-medium text-gray-800">{selectedTx.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment</span>
                <span className="font-medium text-gray-800">{selectedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="font-medium text-gray-800">
                  {new Date(selectedTx.createdAt).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-gray-100 pt-3 mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">ITEMS ORDERED</p>
              <div className="flex flex-col gap-2">
                {selectedTx.orderLines.map((line, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {line.productName} <span className="text-gray-400">x{line.quantity}</span>
                    </span>
                    <span className="font-medium text-gray-800">₱{line.subtotal.toLocaleString()}.00</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-indigo-700 text-base">₱{selectedTx.total.toLocaleString()}.00</span>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full mt-5 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
