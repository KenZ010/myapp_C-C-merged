"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

// ─── UNIFIED UNIT SYSTEM ───────────────────────────────────────────────────
export type StockUnit = "cs" | "btl" | "pk" | "pcs" | "box";

export const STOCK_UNITS: { value: StockUnit; label: string; abbr: string; detail: string }[] = [
  { value: "cs",  label: "Cases",   abbr: "cs",  detail: "Case of bottles" },
  { value: "btl", label: "Bottles", abbr: "btl", detail: "Individual bottle" },
  { value: "pk",  label: "Packs",   abbr: "pk",  detail: "Bundled pack" },
  { value: "pcs", label: "Pieces",  abbr: "pcs", detail: "Single piece" },
  { value: "box", label: "Boxes",   abbr: "box", detail: "Box unit" },
];

export const getUnitAbbr  = (u?: string) => STOCK_UNITS.find((x) => x.value === u)?.abbr  ?? "cs";
export const getUnitLabel = (u?: string) => STOCK_UNITS.find((x) => x.value === u)?.label ?? "Cases";

// ── Fused number + unit dropdown (works on mobile) ─────────────────────────
export function UnitQuantityInput({
  quantity, unit, onQuantityChange, onUnitChange, size = "md",
}: {
  quantity: number | string; unit: StockUnit;
  onQuantityChange: (v: number) => void; onUnitChange: (u: StockUnit) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = STOCK_UNITS.find((u) => u.value === unit) ?? STOCK_UNITS[0];
  const py  = size === "sm" ? "py-1.5" : "py-2";
  const px  = size === "sm" ? "px-2" : "px-3";
  const ts  = size === "sm" ? "text-xs" : "text-sm";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="flex mt-1" ref={ref}>
      <input
        type="number" min={0} value={quantity}
        onChange={(e) => onQuantityChange(Math.max(0, Number(e.target.value)))}
        className={`flex-1 border border-r-0 border-gray-200 rounded-l-lg ${px} ${py} ${ts} outline-none focus:border-indigo-400 text-gray-900 min-w-0`}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-1 border border-gray-200 rounded-r-lg ${px} ${py} ${ts} font-medium transition-colors select-none whitespace-nowrap shrink-0
          ${open ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
      >
        <span>{sel.abbr}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {open && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] w-44 overflow-hidden">
            {STOCK_UNITS.map((u) => (
              <button
                key={u.value} type="button"
                onClick={(e) => { e.stopPropagation(); onUnitChange(u.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                  ${unit === u.value ? "bg-indigo-50" : "hover:bg-gray-50"}`}
              >
                <div>
                  <p className={`text-sm font-medium ${unit === u.value ? "text-indigo-700" : "text-gray-800"}`}>{u.label}</p>
                  <p className="text-xs text-gray-400">{u.detail}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-2 shrink-0
                  ${unit === u.value ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>{u.abbr}</span>
              </button>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

// ── Color-coded stock badge with qty + unit ────────────────────────────────
export function UnitBadge({ quantity, unit, showLabel = false }: {
  quantity: number; unit?: StockUnit | string; showLabel?: boolean;
}) {
  const u = STOCK_UNITS.find((x) => x.value === unit) ?? STOCK_UNITS[0];
  const color = quantity === 0
    ? "bg-red-100 text-red-700 border-red-200"
    : quantity <= 10
    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-green-100 text-green-700 border-green-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {quantity}
      <span className="font-normal opacity-80">{u.abbr}</span>
      {showLabel && <span className="font-normal opacity-60 hidden sm:inline">({u.label})</span>}
    </span>
  );
}

// ─── PAGE SETUP ────────────────────────────────────────────────────────────
type Product = {
  id: string; productName: string; size: string | null;
  price: number; category: string; stockQuantity: number;
  stockUnit: StockUnit; status: string; supplierId: string; image: string | null;
};

const categories = ["All", "SOFTDRINKS", "ENERGY_DRINK", "BEER", "JUICE", "WATER", "OTHER"];
const sizes      = ["All", "237ml", "250ml", "290ml", "500ml", "1L", "1.5L", "2L"];
const ITEMS_PER_PAGE = 18;

const getCategoryColor = (cat: string) => ({
  SOFTDRINKS: "bg-blue-100 text-blue-600", ENERGY_DRINK: "bg-yellow-100 text-yellow-600",
  BEER: "bg-amber-100 text-amber-600",     JUICE: "bg-orange-100 text-orange-600",
  WATER: "bg-cyan-100 text-cyan-600",      OTHER: "bg-gray-100 text-gray-600",
}[cat] || "bg-gray-100 text-gray-600");

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

function AlertModal({ open, type = "alert", title, message, danger, onConfirm, onCancel }: {
  open: boolean; type?: "alert"|"confirm"; title?: string; message: string;
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
          {type === "confirm" && <button onClick={onCancel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
          <button onClick={onConfirm} className={`flex-1 rounded-lg py-2 text-sm text-white font-medium ${danger ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {type === "confirm" ? (danger ? "Delete" : "Confirm") : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

const defaultForm = () => ({
  productName: "", size: "500ml", price: 0,
  category: "SOFTDRINKS", stockQuantity: 0,
  stockUnit: "cs" as StockUnit, supplierId: "", status: "ACTIVE",
});

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

  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showProductModal,  setShowProductModal]  = useState(false);
  const [selectedProduct,   setSelectedProduct]   = useState<Product | null>(null);
  const [isEditing,         setIsEditing]         = useState(false);
  const [addForm,  setAddForm]  = useState(defaultForm());
  const [editForm, setEditForm] = useState(defaultForm());

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSizeDropdown,     setShowSizeDropdown]     = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const sizeRef     = useRef<HTMLDivElement>(null);

  const [alertModal, setAlertModal] = useState<{
    open: boolean; type?: "alert"|"confirm"; title?: string;
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
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data.map((p: Product) => ({ ...p, stockUnit: p.stockUnit ?? "cs" })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProducts();
    api.getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const navigate    = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };

  const filtered = products.filter((p) =>
    (p.productName ?? "").toLowerCase().includes(search.toLowerCase())
    && (selectedCategory === "All" || p.category === selectedCategory)
    && (selectedSize === "All" || p.size === selectedSize)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalProducts    = products.length;
  const totalCategories  = [...new Set(products.map((p) => p.category))].length;
  const softDrinksCount  = products.filter((p) => p.category === "SOFTDRINKS").length;
  const energyDrinkCount = products.filter((p) => p.category === "ENERGY_DRINK").length;

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({ productName: product.productName, size: product.size || "500ml",
      price: product.price, category: product.category, stockQuantity: product.stockQuantity,
      stockUnit: product.stockUnit ?? "cs", supplierId: product.supplierId, status: product.status });
    setIsEditing(false); setShowProductModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.productName) { showAlert("Product name is required.", "Missing Field"); return; }
    setSaving(true);
    try {
      const res = await api.updateProduct(selectedProduct!.id, editForm);
      if (res.message && !res.id) { showToast(res.message, true); return; }
      await fetchProducts();
      setSelectedProduct((prev) => prev ? { ...prev, ...editForm } : prev);
      setIsEditing(false); showToast("Product updated successfully!");
    } catch { showToast("Failed to update product.", true); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteProduct(selectedProduct!.id);
      await fetchProducts(); setShowProductModal(false); setSelectedProduct(null);
      showToast("Product deleted successfully!");
    } catch { showToast("Failed to delete product.", true); }
  };

  const handleAddProduct = async () => {
    if (!addForm.productName) { showAlert("Product name is required.", "Missing Field"); return; }
    if (!addForm.supplierId)  { showAlert("Please select a supplier.", "Missing Field"); return; }
    setSaving(true);
    try {
      const res = await api.createProduct(addForm);
      if (res.message && !res.id) { showToast(res.message, true); return; }
      await fetchProducts(); setShowAddModal(false); setAddForm(defaultForm());
      showToast("Product added successfully!");
    } catch { showToast("Failed to add product.", true); }
    finally { setSaving(false); }
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

      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors
                  ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Product Management</h1>
          <div className="flex items-center gap-2">
            <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { icon: "🗒️", label: "Total Products",  value: totalProducts,    color: "bg-indigo-100", bold: "text-gray-800"   },
              { icon: "📂", label: "Categories",       value: totalCategories,  color: "bg-blue-100",   bold: "text-blue-600"   },
              { icon: "🥤", label: "Soft Drinks",      value: softDrinksCount,  color: "bg-green-100",  bold: "text-green-600"  },
              { icon: "⚡", label: "Energy Drinks",    value: energyDrinkCount, color: "bg-yellow-100", bold: "text-yellow-600" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center text-lg`}>{c.icon}</div>
                <div><p className="text-xs text-gray-400">{c.label}</p><p className={`text-xl font-bold ${c.bold}`}>{c.value}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-36 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="outline-none text-sm text-gray-700 w-full" />
              </div>

              <div className="relative" ref={categoryRef}>
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSizeDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${selectedCategory !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  📂 <span className="hidden sm:inline">{selectedCategory}</span><span className="sm:hidden">Cat</span> ▾
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat ? "text-indigo-600 font-medium" : "text-gray-600"}`}>{cat}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={sizeRef}>
                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowCategoryDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${selectedSize !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  📦 <span className="hidden sm:inline">{selectedSize}</span><span className="sm:hidden">Size</span> ▾
                </button>
                {showSizeDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-32">
                    {sizes.map((size) => (
                      <button key={size} onClick={() => { setSelectedSize(size); setShowSizeDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSize === size ? "text-indigo-600 font-medium" : "text-gray-600"}`}>{size}</button>
                    ))}
                  </div>
                )}
              </div>

              {(selectedCategory !== "All" || selectedSize !== "All") && (
                <button onClick={() => { setSelectedCategory("All"); setSelectedSize("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕</button>
              )}

              <button onClick={() => { setShowAddModal(true); setAddForm(defaultForm()); }}
                className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">
                + <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><p className="text-gray-400 text-sm">Loading products...</p></div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-500 font-medium">No products found</p>
                <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : "Add your first product!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                {paginated.map((product) => (
                  <div key={product.id} onClick={() => handleCardClick(product)}
                    className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white">
                    <div className="w-full aspect-square bg-gray-100 rounded-t-2xl flex items-center justify-center">
                      {product.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
                        : <span className="text-3xl">🥤</span>}
                    </div>
                    <div className="p-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getCategoryColor(product.category)}`}>
                        {product.category}
                      </span>
                      <p className="text-xs md:text-sm font-semibold text-gray-800 mt-1 truncate">{product.productName}</p>
                      <p className="text-xs text-gray-400 truncate">{product.size}</p>
                      <p className="text-xs text-gray-500 font-medium">₱{product.price}</p>
                      {/* ✅ Unit badge — always visible, including on mobile */}
                      <div className="mt-1.5">
                        <UnitBadge quantity={product.stockQuantity} unit={product.stockUnit} />
                      </div>
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
                    <button key={i} onClick={() => setCurrentPage(Number(page))}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{page}</button>
                  )
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── PRODUCT DETAIL / EDIT MODAL ── */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <p className="text-xs text-gray-400 mb-3 font-medium">Product {isEditing ? "Editing" : "Details"}</p>
            <div className="flex gap-3">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-3xl md:text-4xl">
                {selectedProduct.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={selectedProduct.image} alt={selectedProduct.productName} className="w-full h-full object-cover rounded-xl" />
                  : "🥤"}
              </div>
              <div className="flex-1 flex flex-col gap-2.5">
                {isEditing ? (
                  <>
                    <div><p className="text-xs text-gray-400">Product Name</p>
                      <input value={editForm.productName} onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                    <div><p className="text-xs text-gray-400">Size</p>
                      <select value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}</select></div>
                    <div><p className="text-xs text-gray-400">Price (₱)</p>
                      <input type="number" min="0" value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, Number(e.target.value)) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                    {/* ✅ Stock + unit */}
                    <div><p className="text-xs text-gray-400">Stock Quantity & Unit</p>
                      <UnitQuantityInput quantity={editForm.stockQuantity} unit={editForm.stockUnit}
                        onQuantityChange={(v) => setEditForm({ ...editForm, stockQuantity: v })}
                        onUnitChange={(u) => setEditForm({ ...editForm, stockUnit: u })} /></div>
                    <div><p className="text-xs text-gray-400">Category</p>
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                      </select></div>
                  </>
                ) : (
                  <>
                    <div><p className="text-xs text-gray-400">Product Name</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.productName}</p></div>
                    <div><p className="text-xs text-gray-400">Category</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${getCategoryColor(selectedProduct.category)}`}>{selectedProduct.category}</span></div>
                    <div><p className="text-xs text-gray-400">Size</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.size ?? "—"}</p></div>
                    <div><p className="text-xs text-gray-400">Price</p><p className="text-sm font-semibold text-gray-800 mt-0.5">₱{selectedProduct.price}</p></div>
                    {/* ✅ Stock with full unit info */}
                    <div>
                      <p className="text-xs text-gray-400">Stock</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <UnitBadge quantity={selectedProduct.stockQuantity} unit={selectedProduct.stockUnit} showLabel />
                      </div>
                    </div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block
                        ${selectedProduct.status === "ACTIVE" ? "bg-green-100 text-green-600"
                          : selectedProduct.status === "OUT_OF_STOCK" ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-500"}`}>{selectedProduct.status}</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end flex-wrap">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
                </>
              ) : (
                <>
                  <button onClick={() => showConfirm(`Delete "${selectedProduct?.productName}"?`, confirmDelete, "Delete Product", true)}
                    className="flex items-center gap-1 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">✏️ Edit</button>
                  <button onClick={() => setShowProductModal(false)} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">Done</button>
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
              <div><label className="text-xs font-medium text-gray-600">Product Name</label>
                <input value={addForm.productName} onChange={(e) => setAddForm({ ...addForm, productName: e.target.value })}
                  placeholder="e.g. Coca Cola"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Category</label>
                <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600">Size</label>
                <select value={addForm.size} onChange={(e) => setAddForm({ ...addForm, size: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600">Price (₱)</label>
                <input type="number" min="0" value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: Math.max(0, Number(e.target.value)) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              {/* ✅ Stock + unit picker with hint */}
              <div>
                <label className="text-xs font-medium text-gray-600">Stock Quantity & Unit</label>
                <UnitQuantityInput quantity={addForm.stockQuantity} unit={addForm.stockUnit}
                  onQuantityChange={(v) => setAddForm({ ...addForm, stockQuantity: v })}
                  onUnitChange={(u) => setAddForm({ ...addForm, stockUnit: u })} />
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  e.g. <strong>24 cs</strong> = 24 cases · <strong>48 btl</strong> = 48 individual bottles
                </p>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Supplier</label>
                <select value={addForm.supplierId} onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                </select></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} disabled={saving}
                className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Adding..." : "Add Product"}</button>
            </div>
          </div>
        </div>
      )}

      {success && <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>✅</span><span className="text-sm font-medium">{success}</span></div>}
      {error && <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>❌</span><span className="text-sm font-medium">{error}</span><button onClick={() => setError("")} className="ml-2 hover:text-red-200">✕</button></div>}
    </div>
  );
}