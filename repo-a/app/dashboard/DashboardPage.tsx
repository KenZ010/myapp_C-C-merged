"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const supplierData = [
  { name: "ASOS Ridley High Waist", price: "$79.49", quantity: 82, amount: "$6,518.18" },
  { name: "Marco Lightweight Shirt", price: "$128.50", quantity: 37, amount: "$4,754.50" },
  { name: "Half Sleeve Shirt", price: "$39.99", quantity: 64, amount: "$2,559.36" },
  { name: "Lightweight Jacket", price: "$20.00", quantity: 184, amount: "$3,680.00" },
];

const inventoryData = [
  { name: "Soft Drinks", value: 47, color: "#60a5fa" },
  { name: "Beer", value: 27, color: "#7c3aed" },
  { name: "Energy Drink", value: 7, color: "#f59e0b" },
  { name: "Home & Kitchen", value: 6, color: "#f97316" },
  { name: "Fitness", value: 13, color: "#22c55e" },
];

const customers = [
  { name: "Natali Craig", img: "https://i.pravatar.cc/32?img=1" },
  { name: "Drew Cano", img: "https://i.pravatar.cc/32?img=2" },
  { name: "Andi Lane", img: "https://i.pravatar.cc/32?img=3" },
  { name: "Koray Okumus", img: "https://i.pravatar.cc/32?img=4" },
  { name: "Kate Morrison", img: "https://i.pravatar.cc/32?img=5" },
  { name: "Melody Macy", img: "https://i.pravatar.cc/32?img=6" },
];

const navItems = [
  { label: "Dashboard", icon: "🏠", active: true },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

const products = [
  { name: "Coca Cola", price: "₱80.00" },
  { name: "Coca Cola", price: "₱80.00" },
  { name: "Coca Cola", price: "₱80.00" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { name, value, x, y, cx } = props;
  return (
    <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>
      {`${name}: ${value}%`}
    </text>
  );
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Daily");
  // Controls whether the user dropdown menu is visible
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* LEFT SIDEBAR */}
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
    }}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
      item.active ? "text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"
    }`}
  >
              <div className="relative flex items-center gap-2 w-full">
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.active && (
                  <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <h1 className="text-2xl font-bold text-indigo-900">Dashboard</h1>

          <div className="flex items-center gap-3">
            {/* Bell icon */}
            <div className="relative">
              <span className="text-xl">🔔</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            </div>

            {/* Clickable user section with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.pravatar.cc/40?img=8"
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </button>

              {/* Dropdown - only shows when showUserMenu is true */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
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

        {/* DASHBOARD CARDS */}
        <div className="flex-1 p-4 bg-green-50">

          {/* ROW 1 */}
          <div className="grid grid-cols-12 gap-4 mb-4">

            {/* Sales Report */}
            <div className="col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Sales Report</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">3,781</span>
                    <span className="text-xs text-green-500">+11.01% ↗</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Ongoing Orders</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">1,219</span>
                    <span className="text-xs text-red-400">-0.03% ↘</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Product Sold</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">316</span>
                    <span className="text-xs text-green-500">+6.08% ↗</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Return Items</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">$695</span>
                    <span className="text-xs text-green-500">+15.03% ↗</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="col-span-4 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Account Management</h2>
            </div>

            {/* Customer List */}
            <div className="col-span-3 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Customer List</h2>
              <div className="flex flex-col gap-2">
                {customers.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt={c.name} className="w-7 h-7 rounded-full" />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 2 */}
          <div className="grid grid-cols-12 gap-4 mb-4">

            {/* Supplier Information */}
            <div className="col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Supplier Information</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b">
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">Name</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Quantity</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierData.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 text-gray-600">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2">{row.name}</td>
                      <td className="py-2 text-right">{row.price}</td>
                      <td className="py-2 text-right">{row.quantity}</td>
                      <td className="py-2 text-right">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inventory Maintenances */}
            <div className="col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-green-500 mb-3">Inventory Maintenances</h2>
              <div className="flex justify-center">
                <PieChart width={350} height={220}>
                  <Pie
                    data={inventoryData}
                    cx={170}
                    cy={100}
                    outerRadius={100}
                    dataKey="value"
                    label={renderLabel}
                    labelLine={true}
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className="grid grid-cols-12 gap-4">

            {/* Product Maintenance */}
            <div className="col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Product Maintenance</h2>
              <div className="flex gap-3">
                {products.map((product, i) => (
                  <div key={i} className="flex flex-col w-40">
                    <div className="w-full h-32 bg-gray-200 rounded-xl mb-2" />
                    <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Logs */}
            <div className="col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Transaction Logs</h2>
                <button className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50">
                  See more
                </button>
              </div>
              <div className="flex gap-2">
                {["Daily", "Weekly", "Monthly"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-400 text-center py-6">
                No transactions to show
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}