"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import AlertModal from "@/components/AlertModal";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, Gift,
  Tag, Ribbon, Package as PackageIcon, Search, Calendar, Plus
} from "lucide-react";

type PromoType = "Discount" | "Buy 1 Get 1" | "Bundle Deal";
type PromoStatus = "Active" | "Inactive";

type Promo = {
  id: string;
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
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory" },
  { label: "Supplier Maintenance", icon: Users, path: "/supplier" },
  { label: "Sales Reports", icon: LineChart, path: "/sales" },
  { label: "Transaction Logs", icon: FileText, path: "/transaction" },
  { label: "Product Management", icon: Package, path: "/product" },
  { label: "Account Management", icon: User, path: "/account" },
  { label: "Purchase Order", icon: ClipboardList, path: "/purchase-order" },
  { label: "Return", icon: RotateCcw, path: "/return" },
  { label: "Promo Management", icon: Gift, path: "/promo" },
];

const PROMO_TYPES: PromoType[] = ["Discount", "Buy 1 Get 1", "Bundle Deal"];

const TYPE_COLORS: Record<PromoType, string> = {
  "Discount": "bg-blue-100 text-blue-600",
  "Buy 1 Get 1": "bg-purple-100 text-purple-600",
  "Bundle Deal": "bg-orange-100 text-orange-600",
};

const TYPE_ICONS: Record<PromoType, typeof Tag> = {
  "Discount": Tag,
  "Buy 1 Get 1": Ribbon,
  "Bundle Deal": PackageIcon,
};

const emptyForm = {
  title: "",
  description: "",
  type: "Discount" as PromoType,
  discount: undefined as number | undefined,
  bundleQty: undefined as number | undefined,
  product: "",
  image: "",
  status: "Active" as PromoStatus,
  startDate: "",
  endDate: "",
};

const ITEMS_PER_PAGE = 18;

// ✅ Safe — guards against undefined discount/bundleQty
const getPromoLabel = (promo: Promo) => {
  if (promo.type === "Discount") return promo.discount != null ? `${promo.discount}% OFF` : "Discount";
  if (promo.type === "Buy 1 Get 1") return "BOGO";
  if (promo.type === "Bundle Deal") return promo.bundleQty != null ? `${promo.bundleQty} for 2` : "Bundle";
  return "";
};

// ✅ Helper to parse year/month from a date string safely
const parseYear = (val: string) => val ? parseInt(val.split("-")[0]) : new Date().getFullYear();
const parseMonth = (val: string) => val ? parseInt(val.split("-")[1]) - 1 : new Date().getMonth();

// ✅ Fixed DatePicker — no setState inside useEffect
function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();

  const [viewYear, setViewYear] = useState(() => parseYear(value));
  const [viewMonth, setViewMonth] = useState(() => parseMonth(value));

  // Sync nav to current value when opening (not in useEffect)
  const handleToggle = () => {
    if (!show) {
      setViewYear(parseYear(value));
      setViewMonth(parseMonth(value));
    }
    setShow(!show);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectDate = (day: number) => {
    const month = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${viewYear}-${month}-${dayStr}`);
    setShow(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "";

  const selectedDay = value ? parseInt(value.split("-")[2]) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selectedYear = value ? parseInt(value.split("-")[0]) : null;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="relative" ref={ref}>
      {label && <p className="text-xs text-gray-400 mb-1">{label}</p>}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-left hover:border-indigo-400 transition-colors focus:outline-none focus:border-indigo-400 bg-white"
      >
        <Calendar className="w-3 h-3 text-gray-400" />
        <span className={`flex-1 ${displayValue ? "text-gray-900" : "text-gray-400"}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-gray-300 hover:text-gray-500 text-xs ml-auto"
          >
            ✕
          </button>
        )}
      </button>

      {show && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-[9999] w-64 p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-sm">‹</button>
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-semibold text-gray-800 border-none outline-none bg-transparent cursor-pointer"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <input
                type="number"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="w-14 text-xs font-semibold text-gray-800 border border-gray-200 rounded px-1 text-center outline-none focus:border-indigo-400"
              />
            </div>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-sm">›</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-colors
                    ${isSelected ? "bg-indigo-600 text-white font-semibold"
                      : isToday ? "border border-indigo-400 text-indigo-600 font-semibold"
                      : "text-gray-700 hover:bg-indigo-50"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today.getDate()); }}
            className="w-full mt-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}

export default function PromoManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [isDirty, setIsDirty] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [alertModal, setAlertModal] = useState<{
    open: boolean; type?: "alert" | "confirm"; title?: string;
    message: string; danger?: boolean;
    onConfirm: () => void; onCancel?: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const showAlert = (message: string, title?: string) => {
    setAlertModal({ open: true, type: "alert", title, message, onConfirm: () => setAlertModal((a) => ({ ...a, open: false })) });
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string, danger = false) => {
    setAlertModal({
      open: true, type: "confirm", title, message, danger,
      onConfirm: () => { setAlertModal((a) => ({ ...a, open: false })); onConfirm(); },
      onCancel: () => setAlertModal((a) => ({ ...a, open: false })),
    });
  };

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

  const fetchPromos = async () => {
  try {
    setLoading(true);
    const data = await api.getPromos();
    const raw = Array.isArray(data) ? data : (data?.promos ?? data?.data ?? []);

    const normalize = (item: any): Promo => ({
      id: String(item.id ?? ""),
      title: String(item.promoName ?? ""),                          // ← promoName
      description: String(item.description ?? ""),
      type: (["Discount", "Buy 1 Get 1", "Bundle Deal"].includes(item.type)
        ? item.type
        : "Discount") as PromoType,                                 // ← no type in DB, default Discount
      discount: item.discountPercent != null
        ? Number(item.discountPercent)
        : undefined,                                                 // ← discountPercent
      bundleQty: item.bundleQty != null ? Number(item.bundleQty) : undefined,
      product: typeof item.product === "object"
        ? String(item.product?.name ?? item.product?.productName ?? "")
        : String(item.product ?? ""),                               // ← product is a populated object
      image: String(item.image ?? item.product?.image ?? ""),       // ← try product image
      status: item.isActive === true ? "Active" : "Inactive",      // ← isActive boolean
      startDate: item.dateEffective
        ? String(item.dateEffective).split("T")[0]
        : "",                                                        // ← dateEffective
      endDate: item.lastDate
        ? String(item.lastDate).split("T")[0]
        : "",                                                        // ← lastDate
    });

    setPromos(raw.map(normalize));
  } catch (err) {
    console.error("Failed to fetch promos:", err);
    setError("Failed to load promos.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchPromos(); }, []);

  const showToast = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  // ✅ Safe filter — guards against null/undefined title and product
  const filtered = promos.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = (p.title ?? "").toLowerCase().includes(q) || (p.product ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "All" || p.type === typeFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalActive = promos.filter((p) => p.status === "Active").length;
  const totalDiscount = promos.filter((p) => p.type === "Discount").length;
  const totalBogo = promos.filter((p) => p.type === "Buy 1 Get 1").length;

  const handleCardClick = (promo: Promo) => {
    setSelectedPromo(promo);
    setEditForm({
      title: promo.title ?? "",
      description: promo.description ?? "",
      type: promo.type,
      discount: promo.discount,
      bundleQty: promo.bundleQty,
      product: promo.product ?? "",
      image: promo.image ?? "",
      status: promo.status,
      startDate: promo.startDate?.split("T")[0] || "",
      endDate: promo.endDate?.split("T")[0] || "",
    });
    setIsEditing(false);
    setShowPromoModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title) { showAlert("Promo title is required.", "Missing Field"); return; }
    if (!editForm.product) { showAlert("Product is required.", "Missing Field"); return; }
    if (!editForm.startDate || !editForm.endDate) { showAlert("Start and End dates are required.", "Missing Field"); return; }
    if (new Date(editForm.startDate) > new Date(editForm.endDate)) { showAlert("Start date must be before end date.", "Invalid Date"); return; }
    if (editForm.type === "Discount" && (!editForm.discount || Number(editForm.discount) <= 0)) { showAlert("Please enter a valid discount percentage.", "Missing Field"); return; }
    try {
      setEditLoading(true);
      await api.updatePromo(selectedPromo!.id, {
        promoName:       editForm.title,
        discountPercent: editForm.discount ? Number(editForm.discount) : null,
        alteredPrice:    0,
        dateEffective:   editForm.startDate,
        lastDate:        editForm.endDate,
        isActive:        editForm.status === "Active",
      });
      await fetchPromos();
      setIsEditing(false);
      setShowPromoModal(false);
      showToast("Promo updated successfully!");
    } catch (err) {
      showToast("Failed to update promo.", true);
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (promo: Promo) => {
  try {
    await api.togglePromo(promo.id);
    await fetchPromos();
    // Update selectedPromo to reflect new status
    setSelectedPromo((prev) =>
      prev ? { ...prev, status: prev.status === "Active" ? "Inactive" : "Active" } : prev
    );
    showToast(`Promo ${promo.status === "Active" ? "deactivated" : "activated"}!`);
  } catch (err) {
    showToast("Failed to toggle promo status.", true);
  }
};

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await api.deletePromo(selectedPromo!.id);
      await fetchPromos();
      setShowDeleteConfirm(false);
      setShowPromoModal(false);
      setSelectedPromo(null);
      showToast("Promo deleted successfully!");
    } catch (err) {
      showToast("Failed to delete promo.", true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddPromo = async () => {
  if (!addForm.title) { showAlert("Promo title is required.", "Missing Field"); return; }
  if (!addForm.product) { showAlert("Product ID is required.", "Missing Field"); return; }
  if (!addForm.startDate || !addForm.endDate) { showAlert("Start and End dates are required.", "Missing Field"); return; }
  if (new Date(addForm.startDate) > new Date(addForm.endDate)) { showAlert("Start date must be before end date.", "Invalid Date"); return; }
  try {
    setAddLoading(true);
    await api.createPromo({
      promoName:       addForm.title,                              // ← title → promoName
      productId:       addForm.product,                            // ← product is productId for create
      discountPercent: addForm.discount ? Number(addForm.discount) : null,
      alteredPrice:    0,                                          // ← required by backend
      dateEffective:   addForm.startDate,                          // ← startDate → dateEffective
      lastDate:        addForm.endDate,                            // ← endDate → lastDate
      isActive:        addForm.status === "Active",                // ← status → isActive boolean
    });
    await fetchPromos();
    setShowAddModal(false);
    setAddForm(emptyForm);
    setIsDirty(false);
    showToast("Promo added successfully!");
  } catch (err) {
    showToast("Failed to add promo.", true);
  } finally {
    setAddLoading(false);
  }
};

  const handleCloseAddModal = () => {
    if (isDirty) {
      showConfirm("You have unsaved changes. Are you sure you want to close?", () => {
        setShowAddModal(false); setAddForm(emptyForm); setIsDirty(false);
      }, "Unsaved Changes");
    } else {
      setShowAddModal(false); setAddForm(emptyForm); setIsDirty(false);
    }
  };

  const handleExport = () => {
    const headers = ["Title", "Product", "Type", "Discount%", "Bundle Qty", "Status", "Start Date", "End Date"];
    const rows = promos.map((p) => [p.title, p.product, p.type, p.discount || "", p.bundleQty || "", p.status, p.startDate, p.endDate]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "promos.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
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

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AlertModal {...alertModal} />

      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10"><p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p></div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                <div className="relative flex items-center gap-2 w-full">
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                  {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300" style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }} onClick={() => setShowMobileMenu(!showMobileMenu)}>
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
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🎁</div><div><p className="text-xs text-gray-400">Total Promos</p><p className="text-xl font-bold text-gray-800">{promos.length}</p></div></div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">✅</div><div><p className="text-xs text-gray-400">Active</p><p className="text-xl font-bold text-green-600">{totalActive}</p></div></div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">💙</div><div><p className="text-xs text-gray-400">Discounts</p><p className="text-xl font-bold text-blue-600">{totalDiscount}</p></div></div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">🎀</div><div><p className="text-xs text-gray-400">BOGO</p><p className="text-xl font-bold text-purple-600">{totalBogo}</p></div></div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search promos..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="outline-none text-sm text-gray-700 w-full" />
              </div>
              <div className="relative" ref={typeRef}>
                <button onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowStatusDropdown(false); }} className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${typeFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🎁 {typeFilter === "All" ? "Type" : typeFilter} ▾
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...PROMO_TYPES].map((opt) => (
                      <button key={opt} onClick={() => { setTypeFilter(opt); setShowTypeDropdown(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${typeFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>{opt === "All" ? "All Types" : opt}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={statusRef}>
                <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowTypeDropdown(false); }} className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                    {["All", "Active", "Inactive"].map((opt) => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>{opt === "All" ? "All Statuses" : opt}</button>
                    ))}
                  </div>
                )}
              </div>
              {(typeFilter !== "All" || statusFilter !== "All") && (
                <button onClick={() => { setTypeFilter("All"); setStatusFilter("All"); setCurrentPage(1); }} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}
              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={() => { setShowAddModal(true); setIsDirty(false); }} className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Promo</button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center"><p className="text-4xl mb-3 animate-bounce">🎁</p><p className="text-gray-400 text-sm">Loading promos...</p></div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center"><p className="text-4xl mb-3">🎁</p><p className="text-gray-500 font-medium">No promos found</p><p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : "Add your first promo!"}</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {paginated.map((promo) => (
                  <div key={promo.id} onClick={() => handleCardClick(promo)} className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-full aspect-square bg-gray-100 rounded-t-2xl flex flex-col items-center justify-center relative">
                      {promo.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={promo.image} alt={promo.title ?? "Promo"} className="w-full h-full object-cover" />
                        : React.createElement(TYPE_ICONS[promo.type] ?? Gift, { className: "w-12 h-12 text-gray-300" })}
                      <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${promo.status === "Active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>{promo.status}</span>
                    </div>
                    <div className="p-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[promo.type] ?? "bg-gray-100 text-gray-600"}`}>{promo.type}</span>
                      <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{promo.title ?? "—"}</p>
                      <p className="text-xs text-gray-500 truncate">{promo.product ?? "—"}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-0.5">{getPromoLabel(promo)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 flex-wrap mt-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹</button>
                {getPageNumbers().map((page, i) => (
                  page === "..." ? <span key={i} className="px-2 py-1 text-gray-400">...</span> : (
                    <button key={i} onClick={() => setCurrentPage(Number(page))} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{page}</button>
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
            <div className="flex gap-4">
              <div className="w-32 h-32 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-5xl">
                {selectedPromo.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={selectedPromo.image} alt={selectedPromo.title ?? "Promo"} className="w-full h-full object-cover rounded-xl" />
                  : React.createElement(TYPE_ICONS[selectedPromo.type] ?? Gift, { className: "w-12 h-12" })}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {isEditing ? (
                  <>
                    <div><p className="text-xs text-gray-400">Promo Title</p><input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                    <div><p className="text-xs text-gray-400">Description</p><textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 resize-none" rows={2} /></div>
                    <div><p className="text-xs text-gray-400">Product</p><input value={editForm.product} onChange={(e) => setEditForm({ ...editForm, product: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                    <div><p className="text-xs text-gray-400">Promo Type</p><select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as PromoType })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">{PROMO_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                    {editForm.type === "Discount" && <div><p className="text-xs text-gray-400">Discount (%)</p><input type="number" min="1" max="100" value={editForm.discount ?? ""} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>}
                    {editForm.type === "Bundle Deal" && <div><p className="text-xs text-gray-400">Bundle Qty</p><input type="number" min="3" value={editForm.bundleQty ?? ""} onChange={(e) => setEditForm({ ...editForm, bundleQty: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>}
                    <DatePicker label="Start Date" value={editForm.startDate} onChange={(val) => setEditForm({ ...editForm, startDate: val })} />
                    <DatePicker label="End Date" value={editForm.endDate} onChange={(val) => setEditForm({ ...editForm, endDate: val })} />
                    <div><p className="text-xs text-gray-400">Status</p><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PromoStatus })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                    <div><p className="text-xs text-gray-400">Image URL (optional)</p><input value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="https://..." /></div>
                  </>
                ) : (
                  <>
                    <div><p className="text-xs text-gray-400">Promo Title</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.title ?? "—"}</p></div>
                    <div><p className="text-xs text-gray-400">Product</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedPromo.product ?? "—"}</p></div>
                    <div><p className="text-xs text-gray-400">Type</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${TYPE_COLORS[selectedPromo.type] ?? "bg-gray-100 text-gray-600"}`}>{selectedPromo.type}</span></div>
                    <div><p className="text-xs text-gray-400">Deal</p><p className="text-sm font-bold text-indigo-600 mt-0.5">{getPromoLabel(selectedPromo)}</p></div>
                    <div>
                      <p className="text-xs text-gray-400">Duration</p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {selectedPromo.startDate ? new Date(selectedPromo.startDate.split("T")[0] + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        {" → "}
                        {selectedPromo.endDate ? new Date(selectedPromo.endDate.split("T")[0] + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <button onClick={() => handleToggleStatus(selectedPromo)} className={`text-xs px-3 py-1 rounded-full font-medium inline-block mt-0.5 cursor-pointer transition-colors ${selectedPromo.status === "Active" ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                        {selectedPromo.status} (click to toggle)
                      </button>
                    </div>
                    {selectedPromo.description && <div><p className="text-xs text-gray-400">Description</p><p className="text-xs text-gray-600 mt-0.5">{selectedPromo.description}</p></div>}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} disabled={editLoading} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600 disabled:opacity-60">{editLoading ? "Saving..." : "Save"}</button>
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
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Promo Title</label><input value={addForm.title} onChange={(e) => { setAddForm({ ...addForm, title: e.target.value }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Summer Sale" /></div>
              <div><label className="text-xs font-medium text-gray-600">Description</label><textarea value={addForm.description} onChange={(e) => { setAddForm({ ...addForm, description: e.target.value }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 resize-none" rows={2} placeholder="Describe the promo..." /></div>
              <div><label className="text-xs font-medium text-gray-600">Product</label><input value={addForm.product} onChange={(e) => { setAddForm({ ...addForm, product: e.target.value }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. Coca Cola 1.5L" /></div>
              <div><label className="text-xs font-medium text-gray-600">Promo Type</label><select value={addForm.type} onChange={(e) => { setAddForm({ ...addForm, type: e.target.value as PromoType }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">{PROMO_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              {addForm.type === "Discount" && <div><label className="text-xs font-medium text-gray-600">Discount Percentage (%)</label><input type="number" min="1" max="100" value={addForm.discount ?? ""} onChange={(e) => { setAddForm({ ...addForm, discount: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 20" /></div>}
              {addForm.type === "Bundle Deal" && <div><label className="text-xs font-medium text-gray-600">Buy how many? (pay for 2)</label><input type="number" min="3" value={addForm.bundleQty ?? ""} onChange={(e) => { setAddForm({ ...addForm, bundleQty: e.target.value === "" ? undefined : Number(e.target.value) }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. 3" /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Start Date</label>
                  <div className="mt-1">
                    <DatePicker value={addForm.startDate} onChange={(val) => { setAddForm({ ...addForm, startDate: val }); setIsDirty(true); }} placeholder="Start date" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">End Date</label>
                  <div className="mt-1">
                    <DatePicker value={addForm.endDate} onChange={(val) => { setAddForm({ ...addForm, endDate: val }); setIsDirty(true); }} placeholder="End date" />
                  </div>
                </div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Status</label><select value={addForm.status} onChange={(e) => { setAddForm({ ...addForm, status: e.target.value as PromoStatus }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
              <div><label className="text-xs font-medium text-gray-600">Promo Image URL <span className="text-gray-400">(optional)</span></label><input value={addForm.image} onChange={(e) => { setAddForm({ ...addForm, image: e.target.value }); setIsDirty(true); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="https://..." /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloseAddModal} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddPromo} disabled={addLoading} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60">{addLoading ? "Adding..." : "Add Promo"}</button>
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
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete <span className="font-semibold text-gray-700">{selectedPromo?.title ?? "this promo"}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60">{deleteLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {success && <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>✅</span><span className="text-sm font-medium">{success}</span></div>}
      {error && <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>❌</span><span className="text-sm font-medium">{error}</span></div>}
    </div>
  );
}