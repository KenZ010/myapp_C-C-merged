"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type SupplierItem = {
  id: string;
  supplierName: string;
  contactNo: string;
  address: string | null;
  email: string | null;
  lastOrdered: number | null;
  lastCheckBy: string | null;
  dateChecked: string | null;
  status: string;
};

const CHECKERS = ["Rjay Salinas", "Ray Teodoro"];

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊", active: true },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤" },
];

const emptyForm = {
  supplierName: "",
  contactNo: "",
  address: "",
  email: "",
  lastOrdered: "" as string | number,
  lastCheckBy: "",
  dateChecked: "",
  status: "ACTIVE"
};

export default function SupplierMaintenancePage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkerFilter, setCheckerFilter] = useState("All");
  const [showCheckerDropdown, setShowCheckerDropdown] = useState(false);
  const [viewItem, setViewItem] = useState<SupplierItem | null>(null);

  const checkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (checkerRef.current && !checkerRef.current.contains(e.target as Node)) setShowCheckerDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filtered = items.filter((row) => {
    const matchSearch =
      row.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      row.id.toLowerCase().includes(search.toLowerCase()) ||
      row.contactNo.toLowerCase().includes(search.toLowerCase());
    const matchChecker = checkerFilter === "All" || row.lastCheckBy === checkerFilter;
    return matchSearch && matchChecker;
  });

  const toggleSelect = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAll = () => selected.length === filtered.length ? setSelected([]) : setSelected(filtered.map((r) => r.id));

  const openAddModal = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };

  const openEditModal = () => {
    if (selected.length !== 1) { alert("Please select exactly one item to edit."); return; }
    const item = items.find((i) => i.id === selected[0]);
    if (!item) return;
    setForm({
      supplierName: item.supplierName,
      contactNo: item.contactNo,
      address: item.address || "",
      email: item.email || "",
      lastOrdered: item.lastOrdered ?? "",
      lastCheckBy: item.lastCheckBy || "",
      dateChecked: item.dateChecked ? new Date(item.dateChecked).toISOString().split('T')[0] : "",
      status: item.status
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const openEditFromView = (item: SupplierItem) => {
    setViewItem(null);
    setForm({
      supplierName: item.supplierName,
      contactNo: item.contactNo,
      address: item.address || "",
      email: item.email || "",
      lastOrdered: item.lastOrdered ?? "",
      lastCheckBy: item.lastCheckBy || "",
      dateChecked: item.dateChecked ? new Date(item.dateChecked).toISOString().split('T')[0] : "",
      status: item.status
    });
    setSelected([item.id]);
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supplierName) { alert("Supplier Name is required."); return; }
    try {
      const saveData = {
        ...form,
        lastOrdered: form.lastOrdered === "" ? 0 : Number(form.lastOrdered)
      };
      if (editingId !== null) {
        await api.updateSupplier(editingId, saveData);
      } else {
        await api.createSupplier(saveData);
      }
      await fetchSuppliers();
      setShowModal(false);
      setSelected([]);
    } catch (err) {
      console.error("Failed to save supplier:", err);
    }
  };

  const handleDelete = () => {
    if (selected.length === 0) { alert("Please select at least one item."); return; }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await Promise.all(selected.map((id) => api.deleteSupplier(id)));
      await fetchSuppliers();
      setSelected([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete supplier:", err);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "Company Name", "Contact No", "Address", "Email", "Last Ordered", "Last Check By", "Date Checked", "Status"];
    const rows = items.map((item) => [item.id, item.supplierName, item.contactNo, item.address, item.email, item.lastOrdered, item.lastCheckBy, item.dateChecked, item.status]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "suppliers.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    localStorage.removeItem('employee');
    router.push('/');
  };

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    if (label === "Product Management") router.push("/product");
    if (label === "Account Management") router.push("/account");
    setShowMobileMenu(false);
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

            {/* Top action buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-end">
              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openEditModal} className="flex items-center gap-1 border border-gray-800 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-800 hover:bg-gray-100">✏️ Edit</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add Supplier</button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="outline-none text-sm text-gray-700 w-full" />
              </div>
              <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">🔖 Status ▾</button>

              {/* Checker Filter */}
              <div className="relative" ref={checkerRef}>
                <button onClick={() => setShowCheckerDropdown(!showCheckerDropdown)}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${checkerFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🧑 {checkerFilter === "All" ? "Last Check By" : checkerFilter} ▾
                </button>
                {showCheckerDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...CHECKERS].map((opt) => (
                      <button key={opt} onClick={() => { setCheckerFilter(opt); setShowCheckerDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${checkerFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Checkers" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {checkerFilter !== "All" && (
                <button onClick={() => setCheckerFilter("All")} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}
            </div>

            {/* Simplified Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} /></th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Company Name</th>
                    <th className="p-3 text-left">Last Check By</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading suppliers...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">No suppliers found.</td></tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                        <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                        <td className="p-3 text-gray-500 text-xs">{row.id}</td>
                        <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs">{row.supplierName}</span></td>
                        <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.lastCheckBy ?? "-"}</span></td>
                        <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${row.status === "ACTIVE" ? "bg-green-500 text-white" : "bg-yellow-400 text-black"}`}>{row.status}</span></td>
                        <td className="p-3">
                          <button
                            onClick={() => setViewItem(row)}
                            className="flex items-center gap-1 border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                          >
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── View Details Modal ── */}
      {viewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{viewItem.supplierName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Supplier ID: {viewItem.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${viewItem.status === "ACTIVE" ? "bg-green-500 text-white" : "bg-yellow-400 text-black"}`}>
                {viewItem.status}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Contact No.</p>
                  <p className="text-sm font-medium text-gray-800">{viewItem.contactNo || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-800 break-all">{viewItem.email || "—"}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Address</p>
                <p className="text-sm font-medium text-gray-800">{viewItem.address || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Last Ordered</p>
                  <p className="text-sm font-medium text-gray-800">{viewItem.lastOrdered ?? "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Date Checked</p>
                  <p className="text-sm font-medium text-gray-800">
                    {viewItem.dateChecked ? new Date(viewItem.dateChecked).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Last Check By</p>
                <p className="text-sm font-medium text-gray-800">{viewItem.lastCheckBy || "—"}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setViewItem(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => openEditFromView(viewItem)} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">✏️ Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId !== null ? "Edit Supplier" : "Add New Supplier"}</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Company Name</label><input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Contact No.</label><input value={form.contactNo} onChange={(e) => setForm({ ...form, contactNo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Last Ordered</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lastOrdered}
                    onChange={(e) => setForm({ ...form, lastOrdered: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
                  />
                </div>
                <div><label className="text-xs font-medium text-gray-600">Date Checked</label><input type="date" value={form.dateChecked} onChange={(e) => setForm({ ...form, dateChecked: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Last Check By</label>
                <select value={form.lastCheckBy} onChange={(e) => setForm({ ...form, lastCheckBy: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="">-- Select --</option>
                  {CHECKERS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
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

      {/* ── Delete Confirm Modal ── */}
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