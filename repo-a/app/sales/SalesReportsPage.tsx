"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

const navItems = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory" },
  { label: "Supplier Maintenance", icon: "📊", path: "/supplier" },
  { label: "Sales Reports", icon: "🌐", path: "/sales" },
  { label: "Transaction Logs", icon: "▦", path: "/transaction" },
  { label: "Product Management", icon: "🗒️", path: "/product" },
  { label: "Account Management", icon: "👤", path: "/account" },
  { label: "Purchase Order", icon: "📋", path: "/purchase-order" },
];

const revenueData = [
  { date: "Oct 10", revenue: 12500 }, { date: "Oct 24", revenue: 11800 },
  { date: "Nov 07", revenue: 13200 }, { date: "Nov 21", revenue: 12000 },
  { date: "Dec 05", revenue: 14500 }, { date: "Dec 19", revenue: 13800 },
  { date: "Jan 02", revenue: 15000 }, { date: "Jan 16", revenue: 14200 },
  { date: "Jan 30", revenue: 13500 }, { date: "Feb 13", revenue: 16000 },
  { date: "Feb 27", revenue: 15200 }, { date: "Mar 13", revenue: 14800 },
];

const transactionData = [
  { date: "Oct 17", transactions: 80 }, { date: "Oct 24", transactions: 120 },
  { date: "Oct 31", transactions: 135 }, { date: "Nov 07", transactions: 150 },
  { date: "Nov 14", transactions: 110 }, { date: "Nov 21", transactions: 130 },
  { date: "Nov 28", transactions: 115 }, { date: "Dec 05", transactions: 95 },
  { date: "Dec 12", transactions: 105 }, { date: "Dec 19", transactions: 90 },
  { date: "Jan 02", transactions: 125 }, { date: "Jan 16", transactions: 160 },
  { date: "Jan 30", transactions: 140 }, { date: "Feb 13", transactions: 115 },
  { date: "Mar 06", transactions: 85 }, { date: "Mar 11", transactions: 75 },
];

const topSelling = [
  { name: "Coca Cola", category: "Soft Drinks", units: 520, revenue: "₱41,600", growth: 18.2 },
  { name: "Pepsi", category: "Soft Drinks", units: 430, revenue: "₱34,400", growth: 12.5 },
  { name: "Cobra Energy", category: "Energy Drink", units: 380, revenue: "₱45,600", growth: 22.1 },
  { name: "Royal", category: "Soft Drinks", units: 310, revenue: "₱24,800", growth: 9.4 },
  { name: "Sprite", category: "Soft Drinks", units: 295, revenue: "₱23,600", growth: 7.8 },
  { name: "Red Bull", category: "Energy Drink", units: 260, revenue: "₱52,000", growth: 15.3 },
  { name: "Gatorade", category: "Sports Drink", units: 240, revenue: "₱28,800", growth: 11.6 },
  { name: "RC Cola", category: "Soft Drinks", units: 180, revenue: "₱14,400", growth: -2.4 },
  { name: "Mountain Dew", category: "Soft Drinks", units: 165, revenue: "₱13,200", growth: 4.1 },
  { name: "Sting", category: "Energy Drink", units: 150, revenue: "₱18,000", growth: 6.7 },
];

const unpopular = [
  { name: "Sarsi", category: "Soft Drinks", units: 25, revenue: "₱1,750", growth: -18.1 },
  { name: "Sparkle Water", category: "Water", units: 30, revenue: "₱1,500", growth: -12.5 },
  { name: "Zest-O Orange", category: "Juice", units: 35, revenue: "₱2,100", growth: -9.3 },
  { name: "C2 Green Tea", category: "Tea", units: 40, revenue: "₱3,200", growth: -7.8 },
  { name: "Pop Cola", category: "Soft Drinks", units: 28, revenue: "₱1,960", growth: -22.0 },
];

const inventoryItems = [
  { name: "Coca Cola", category: "Soft Drinks", stock: 180, reorder: 100, units: 520, status: "Healthy" },
  { name: "Pepsi", category: "Soft Drinks", stock: 150, reorder: 100, units: 430, status: "Healthy" },
  { name: "Cobra Energy", category: "Energy Drink", stock: 120, reorder: 100, units: 380, status: "Healthy" },
  { name: "Royal", category: "Soft Drinks", stock: 140, reorder: 100, units: 310, status: "Healthy" },
  { name: "Sprite", category: "Soft Drinks", stock: 130, reorder: 100, units: 295, status: "Healthy" },
  { name: "Red Bull", category: "Energy Drink", stock: 75, reorder: 100, units: 260, status: "Low" },
  { name: "Gatorade", category: "Sports Drink", stock: 80, reorder: 100, units: 240, status: "Low" },
  { name: "RC Cola", category: "Soft Drinks", stock: 60, reorder: 100, units: 180, status: "Low" },
  { name: "Mountain Dew", category: "Soft Drinks", stock: 110, reorder: 100, units: 165, status: "Healthy" },
  { name: "Sting", category: "Energy Drink", stock: 55, reorder: 100, units: 150, status: "Low" },
];

const barData = topSelling.slice(0, 5).map((item) => ({ name: item.name.split(" ")[0], units: item.units }));

const pieData = [
  { name: "Soft Drinks", value: 47, color: "#3b82f6" },
  { name: "Energy Drink", value: 27, color: "#f59e0b" },
  { name: "Sports Drink", value: 13, color: "#22c55e" },
  { name: "Water", value: 7, color: "#60a5fa" },
  { name: "Juice/Tea", value: 6, color: "#6b7280" },
];

const topSellingDetails = topSelling.map((item, i) => ({
  rank: i + 1,
  name: item.name,
  category: item.category,
  units: item.units,
  stock: inventoryItems.find((inv) => inv.name === item.name)?.stock ?? 0,
  revenue: item.revenue,
}));

export default function SalesReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "inventory">("sales");
  const [period, setPeriod] = useState("Daily");
  const [topSearch, setTopSearch] = useState("");
  const [unpopularSearch, setUnpopularSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  const filteredTopSelling = useMemo(() =>
    topSelling.filter((i) => i.name.toLowerCase().includes(topSearch.toLowerCase()) || i.category.toLowerCase().includes(topSearch.toLowerCase())),
    [topSearch]);

  const filteredUnpopular = useMemo(() =>
    unpopular.filter((i) => i.name.toLowerCase().includes(unpopularSearch.toLowerCase()) || i.category.toLowerCase().includes(unpopularSearch.toLowerCase())),
    [unpopularSearch]);

  const filteredInventory = useMemo(() =>
    inventoryItems.filter((i) => i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.category.toLowerCase().includes(inventorySearch.toLowerCase())),
    [inventorySearch]);

  const filteredTopDetails = useMemo(() =>
    topSellingDetails.filter((i) => i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.category.toLowerCase().includes(inventorySearch.toLowerCase())),
    [inventorySearch]);

  const navigate = (path: string) => {
    router.push(path);
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  const exportCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSalesReport = () => {
    exportCSV(
      ["Product Name", "Category", "Units Sold", "Revenue", "Growth %"],
      topSelling.map((i) => [i.name, i.category, i.units, i.revenue, `${i.growth}%`]),
      "sales_report.csv"
    );
  };

  const exportInventoryReport = () => {
    exportCSV(
      ["Product Name", "Category", "Current Stock", "Reorder Level", "Units Sold", "Status"],
      inventoryItems.map((i) => [i.name, i.category, i.stock, i.reorder, i.units, i.status]),
      "inventory_report.csv"
    );
  };

  return (
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
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">Sales & Inventory Reports</h1>
            <p className="text-xs text-gray-400">Administrator Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="hidden md:block text-left"><p className="text-sm font-semibold text-gray-800">Ray Teodoro</p><p className="text-xs text-green-500">Admin</p></div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <div key={item.label} onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${isActive ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab("sales")} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${activeTab === "sales" ? "bg-blue-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>📊 Sales Reports</button>
            <button onClick={() => setActiveTab("inventory")} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${activeTab === "inventory" ? "bg-blue-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>📦 Inventory Reports</button>
          </div>

          {activeTab === "sales" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">📅 Report Period</p>
                <div className="flex gap-2">
                  {["Daily", "Weekly", "Monthly"].map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${period === p ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Total Revenue</p><p className="text-2xl font-bold text-gray-800">₱251,350</p><p className="text-xs text-green-500">↑ 14.2%</p></div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">₱</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Total Transactions</p><p className="text-2xl font-bold text-gray-800">2,050</p><p className="text-xs text-green-500">↑ 8.3%</p></div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-500 text-lg">🛒</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Avg Order Value</p><p className="text-2xl font-bold text-gray-800">₱122</p><p className="text-xs text-gray-400">Per transaction</p></div>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-500 text-lg font-bold">₱</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `₱${Number(v).toLocaleString()}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue (₱)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Transaction Volume</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={transactionData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} /><Tooltip />
                    <Bar dataKey="transactions" fill="#22c55e" radius={[3, 3, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="font-bold text-gray-800">Top Selling Items</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-gray-400 text-xs">🔍</span>
                      <input type="text" placeholder="Search..." value={topSearch} onChange={(e) => setTopSearch(e.target.value)} className="outline-none text-xs text-gray-700 w-28" />
                    </div>
                    <button onClick={exportSalesReport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">📤 Export</button>
                  </div>
                </div>
                <table className="w-full text-sm min-w-max">
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
                    {filteredTopSelling.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">No results for &quot;{topSearch}&quot;</td></tr>
                    ) : filteredTopSelling.map((item, i) => (
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
              <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="font-bold text-gray-800">Unpopular Items <span className="text-red-400 text-sm">(Needs Attention)</span></h2>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-gray-400 text-xs">🔍</span>
                    <input type="text" placeholder="Search..." value={unpopularSearch} onChange={(e) => setUnpopularSearch(e.target.value)} className="outline-none text-xs text-gray-700 w-28" />
                  </div>
                </div>
                <table className="w-full text-sm min-w-max">
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
                    {filteredUnpopular.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">No results for &quot;{unpopularSearch}&quot;</td></tr>
                    ) : filteredUnpopular.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-gray-400 text-xs">{item.category}</td>
                        <td className="py-2 text-right text-gray-700">{item.units}</td>
                        <td className="py-2 text-right text-gray-700">{item.revenue}</td>
                        <td className="py-2 text-right text-xs font-medium text-red-500">↓ {Math.abs(item.growth)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Critical Stock</p><p className="text-3xl font-bold text-gray-800">0</p><p className="text-xs text-gray-400">Items need reorder</p></div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-lg">⚠️</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Low Stock</p><p className="text-3xl font-bold text-gray-800">{inventoryItems.filter((i) => i.status === "Low").length}</p><p className="text-xs text-gray-400">Monitor closely</p></div>
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg">📦</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400">Healthy Stock</p><p className="text-3xl font-bold text-gray-800">{inventoryItems.filter((i) => i.status === "Healthy").length}</p><p className="text-xs text-gray-400">Adequate levels</p></div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">✅</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Top 5 Selling Items</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} /><Tooltip />
                      <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h2 className="font-bold text-gray-800 mb-3">Inventory by Category</h2>
                  <div className="flex justify-center">
                    <PieChart width={260} height={180}>
                      <Pie data={pieData} cx={125} cy={85} outerRadius={75} dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(v) => `₱${Number(v).toLocaleString()}`} />
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
              <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="font-bold text-gray-800">Complete Inventory Report</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-gray-400 text-xs">🔍</span>
                      <input type="text" placeholder="Search..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className="outline-none text-xs text-gray-700 w-28" />
                    </div>
                    <button onClick={exportInventoryReport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">📤 Export</button>
                  </div>
                </div>
                <table className="w-full text-sm min-w-max">
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
                    {filteredInventory.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">No results for &quot;{inventorySearch}&quot;</td></tr>
                    ) : filteredInventory.map((item, i) => (
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
              <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                <h2 className="font-bold text-gray-800 mb-3">📈 Top Selling Items - Inventory Details</h2>
                <table className="w-full text-sm min-w-max">
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
                    {filteredTopDetails.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">No results for &quot;{inventorySearch}&quot;</td></tr>
                    ) : filteredTopDetails.map((item) => (
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