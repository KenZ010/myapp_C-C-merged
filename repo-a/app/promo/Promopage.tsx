"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type PromoType = "Discount" | "Buy 1 Get 1" | "Bundle Deal";
type PromoStatus = "Active" | "Inactive";

type Promo = {
  id: number;
  title: string;
  description: string;
  type: PromoType;
  discount?: number;
  bundleQty?: number;
  product: string;
  image: string;
  status: PromoStatus;
  startDate: string;
  endDate: string;
};

const navItems = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory" },
  { label: "Supplier Maintenance", icon: "📊", path: "/supplier" },
  { label: "Sales Reports", icon: "🌐", path: "/sales" },
  { label: "Transaction Logs", icon: "▦", path: "/transaction" },
  { label: "Product Management", icon: "🗒️", path: "/product" },
  { label: "Account Management", icon: "👤", path: "/account" },
  { label: "Promo Management", icon: "🎁", path: "/promo" },
];

const PROMO_TYPES: PromoType[] = ["Discount", "Buy 1 Get 1", "Bundle Deal"];

const TYPE_COLORS: Record<PromoType, string> = {
  "Discount": "bg-blue-100 text-blue-600",
  "Buy 1 Get 1": "bg-purple-100 text-purple-600",
  "Bundle Deal": "bg-orange-100 text-orange-600",
};

const initialPromos: Promo[] = [
  {
    id: 1,
    title: "Coca Cola Summer Sale",
    description: "Get 20% off on all Coca Cola products this summer!",
    type: "Discount",
    discount: 20,
    product: "Coca Cola",
    image: "",
    status: "Active",
    startDate: "2025-06-01",
    endDate: "2025-08-31",
  },
  {
    id: 2,
    title: "Pepsi BOGO",
    description: "Buy 1 Get 1 Free on all Pepsi 500ml bottles!",
    type: "Buy 1 Get 1",
    product: "Pepsi 500ml",
    image: "",
    status: "Active",
    startDate: "2025-06-01",
    endDate: "2025-06-30",
  },
  {
    id: 3,
    title: "Cobra Bundle Deal",
    description: "Buy 3 Cobra Energy drinks and pay for only 2!",
    type: "Bundle Deal",
    bundleQty: 3,
    product: "Cobra Energy",
    image: "",
    status: "Inactive",
    startDate: "2025-07-01",
    endDate: "2025-07-31",
  },
];

const emptyForm: Omit<Promo, "id"> = {
  title: "",
  description: "",
  type: "Discount",
  discount: undefined,
  bundleQty: undefined,
  product: "",
  image: "",
  status: "Active",
  startDate: "",
  endDate: "",
};

const isPromoCurrentlyActive = (promo: Promo): boolean => {
  if (promo.status === "Inactive") return false;
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);
  return now >= start && now <= end;
};

export default function PromoManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Promo, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setShowTypeDropdown(false);
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = promos.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.product.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || p.type === typeFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalActive = promos.filter((p) => isPromoCurrentlyActive(p)).length;
  // FIX 1: Removed unused 'totalInactive' variable
  const totalDiscount = promos.filter((p) => p.type === "Discount").length;
  const totalBogo = promos.filter((p) => p.type === "Buy 1 Get 1").length;

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAll = () =>
    selectedIds.length === filtered.length ? setSelectedIds([]) : setSelectedIds(filtered.map((p) => p.id));

  const openAddModal = () => { setForm(emptyForm); setEditingId(null); setIsDirty(false); setShowModal(true); };
  const openEditModal = (promo: Promo) => {
    setForm({ title: promo.title, description: promo.description, type: promo.type, discount: promo.discount, bundleQty: promo.bundleQty, product: promo.product, image: promo.image, status: promo.status, startDate: promo.startDate, endDate: promo.endDate });
    setEditingId(promo.id); setIsDirty(false); setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isDirty && !confirm("You have unsaved changes. Are you sure you want to close?")) return;
    setShowModal(false);
  };

  const handleSave = () => {
    if (!form.title) { alert("Promo title is required."); return; }
    if (!form.product) { alert("Product is required."); return; }
    if (!form.startDate || !form.endDate) { alert("Start and End dates are required."); return; }
    if (new Date(form.startDate) > new Date(form.endDate)) { alert("Start date must be before end date."); return; }
    // FIX 2: Compare number to number (not string) using Number() conversion
    if (form.type === "Discount" && (form.discount === undefined || Number(form.discount) <= 0)) {
      alert("Please enter a valid discount percentage."); return;
    }

    const saveData = {
      ...form,
      discount: form.discount === undefined ? undefined : Number(form.discount),
      bundleQty: form.bundleQty === undefined ? undefined : Number(form.bundleQty),
    };

    if (editingId !== null) {
      setPromos((prev) => prev.map((p) => p.id === editingId ? { ...p, ...saveData } : p));
    } else {
      setPromos((prev) => [...prev, { id: Date.now(), ...saveData }]);
    }
    setShowModal(false); setSelectedIds([]);
  };

  const handleToggleStatus = (id: number) => {
    setPromos((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "Active" ? "Inactive" : "Active" } : p));
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) { alert("Please select at least one promo to delete."); return; }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setPromos((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]); setShowDeleteConfirm(false);
  };

  const handleExport = () => {
    const headers = ["Title", "Product", "Type", "Discount%", "Bundle Qty", "Status", "Start Date", "End Date"];
    const rows = promos.map((p) => [p.title, p.product, p.type, p.discount || "", p.bundleQty || "", p.status, p.startDate, p.endDate]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "promos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  const getPromoLabel = (promo: Promo) => {
    if (promo.type === "Discount") return `${promo.discount}% OFF`;
    if (promo.type === "Buy 1 Get 1") return "BOGO";
    if (promo.type === "Bundle Deal") return `${promo.bundleQty} for 2`;
    return "";
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
          <button className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Promo Management</h1>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🎁</div>
              <div><p className="text-xs text-gray-400">Total Promos</p><p className="text-xl font-bold text-gray-800">{promos.length}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">✅</div>
              <div><p className="text-xs text-gray-400">Active Now</p><p className="text-xl font-bold text-green-600">{totalActive}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">💙</div>
              <div><p className="text-xs text-gray-400">Discounts</p><p className="text-xl font-bold text-blue-600">{totalDiscount}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">🎀</div>
              <div><p className="text-xs text-gray-400">BOGO</p><p className="text-xl font-bold text-purple-600">{totalBogo}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search promos..." value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  className="outline-none text-sm text-gray-700 w-full" />
              </div>

              {/* Type Filter */}
              <div className="relative" ref={typeRef}>
                <button onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowStatusDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${typeFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🎁 {typeFilter === "All" ? "Type" : typeFilter} ▾
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...PROMO_TYPES].map((opt) => (
                      <button key={opt} onClick={() => { setTypeFilter(opt); setShowTypeDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${typeFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Types" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative" ref={statusRef}>
                <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowTypeDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                    {["All", "Active", "Inactive"].map((opt) => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Statuses" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(typeFilter !== "All" || statusFilter !== "All") && (
                <button onClick={() => { setTypeFilter("All"); setStatusFilter("All"); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}

              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50 ml-auto">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add Promo</button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAll} checked={filtered.length > 0 && selectedIds.length === filtered.length} /></th>
                    <th className="p-3 text-left">Title</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Deal</th>
                    <th className="p-3 text-left">Start Date</th>
                    <th className="p-3 text-left">End Date</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">
                      {search ? `No promos found for "${search}".` : "No promos yet. Click + Add Promo to get started!"}
                    </td></tr>
                  ) : filtered.map((promo) => (
                    <tr key={promo.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.includes(promo.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={selectedIds.includes(promo.id)} onChange={() => toggleSelect(promo.id)} /></td>
                      <td className="p-3 text-gray-800 font-medium">{promo.title}</td>
                      <td className="p-3 text-gray-600">{promo.product}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[promo.type]}`}>{promo.type}</span></td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold">{getPromoLabel(promo)}</span></td>
                      <td className="p-3 text-gray-500 text-xs">{promo.startDate}</td>
                      <td className="p-3 text-gray-500 text-xs">{promo.endDate}</td>
                      <td className="p-3">
                        <button onClick={() => handleToggleStatus(promo.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${promo.status === "Active" ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}>
                          {promo.status}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal(promo)} className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-2 py-1 text-xs">✏️ Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId !== null ? "Edit Promo" : "Add New Promo"}</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Promo Title</label>
                <input value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Summer Sale" />
              </div>

              <div><label className="text-xs font-medium text-gray-600">Description</label>
                <textarea value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 resize-none" rows={3} placeholder="Describe the promo..." />
              </div>

              <div><label className="text-xs font-medium text-gray-600">Product</label>
                <input value={form.product} onChange={(e) => { setForm({ ...form, product: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Coca Cola 1.5L" />
              </div>

              <div><label className="text-xs font-medium text-gray-600">Promo Type</label>
                <select value={form.type} onChange={(e) => { setForm({ ...form, type: e.target.value as PromoType }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {PROMO_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {form.type === "Discount" && (
                <div><label className="text-xs font-medium text-gray-600">Discount Percentage (%)</label>
                  <input type="number" min="1" max="100"
                    value={form.discount ?? ""}
                    onChange={(e) => { setForm({ ...form, discount: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 20" />
                </div>
              )}

              {form.type === "Bundle Deal" && (
                <div><label className="text-xs font-medium text-gray-600">Buy how many? (pay for 2)</label>
                  <input type="number" min="3"
                    value={form.bundleQty ?? ""}
                    onChange={(e) => { setForm({ ...form, bundleQty: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 3" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => { setForm({ ...form, startDate: e.target.value }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
                <div><label className="text-xs font-medium text-gray-600">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => { setForm({ ...form, endDate: e.target.value }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
              </div>

              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={form.status} onChange={(e) => { setForm({ ...form, status: e.target.value as PromoStatus }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div><label className="text-xs font-medium text-gray-600">Promo Image URL <span className="text-gray-400">(optional)</span></label>
                <input value={form.image} onChange={(e) => { setForm({ ...form, image: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloseModal} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">{editingId !== null ? "Save Changes" : "Add Promo"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Promos?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {selectedIds.length} promo(s)? This cannot be undone.</p>
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