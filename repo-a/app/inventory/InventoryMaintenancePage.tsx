"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

type InventoryItem = {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  expiryDate: string;
  stock: number;
  status: string;
};

type Employee = {
  id: string;
  name: string;
};

type SortKey = "barcode" | "productName" | "category" | "expiryDate" | "stock" | "status";
type SortDir = "asc" | "desc";

const calculateStockStatus = (stock: number): { label: string; color: string } => {
  if (stock === 0) return { label: "Out of Stock", color: "red" };
  if (stock <= 10)  return { label: "Low Stock",    color: "yellow" };
  return { label: "In Stock", color: "green" };
};

const ITEMS_PER_PAGE = 5;

const getStockBadge = (color: string) => {
  const map: Record<string, string> = {
    green:  "bg-green-500 text-white",
    red:    "bg-red-500 text-white",
    yellow: "bg-yellow-400 text-black",
  };
  return map[color] || "bg-gray-300 text-white";
};

const navItems = [
  { label: "Dashboard",             icon: "🏠", path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: "🛒", path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: "📊", path: "/supplier"       },
  { label: "Sales Reports",         icon: "🌐", path: "/sales"          },
  { label: "Transaction Logs",      icon: "▦",  path: "/transaction"    },
  { label: "Product Management",    icon: "🗒️", path: "/product"        },
  { label: "Account Management",    icon: "👤", path: "/account"        },
  { label: "Purchase Order",        icon: "📋", path: "/purchase-order" },
  { label: "Promo Management", icon: "🎁", path: "/promo" },
];

export default function InventoryMaintenancePage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [items,    setItems]    = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [sortKey,        setSortKey]        = useState<SortKey>("productName");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown,   setShowStatusDropdown]   = useState(false);
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef   = useRef<HTMLDivElement>(null);

  // Fetch products from your API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
        const data = await res.json();
        setItems(data.map((p: any) => ({
          id:          p.id,
          barcode:     p.barcode     ?? "—",
          productName: p.productName,
          category:    p.category,
          expiryDate:  p.expiryDate  ? new Date(p.expiryDate).toISOString().split("T")[0] : "—",
          stock:       p.stock       ?? 0,
          status:      p.status,
        })));
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch employees for checker filter
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees`);
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (statusRef.current   && !statusRef.current.contains(e.target as Node))   setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Summary counts
  const totalItems      = items.length;
  const inStockCount    = items.filter(i => calculateStockStatus(i.stock).label === "In Stock").length;
  const lowStockCount   = items.filter(i => calculateStockStatus(i.stock).label === "Low Stock").length;
  const outOfStockCount = items.filter(i => calculateStockStatus(i.stock).label === "Out of Stock").length;

  // Category breakdown for pie chart (dynamic)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] ?? 0) + 1; });
    const colors = ["#60a5fa","#7c3aed","#f59e0b","#f97316","#22c55e","#ec4899"];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value: Math.round((value / items.length) * 100),
      color: colors[idx % colors.length]
    }));
  }, [items]);

  // Top selling for bar chart (by stock, replace with actual sales data later)
  const topSellingData = useMemo(() =>
    [...items].sort((a, b) => b.stock - a.stock).slice(0, 5).map(p => ({
      name: p.productName,
      units: p.stock
    }))
  , [items]);

  const filtered = useMemo(() => {
    const f = items.filter(row => {
      const matchSearch   = row.productName.toLowerCase().includes(search.toLowerCase()) ||
                            row.barcode.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "All" || row.category === categoryFilter;
      const matchStatus   = statusFilter   === "All" || calculateStockStatus(row.stock).label === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
    f.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return f;
  }, [items, search, categoryFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const allPageSelected = paginated.length > 0 && paginated.every(r => selected.includes(r.id));
  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => {
    if (allPageSelected) setSelected(prev => prev.filter(id => !paginated.map(r => r.id).includes(id)));
    else setSelected(prev => [...new Set([...prev, ...paginated.map(r => r.id)])]);
  };

  const handleDelete = () => {
    if (selected.length === 0) { alert("Please select at least one item to delete."); return; }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await Promise.all(
        selected.map(id =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, { method: "DELETE" })
        )
      );
      setItems(prev => prev.filter(item => !selected.includes(item.id)));
      setSelected([]);
    } catch (err) {
      console.error("Failed to delete", err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = () => {
    const headers = ["Barcode","Product Name","Category","Expiry Date","Stock","Status"];
    const rows = items.map(item => [item.barcode, item.productName, item.category, item.expiryDate, item.stock, calculateStockStatus(item.stock).label]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };
  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const hasActiveFilters = categoryFilter !== "All" || statusFilter !== "All";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { name, value, x, y, cx } = props;
    return <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>{`${name}: ${value}%`}</text>;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Sidebar */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
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
          <button className="md:hidden text-gray-600 text-xl mr-2"
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
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="outline-none text-sm text-gray-700 w-full bg-transparent" />
              </div>

              {/* Category Filter */}
              <div className="relative" ref={categoryRef}>
                <button onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowStatusDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${categoryFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  📦 {categoryFilter === "All" ? "Category" : categoryFilter} ▾
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All", ...Array.from(new Set(items.map(i => i.category)))].map(opt => (
                      <button key={opt} onClick={() => { setCategoryFilter(opt); setCurrentPage(1); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${categoryFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Categories" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative" ref={statusRef}>
                <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowCategoryDropdown(false); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44">
                    {["All","In Stock","Low Stock","Out of Stock"].map(opt => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setCurrentPage(1); setShowStatusDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Statuses" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button onClick={() => { setCategoryFilter("All"); setStatusFilter("All"); setCurrentPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}

              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50 ml-auto">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={() => router.push("/product")} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add</button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Loading inventory...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      <th className="p-3 text-left w-8">
                        <input type="checkbox" onChange={toggleAll} checked={allPageSelected} />
                      </th>
                      {([
                        { key: "barcode",     label: "Barcode"       },
                        { key: "productName", label: "Product Name"  },
                        { key: "category",    label: "Category"      },
                        { key: "expiryDate",  label: "Expiry Date"   },
                        { key: "stock",       label: "Stock"         },
                        { key: "status",      label: "Stock Status"  },
                      ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                        <th key={key} className="p-3 text-left cursor-pointer hover:bg-indigo-800 select-none"
                          onClick={() => handleSort(key)}>
                          {label}{sortIcon(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10">
                        <p className="text-gray-400 text-sm">{search ? `No results for "${search}".` : "No items in inventory yet."}</p>
                      </td></tr>
                    ) : paginated.map(row => {
                      const { label, color } = calculateStockStatus(row.stock);
                      return (
                        <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                          <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                          <td className="p-3 text-gray-700">{row.barcode}</td>
                          <td className="p-3 text-gray-700">{row.productName}</td>
                          <td className="p-3">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs">{row.category}</span>
                          </td>
                          <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">{row.expiryDate}</span></td>
                          <td className="p-3 text-gray-700">{row.stock}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockBadge(color)}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-gray-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm border transition-colors ${currentPage === page ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Top Products by Stock</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellingData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="units" fill="#3b82f6" radius={[4,4,0,0]} name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Inventory by Category</h2>
              <div className="flex justify-center overflow-x-auto">
                <PieChart width={320} height={220}>
                  <Pie data={categoryData} cx={155} cy={100} outerRadius={90} dataKey="value" label={renderLabel} labelLine={true}>
                    {categoryData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={value => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>
        </div>
      </main>

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