"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

// ===== NAV =====
const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐", active: true },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

// ===== REVENUE TREND DATA =====
const revenueData = [
  { date: "2025-10-10", revenue: 5200 }, { date: "2025-10-24", revenue: 4800 },
  { date: "2025-11-07", revenue: 5100 }, { date: "2025-11-21", revenue: 4600 },
  { date: "2025-12-05", revenue: 5300 }, { date: "2025-12-19", revenue: 4900 },
  { date: "2026-01-02", revenue: 5000 }, { date: "2026-01-16", revenue: 5400 },
  { date: "2026-01-30", revenue: 4700 }, { date: "2026-02-13", revenue: 5600 },
  { date: "2026-02-27", revenue: 5100 }, { date: "2026-03-13", revenue: 4300 },
];

// ===== TRANSACTION VOLUME DATA =====
const transactionData = [
  { date: "Oct 17", transactions: 40 }, { date: "Oct 24", transactions: 85 },
  { date: "Oct 31", transactions: 95 }, { date: "Nov 07", transactions: 110 },
  { date: "Nov 14", transactions: 75 }, { date: "Nov 21", transactions: 90 },
  { date: "Nov 28", transactions: 80 }, { date: "Dec 05", transactions: 60 },
  { date: "Dec 12", transactions: 70 }, { date: "Dec 19", transactions: 55 },
  { date: "Dec 26", transactions: 45 }, { date: "Jan 02", transactions: 85 },
  { date: "Jan 09", transactions: 95 }, { date: "Jan 16", transactions: 115 },
  { date: "Jan 23", transactions: 100 }, { date: "Jan 30", transactions: 90 },
  { date: "Feb 06", transactions: 80 }, { date: "Feb 13", transactions: 70 },
  { date: "Feb 20", transactions: 60 }, { date: "Feb 27", transactions: 50 },
  { date: "Mar 06", transactions: 40 }, { date: "Mar 11", transactions: 35 },
];

// ===== TOP SELLING ITEMS =====
const topSelling = [
  { name: "Wireless Headphones", category: "Electronics", units: 342, revenue: "$34,200", growth: 15.2 },
  { name: "Smart Watch", category: "Electronics", units: 298, revenue: "$59,600", growth: 22.5 },
  { name: "Yoga Mat", category: "Fitness", units: 275, revenue: "$8,250", growth: 8.3 },
  { name: "Coffee Maker", category: "Home & Kitchen", units: 234, revenue: "$23,400", growth: 12.1 },
  { name: "Running Shoes", category: "Sports", units: 198, revenue: "$19,800", growth: 18.7 },
  { name: "Bluetooth Speaker", category: "Electronics", units: 187, revenue: "$14,025", growth: 9.4 },
  { name: "Water Bottle", category: "Fitness", units: 176, revenue: "$3,520", growth: -3.2 },
  { name: "Laptop Stand", category: "Office", units: 165, revenue: "$8,250", growth: 14.8 },
];

// ===== UNPOPULAR ITEMS =====
const unpopular = [
  { name: "Electric Pencil Sharpener", category: "Office", units: 12, revenue: "$98", growth: -8.1 },
  { name: "CD Player", category: "Electronics", units: 15, revenue: "$1,500", growth: -15 },
  { name: "Fax Machine", category: "Office", units: 18, revenue: "$700", growth: -23 },
  { name: "VHS Tape Rewinder", category: "Electronics", units: 8, revenue: "$320", growth: -30 },
  { name: "Rotary Phone", category: "Electronics", units: 10, revenue: "$901", growth: -12 },
  { name: "Typewriter", category: "Office", units: 14, revenue: "$1,400", growth: -9 },
  { name: "Film Camera", category: "Electronics", units: 20, revenue: "$001", growth: -5.4 },
];

// ===== INVENTORY DATA =====
const inventoryItems = [
  { name: "Wireless Headphones", category: "Electronics", stock: 141, reorder: 100, units: 342, status: "Healthy" },
  { name: "Smart Watch", category: "Electronics", stock: 156, reorder: 100, units: 298, status: "Healthy" },
  { name: "Yoga Mat", category: "Fitness", stock: 214, reorder: 100, units: 275, status: "Healthy" },
  { name: "Coffee Maker", category: "Home & Kitchen", stock: 138, reorder: 100, units: 234, status: "Healthy" },
  { name: "Running Shoes", category: "Sports", stock: 200, reorder: 100, units: 198, status: "Healthy" },
  { name: "Bluetooth Speaker", category: "Electronics", stock: 75, reorder: 100, units: 187, status: "Low" },
  { name: "Water Bottle", category: "Fitness", stock: 75, reorder: 100, units: 176, status: "Low" },
  { name: "Laptop Stand", category: "Office", stock: 62, reorder: 100, units: 165, status: "Low" },
  { name: "Electric Pencil Sharpener", category: "Office", stock: 241, reorder: 100, units: 12, status: "Healthy" },
  { name: "CD Player", category: "Electronics", stock: 182, reorder: 100, units: 15, status: "Healthy" },
  { name: "Fax Machine", category: "Office", stock: 68, reorder: 100, units: 18, status: "Low" },
  { name: "VHS Tape Rewinder", category: "Electronics", stock: 267, reorder: 100, units: 8, status: "Healthy" },
  { name: "Rotary Phone", category: "Electronics", stock: 87, reorder: 100, units: 10, status: "Low" },
  { name: "Typewriter", category: "Office", stock: 202, reorder: 100, units: 14, status: "Healthy" },
  { name: "Film Camera", category: "Electronics", stock: 244, reorder: 100, units: 20, status: "Healthy" },
];

// ===== BAR CHART DATA (Top 5) =====
const barData = topSelling.slice(0, 5).map((item) => ({ name: item.name.split(" ")[0], units: item.units }));

// ===== PIE CHART DATA =====
const pieData = [
  { name: "Electronics", value: 47, color: "#3b82f6" },
  { name: "Fitness", value: 13, color: "#22c55e" },
  { name: "Home & Kitchen", value: 7, color: "#f97316" },
  { name: "Sports", value: 7, color: "#f59e0b" },
  { name: "Office", value: 27, color: "#6b7280" },
];

// ===== TOP SELLING INVENTORY DETAILS =====
const topSellingDetails = [
  { rank: 1, name: "Wireless Headphones", category: "Electronics", units: 342, stock: 141, revenue: "$34,200" },
  { rank: 2, name: "Smart Watch", category: "Electronics", units: 298, stock: 156, revenue: "$59,600" },
  { rank: 3, name: "Yoga Mat", category: "Fitness", units: 275, stock: 214, revenue: "$8,250" },
  { rank: 4, name: "Coffee Maker", category: "Home & Kitchen", units: 234, stock: 138, revenue: "$23,400" },
  { rank: 5, name: "Running Shoes", category: "Sports", units: 198, stock: 200, revenue: "$19,800" },
  { rank: 6, name: "Bluetooth Speaker", category: "Electronics", units: 187, stock: 75, revenue: "$14,025" },
  { rank: 7, name: "Water Bottle", category: "Fitness", units: 176, stock: 75, revenue: "$3,520" },
  { rank: 8, name: "Laptop Stand", category: "Office", units: 165, stock: 62, revenue: "$8,250" },
];

export default function SalesReportsPage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "inventory">("sales");
  const [period, setPeriod] = useState("Daily");

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* SIDEBAR */}
      <aside className="w-52 bg-white flex flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">
            JULIETA SOFTDRINKS<br />STORE
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => {
                if (item.label === "Dashboard") router.push("/dashboard");
                if (item.label === "Inventory Maintenance") router.push("/inventory");
                if (item.label === "Supplier Maintenance") router.push("/supplier");
                if (item.label === "Sales Reports") router.push("/sales");
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                item.active ? "text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className="relative flex items-center gap-2 w-full">
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.active && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sales & Inventory Reports</h1>
            <p className="text-xs text-gray-400">Administrator Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-xl">🔔</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-10 h-10 rounded-full object-cover" />
                <div className="text-left">
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

        {/* CONTENT */}
        <div className="flex-1 p-4 bg-green-50">

          {/* TABS */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "sales" ? "bg-blue-500 text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              📊 Sales Reports
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "inventory" ? "bg-blue-500 text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              📦 Inventory Reports
            </button>
          </div>

          {/* ===== SALES TAB ===== */}
          {activeTab === "sales" && (
            <div className="flex flex-col gap-4">

              {/* Report Period */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">📅 Report Period</p>
                <div className="flex gap-2">
                  {["Daily", "Weekly", "Monthly"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        period === p ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-800">$201,353</p>
                    <p className="text-xs text-green-500">↑ 4.2%</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">$</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-800">2,050</p>
                    <p className="text-xs text-red-500">↓ 20.3%</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-500 text-lg">🛒</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-800">$98</p>
                    <p className="text-xs text-gray-400">Per transaction</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-500 text-lg font-bold">$</div>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-1 justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                  <span className="text-xs text-gray-500">Revenue ($)</span>
                </div>
              </div>

              {/* Transaction Volume */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Transaction Volume</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={transactionData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="transactions" fill="#22c55e" radius={[3, 3, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-1 justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                  <span className="text-xs text-gray-500">Transactions</span>
                </div>
              </div>

              {/* Top Selling Items */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Top Selling Items</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-left">Product Name</th>
                      <th className="py-2 text-left">Category</th>
                      <th className="py-2 text-right">Units Sold</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSelling.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                        <td className="py-2 text-right text-gray-700">{item.units}</td>
                        <td className="py-2 text-right text-gray-700">{item.revenue}</td>
                        <td className={`py-2 text-right text-xs font-medium ${item.growth > 0 ? "text-green-500" : "text-red-500"}`}>
                          {item.growth > 0 ? "↑" : "↓"} {Math.abs(item.growth)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Unpopular Items */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-1">Unpopular Items <span className="text-red-400 text-sm">(Needs Attention)</span></h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-left">Product Name</th>
                      <th className="py-2 text-left">Category</th>
                      <th className="py-2 text-right">Units Sold</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpopular.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                        <td className="py-2 text-right text-gray-700">{item.units}</td>
                        <td className="py-2 text-right text-gray-700">{item.revenue}</td>
                        <td className="py-2 text-right text-xs font-medium text-red-500">
                          ↓ {Math.abs(item.growth)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== INVENTORY TAB ===== */}
          {activeTab === "inventory" && (
            <div className="flex flex-col gap-4">

              {/* Stock Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Critical Stock</p>
                    <p className="text-3xl font-bold text-gray-800">0</p>
                    <p className="text-xs text-gray-400">Items need reorder</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-500 text-lg">⚠️</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Low Stock</p>
                    <p className="text-3xl font-bold text-gray-800">5</p>
                    <p className="text-xs text-gray-400">Monitor closely</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 text-lg">📦</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Healthy Stock</p>
                    <p className="text-3xl font-bold text-gray-800">10</p>
                    <p className="text-xs text-gray-400">Adequate levels</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-500 text-lg">✅</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Top 5 Selling Items</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-2 mt-1 justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    <span className="text-xs text-gray-500">Units Sold</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Inventory by Category</h2>
                  <div className="flex justify-center">
                    <PieChart width={280} height={200}>
                      <Pie data={pieData} cx={135} cy={95} outerRadius={80} dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-gray-500">{entry.name} {entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Complete Inventory Report */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Complete Inventory Report</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-left">Product Name</th>
                      <th className="py-2 text-left">Category</th>
                      <th className="py-2 text-right">Current Stock</th>
                      <th className="py-2 text-right">Reorder Level</th>
                      <th className="py-2 text-right">Units Sold</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                        <td className={`py-2 text-right text-xs font-medium ${item.stock >= item.reorder ? "text-green-500" : "text-orange-400"}`}>{item.stock}</td>
                        <td className="py-2 text-right text-gray-400">{item.reorder}</td>
                        <td className="py-2 text-right text-gray-700">{item.units}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === "Healthy" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                            {item.status === "Healthy" ? "✅" : "🔴"} {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Selling Inventory Details */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">📈 Top Selling Items - Inventory Details</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-left">Rank</th>
                      <th className="py-2 text-left">Product Name</th>
                      <th className="py-2 text-left">Category</th>
                      <th className="py-2 text-right">Units Sold</th>
                      <th className="py-2 text-right">Current Stock</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellingDetails.map((item) => (
                      <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-400 text-xs">#{item.rank}</td>
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                        <td className="py-2 text-right text-gray-700">{item.units}</td>
                        <td className={`py-2 text-right text-xs font-medium ${item.stock >= 100 ? "text-green-500" : "text-orange-400"}`}>{item.stock}</td>
                        <td className="py-2 text-right text-green-600 font-medium">{item.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}