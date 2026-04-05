"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

type PromoStatus = "Active" | "Inactive";

type Promo = {
  id: string;
  promoName: string;
  productId: string;
  alteredPrice: number;
  discountPercent?: number;
  dateEffective: string;
  lastDate: string;
  isActive: boolean;
  product?: { id: string; productName: string; price: number };
};

type Product = { id: string; productName: string; price: number };

const navItems = [
  { label: "Dashboard",             icon: "🏠", path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: "📊", path: "/supplier"       },
  { label: "Sales Reports",         icon: "🌐", path: "/sales"          },
  { label: "Transaction Logs",      icon: "▦",  path: "/transaction"    },
  { label: "Product Management",    icon: "🗒️", path: "/product"        },
  { label: "Account Management",    icon: "👤", path: "/account"        },
  { label: "Purchase Order",        icon: "📋", path: "/purchase-order" },
  { label: "Promo Management",      icon: "🎁", path: "/promo"          },
];

const emptyForm = {
  productId:       "",
  promoName:       "",
  alteredPrice:    "" as number | "",
  discountPercent: "" as number | "",
  dateEffective:   "",
  lastDate:        "",
  isActive:        true,
};

const ITEMS_PER_PAGE = 18;

export default function PromoManagementPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [promos,         setPromos]         = useState<Promo[]>([]);
  const [products,       setProducts]       = useState<Product[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [currentPage,    setCurrentPage]    = useState(1);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm,      setAddForm]      = useState(emptyForm);
  const [isDirty,      setIsDirty]      = useState(false);
  const [addLoading,   setAddLoading]   = useState(false);

  // Detail/edit modal
  const [showPromoModal,  setShowPromoModal]  = useState(false);
  const [selectedPromo,   setSelectedPromo]   = useState<Promo | null>(null);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editForm,        setEditForm]        = useState(emptyForm);
  const [editLoading,     setEditLoading]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch promos + products ──────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [promosData, productsData] = await Promise.all([
        api.getPromos(),
        api.getProducts(),
      ]);
      setPromos(Array.isArray(promosData) ? promosData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error("Failed to fetch:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = promos.filter((p) => {
    const matchSearch = p.promoName.toLowerCase().includes(search.toLowerCase()) ||
      (p.product?.productName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" ||
      (statusFilter === "Active" && p.isActive) ||
      (statusFilter === "Inactive" && !p.isActive);
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalActive = promos.filter((p) => p.isActive).length;

  // ── Card click ───────────────────────────────────────────────────────────
  const handleCardClick = (promo: Promo) => {
    setSelectedPromo(promo);
    setEditForm({
      productId:       promo.productId,
      promoName:       promo.promoName,
      alteredPrice:    promo.alteredPrice,
      discountPercent: promo.discountPercent ?? "",
      dateEffective:   promo.dateEffective?.split("T")[0] || "",
      lastDate:        promo.lastDate?.split("T")[0] || "",
      isActive:        promo.isActive,
    });
    setIsEditing(false);
    setShowPromoModal(true);
  };

  // ── Save edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editForm.productId)   { alert("Please select a product."); return; }
    if (!editForm.promoName)   { alert("Promo name is required."); return; }
    if (!editForm.alteredPrice || Number(editForm.alteredPrice) <= 0) {
      alert("Please enter a valid promo price."); return;
    }
    if (!editForm.dateEffective || !editForm.lastDate) {
      alert("Start and end dates are required."); return;
    }
    if (new Date(editForm.dateEffective) > new Date(editForm.lastDate)) {
      alert("Start date must be before end date."); return;
    }
    try {
      setEditLoading(true);
      await api.updatePromo(selectedPromo!.id, {
        productId:       editForm.productId,
        promoName:       editForm.promoName,
        alteredPrice:    Number(editForm.alteredPrice),
        discountPercent: editForm.discountPercent !== "" ? Number(editForm.discountPercent) : undefined,
        dateEffective:   editForm.dateEffective,
        lastDate:        editForm.lastDate,
        isActive:        editForm.isActive,
      });
      await fetchAll();
      setIsEditing(false);
      setShowPromoModal(false);
      showToast("Promo updated successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to update promo.", true);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Toggle status ────────────────────────────────────────────────────────
  const handleToggleStatus = async (promo: Promo) => {
    try {
      await api.togglePromo(promo.id);
      await fetchAll();
      showToast(`Promo ${promo.isActive ? "deactivated" : "activated"}!`);
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle promo status.", true);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await api.deletePromo(selectedPromo!.id);
      await fetchAll();
      setShowDeleteConfirm(false);
      setShowPromoModal(false);
      setSelectedPromo(null);
      showToast("Promo deleted successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete promo.", true);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Add promo ────────────────────────────────────────────────────────────
  const handleAddPromo = async () => {
    if (!addForm.productId)   { alert("Please select a product."); return; }
    if (!addForm.promoName)   { alert("Promo name is required."); return; }
    if (!addForm.alteredPrice || Number(addForm.alteredPrice) <= 0) {
      alert("Please enter a valid promo price."); return;
    }
    if (!addForm.dateEffective || !addForm.lastDate) {
      alert("Start and end dates are required."); return;
    }
    if (new Date(addForm.dateEffective) > new Date(addForm.lastDate)) {
      alert("Start date must be before end date."); return;
    }
    try {
      setAddLoading(true);
      await api.createPromo({
        productId:       addForm.productId,
        promoName:       addForm.promoName,
        alteredPrice:    Number(addForm.alteredPrice),
        discountPercent: addForm.discountPercent !== "" ? Number(addForm.discountPercent) : undefined,
        dateEffective:   addForm.dateEffective,
        lastDate:        addForm.lastDate,
        isActive:        addForm.isActive,
      });
      await fetchAll();
      setShowAddModal(false);
      setAddForm(emptyForm);
      setIsDirty(false);
      showToast("Promo added successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to add promo.", true);
    } finally {
      setAddLoading(false);
    }
  };

  const handleCloseAddModal = () => {
    if (isDirty && !confirm("You have unsaved changes. Are you sure you want to close?")) return;
    setShowAddModal(false);
    setAddForm(emptyForm);
    setIsDirty(false);
  };

  const handleExport = () => {
    const headers = ["ID", "Promo Name", "Product", "Altered Price", "Discount%", "Start Date", "End Date", "Active"];
    const rows = promos.map((p) => [
      p.id, p.promoName, p.product?.productName || p.productId,
      p.alteredPrice, p.discountPercent || "", p.dateEffective, p.lastDate, p.isActive
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "promos.csv"; a.click();
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    router.push("/");
  };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

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

  // ── Shared form fields (used in both Add and Edit modals) ────────────────
  const renderFormFields = (
    form: typeof emptyForm,
    setForm: (f: typeof emptyForm) => void,
    markDirty?: () => void
  ) => {
    const update = (patch: Partial<typeof emptyForm>) => {
      setForm({ ...form, ...patch });
      markDirty?.();
    };
    return (
      <div className="flex flex-col gap-3">
        {/* Product */}
        <div>
          <label className="text-xs font-medium text-gray-600">Product <span className="text-red-400">*</span></label>
          <select value={form.productId} onChange={(e) => update({ productId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
            <option value="">— Select a product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.productName} (₱{p.price})</option>
            ))}
          </select>
        </div>
        {/* Promo name */}
        <div>
          <label className="text-xs font-medium text-gray-600">Promo Name <span className="text-red-400">*</span></label>
          <input value={form.promoName} onChange={(e) => update({ promoName: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
            placeholder="e.g. Summer Sale" />
        </div>
        {/* Altered price */}
        <div>
          <label className="text-xs font-medium text-gray-600">Promo Price (₱) <span className="text-red-400">*</span></label>
          <input type="number" min="0" step="0.01" value={form.alteredPrice}
            onChange={(e) => update({ alteredPrice: e.target.value === "" ? "" : Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
            placeholder="e.g. 59.00" />
        </div>
        {/* Discount percent */}
        <div>
          <label className="text-xs font-medium text-gray-600">Discount % <span className="text-gray-400">(optional)</span></label>
          <input type="number" min="0" max="100" value={form.discountPercent}
            onChange={(e) => update({ discountPercent: e.target.value === "" ? "" : Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
            placeholder="e.g. 20" />
        </div>
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Start Date <span className="text-red-400">*</span></label>
            <input type="date" value={form.dateEffective} onChange={(e) => update({ dateEffective: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">End Date <span className="text-red-400">*</span></label>
            <input type="date" value={form.lastDate} onChange={(e) => update({ lastDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
          </div>
        </div>
        {/* isActive toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-600 flex-1">Active immediately</span>
          <button type="button" onClick={() => update({ isActive: !form.isActive })}
            className={`w-11 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    );
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
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🎁</div>
              <div><p className="text-xs text-gray-400">Total Promos</p><p className="text-xl font-bold text-gray-800">{promos.length}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">✅</div>
              <div><p className="text-xs text-gray-400">Active</p><p className="text-xl font-bold text-green-600">{totalActive}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">⏸️</div>
              <div><p className="text-xs text-gray-400">Inactive</p><p className="text-xl font-bold text-gray-500">{promos.length - totalActive}</p></div>
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

              {/* Status Filter */}
              <div className="relative" ref={statusRef}>
                <button onClick={() => setShowStatusDropdown(!showStatusDropdown)}
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

              {statusFilter !== "All" && (
                <button onClick={() => { setStatusFilter("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}

              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={() => { setShowAddModal(true); setIsDirty(false); }}
                className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">
                + Add Promo
              </button>
            </div>

            {/* Promo Cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3 animate-bounce">🎁</p>
                <p className="text-gray-400 text-sm">Loading promos...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3">🎁</p>
                <p className="text-gray-500 font-medium">No promos found</p>
                <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : "Add your first promo!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {paginated.map((promo) => (
                  <div key={promo.id} onClick={() => handleCardClick(promo)}
                    className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-full aspect-square bg-indigo-50 rounded-t-2xl flex flex-col items-center justify-center relative">
                      <span className="text-4xl">🎁</span>
                      <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${promo.isActive ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>
                        {promo.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{promo.promoName}</p>
                      <p className="text-xs text-gray-500 truncate">{promo.product?.productName || promo.productId}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-0.5">₱{promo.alteredPrice}</p>
                      {promo.discountPercent && (
                        <p className="text-xs text-green-600">{promo.discountPercent}% off</p>
                      )}
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
                  page === "..." ? <span key={i} className="px-2 py-1 text-gray-400">...</span> : (
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <p className="text-xs text-gray-400 mb-3 font-medium">Promo {isEditing ? "Editing" : "Details"}</p>

            {isEditing ? (
              renderFormFields(editForm, setEditForm)
            ) : (
              <div className="flex flex-col gap-3">
                <div><p className="text-xs text-gray-400">Promo Name</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.promoName}</p></div>
                <div><p className="text-xs text-gray-400">Product</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.product?.productName || selectedPromo.productId}</p></div>
                <div><p className="text-xs text-gray-400">Promo Price</p><p className="text-sm font-bold text-indigo-600 mt-0.5">₱{selectedPromo.alteredPrice}</p></div>
                {selectedPromo.discountPercent && (
                  <div><p className="text-xs text-gray-400">Discount</p><p className="text-sm text-green-600 mt-0.5">{selectedPromo.discountPercent}% off</p></div>
                )}
                <div><p className="text-xs text-gray-400">Duration</p>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedPromo.dateEffective?.split("T")[0]} → {selectedPromo.lastDate?.split("T")[0]}</p>
                </div>
                <div><p className="text-xs text-gray-400">Status</p>
                  <button onClick={() => handleToggleStatus(selectedPromo)}
                    className={`text-xs px-3 py-1 rounded-full font-medium inline-block mt-0.5 cursor-pointer transition-colors ${selectedPromo.isActive ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                    {selectedPromo.isActive ? "Active" : "Inactive"} (click to toggle)
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5 justify-end">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} disabled={editLoading} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600 disabled:opacity-60">
                    {editLoading ? "Saving..." : "Save"}
                  </button>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Promo</h2>
            {renderFormFields(addForm, setAddForm, () => setIsDirty(true))}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloseAddModal} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddPromo} disabled={addLoading} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60">
                {addLoading ? "Adding..." : "Add Promo"}
              </button>
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
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete <span className="font-semibold text-gray-700">{selectedPromo?.promoName}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span><span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* ERROR TOAST */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>❌</span><span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
