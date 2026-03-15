"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️", active: true },
  { label: "Account Management", icon: "👤" },
];

type Product = {
  id: number;
  name: string;
  size: string;
  price: number;
  category: string;
};

const initialProducts: Product[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: "Coca Cola",
  size: "1.5 L",
  price: 80,
  category: "Soft Drinks",
}));

const categories = ["All", "Soft Drinks", "Beer", "Energy Drink", "Water"];
const sizes = ["All", "250ml", "500ml", "1L", "1.5 L", "2L"];
const ITEMS_PER_PAGE = 18;

export default function ProductManagementPage() {
  const router = useRouter();
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
  const [editForm, setEditForm] = useState({ name: "", size: "1.5 L", price: 0, category: "Soft Drinks" });
  const [addForm, setAddForm] = useState({ name: "", size: "1.5 L", price: 0, category: "Soft Drinks" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

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

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchSize = selectedSize === "All" || p.size === selectedSize;
    return matchSearch && matchCategory && matchSize;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({ name: product.name, size: product.size, price: product.price, category: product.category });
    setIsEditing(false);
    setShowProductModal(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.name) { alert("Product name is required."); return; }
    setProducts((prev) => prev.map((p) => p.id === selectedProduct!.id ? { ...p, ...editForm } : p));
    setSelectedProduct({ ...selectedProduct!, ...editForm });
    setIsEditing(false);
  };

  const handleDeleteProduct = () => { setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    setProducts((prev) => prev.filter((p) => p.id !== selectedProduct!.id));
    setShowDeleteConfirm(false);
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  const handleAddProduct = () => {
    if (!addForm.name) { alert("Product name is required."); return; }
    setProducts((prev) => [...prev, { id: Date.now(), ...addForm }]);
    setShowAddModal(false);
    setAddForm({ name: "", size: "1.5 L", price: 0, category: "Soft Drinks" });
  };

  const getPageNumbers = () => {
    const pages = [];
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
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
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
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
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
          <div className="bg-white rounded-2xl p-4 shadow-sm">

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="outline-none text-sm text-gray-700 w-full" />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSizeDropdown(false); }}
                  className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  👤 {selectedCategory} ▾
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === cat ? "text-indigo-600 font-medium" : "text-gray-600"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Size Dropdown */}
              <div className="relative">
                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowCategoryDropdown(false); }}
                  className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  📦 {selectedSize} ▾
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

              <button onClick={() => setShowAddModal(true)} className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Product</button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {paginated.map((product) => (
                <div key={product.id} onClick={() => handleCardClick(product)}
                  className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-full aspect-square bg-gray-200 rounded-t-2xl" />
                  <div className="p-2">
                    <p className="text-sm font-semibold text-gray-800">{product.name} <span className="text-gray-400 font-normal">{product.size}</span></p>
                    <p className="text-xs text-gray-500">₱{product.price}.00</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
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
          </div>
        </div>
      </main>

      {/* PRODUCT DETAIL / EDIT MODAL */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <p className="text-xs text-gray-400 mb-3 font-medium">Product {isEditing ? "Editing" : "Details"}</p>
            <div className="flex gap-4">
              {/* Product image */}
              <div className="w-32 h-32 bg-gray-200 rounded-xl shrink-0 flex items-center justify-center text-gray-400 text-xs">No Image</div>
              {/* Product info */}
              <div className="flex-1 flex flex-col gap-3">
                {isEditing ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-400">Product Name</p>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Size</p>
                      <select value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                        {sizes.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Price (₱)</p>
                      <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-gray-400">Product Name</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Size</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedProduct.size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">₱{selectedProduct.price}.00</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Buttons */}
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
              <div><label className="text-xs font-medium text-gray-600">Price (₱)</label><input type="number" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
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
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete this product?</p>
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