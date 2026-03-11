"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

type InventoryItem = {
  id: number; code: string; name: string; date: string; total: number;
  remaining: number; lastCheck: string; expiry: string; expiryColor: string;
  stock: string; stockColor: string;
};

const initialData: InventoryItem[] = [
  { id: 1, code: "COLA22", name: "Coca Cola", date: "08 Nov 2025", total: 30, remaining: 10, lastCheck: "Rjay Salinas", expiry: "Fresh/ Valid", expiryColor: "green", stock: "Low Stock", stockColor: "yellow" },
  { id: 2, code: "RC22", name: "RC", date: "06 Nov 2025", total: 30, remaining: 0, lastCheck: "Rjay Salinas", expiry: "Unknown", expiryColor: "gray", stock: "Out of Stock", stockColor: "red" },
  { id: 3, code: "PEP12", name: "Pepsi", date: "06 Nov 2025", total: 30, remaining: 15, lastCheck: "Rjay Salinas", expiry: "Fresh/ Valid", expiryColor: "green", stock: "In Stock", stockColor: "green" },
  { id: 4, code: "GATO22", name: "Gatorade", date: "06 Nov 2025", total: 15, remaining: 15, lastCheck: "Rjay Salinas", expiry: "Fresh/ Valid", expiryColor: "green", stock: "In Stock", stockColor: "green" },
  { id: 5, code: "COB25", name: "Cobra", date: "06 Nov 2025", total: 30, remaining: 27, lastCheck: "Rjay Salinas", expiry: "No Expiry", expiryColor: "blue", stock: "In Stock", stockColor: "green" },
  { id: 6, code: "COB25", name: "Cobra", date: "06 Nov 2025", total: 30, remaining: 27, lastCheck: "Rjay Salinas", expiry: "Expired", expiryColor: "red", stock: "In Stock", stockColor: "green" },
  { id: 7, code: "COB25", name: "Cobra", date: "06 Nov 2025", total: 30, remaining: 27, lastCheck: "Rjay Salinas", expiry: "Expiring Soon", expiryColor: "orange", stock: "In Stock", stockColor: "green" },
];

const categoryData = [
  { name: "Soft Drinks", value: 47, color: "#60a5fa" },
  { name: "Beer", value: 27, color: "#7c3aed" },
  { name: "Energy Drink", value: 7, color: "#f59e0b" },
  { name: "Home & Kitchen", value: 7, color: "#f97316" },
  { name: "Fitness", value: 13, color: "#22c55e" },
];

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒", active: true },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

const getExpiryBadge = (color: string) => {
  const map: Record<string, string> = { green: "bg-green-500 text-white", red: "bg-red-500 text-white", gray: "bg-gray-400 text-white", blue: "bg-blue-400 text-white", orange: "bg-orange-400 text-white" };
  return map[color] || "bg-gray-300 text-white";
};

const getStockBadge = (color: string) => {
  const map: Record<string, string> = { green: "bg-green-500 text-white", red: "bg-red-500 text-white", yellow: "bg-yellow-400 text-black" };
  return map[color] || "bg-gray-300 text-white";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { name, value, x, y, cx } = props;
  return <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>{`${name}: ${value}%`}</text>;
};

const emptyForm = { code: "", name: "", date: "", total: 0, remaining: 0, lastCheck: "", expiry: "Fresh/ Valid", expiryColor: "green", stock: "In Stock", stockColor: "green" };

export default function InventoryMaintenancePage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InventoryItem[]>(initialData);
  const [selected, setSelected] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filtered = items.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()) || row.code.toLowerCase().includes(search.toLowerCase()));
  const topSellingData = items.slice(0, 5).map((item) => ({ name: item.name, units: item.total }));
  const toggleSelect = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAll = () => selected.length === filtered.length ? setSelected([]) : setSelected(filtered.map((r) => r.id));
  const openAddModal = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEditModal = () => {
    if (selected.length !== 1) { alert("Please select exactly one item to edit."); return; }
    const item = items.find((i) => i.id === selected[0]); if (!item) return;
    setForm({ code: item.code, name: item.name, date: item.date, total: item.total, remaining: item.remaining, lastCheck: item.lastCheck, expiry: item.expiry, expiryColor: item.expiryColor, stock: item.stock, stockColor: item.stockColor });
    setEditingId(item.id); setShowModal(true);
  };
  const handleSave = () => {
    if (!form.code || !form.name) { alert("Code and Product Name are required."); return; }
    if (editingId !== null) { setItems((prev) => prev.map((item) => item.id === editingId ? { ...item, ...form } : item)); }
    else { setItems((prev) => [...prev, { id: Date.now(), ...form }]); }
    setShowModal(false); setSelected([]);
  };
  const handleDelete = () => { if (selected.length === 0) { alert("Please select at least one item to delete."); return; } setShowDeleteConfirm(true); };
  const confirmDelete = () => { setItems((prev) => prev.filter((item) => !selected.includes(item.id))); setSelected([]); setShowDeleteConfirm(false); };
  const handleExport = () => {
    const headers = ["Code", "Product Name", "Date Acquired", "Total Stock", "Remaining Stock", "Last Check By", "Expiry Status", "Stock Status"];
    const rows = items.map((item) => [item.code, item.name, item.date, item.total, item.remaining, item.lastCheck, item.expiry, item.stock]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    setShowMobileMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* SIDEBAR - desktop */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10"><p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p></div>
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
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>☰</button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventory Maintenance</h1>
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
                  <button onClick={() => router.push("/")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="outline-none text-sm text-gray-700 w-full" />
              </div>
              <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">👤 Category ▾</button>
              <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">🔖 Status ▾</button>
              <button className="hidden md:flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📅 Date ▾</button>
              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50 ml-auto">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openEditModal} className="flex items-center gap-1 border border-gray-800 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-800 hover:bg-gray-100">✏️ Edit</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} /></th>
                    <th className="p-3 text-left">Code</th><th className="p-3 text-left">Product Name</th>
                    <th className="p-3 text-left">Date Acquired</th><th className="p-3 text-left">Total Stock</th>
                    <th className="p-3 text-left">Remaining Stock</th><th className="p-3 text-left">Last Check by</th>
                    <th className="p-3 text-left">Expiry Status</th><th className="p-3 text-left">Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                      <td className="p-3 text-gray-700">{row.code}</td><td className="p-3 text-gray-700">{row.name}</td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.date}</span></td>
                      <td className="p-3 text-gray-700">{row.total}</td><td className="p-3 text-gray-700">{row.remaining}</td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.lastCheck}</span></td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getExpiryBadge(row.expiryColor)}`}>{row.expiry}</span></td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockBadge(row.stockColor)}`}>{row.stock}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Top Selling Products</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellingData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} /><Tooltip />
                  <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-2 mt-2 justify-center"><div className="w-3 h-3 bg-blue-500 rounded-sm" /><span className="text-xs text-gray-500">Units Sold</span></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Inventory by Category</h2>
              <div className="flex justify-center overflow-x-auto">
                <PieChart width={320} height={220}>
                  <Pie data={categoryData} cx={155} cy={100} outerRadius={90} dataKey="value" label={renderLabel} labelLine={true}>
                    {categoryData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId !== null ? "Edit Item" : "Add New Item"}</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Product Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Date Acquired</label><input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 06 Nov 2025" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Total Stock</label><input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                <div><label className="text-xs font-medium text-gray-600">Remaining Stock</label><input type="number" value={form.remaining} onChange={(e) => setForm({ ...form, remaining: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Last Check By</label><input value={form.lastCheck} onChange={(e) => setForm({ ...form, lastCheck: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div>
                <label className="text-xs font-medium text-gray-600">Expiry Status</label>
                <select value={form.expiry} onChange={(e) => { const val = e.target.value; const colorMap: Record<string, string> = { "Fresh/ Valid": "green", "Expired": "red", "Expiring Soon": "orange", "No Expiry": "blue", "Unknown": "gray" }; setForm({ ...form, expiry: val, expiryColor: colorMap[val] || "gray" }); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option>Fresh/ Valid</option><option>Expired</option><option>Expiring Soon</option><option>No Expiry</option><option>Unknown</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Stock Status</label>
                <select value={form.stock} onChange={(e) => { const val = e.target.value; const colorMap: Record<string, string> = { "In Stock": "green", "Out of Stock": "red", "Low Stock": "yellow" }; setForm({ ...form, stock: val, stockColor: colorMap[val] || "green" }); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option>In Stock</option><option>Out of Stock</option><option>Low Stock</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">{editingId !== null ? "Save Changes" : "Add Item"}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Items?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {selected.length} item(s)? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}