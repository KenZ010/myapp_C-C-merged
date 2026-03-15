"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { api } from "@/lib/api";

type SupplierItem = {
  code: string;
  itemName: string;
  supplierName: string;
  contactNo: string;
  lastOrdered: number | null;
  status: string;
};

type Employee = {
  id: number;
  name: string;
  role: string;
  userStatus: string;
  phone: string;
};

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const router = useRouter();

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const data = await api.getSuppliers();
        setSuppliers(data);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch employees (CASHIER and STOCK_MANAGER only)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const data = await api.getEmployees("");
        const filtered = data.filter(
          (emp: Employee) => emp.role === "CASHIER" || emp.role === "STOCK_MANAGER"
        );
        setEmployees(filtered);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    if (label === "Product Management") router.push("/product");
    setShowMobileMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
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
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-indigo-900">Dashboard</h1>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <span className="text-xl">🔔</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="text-left hidden md:block">
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

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Sales Report</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">3,781</span>
                    <span className="text-xs text-green-500">+11.01% ↗</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Ongoing Orders</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">1,219</span>
                    <span className="text-xs text-red-400">-0.03% ↘</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Product Sold</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">316</span>
                    <span className="text-xs text-green-500">+6.08% ↗</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Return Items</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">$695</span>
                    <span className="text-xs text-green-500">+15.03% ↗</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Account Management - Employees from DB */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Account Management</h2>
              {loadingEmployees ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading employees...</p>
              ) : employees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No employees found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {employees.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.role === "CASHIER" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                          {emp.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${emp.userStatus === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                          {emp.userStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                  {employees.length > 5 && (
                    <button onClick={() => router.push("/accounts")} className="text-xs text-indigo-600 hover:underline mt-1">
                      See all {employees.length} employees →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Customer List</h2>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
              <h2 className="font-bold text-gray-800 mb-3">Supplier Information</h2>
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="text-gray-400 text-xs border-b">
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">Item Name</th>
                    <th className="text-left pb-2">Supplier</th>
                    <th className="text-right pb-2">Last Ordered</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSuppliers ? (
                    <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-xs">Loading...</td></tr>
                  ) : suppliers.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-xs">No suppliers found.</td></tr>
                  ) : (
                    suppliers.slice(0, 5).map((row, i) => (
                      <tr key={row.code} className="border-b last:border-0 text-gray-600">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2">{row.itemName}</td>
                        <td className="py-2">{row.supplierName}</td>
                        <td className="py-2 text-right">{row.lastOrdered ?? "-"}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {suppliers.length > 5 && (
                <button onClick={() => router.push("/supplier")} className="mt-3 text-xs text-indigo-600 hover:underline">
                  See all {suppliers.length} suppliers →
                </button>
              )}
            </div>

            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-green-500 mb-3">Inventory Maintenances</h2>
              <div className="flex justify-center overflow-x-auto">
                <PieChart width={320} height={220}>
                  <Pie data={inventoryData} cx={155} cy={100} outerRadius={90} dataKey="value" label={renderLabel} labelLine={true}>
                    {inventoryData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Product Maintenance</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {products.map((product, i) => (
                  <div key={i} className="flex flex-col w-36 shrink-0">
                    <div className="w-full h-28 bg-gray-200 rounded-xl mb-2" />
                    <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.price}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Transaction Logs</h2>
                <button className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50">See more</button>
              </div>
              <div className="flex gap-2">
                {["Daily", "Weekly", "Monthly"].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-400 text-center py-6">No transactions to show</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}