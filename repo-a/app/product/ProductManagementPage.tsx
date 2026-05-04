"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, Gift,
  FolderOpen, Coffee, Zap, ChevronDown, Search, Beer, Droplets, ShoppingBasket
} from "lucide-react";

type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: {
  value: CaseUnit; label: string; short: string; bottlesPerCase: number | null;
}[] = [
  { value: "case_24", label: "Case (24 pcs)", short: "24-cs", bottlesPerCase: 24 },
  { value: "case_12", label: "Case (12 pcs)", short: "12-cs", bottlesPerCase: 12 },
  { value: "case_6",  label: "Case (6 pcs)",  short: "6-cs",  bottlesPerCase: 6  },
  { value: "btl",     label: "Bottles",        short: "btl",   bottlesPerCase: null },
  { value: "pcs",     label: "Pieces",         short: "pcs",   bottlesPerCase: null },
];

const getUnit = (u?: string): typeof CASE_UNITS[number] =>
  CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: Users, path: "/supplier"       },
  { label: "Sales Reports",         icon: LineChart, path: "/sales"          },
  { label: "Transaction Logs",      icon: FileText, path: "/transaction"    },
  { label: "Product Management",    icon: Package, path: "/product"        },
  { label: "Account Management",    icon: User, path: "/account"        },
  { label: "Purchase Order",        icon: ClipboardList, path: "/purchase-order" },
  { label: "Return", icon: RotateCcw, path: "/return" },
  { label: "Promo Management",      icon: Gift, path: "/promo"          },
];

// ── Fused qty + case-unit dropdown ───────────────────────────────────────────
function CaseUnitInput({
  quantity, unit, onQuantityChange, onUnitChange,
}: {
  quantity: number | string; unit: CaseUnit;
  onQuantityChange: (v: number | string) => void; onUnitChange: (u: CaseUnit) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = getUnit(unit);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const qty       = Number(quantity) || 0;
  const totalBtl  = sel.bottlesPerCase ? qty * sel.bottlesPerCase : null;

  return (
    <div ref={ref}>
      <div className="flex mt-1">
        <input
          type="number" inputMode="numeric" min={0} value={quantity}
          onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            onQuantityChange(val);
          }}
          placeholder="0"
          className="flex-1 border border-r-0 border-gray-200 rounded-l-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 text-gray-900 min-w-0"
        />
        <button
          type="button" onClick={() => setOpen(!open)}
          className={`relative flex items-center gap-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors select-none whitespace-nowrap shrink-0
            ${open ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
          {sel.short}
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {open && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-52 overflow-hidden">
              {CASE_UNITS.map((u) => (
                <button key={u.value} type="button"
                  onClick={(e) => { e.stopPropagation(); onUnitChange(u.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                    ${unit === u.value ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                  <div>
                    <p className={`text-sm font-medium ${unit === u.value ? "text-indigo-700" : "text-gray-800"}`}>{u.label}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-2 shrink-0 ${unit === u.value ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                      {u.short}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </button>
      </div>
      {qty > 0 && totalBtl !== null && (
        <p className="text-xs text-indigo-500 mt-1 font-medium">
          {qty} × {sel.bottlesPerCase} = {totalBtl} bottles total
        </p>
      )}
    </div>
  );
}

// ── Stock badge ───────────────────────────────────────────────────────────────
function CaseBadge({ quantity, unit, compact = false }: {
  quantity: number; unit?: string; compact?: boolean;
}) {
  const u        = getUnit(unit);
  const qty      = Number(quantity) || 0;
  const totalBtl = u.bottlesPerCase ? qty * u.bottlesPerCase : null;

  const color = qty === 0
    ? "bg-red-100 text-red-700 border-red-200"
    : qty <= 10
    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-green-100 text-green-700 border-green-200";

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${color}`}>
        {qty} <span className="font-normal opacity-80">{u.short}</span>
      </span>
      <span className={`text-xs font-medium ${compact ? "text-gray-400" : "text-indigo-500"}`}>
        {totalBtl !== null ? `${qty} × ${u.bottlesPerCase} = ${totalBtl} btl` : null}
      </span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
  id: string; productName: string; size: string | null;
  price: number; category: string; stockQuantity: number;
  stockUnit: CaseUnit; status: string; supplierId: string; image: string | null;
  supplier?: { id: string; supplierName: string };
};

const categories = ["All", "SOFTDRINKS", "ENERGY_DRINK", "BEER", "JUICE", "WATER", "OTHER"];
const sizes      = ["All", "237ml", "250ml", "290ml", "330ml", "500ml", "1L", "1.5L", "2L"];
const ITEMS_PER_PAGE = 18;

const getCategoryColor = (cat: string) => ({
  SOFTDRINKS:   "bg-blue-100 text-blue-600",
  ENERGY_DRINK: "bg-yellow-100 text-yellow-600",
  BEER:         "bg-amber-100 text-amber-600",
  JUICE:        "bg-orange-100 text-orange-600",
  WATER:        "bg-cyan-100 text-cyan-600",
  OTHER:        "bg-gray-100 text-gray-600",
}[cat] || "bg-gray-100 text-gray-600");

const getCategoryIcon = (cat: string) => {
  const icons: Record<string, { icon: typeof Coffee; color: string }> = {
    SOFTDRINKS:   { icon: Coffee, color: "text-blue-500" },
    ENERGY_DRINK: { icon: Zap, color: "text-yellow-500" },
    BEER:         { icon: Beer, color: "text-amber-600" },
    JUICE:        { icon: Droplets, color: "text-orange-500" },
    WATER:        { icon: Droplets, color: "text-cyan-500" },
    OTHER:        { icon: ShoppingBasket, color: "text-gray-500" },
  };
  return icons[cat?.toUpperCase()] || { icon: Coffee, color: "text-gray-500" };
};

function AlertModal({ open, type = "alert", title, message, danger, onConfirm, onCancel }: {
  open: boolean; type?: "alert" | "confirm"; title?: string; message: string;
  danger?: boolean; onConfirm: () => void; onCancel?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl text-center">
        <p className="text-2xl mb-2">{danger ? "⚠️" : type === "confirm" ? "❓" : "ℹ️"}</p>
        {title && <h2 className="text-base font-bold text-gray-800 mb-1">{title}</h2>}
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3">
          {type === "confirm" && (
            <button onClick={onCancel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          )}
          <button onClick={onConfirm}
            className={`flex-1 rounded-lg py-2 text-sm text-white font-medium ${danger ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {type === "confirm" ? (danger ? "Delete" : "Confirm") : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner icon ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

const defaultForm = () => ({
  productName: "", size: "500ml", price: "",
  category: "SOFTDRINKS", stockQuantity: "",
  stockUnit: "case_24" as CaseUnit, supplierId: "", status: "ACTIVE",
  piecesPerCase: "24",
});

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProductManagementPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search,         setSearch]         = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSize,     setSelectedSize]     = useState("All");
  const [currentPage,      setCurrentPage]      = useState(1);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; supplierName: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState("");
  const [error,    setError]    = useState("");

  const [showAddModal,     setShowAddModal]     = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct,  setSelectedProduct]  = useState<Product | null>(null);
  const [isEditing,        setIsEditing]        = useState(false);
  const [addForm,  setAddForm]  = useState(defaultForm());
  const [editForm, setEditForm] = useState(defaultForm());

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSizeDropdown,     setShowSizeDropdown]     = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showPcsDropdown,      setShowPcsDropdown]      = useState(false);
  const [showEditPcsDropdown,  setShowEditPcsDropdown]  = useState(false);
  const [selectedSupplier,     setSelectedSupplier]     = useState("All");
  const categoryRef = useRef<HTMLDivElement>(null);
  const sizeRef     = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);
  const pcsRef      = useRef<HTMLDivElement>(null);
  const editPcsRef  = useRef<HTMLDivElement>(null);

  // ── FIX: Refs to prevent double-submission ────────────────────────────────
  const isAddingRef  = useRef(false);
  const isEditingRef = useRef(false);

  const [alertModal, setAlertModal] = useState<{
    open: boolean; type?: "alert" | "confirm"; title?: string;
    message: string; danger?: boolean; onConfirm: () => void; onCancel?: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const showAlert = (msg: string, title?: string) =>
    setAlertModal({ open: true, type: "alert", title, message: msg, onConfirm: () => setAlertModal((a) => ({ ...a, open: false })) });

  const showConfirm = (msg: string, fn: () => void, title?: string, danger = false) =>
    setAlertModal({ open: true, type: "confirm", title, message: msg, danger,
      onConfirm: () => { setAlertModal((a) => ({ ...a, open: false })); fn(); },
      onCancel:  () => setAlertModal((a) => ({ ...a, open: false })),
    });

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setShowSizeDropdown(false);
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDropdown(false);
      if (pcsRef.current && !pcsRef.current.contains(e.target as Node)) setShowPcsDropdown(false);
      if (editPcsRef.current && !editPcsRef.current.contains(e.target as Node)) setShowEditPcsDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeProduct = (p: any): Product => ({
    id:            p.id,
    productName:   p.productName ?? "",
    size:          p.size ?? null,
    price:         Number(p.price ?? 0),
    category:      p.category ?? "OTHER",
    stockQuantity: Number(p.stockQuantity ?? p.stock ?? 0),
    stockUnit:     (CASE_UNITS.find((u) => u.value === p.stockUnit)?.value) ?? "case_24",
    status:        p.status ?? "ACTIVE",
    supplierId:    p.supplierId ?? "",
    image:         p.image ?? null,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts((Array.isArray(data) ? data : []).map(normalizeProduct));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProducts();
    api.getSuppliers()
      .then((data) => {
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  const filtered = products.filter((p) =>
    (p.productName ?? "").toLowerCase().includes(search.toLowerCase())
    && (selectedCategory === "All" || p.category === selectedCategory)
    && (selectedSize === "All" || p.size === selectedSize)
    && (selectedSupplier === "All" || p.supplierId === selectedSupplier)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalProducts    = products.length;
  const totalCategories  = [...new Set(products.map((p) => p.category))].length;
  const softDrinksCount  = products.filter((p) => p.category === "SOFTDRINKS").length;
  const energyDrinkCount = products.filter((p) => p.category === "ENERGY_DRINK").length;

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
    const unit = getUnit(product.stockUnit);
    setEditForm({
      productName: product.productName, size: product.size || "500ml",
      price: String(product.price), category: product.category,
      stockQuantity: String(product.stockQuantity),
      stockUnit: product.stockUnit ?? "case_24",
      supplierId: product.supplierId, status: product.status,
      piecesPerCase: unit.bottlesPerCase != null ? String(unit.bottlesPerCase) : "1",
    });
    setIsEditing(false);
    setShowProductModal(true);
  };

  // ── FIX: handleSaveEdit with ref guard + modal closes first ───────────────
  const handleSaveEdit = async () => {
    if (isEditingRef.current) return;
    isEditingRef.current = true;

    if (!editForm.productName) {
      showAlert("Product name is required.", "Missing Field");
      isEditingRef.current = false;
      return;
    }

    setSaving(true);
    try {
      const price = editForm.price === "" ? 0 : Number(editForm.price);
      const stockQuantity = editForm.stockQuantity === "" ? 0 : Number(editForm.stockQuantity);
      const pcs = Number(editForm.piecesPerCase);
      const stockUnitMap: Record<number, CaseUnit> = { 24: "case_24", 12: "case_12", 6: "case_6", 1: "pcs" };
      const stockUnit = stockUnitMap[pcs];
      if (!stockUnit) {
        showToast("Piece per case must be 24, 12, 6, or 1.", true);
        setIsEditing(true);
        setSaving(false);
        isEditingRef.current = false;
        return;
      }
      const { piecesPerCase: _ppc, supplierId, ...payload } = editForm;
      const body = { ...payload, price, stockQuantity, stockUnit, piecesPerCase: pcs };
      console.log("Saving product:", body);
      const res = await api.updateProduct(selectedProduct!.id, body);
      console.log("Save response:", res);
      if (res.message && !res.id) { showToast(res.message, true); return; }
      await fetchProducts();
      setSelectedProduct((prev) => prev ? { ...prev, ...body } : prev);
      setIsEditing(false);
      showToast("Product updated successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to update product.", true);
    }
    finally {
      setSaving(false);
      isEditingRef.current = false;
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteProduct(selectedProduct!.id);
      await fetchProducts();
      setShowProductModal(false);
      setSelectedProduct(null);
      showToast("Product deleted successfully!");
    } catch { showToast("Failed to delete product.", true); }
  };

  // ── FIX: handleAddProduct with ref guard + modal closes immediately ────────
  const handleAddProduct = async () => {
    if (isAddingRef.current) return; // block synchronously
    isAddingRef.current = true;

    if (!addForm.productName) {
      showAlert("Product name is required.", "Missing Field");
      isAddingRef.current = false;
      return;
    }
    if (!addForm.supplierId) {
      showAlert("Please select a supplier.", "Missing Field");
      isAddingRef.current = false;
      return;
    }

    // Close modal immediately so user can't resubmit
    setShowAddModal(false);
    setSaving(true);

    try {
      const price = addForm.price === "" ? 0 : Number(addForm.price);
      const stockQuantity = addForm.stockQuantity === "" ? 0 : Number(addForm.stockQuantity);
      const pcs = Number(addForm.piecesPerCase) || 24;
      const stockUnitMap: Record<number, CaseUnit> = { 24: "case_24", 12: "case_12", 6: "case_6", 1: "pcs" };
      const stockUnit = stockUnitMap[pcs] || "case_24";
      const { piecesPerCase: _ppc, ...payload } = addForm;
      const res = await api.createProduct({ ...payload, price, stockQuantity, stockUnit, piecesPerCase: pcs });
      if (res.message && !res.id) {
        // Re-open modal with data intact if API returned an error
        setShowAddModal(true);
        showToast(res.message, true);
        return;
      }
      await fetchProducts();
      setAddForm(defaultForm());
      showToast("Product added successfully!");
    } catch {
      // Re-open modal with data intact on network error
      setShowAddModal(true);
      showToast("Failed to add product.", true);
    } finally {
      setSaving(false);
      isAddingRef.current = false; // reset ref
    }
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
      <AlertModal {...alertModal} />

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">
            JULIETA SOFTDRINKS<br />STORE
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors
                  ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
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

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2"
            onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Product Management</h1>
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
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Mobile nav ── */}
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

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { icon: Package, label: "Total Products",  value: totalProducts,    color: "bg-indigo-100", iconColor: "text-indigo-600" },
              { icon: FolderOpen, label: "Categories",       value: totalCategories,  color: "bg-blue-100", iconColor: "text-blue-600" },
              { icon: Coffee, label: "Soft Drinks",      value: softDrinksCount,  color: "bg-green-100", iconColor: "text-green-600" },
              { icon: Zap, label: "Energy Drinks",    value: energyDrinkCount, color: "bg-yellow-100", iconColor: "text-yellow-600" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center`}>
                  <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{c.label}</p>
                  <p className={`text-xl font-bold ${c.iconColor}`}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm">

            {/* ── Filters ── */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-36 md:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search" value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="outline-none text-sm text-gray-700 w-full" />
              </div>

              <div className="relative" ref={categoryRef}>
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSizeDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${selectedCategory !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{selectedCategory}</span><span className="sm:hidden">Cat</span> <ChevronDown className="w-3 h-3" />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat ? "text-indigo-600 font-medium" : "text-gray-600"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={sizeRef}>
                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowCategoryDropdown(false); setShowSupplierDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${selectedSize !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <Package className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{selectedSize}</span><span className="sm:hidden">Size</span> <ChevronDown className="w-3 h-3" />
                </button>
                {showSizeDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-32">
                    {sizes.map((size) => (
                      <button key={size} onClick={() => { setSelectedSize(size); setShowSizeDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSize === size ? "text-indigo-600 font-medium" : "text-gray-600"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Supplier Filter */}
              <div className="relative" ref={supplierRef}>
                <button onClick={() => { setShowSupplierDropdown(!showSupplierDropdown); setShowCategoryDropdown(false); setShowSizeDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${selectedSupplier !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{suppliers.find(s => s.id === selectedSupplier)?.supplierName || "All Suppliers"}</span><span className="sm:hidden">Supplier</span> <ChevronDown className="w-3 h-3" />
                </button>
                {showSupplierDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-48 max-h-48 overflow-y-auto">
                    <button key="All" onClick={() => { setSelectedSupplier("All"); setShowSupplierDropdown(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSupplier === "All" ? "text-indigo-600 font-medium" : "text-gray-600"}`}>
                      All Suppliers
                    </button>
                    {suppliers.map((supplier) => (
                      <button key={supplier.id} onClick={() => { setSelectedSupplier(supplier.id); setShowSupplierDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSupplier === supplier.id ? "text-indigo-600 font-medium" : "text-gray-600"}`}>
                        {supplier.supplierName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(selectedCategory !== "All" || selectedSize !== "All" || selectedSupplier !== "All") && (
                <button onClick={() => { setSelectedCategory("All"); setSelectedSize("All"); setSelectedSupplier("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕</button>
              )}

              <button onClick={() => { setShowAddModal(true); setAddForm(defaultForm()); }}
                className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">
                + <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
              </button>
            </div>

            {/* ── Product grid ── */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-400 text-sm">Loading products...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No products found</p>
                <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : "Add your first product!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                {paginated.map((product) => {
                  const u        = getUnit(product.stockUnit);
                  const qty      = Number(product.stockQuantity) || 0;
                  const totalBtl = u.bottlesPerCase ? qty * u.bottlesPerCase : null;
                  const badgeColor = qty === 0
                    ? "bg-red-100 text-red-700 border-red-200"
                    : qty <= 10
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : "bg-green-100 text-green-700 border-green-200";

                  return (
                    <div key={product.id} onClick={() => handleCardClick(product)}
                      className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white">
                      <div className="w-full aspect-square bg-gray-100 rounded-t-2xl flex items-center justify-center">
                        {product.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
                          : React.createElement(getCategoryIcon(product.category).icon, { className: `w-12 h-12 ${getCategoryIcon(product.category).color}` })}
                      </div>
                      <div className="p-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getCategoryColor(product.category)}`}>
                          {product.category}
                        </span>
                        <p className="text-xs md:text-sm font-semibold text-gray-800 mt-1 truncate">
                          {product.productName}
                          {product.size && (
                            <span className="text-gray-400 font-normal ml-1">{product.size}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">₱{product.price}</p>

                        {/* Supplier name */}
                        {product.supplier && (
                          <p className="text-xs text-indigo-600 font-medium mt-0.5 truncate">
                            {product.supplier.supplierName}
                          </p>
                        )}

                        {/* ✅ Fixed stock badge — no more undefined/NaN */}
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${badgeColor}`}>
                            {qty} <span className="font-normal opacity-80">{u.short}</span>
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {qty} × {u.bottlesPerCase} = {totalBtl} btl
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 flex-wrap mt-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                  className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹</button>
                {getPageNumbers().map((page, i) => (
                  page === "..."
                    ? <span key={i} className="px-2 py-1 text-gray-400">...</span>
                    : <button key={i} onClick={() => setCurrentPage(Number(page))}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                        {page}
                      </button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── PRODUCT DETAIL / EDIT MODAL ── */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <p className="text-xs text-gray-400 mb-3 font-medium">
              Product {isEditing ? "Editing" : "Details"}
            </p>
            <div className="flex gap-3">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-3xl md:text-4xl">
                {selectedProduct.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={selectedProduct.image} alt={selectedProduct.productName} className="w-full h-full object-cover rounded-xl" />
                  : React.createElement(getCategoryIcon(selectedProduct.category).icon, { className: `w-12 h-12 ${getCategoryIcon(selectedProduct.category).color}` })}
              </div>
              <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                {isEditing ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-400">Product Name</p>
                      <input value={editForm.productName}
                        onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Size</p>
                      <select value={editForm.size ?? "500ml"}
                        onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Price (₱)</p>
                      <input type="number" inputMode="numeric" min="0" value={editForm.price}
                        onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setEditForm({ ...editForm, price: val });
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div ref={editPcsRef}>
                      <p className="text-xs text-gray-400">Piece per Case</p>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editForm.piecesPerCase}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setEditForm({ ...editForm, piecesPerCase: val });
                            setShowEditPcsDropdown(true);
                          }}
                          onFocus={() => setShowEditPcsDropdown(true)}
                          placeholder="Type number or pick below"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-400"
                        />
                        <button type="button" onClick={() => setShowEditPcsDropdown(!showEditPcsDropdown)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {showEditPcsDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] max-h-40 overflow-y-auto">
                            {["24", "12", "6", "1"]
                              .filter((pcs) => !editForm.piecesPerCase || pcs.startsWith(editForm.piecesPerCase))
                              .map((pcs) => (
                                <button key={pcs} type="button"
                                  onClick={() => { setEditForm({ ...editForm, piecesPerCase: pcs }); setShowEditPcsDropdown(false); }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${editForm.piecesPerCase === pcs ? "text-indigo-600 font-medium bg-indigo-50" : "text-gray-600"}`}>
                                  {pcs} pcs per case
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Category</p>
                      <select value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <select value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-gray-400">Product</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">
                        {selectedProduct.productName}
                        {selectedProduct.size && (
                          <span className="text-gray-500 font-normal ml-1">{selectedProduct.size}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Category</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${getCategoryColor(selectedProduct.category)}`}>
                        {selectedProduct.category}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">₱{selectedProduct.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Stock</p>
                      <div className="mt-1">
                        <CaseBadge quantity={selectedProduct.stockQuantity} unit={selectedProduct.stockUnit} />
                        {(() => {
                          const unit = getUnit(selectedProduct.stockUnit);
                          return unit.bottlesPerCase != null
                            ? <p className="text-xs text-gray-400 mt-0.5">{unit.bottlesPerCase} pieces per case</p>
                            : <p className="text-xs text-gray-400 mt-0.5">{unit.label}</p>;
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block
                        ${selectedProduct.status === "ACTIVE"        ? "bg-green-100 text-green-600"
                        : selectedProduct.status === "OUT_OF_STOCK"  ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-500"}`}>
                        {selectedProduct.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5 justify-end flex-wrap">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  {/* ── FIX: spinner + cursor-not-allowed when saving ── */}
                  <button onClick={handleSaveEdit} disabled={saving}
                    className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors
                      ${saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                    {saving ? (
                      <span className="flex items-center gap-2"><Spinner /> Saving...</span>
                    ) : "Save Changes"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => showConfirm(`Delete "${selectedProduct?.productName}"?`, confirmDelete, "Delete Product", true)}
                    className="flex items-center gap-1 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50">
                    🗑️ Delete
                  </button>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    ✏️ Edit
                  </button>
                  <button onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PRODUCT MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Product</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Product Name</label>
                <input value={addForm.productName}
                  onChange={(e) => setAddForm({ ...addForm, productName: e.target.value })}
                  placeholder="e.g. Coca Cola"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <select value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Size</label>
                <select value={addForm.size ?? "500ml"}
                  onChange={(e) => setAddForm({ ...addForm, size: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Price (₱)</label>
                <input type="number" inputMode="numeric" min="0" value={addForm.price}
                  onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setAddForm({ ...addForm, price: val });
                  }}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Supplier</label>
                <select value={addForm.supplierId}
                  onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                </select>
              </div>
              <div ref={pcsRef}>
                <label className="text-xs font-medium text-gray-600">Piece per Case</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addForm.piecesPerCase}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setAddForm({ ...addForm, piecesPerCase: val });
                      setShowPcsDropdown(true);
                    }}
                    onFocus={() => setShowPcsDropdown(true)}
                    placeholder="Type number or pick below"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-400"
                  />
                  <button type="button" onClick={() => setShowPcsDropdown(!showPcsDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showPcsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] max-h-40 overflow-y-auto">
                      {["24", "12", "6", "1"]
                        .filter((pcs) => !addForm.piecesPerCase || pcs.startsWith(addForm.piecesPerCase))
                        .map((pcs) => (
                          <button key={pcs} type="button"
                            onClick={() => { setAddForm({ ...addForm, piecesPerCase: pcs }); setShowPcsDropdown(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${addForm.piecesPerCase === pcs ? "text-indigo-600 font-medium bg-indigo-50" : "text-gray-600"}`}>
                            {pcs} pcs per case
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Status</label>
                <select value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              {/* ── FIX: spinner + cursor-not-allowed when saving ── */}
              <button onClick={handleAddProduct} disabled={saving}
                className={`flex-1 rounded-lg py-2 text-sm text-white font-medium transition-colors
                  ${saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> Adding...</span>
                ) : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span><span className="text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>❌</span><span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError("")} className="ml-2 hover:text-red-200">✕</button>
        </div>
      )}
    </div>
  );
}