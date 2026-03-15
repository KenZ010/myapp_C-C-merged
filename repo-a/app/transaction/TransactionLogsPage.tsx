"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦", active: true },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

type Transaction = {
  id: number;
  customer: string;
  customerType: string;
  cashier: string;
  total: number;
  status: "Pending" | "Approved";
  period: "Today" | "Week" | "Month";
  type: "Customer" | "Employee";
};

const initialTransactions: Transaction[] = [
  { id: 1, customer: "Ken Masilungan", customerType: "New Customer", cashier: "James Renoblas", total: 960, status: "Pending", period: "Today", type: "Customer" },
  { id: 2, customer: "Maria Santos", customerType: "Regular Customer", cashier: "Ray Teodoro", total: 520, status: "Pending", period: "Today", type: "Customer" },
  { id: 3, customer: "Juan Dela Cruz", customerType: "New Customer", cashier: "James Renoblas", total: 1200, status: "Approved", period: "Today", type: "Customer" },
  { id: 4, customer: "Anna Reyes", customerType: "Regular Customer", cashier: "Ray Teodoro", total: 780, status: "Pending", period: "Week", type: "Customer" },
  { id: 5, customer: "Pedro Bautista", customerType: "New Customer", cashier: "James Renoblas", total: 430, status: "Approved", period: "Week", type: "Customer" },
  { id: 6, customer: "Luis Garcia", customerType: "Employee", cashier: "Ray Teodoro", total: 300, status: "Pending", period: "Week", type: "Employee" },
  { id: 7, customer: "Rosa Mendoza", customerType: "Regular Customer", cashier: "James Renoblas", total: 650, status: "Approved", period: "Month", type: "Customer" },
  { id: 8, customer: "Carlo Villanueva", customerType: "Employee", cashier: "Ray Teodoro", total: 200, status: "Pending", period: "Month", type: "Employee" },
];

export default function TransactionLogsPage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activePeriod, setActivePeriod] = useState("Daily");
  const [activeFilter, setActiveFilter] = useState<"All" | "Customer" | "Employee">("All");
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    setShowMobileMenu(false);
  };

  const handleApprove = (id: number) => {
    setTransactions((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: "Approved" } : t)
    );
  };

  const handleSeeOrder = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowOrderModal(true);
  };

  const getPeriodKey = () => {
    if (activePeriod === "Daily") return "Today";
    if (activePeriod === "Weekly") return "Week";
    return "Month";
  };

  const filtered = transactions.filter((t) => {
    const periodMatch = t.period === getPeriodKey();
    const typeMatch = activeFilter === "All" || t.type === activeFilter;
    return periodMatch && typeMatch;
  });

  const sections = [
    { label: activePeriod === "Daily" ? "Today" : activePeriod === "Weekly" ? "This Week" : "This Month", items: filtered },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* SIDEBAR - desktop */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
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
                  <button onClick={() => router.push("/")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
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

            {/* Filter buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["All", "Customer", "Employee"].map((f) => (
                <button key={f} onClick={() => setActiveFilter(f as "All" | "Customer" | "Employee")}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${activeFilter === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                  {f === "Customer" ? "👤" : f === "Employee" ? "👔" : "🔍"} {f}
                </button>
              ))}
            </div>

            {/* Period tabs */}
            <div className="flex gap-2 mb-6">
              {["Daily", "Weekly", "Monthly"].map((tab) => (
                <button key={tab} onClick={() => setActivePeriod(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePeriod === tab ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Transaction sections */}
            {sections.map((section) => (
              <div key={section.label} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-700">{section.label}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {section.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No transactions to show</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {section.items.map((t) => (
                      <div key={t.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-indigo-700 text-base">Customer: {t.customer}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Customer Type: {t.customerType}</p>
                            <p className="text-sm text-gray-500">Cashier: {t.cashier}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-indigo-700 text-base">Total: ₱{t.total.toLocaleString()}</p>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === "Approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 justify-end">
                          <button onClick={() => handleSeeOrder(t)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                            See Order
                          </button>
                          {t.status === "Pending" && (
                            <button onClick={() => handleApprove(t.id)}
                              className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">
                              Approve
                            </button>
                          )}
                          {t.status === "Approved" && (
                            <button className="px-4 py-2 bg-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed">
                              Approved ✓
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* SEE ORDER MODAL */}
      {showOrderModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Order Details</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Customer</span><span className="font-medium text-gray-800">{selectedTransaction.customer}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="font-medium text-gray-800">{selectedTransaction.customerType}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Cashier</span><span className="font-medium text-gray-800">{selectedTransaction.cashier}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Period</span><span className="font-medium text-gray-800">{selectedTransaction.period}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span>
                <span className={`font-medium ${selectedTransaction.status === "Approved" ? "text-green-500" : "text-yellow-500"}`}>{selectedTransaction.status}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
                <span className="text-gray-400 font-semibold">Total</span>
                <span className="font-bold text-indigo-700 text-base">₱{selectedTransaction.total.toLocaleString()}</span>
              </div>
            </div>
            <button onClick={() => setShowOrderModal(false)}
              className="w-full mt-5 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}