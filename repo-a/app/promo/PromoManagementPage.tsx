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

const TYPE_ICONS: Record<PromoType, string> = {
  "Discount": "🏷️",
  "Buy 1 Get 1": "🎀",
  "Bundle Deal": "📦",
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

const getPromoLabel = (promo: Promo) => {
  if (promo.type === "Discount") return `${promo.discount}% OFF`;
  if (promo.type === "Buy 1 Get 1") return "BOGO";
  if (promo.type === "Bundle Deal") return `${promo.bundleQty} for 2`;
  return "";
};

const ITEMS_PER_PAGE = 18;

export default function PromoManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<Omit<Promo, "id">>(emptyForm);
  const [isDirty, setIsDirty] = useState(false);

  // Detail/edit modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Promo, "id">>(emptyForm);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [success, setSuccess] = useState("");

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
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.product.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || p.type === typeFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalActive = promos.filter((p) => isPromoCurrentlyActive(p)).length;
  const totalDiscount = promos.filter((p) => p.type === "Discount").length;
  const totalBogo = promos.filter((p) => p.type === "Buy 1 Get 1").length;

  // Card click → open detail modal
  const handleCardClick = (promo: Promo) => {
    setSelectedPromo(promo);
    setEditForm({
      title: promo.title,
      description: promo.description,
      type: promo.type,
      discount: promo.discount,
      bundleQty: promo.bundleQty,
      product: promo.product,
      image: promo.image,
      status: promo.status,
      startDate: promo.startDate,
      endDate: promo.endDate,
    });
    setIsEditing(false);
    setShowPromoModal(true);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editForm.title) { alert("Promo title is required."); return; }
    if (!editForm.product) { alert("Product is required."); return; }
    if (!editForm.startDate || !editForm.endDate) { alert("Start and End dates are required."); return; }
    if (new Date(editForm.startDate) > new Date(editForm.endDate)) { alert("Start date must be before end date."); return; }
    if (editForm.type === "Discount" && (editForm.discount === undefined || Number(editForm.discount) <= 0)) {
      alert("Please enter a valid discount percentage."); return;
    }
    setPromos((prev) =>
      prev.map((p) => p.id === selectedPromo!.id ? { ...p, ...editForm } : p)
    );
    setSelectedPromo({ ...selectedPromo!, ...editForm });
    setIsEditing(false);
    setSuccess("Promo updated successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Delete
  const confirmDelete = () => {
    setPromos((prev) => prev.filter((p) => p.id !== selectedPromo!.id));
    setShowDeleteConfirm(false);
    setShowPromoModal(false);
    setSelectedPromo(null);
    setSuccess("Promo deleted successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Add
  const handleAddPromo = () => {
    if (!addForm.title) { alert("Promo title is required."); return; }
    if (!addForm.product) { alert("Product is required."); return; }
    if (!addForm.startDate || !addForm.endDate) { alert("Start and End dates are required."); return; }
    if (new Date(addForm.startDate) > new Date(addForm.endDate)) { alert("Start date must be before end date."); return; }
    if (addForm.type === "Discount" && (addForm.discount === undefined || Number(addForm.discount) <= 0)) {
      alert("Please enter a valid discount percentage."); return;
    }
    setPromos((prev) => [...prev, { id: Date.now(), ...addForm }]);
    setShowAddModal(false);
    setAddForm(emptyForm);
    setIsDirty(false);
    setSuccess("Promo added successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleCloseAddModal = () => {
    if (isDirty && !confirm("You have unsaved changes. Are you sure you want to close?")) return;
    setShowAddModal(false);
    setAddForm(emptyForm);
    setIsDirty(false);
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

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  const navigate = (path: string) => {
    router.push(path);
    setShowMobileMenu(false);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
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
        {/* Header */}
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

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search promos..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="outline-none text-sm text-gray-700 w-full" />
              </div>

              {/* Type Filter */}
              <div className="relative" ref={typeRef}>
                <button onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowStatusDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${typeFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🎁 {typeFilter === "All" ? "Type" : typeFilter} ▾
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...PROMO_TYPES].map((opt) => (
                      <button key={opt} onClick={() => { setTypeFilter(opt); setShowTypeDropdown(false); setCurrentPage(1); }}
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
                  className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                    {["All", "Active", "Inactive"].map((opt) => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Statuses" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(typeFilter !== "All" || statusFilter !== "All") && (
                <button onClick={() => { setTypeFilter("All"); setStatusFilter("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}

              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={() => { setShowAddModal(true); setIsDirty(false); }} className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Promo</button>
            </div>

            {/* Promo Card Grid */}
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3">🎁</p>
                <p className="text-gray-500 font-medium">No promos found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {search ? `No results for "${search}"` : "Add your first promo!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {paginated.map((promo) => (
                  <div key={promo.id} onClick={() => handleCardClick(promo)}
                    className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    {/* Card image / icon area */}
                    <div className="w-full aspect-square bg-gray-100 rounded-t-2xl flex flex-col items-center justify-center relative">
                      {promo.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{TYPE_ICONS[promo.type]}</span>
                      )}
                      {/* Status badge */}
                      <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${promo.status === "Active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>
                        {promo.status}
                      </span>
                    </div>
                    {/* Card info */}
                    <div className="p-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[promo.type]}`}>
                        {promo.type}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{promo.title}</p>
                      <p className="text-xs text-gray-500 truncate">{promo.product}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-0.5">{getPromoLabel(promo)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 flex-wrap mt-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹</button>
                {getPageNumbers().map((page, i) => (
                  page === "..." ? (
                    <span key={i} className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <button key={i} onClick={() => setCurrentPage(Number(page))}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                      {page}
                    </button>
                  )
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PROMO DETAIL / EDIT MODAL */}
      {showPromoModal && selectedPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <p className="text-xs text-gray-400 mb-3 font-medium">Promo {isEditing ? "Editing" : "Details"}</p>
            <div className="flex gap-4">
              {/* Icon area */}
              <div className="w-32 h-32 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-5xl">
                {selectedPromo.image
                  ? <img src={selectedPromo.image} alt={selectedPromo.title} className="w-full h-full object-cover rounded-xl" /> // eslint-disable-line @next/next/no-img-element
                  : TYPE_ICONS[selectedPromo.type]}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {isEditing ? (
                  <>
                    <div><p className="text-xs text-gray-400">Promo Title</p>
                      <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div><p className="text-xs text-gray-400">Product</p>
                      <input value={editForm.product} onChange={(e) => setEditForm({ ...editForm, product: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div><p className="text-xs text-gray-400">Promo Type</p>
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as PromoType })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {PROMO_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    {editForm.type === "Discount" && (
                      <div><p className="text-xs text-gray-400">Discount (%)</p>
                        <input type="number" min="1" max="100" value={editForm.discount ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, discount: e.target.value === "" ? undefined : Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                      </div>
                    )}
                    {editForm.type === "Bundle Deal" && (
                      <div><p className="text-xs text-gray-400">Bundle Qty</p>
                        <input type="number" min="3" value={editForm.bundleQty ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, bundleQty: e.target.value === "" ? undefined : Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                      </div>
                    )}
                    <div><p className="text-xs text-gray-400">Start Date</p>
                      <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div><p className="text-xs text-gray-400">End Date</p>
                      <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PromoStatus })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div><p className="text-xs text-gray-400">Promo Title</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.title}</p>
                    </div>
                    <div><p className="text-xs text-gray-400">Product</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.product}</p>
                    </div>
                    <div><p className="text-xs text-gray-400">Type</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${TYPE_COLORS[selectedPromo.type]}`}>
                        {selectedPromo.type}
                      </span>
                    </div>
                    <div><p className="text-xs text-gray-400">Deal</p>
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">{getPromoLabel(selectedPromo)}</p>
                    </div>
                    <div><p className="text-xs text-gray-400">Duration</p>
                      <p className="text-sm text-gray-700 mt-0.5">{selectedPromo.startDate} → {selectedPromo.endDate}</p>
                    </div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-0.5 ${selectedPromo.status === "Active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>
                        {selectedPromo.status}
                      </span>
                    </div>
                    {selectedPromo.description && (
                      <div><p className="text-xs text-gray-400">Description</p>
                        <p className="text-xs text-gray-600 mt-0.5">{selectedPromo.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">Save</button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 px-4 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">✏️ Edit</button>
                  <button onClick={() => setShowPromoModal(false)} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD PROMO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Promo</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Promo Title</label>
                <input value={addForm.title} onChange={(e) => { setAddForm({ ...addForm, title: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Summer Sale" />
              </div>
              <div><label className="text-xs font-medium text-gray-600">Description</label>
                <textarea value={addForm.description} onChange={(e) => { setAddForm({ ...addForm, description: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 resize-none" rows={2} placeholder="Describe the promo..." />
              </div>
              <div><label className="text-xs font-medium text-gray-600">Product</label>
                <input value={addForm.product} onChange={(e) => { setAddForm({ ...addForm, product: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Coca Cola 1.5L" />
              </div>
              <div><label className="text-xs font-medium text-gray-600">Promo Type</label>
                <select value={addForm.type} onChange={(e) => { setAddForm({ ...addForm, type: e.target.value as PromoType }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {PROMO_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              {addForm.type === "Discount" && (
                <div><label className="text-xs font-medium text-gray-600">Discount Percentage (%)</label>
                  <input type="number" min="1" max="100" value={addForm.discount ?? ""}
                    onChange={(e) => { setAddForm({ ...addForm, discount: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 20" />
                </div>
              )}
              {addForm.type === "Bundle Deal" && (
                <div><label className="text-xs font-medium text-gray-600">Buy how many? (pay for 2)</label>
                  <input type="number" min="3" value={addForm.bundleQty ?? ""}
                    onChange={(e) => { setAddForm({ ...addForm, bundleQty: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 3" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Start Date</label>
                  <input type="date" value={addForm.startDate} onChange={(e) => { setAddForm({ ...addForm, startDate: e.target.value }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
                <div><label className="text-xs font-medium text-gray-600">End Date</label>
                  <input type="date" value={addForm.endDate} onChange={(e) => { setAddForm({ ...addForm, endDate: e.target.value }); setIsDirty(true); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={addForm.status} onChange={(e) => { setAddForm({ ...addForm, status: e.target.value as PromoStatus }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Promo Image URL <span className="text-gray-400">(optional)</span></label>
                <input value={addForm.image} onChange={(e) => { setAddForm({ ...addForm, image: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloseAddModal} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddPromo} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">Add Promo</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Promo?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete <span className="font-semibold text-gray-700">{selectedPromo?.title}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span>
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}
    </div>
  );
}