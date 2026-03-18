"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SupplierItem = {
  id: number; code: string; itemName: string; supplierName: string;
  contactNo: string; lastOrdered: number; lastCheckBy: string; dateChecked: string; status: string;
};

const initialData: SupplierItem[] = [
  { id: 1, code: "COLA22", itemName: "Coca Cola", supplierName: "Ken Masilungan", contactNo: "09312412411", lastOrdered: 10, lastCheckBy: "Rjay Salinas", dateChecked: "07 Apr 2030", status: "Inactive" },
  { id: 2, code: "RC22", itemName: "RC", supplierName: "Ken Masilungan", contactNo: "09312412411", lastOrdered: 0, lastCheckBy: "Rjay Salinas", dateChecked: "09 Apr 2031", status: "Active" },
  { id: 3, code: "PEP12", itemName: "Pepsi", supplierName: "Ken Masilungan", contactNo: "09312412411", lastOrdered: 15, lastCheckBy: "Rjay Salinas", dateChecked: "10 Apr 2030", status: "Inactive" },
  { id: 4, code: "GATO22", itemName: "Gatorade", supplierName: "Ken Masilungan", contactNo: "09312412411", lastOrdered: 15, lastCheckBy: "Rjay Salinas", dateChecked: "07 Apr 2030", status: "Active" },
  { id: 5, code: "COB25", itemName: "Cobra", supplierName: "Ken Masilungan", contactNo: "09312412411", lastOrdered: 27, lastCheckBy: "Rjay Salinas", dateChecked: "04 Apr 2030", status: "Active" },
];

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊", active: true },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

const emptyForm = { code: "", itemName: "", supplierName: "", contactNo: "", lastOrdered: 0, lastCheckBy: "", dateChecked: "", status: "Active" };

export default function SupplierMaintenancePage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SupplierItem[]>(initialData);
  const [selected, setSelected] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filtered = items.filter((row) => row.itemName.toLowerCase().includes(search.toLowerCase()) || row.code.toLowerCase().includes(search.toLowerCase()) || row.supplierName.toLowerCase().includes(search.toLowerCase()));
  const toggleSelect = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAll = () => selected.length === filtered.length ? setSelected([]) : setSelected(filtered.map((r) => r.id));
  const openAddModal = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEditModal = () => {
    if (selected.length !== 1) { alert("Please select exactly one item to edit."); return; }
    const item = items.find((i) => i.id === selected[0]); if (!item) return;
    setForm({ code: item.code, itemName: item.itemName, supplierName: item.supplierName, contactNo: item.contactNo, lastOrdered: item.lastOrdered, lastCheckBy: item.lastCheckBy, dateChecked: item.dateChecked, status: item.status });
    setEditingId(item.id); setShowModal(true);
  };
  const handleSave = () => {
    if (!form.code || !form.itemName) { alert("Code and Item Name are required."); return; }
    if (editingId !== null) { setItems((prev) => prev.map((item) => item.id === editingId ? { ...item, ...form } : item)); }
    else { setItems((prev) => [...prev, { id: Date.now(), ...form }]); }
    setShowModal(false); setSelected([]);
  };
  const handleDelete = () => { if (selected.length === 0) { alert("Please select at least one item."); return; } setShowDeleteConfirm(true); };
  const confirmDelete = () => { setItems((prev) => prev.filter((item) => !selected.includes(item.id))); setSelected([]); setShowDeleteConfirm(false); };
  const handleExport = () => {
    const headers = ["Code", "Item Name", "Supplier Name", "Contact No", "Last Ordered", "Last Check By", "Date Checked", "Status"];
    const rows = items.map((item) => [item.code, item.itemName, item.supplierName, item.contactNo, item.lastOrdered, item.lastCheckBy, item.dateChecked, item.status]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "suppliers.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Account Management") router.push("/account");
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
  document.cookie = 'token=; path=/; max-age=0';
  localStorage.removeItem('employee');
  router.push('/');
};

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
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
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Supplier Maintenance</h1>
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
            {navItems.map((item) => (
              <div key={item.label} onClick={() => navigate(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${item.active ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-end">
              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openEditModal} className="flex items-center gap-1 border border-gray-800 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-800 hover:bg-gray-100">✏️ Edit</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add Supplier</button>
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="outline-none text-sm text-gray-700 w-full" />
              </div>
              <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">👤 Role ▾</button>
              <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">🔖 Status ▾</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} /></th>
                    <th className="p-3 text-left">Code ↕</th><th className="p-3 text-left">Item Name ↕</th>
                    <th className="p-3 text-left">Supplier Name ↕</th><th className="p-3 text-left">Contact No. ↕</th>
                    <th className="p-3 text-left">Last Ordered ↕</th><th className="p-3 text-left">Last Check by ↕</th>
                    <th className="p-3 text-left">Date Checked ↕</th><th className="p-3 text-left">Status ↕</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                      <td className="p-3 text-gray-700">{row.code}</td><td className="p-3 text-gray-700">{row.itemName}</td>
                      <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs">{row.supplierName}</span></td>
                      <td className="p-3 text-gray-700">{row.contactNo}</td><td className="p-3 text-gray-700">{row.lastOrdered}</td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.lastCheckBy}</span></td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.dateChecked}</span></td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${row.status === "Active" ? "bg-green-500 text-white" : "bg-yellow-400 text-black"}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId !== null ? "Edit Supplier" : "Add New Supplier"}</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Item Name</label><input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Supplier Name</label><input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Contact No.</label><input value={form.contactNo} onChange={(e) => setForm({ ...form, contactNo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Last Ordered</label><input type="number" min="0" value={form.lastOrdered} onChange={(e) => setForm({ ...form, lastOrdered: Math.max(0, Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                <div><label className="text-xs font-medium text-gray-600">Date Checked</label><input value={form.dateChecked} onChange={(e) => setForm({ ...form, dateChecked: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 07 Apr 2030" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Last Check By</label><input value={form.lastCheckBy} onChange={(e) => setForm({ ...form, lastCheckBy: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div>
                <label className="text-xs font-medium text-gray-600">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">{editingId !== null ? "Save Changes" : "Add Supplier"}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Suppliers?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {selected.length} item(s)?</p>
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