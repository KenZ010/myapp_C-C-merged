"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

type InventoryItem = {
  id: number; code: string; name: string; type: string; date: string; total: number;
  remaining: number; lastCheck: string; stock: string; stockColor: string;
};

type SortKey = "code" | "name" | "type" | "date" | "total" | "remaining" | "stock";
type SortDir = "asc" | "desc";

const CHECKERS = ["Rjay Salinas", "Ray Teodoro"];

const calculateStock = (remaining: number, total: number): { stock: string; stockColor: string } => {
  if (remaining === 0) return { stock: "Out of Stock", stockColor: "red" };
  if (total > 0 && remaining / total <= 0.3) return { stock: "Low Stock", stockColor: "yellow" };
  return { stock: "In Stock", stockColor: "green" };
};

const initialData: InventoryItem[] = [
  { id: 1, code: "COLA22", name: "Coca Cola",     type: "Bottle",        date: "2025-11-08", total: 30, remaining: 10, lastCheck: "Rjay Salinas", ...calculateStock(10, 30) },
  { id: 2, code: "RC22",   name: "RC",            type: "Plastic Bottle", date: "2025-11-06", total: 30, remaining: 0,  lastCheck: "Rjay Salinas", ...calculateStock(0,  30) },
  { id: 3, code: "PEP12",  name: "Pepsi",         type: "Bottle",        date: "2025-11-06", total: 30, remaining: 15, lastCheck: "Rjay Salinas", ...calculateStock(15, 30) },
  { id: 4, code: "GATO22", name: "Gatorade",      type: "Plastic Bottle", date: "2025-11-06", total: 15, remaining: 15, lastCheck: "Rjay Salinas", ...calculateStock(15, 15) },
  { id: 5, code: "COB25",  name: "Cobra",         type: "Bottle",        date: "2024-11-06", total: 30, remaining: 27, lastCheck: "Rjay Salinas", ...calculateStock(27, 30) },
  { id: 6, code: "COB25B", name: "Cobra Zero",    type: "Bottle",        date: "2025-03-01", total: 30, remaining: 27, lastCheck: "Rjay Salinas", ...calculateStock(27, 30) },
  { id: 7, code: "COB25P", name: "Cobra Energy",  type: "Plastic Bottle", date: "2025-11-06", total: 30, remaining: 27, lastCheck: "Rjay Salinas", ...calculateStock(27, 30) },
];

const categoryData = [
  { name: "Soft Drinks", value: 47, color: "#60a5fa" },
  { name: "Beer",        value: 27, color: "#7c3aed" },
  { name: "Energy Drink",value: 13, color: "#f59e0b" },
  { name: "Water",       value: 7,  color: "#f97316" },
  { name: "Juice",       value: 6,  color: "#22c55e" },
];

const navItems = [
  { label: "Dashboard",             icon: "🏠", path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: "📊", path: "/supplier"       },
  { label: "Sales Reports",         icon: "🌐", path: "/sales"          },
  { label: "Transaction Logs",      icon: "▦",  path: "/transaction"    },
  { label: "Product Management",    icon: "🗒️", path: "/product"        },
  { label: "Account Management",    icon: "👤", path: "/account"        },
  { label: "Purchase Order",        icon: "📋", path: "/purchase-order" },
];

const ITEMS_PER_PAGE = 5;

const getStockBadge = (color: string) => {
  const map: Record<string, string> = {
    green:  "bg-green-500 text-white",
    red:    "bg-red-500 text-white",
    yellow: "bg-yellow-400 text-black",
  };
  return map[color] || "bg-gray-300 text-white";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { name, value, x, y, cx } = props;
  return <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>{`${name}: ${value}%`}</text>;
};

const emptyForm = {
  code: "", name: "", type: "Bottle", date: "",
  total: "" as string | number, remaining: "" as string | number,
  lastCheck: "", stock: "In Stock", stockColor: "green",
};

export default function InventoryMaintenancePage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search,         setSearch]         = useState("");
  const [items,          setItems]          = useState<InventoryItem[]>(initialData);
  const [selected,       setSelected]       = useState<number[]>([]);
  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState(emptyForm);
  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [checkerFilter,  setCheckerFilter]  = useState("All");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown,   setShowStatusDropdown]   = useState(false);
  const [showCheckerDropdown,  setShowCheckerDropdown]  = useState(false);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [sortKey,        setSortKey]        = useState<SortKey>("name");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [isDirty,        setIsDirty]        = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef   = useRef<HTMLDivElement>(null);
  const checkerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (statusRef.current   && !statusRef.current.contains(e.target as Node))   setShowStatusDropdown(false);
      if (checkerRef.current  && !checkerRef.current.contains(e.target as Node))  setShowCheckerDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalItems      = items.length;
  const inStockCount    = items.filter((i) => i.stock === "In Stock").length;
  const lowStockCount   = items.filter((i) => i.stock === "Low Stock").length;
  const outOfStockCount = items.filter((i) => i.stock === "Out of Stock").length;

  const filtered = useMemo(() => {
    const f = items.filter((row) => {
      const matchSearch   = row.name.toLowerCase().includes(search.toLowerCase()) || row.code.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "All" || row.type === categoryFilter;
      const matchStatus   = statusFilter   === "All" || row.stock === statusFilter;
      const matchChecker  = checkerFilter  === "All" || row.lastCheck === checkerFilter;
      return matchSearch && matchCategory && matchStatus && matchChecker;
    });
    f.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return f;
  }, [items, search, categoryFilter, statusFilter, checkerFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch         = (val: string) => { setSearch(val);         setCurrentPage(1); };
  const handleCategoryFilter = (val: string) => { setCategoryFilter(val); setCurrentPage(1); setShowCategoryDropdown(false); };
  const handleStatusFilter   = (val: string) => { setStatusFilter(val);   setCurrentPage(1); setShowStatusDropdown(false);   };
  const handleCheckerFilter  = (val: string) => { setCheckerFilter(val);  setCurrentPage(1); setShowCheckerDropdown(false);  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const topSellingData = items.slice(0, 5).map((item) => ({ name: item.name, units: item.total }));
  const allPageSelected = paginated.length > 0 && paginated.every((r) => selected.includes(r.id));

  const toggleSelect = (id: number) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const toggleAll = () => {
    if (allPageSelected) setSelected((prev) => prev.filter((id) => !paginated.map((r) => r.id).includes(id)));
    else setSelected((prev) => [...new Set([...prev, ...paginated.map((r) => r.id)])]);
  };

  const openAddModal = () => {
    setForm(emptyForm); setEditingId(null); setIsDirty(false); setShowModal(true);
  };

  const openEditModal = () => {
    if (selected.length !== 1) { alert("Please select exactly one item to edit."); return; }
    const item = items.find((i) => i.id === selected[0]); if (!item) return;
    setForm({
      code: item.code, name: item.name, type: item.type, date: item.date,
      total: item.total, remaining: item.remaining, lastCheck: item.lastCheck,
      stock: item.stock, stockColor: item.stockColor,
    });
    setEditingId(item.id); setIsDirty(false); setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isDirty) { if (!confirm("You have unsaved changes. Are you sure you want to close?")) return; }
    setShowModal(false);
  };

  const handleRemainingChange = (val: string) => {
    setIsDirty(true);
    if (val === "") { setForm({ ...form, remaining: "" }); return; }
    const remaining = Math.max(0, Number(val));
    setForm({ ...form, remaining, ...calculateStock(remaining, Number(form.total) || 0) });
  };

  const handleTotalChange = (val: string) => {
    setIsDirty(true);
    if (val === "") { setForm({ ...form, total: "" }); return; }
    const total = Math.max(0, Number(val));
    setForm({ ...form, total, ...calculateStock(Number(form.remaining) || 0, total) });
  };

  const handleSave = () => {
    if (!form.code || !form.name) { alert("Code and Product Name are required."); return; }
    const saveData = {
      ...form,
      total:     form.total     === "" ? 0 : Number(form.total),
      remaining: form.remaining === "" ? 0 : Number(form.remaining),
    };
    if (editingId !== null)
      setItems((prev) => prev.map((item) => item.id === editingId ? { ...item, ...saveData } : item));
    else
      setItems((prev) => [...prev, { id: Date.now(), ...saveData } as InventoryItem]);
    setShowModal(false); setSelected([]); setIsDirty(false);
  };

  const handleDelete = () => {
    if (selected.length === 0) { alert("Please select at least one item to delete."); return; }
    setShowDeleteConfirm(true);
  };
  const confirmDelete = () => {
    setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
    setSelected([]); setShowDeleteConfirm(false);
  };

  const handleExport = () => {
    const headers = ["Code","Product Name","Type","Date Acquired","Total Stock","Remaining Stock","Last Check By","Stock Status"];
    const rows = items.map((item) => [item.code, item.name, item.type, item.date, item.total, item.remaining, item.lastCheck, item.stock]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const hasActiveFilters = categoryFilter !== "All" || statusFilter !== "All" || checkerFilter !== "All";

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
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventory Maintenance</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">📦</div>
              <div><p className="text-xs text-gray-400">Total Items</p><p className="text-xl font-bold text-gray-800">{totalItems}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">✅</div>
              <div><p className="text-xs text-gray-400">In Stock</p><p className="text-xl font-bold text-green-600">{inStockCount}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-lg">⚠️</div>
              <div><p className="text-xs text-gray-400">Low Stock</p><p className="text-xl font-bold text-yellow-500">{lowStockCount}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg">❌</div>
              <div><p className="text-xs text-gray-400">Out of Stock</p><p className="text-xl font-bold text-red-500">{outOfStockCount}</p></div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm mb-4">

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" placeholder="Search" value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="outline-none text-sm text-gray-700 w-full bg-transparent" />
              </div>

              {/* Category Filter */}
              <div className="relative" ref={categoryRef}>
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowStatusDropdown(false); setShowCheckerDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${categoryFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  👤 {categoryFilter === "All" ? "Category" : categoryFilter} ▾
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All","Bottle","Plastic Bottle"].map((opt) => (
                      <button key={opt} onClick={() => handleCategoryFilter(opt)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${categoryFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Categories" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative" ref={statusRef}>
                <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowCategoryDropdown(false); setShowCheckerDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All","In Stock","Low Stock","Out of Stock"].map((opt) => (
                      <button key={opt} onClick={() => handleStatusFilter(opt)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Statuses" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Checker Filter */}
              <div className="relative" ref={checkerRef}>
                <button onClick={() => { setShowCheckerDropdown(!showCheckerDropdown); setShowCategoryDropdown(false); setShowStatusDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${checkerFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🧑 {checkerFilter === "All" ? "Last Check By" : checkerFilter} ▾
                </button>
                {showCheckerDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...CHECKERS].map((opt) => (
                      <button key={opt} onClick={() => handleCheckerFilter(opt)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${checkerFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Checkers" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button onClick={() => { setCategoryFilter("All"); setStatusFilter("All"); setCheckerFilter("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}

              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50 ml-auto">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openEditModal} className="flex items-center gap-1 border border-gray-800 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-800 hover:bg-gray-100">✏️ Edit</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add</button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8">
                      <input type="checkbox" onChange={toggleAll} checked={allPageSelected} />
                    </th>
                    {([
                      { key: "code",      label: "Code"            },
                      { key: "name",      label: "Product Name"    },
                      { key: "type",      label: "Type"            },
                      { key: "date",      label: "Date Acquired"   },
                      { key: "total",     label: "Total Stock"     },
                      { key: "remaining", label: "Remaining Stock" },
                    ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                      <th key={key} className="p-3 text-left cursor-pointer hover:bg-indigo-800 select-none"
                        onClick={() => handleSort(key)}>
                        {label}{sortIcon(key)}
                      </th>
                    ))}
                    <th className="p-3 text-left">Last Check by</th>
                    <th className="p-3 text-left cursor-pointer hover:bg-indigo-800 select-none"
                      onClick={() => handleSort("stock")}>
                      Stock Status{sortIcon("stock")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10">
                      <p className="text-gray-400 text-sm">{search ? `No results found for "${search}".` : "No items in inventory yet."}</p>
                      {search && <button onClick={() => handleSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">Clear search</button>}
                    </td></tr>
                  ) : paginated.map((row) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                      <td className="p-3 text-gray-700">{row.code}</td>
                      <td className="p-3 text-gray-700">{row.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${row.type === "Bottle" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700"}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.date}</span></td>
                      <td className="p-3 text-gray-700">{row.total}</td>
                      <td className="p-3 text-gray-700">{row.remaining}</td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.lastCheck}</span></td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockBadge(row.stockColor)}`}>{row.stock}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-gray-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm border transition-colors ${currentPage === page ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Top Selling Products</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellingData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="units" fill="#3b82f6" radius={[4,4,0,0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-2 mt-2 justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span className="text-xs text-gray-500">Units Sold</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Inventory by Category</h2>
              <div className="flex justify-center overflow-x-auto">
                <PieChart width={320} height={220}>
                  <Pie data={categoryData} cx={155} cy={100} outerRadius={90} dataKey="value" label={renderLabel} labelLine={true}>
                    {categoryData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId !== null ? "Edit Item" : "Add New Item"}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Code</label>
                <input value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Product Name</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Type</label>
                <select value={form.type} onChange={(e) => { setForm({ ...form, type: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white">
                  <option>Bottle</option>
                  <option>Plastic Bottle</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Date Acquired</label>
                <input type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Total Stock</label>
                  <input type="number" min="0" value={form.total} onChange={(e) => handleTotalChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Remaining Stock</label>
                  <input type="number" min="0" value={form.remaining} onChange={(e) => handleRemainingChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Last Check By</label>
                <select value={form.lastCheck} onChange={(e) => { setForm({ ...form, lastCheck: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900 bg-white">
                  <option value="">Select</option>
                  {CHECKERS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Stock Status</label>
                <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium inline-block ${getStockBadge(form.stockColor)}`}>
                  {form.stock} <span className="text-xs opacity-75">(auto)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloseModal} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">
                {editingId !== null ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Items?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {selected.length} item(s)? This cannot be undone.</p>
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