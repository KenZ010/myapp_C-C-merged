"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory" },
  { label: "Supplier Maintenance", icon: "📊", path: "/supplier" },
  { label: "Sales Reports", icon: "🌐", path: "/sales" },
  { label: "Transaction Logs", icon: "▦", path: "/transaction" },
  { label: "Product Management", icon: "🗒️", path: "/product" },
  { label: "Account Management", icon: "👤", path: "/account" },
  { label: "Purchase Order", icon: "📋", path: "/purchase-order" },
];

type Product = {
  id: number;
  name: string;
  size: string;
  price: number;
  category: string;
};

const initialProducts: Product[] = [
  { id: 1, name: "Coca Cola", size: "1.5 L", price: 80, category: "Soft Drinks" },
  { id: 2, name: "Coca Cola", size: "500ml", price: 45, category: "Soft Drinks" },
  { id: 3, name: "Pepsi", size: "1.5 L", price: 75, category: "Soft Drinks" },
  { id: 4, name: "Pepsi", size: "500ml", price: 40, category: "Soft Drinks" },
  { id: 5, name: "Sprite", size: "1.5 L", price: 75, category: "Soft Drinks" },
  { id: 6, name: "Sprite", size: "500ml", price: 40, category: "Soft Drinks" },
  { id: 7, name: "Royal", size: "1.5 L", price: 70, category: "Soft Drinks" },
  { id: 8, name: "Royal", size: "500ml", price: 38, category: "Soft Drinks" },
  { id: 9, name: "Mountain Dew", size: "1.5 L", price: 78, category: "Soft Drinks" },
  { id: 10, name: "Mountain Dew", size: "500ml", price: 42, category: "Soft Drinks" },
  { id: 11, name: "RC Cola", size: "1.5 L", price: 65, category: "Soft Drinks" },
  { id: 12, name: "RC Cola", size: "500ml", price: 35, category: "Soft Drinks" },
  { id: 13, name: "Cobra", size: "250ml", price: 55, category: "Energy Drink" },
  { id: 14, name: "Cobra", size: "500ml", price: 85, category: "Energy Drink" },
  { id: 15, name: "Red Bull", size: "250ml", price: 120, category: "Energy Drink" },
  { id: 16, name: "Sting", size: "250ml", price: 50, category: "Energy Drink" },
  { id: 17, name: "Gatorade", size: "500ml", price: 65, category: "Sports Drink" },
  { id: 18, name: "Gatorade", size: "1L", price: 95, category: "Sports Drink" },
  { id: 19, name: "Nature Spring", size: "500ml", price: 20, category: "Water" },
  { id: 20, name: "Wilkins", size: "1L", price: 35, category: "Water" },
  { id: 21, name: "Absolute", size: "500ml", price: 22, category: "Water" },
  { id: 22, name: "C2 Apple", size: "500ml", price: 35, category: "Juice/Tea" },
  { id: 23, name: "Zest-O Orange", size: "250ml", price: 18, category: "Juice/Tea" },
  { id: 24, name: "Sarsi", size: "500ml", price: 38, category: "Soft Drinks" },
];

const categories = ["All", "Soft Drinks", "Energy Drink", "Sports Drink", "Water", "Juice/Tea"];
const sizes = ["All", "250ml", "500ml", "1L", "1.5 L", "2L"];
const ITEMS_PER_PAGE = 18;

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    "Soft Drinks": "bg-blue-100 text-blue-600",
    "Energy Drink": "bg-yellow-100 text-yellow-600",
    "Sports Drink": "bg-green-100 text-green-600",
    "Water": "bg-cyan-100 text-cyan-600",
    "Juice/Tea": "bg-orange-100 text-orange-600",
  };
  return map[category] || "bg-gray-100 text-gray-600";
};

// ✅ Use string type for price so it can be cleared
const emptyAddForm = { name: "", size: "1.5 L", price: "" as string | number, category: "Soft Drinks" };
const emptyEditForm = { name: "", size: "1.5 L", price: "" as string | number, category: "Soft Drinks" };

export default function ProductManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setShowSizeDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchSize = selectedSize === "All" || p.size === selectedSize;
    return matchSearch && matchCategory && matchSize;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalProducts = products.length;
  const totalCategories = [...new Set(products.map((p) => p.category))].length;
  const softDrinksCount = products.filter((p) => p.category === "Soft Drinks").length;
  const energyDrinkCount = products.filter((p) => p.category === "Energy Drink").length;

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({ name: product.name, size: product.size, price: product.price, category: product.category });
    setIsEditing(false);
    setShowProductModal(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.name) { alert("Product name is required."); return; }
    // ✅ Convert empty string to 0 when saving
    const savePrice = editForm.price === "" ? 0 : Number(editForm.price);
    setProducts((prev) => prev.map((p) => p.id === selectedProduct!.id ? { ...p, ...editForm, price: savePrice } : p));
    setSelectedProduct({ ...selectedProduct!, ...editForm, price: savePrice });
    setIsEditing(false);
  };

  const handleDeleteProduct = () => { setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    setProducts((prev) => prev.filter((p) => p.id !== selectedProduct!.id));
    setShowDeleteConfirm(false); setShowProductModal(false); setSelectedProduct(null);
  };

  const handleAddProduct = () => {
    if (!addForm.name) { alert("Product name is required."); return; }
    // ✅ Convert empty string to 0 when saving
    const savePrice = addForm.price === "" ? 0 : Number(addForm.price);
    setProducts((prev) => [...prev, { id: Date.now(), ...addForm, price: savePrice }]);
    setShowAddModal(false);
    setAddForm(emptyAddForm);
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
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10"><p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p></div>
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
          <button className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300" style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }} onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Product Management</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">🗒️</div>
              <div><p className="text-xs text-gray-400">Total Products</p><p className="text-xl font-bold text-gray-800">{totalProducts}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">📂</div>
              <div><p className="text-xs text-gray-400">Categories</p><p className="text-xl font-bold text-blue-600">{totalCategories}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🥤</div>
              <div><p className="text-xs text-gray-400">Soft Drinks</p><p className="text-xl font-bold text-green-600">{softDrinksCount}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-lg">⚡</div>
              <div><p className="text-xs text-gray-400">Energy Drinks</p><p className="text-xl font-bold text-yellow-600">{energyDrinkCount}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="outline-none text-sm text-gray-700 w-full" />
              </div>
              <div className="relative" ref={categoryRef}>
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSizeDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${selectedCategory !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  👤 {selectedCategory} ▾
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat ? "text-indigo-600 font-medium" : "text-gray-600"}`}>{cat}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={sizeRef}>
                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowCategoryDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-sm transition-colors ${selectedSize !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  📦 {selectedSize} ▾
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
                <button onClick={() => { setSelectedCategory("All"); setSelectedSize("All"); setCurrentPage(1); }} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}
              <button onClick={() => setShowAddModal(true)} className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Product</button>
            </div>

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-500 font-medium">No products found</p>
                <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : "Try adjusting your filters"}</p>
                <button onClick={() => { setSearch(""); setSelectedCategory("All"); setSelectedSize("All"); }} className="mt-4 text-xs text-indigo-500 hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {paginated.map((product) => (
                  <div key={product.id} onClick={() => handleCardClick(product)} className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-full aspect-square bg-gray-200 rounded-t-2xl" />
                    <div className="p-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(product.category)}`}>{product.category}</span>
                      <p className="text-sm font-semibold text-gray-800 mt-1">{product.name} <span className="text-gray-400 font-normal">{product.size}</span></p>
                      <p className="text-xs text-gray-500">₱{product.price}.00</p>
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

      {/* PRODUCT DETAIL / EDIT MODAL */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <p className="text-xs text-gray-400 mb-3 font-medium">Product {isEditing ? "Editing" : "Details"}</p>
            <div className="flex gap-4">
              <div className="w-32 h-32 bg-gray-200 rounded-xl shrink-0 flex items-center justify-center text-gray-400 text-xs">No Image</div>
              <div className="flex-1 flex flex-col gap-3">
                {isEditing ? (
                  <>
                    <div><p className="text-xs text-gray-400">Product Name</p><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
                    <div><p className="text-xs text-gray-400">Size</p>
                      <select value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* ✅ Fixed: price can be cleared */}
                    <div><p className="text-xs text-gray-400">Price (₱)</p>
                      <input type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div><p className="text-xs text-gray-400">Category</p>
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div><p className="text-xs text-gray-400">Product Name</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.name}</p></div>
                    <div><p className="text-xs text-gray-400">Category</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${getCategoryColor(selectedProduct.category)}`}>{selectedProduct.category}</span></div>
                    <div><p className="text-xs text-gray-400">Size</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.size}</p></div>
                    <div><p className="text-xs text-gray-400">Price</p><p className="text-sm font-semibold text-gray-800 mt-0.5">₱{selectedProduct.price}.00</p></div>
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
                  <button onClick={handleDeleteProduct} className="flex items-center gap-1 px-4 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">✏️ Edit</button>
                  <button onClick={() => setShowProductModal(false)} className="px-4 py-2 bg-green-500 rounded-lg text-sm text-white font-medium hover:bg-green-600">Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Product</h2>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Product Name</label><input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Size</label>
                <select value={addForm.size} onChange={(e) => setAddForm({ ...addForm, size: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {/* ✅ Fixed: price can be cleared */}
              <div><label className="text-xs font-medium text-gray-600">Price (₱)</label>
                <input type="number" min="0" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div><label className="text-xs font-medium text-gray-600">Category</label>
                <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">Add Product</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Product?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete <span className="font-semibold text-gray-700">{selectedProduct?.name}</span>?</p>
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