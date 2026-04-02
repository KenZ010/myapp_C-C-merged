"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

type LineItem = {
  productId: string;
  productName: string;
  quantity: number | string;
  unitPrice: number | string;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  lineItems: LineItem[];
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
  createdBy: string;
  approvedBy?: string;
  completedAt?: string;
};

type Supplier = { id: string; supplierName: string };
type Product  = { id: string; productName: string; unitPrice: number };

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: "bg-yellow-100", text: "text-yellow-800" },
  APPROVED:  { bg: "bg-blue-100",   text: "text-blue-800"   },
  COMPLETED: { bg: "bg-green-100",  text: "text-green-800"  },
  CANCELLED: { bg: "bg-red-100",    text: "text-red-700"    },
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
];

const ITEMS_PER_PAGE = 8;
const emptyLineItem  = (): LineItem => ({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
const makeEmptyForm  = () => ({
  supplierId: "",
  orderDate:  new Date().toISOString().split("T")[0],
  lineItems:  [emptyLineItem()] as LineItem[],
});

type Tab = "create" | "receiving" | "history";

export default function PurchaseOrderPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [activeTab,      setActiveTab]      = useState<Tab>("create");
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [orders,         setOrders]         = useState<PurchaseOrder[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [suppliers,      setSuppliers]      = useState<Supplier[]>([]);
  const [products,       setProducts]       = useState<Product[]>([]);
  const [form,           setForm]           = useState(makeEmptyForm());
  const [saving,         setSaving]         = useState(false);

  // History
  const [historySearch,         setHistorySearch]         = useState("");
  const [historyStatus,         setHistoryStatus]         = useState("All");
  const [historyPage,           setHistoryPage]           = useState(1);
  const [viewOrder,             setViewOrder]             = useState<PurchaseOrder | null>(null);
  const [showHistoryStatusDrop, setShowHistoryStatusDrop] = useState(false);
  const historyStatusRef = useRef<HTMLDivElement>(null);

  // Receiving
  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivePage,     setReceivePage]     = useState(1);
  const [receivingOrder,  setReceivingOrder]  = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (historyStatusRef.current && !historyStatusRef.current.contains(e.target as Node))
        setShowHistoryStatusDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ordersData, suppliersData, productsData] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const calculateTotal = (items: LineItem[]) =>
    items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);

  const validLineItems = form.lineItems.filter((i) => i.productId);

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.supplierId)        { alert("Please select a supplier.");          return; }
    if (validLineItems.length === 0) { alert("Please add at least one line item."); return; }
    try {
      setSaving(true);
      const employee = JSON.parse(localStorage.getItem("employee") || "{}");
      const saveData = {
        supplierId:  form.supplierId,
        orderDate:   form.orderDate,
        lineItems:   validLineItems.map((i) => ({
          ...i, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0,
        })),
        totalAmount: calculateTotal(validLineItems),
        createdBy:   employee?.id || employee?.employeeId || "",
      };
      const result = await api.createPurchaseOrder(saveData);
      if (result?.error || (result?.message && result.message.toLowerCase().includes("error"))) {
        alert(result.message || "Failed to create order."); return;
      }
      setForm(makeEmptyForm());
      await fetchAll();
      alert("Purchase order created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addLineItem    = () => setForm({ ...form, lineItems: [...form.lineItems, emptyLineItem()] });
  const removeLineItem = (idx: number) => setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });
  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const items = [...form.lineItems];
    if (field === "productId") {
      const p = products.find((p) => p.id === value);
      items[idx] = { ...items[idx], productId: String(value), productName: p?.productName || "", unitPrice: p?.unitPrice || 0 };
    } else {
      items[idx] = { ...items[idx], [field]: value === "" ? "" : Number(value) };
    }
    setForm({ ...form, lineItems: items });
  };

  // ── RECEIVING ────────────────────────────────────────────────────────────────
  const approvedOrders      = orders.filter((o) => o.status === "APPROVED");
  const filteredReceiving   = approvedOrders.filter((o) =>
    o.poNumber.toLowerCase().includes(receivingSearch.toLowerCase()) ||
    o.supplierName.toLowerCase().includes(receivingSearch.toLowerCase())
  );
  const receiveTotalPages   = Math.ceil(filteredReceiving.length / ITEMS_PER_PAGE);
  const paginatedReceiving  = filteredReceiving.slice((receivePage - 1) * ITEMS_PER_PAGE, receivePage * ITEMS_PER_PAGE);

  const handleReceive = async (id: string) => {
    if (!confirm("Mark this order as COMPLETED (received)?")) return;
    try {
      await api.updatePurchaseOrderStatus(id, "COMPLETED");
      setReceivingOrder(null);
      await fetchAll();
    } catch (err) { console.error(err); }
  };

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  const filteredHistory    = orders.filter((o) => {
    const ms = o.poNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
               o.supplierName.toLowerCase().includes(historySearch.toLowerCase());
    const ss = historyStatus === "All" || o.status === historyStatus;
    return ms && ss;
  });
  const historyTotalPages  = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory   = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  const handleApprove = async (id: string) => {
    try { await api.updatePurchaseOrderStatus(id, "APPROVED"); await fetchAll(); }
    catch (err) { console.error(err); }
  };
  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    try { await api.updatePurchaseOrderStatus(id, "CANCELLED"); await fetchAll(); }
    catch (err) { console.error(err); }
  };

  const handleExport = () => {
    const headers = ["PO Number","Supplier","Order Date","Items","Total Amount","Status","Created By"];
    const rows    = orders.map((o) => [
      o.poNumber, o.supplierName, new Date(o.orderDate).toLocaleDateString(),
      o.lineItems?.length || 0, `₱${o.totalAmount?.toLocaleString() || 0}`, o.status, o.createdBy || ""
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "purchase_orders.csv"; a.click();
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  // ── PAGINATION HELPERS ───────────────────────────────────────────────────────
  const PaginationBar = ({
    page, totalPages, setPage, total, label,
  }: { page: number; totalPages: number; setPage: (p: number) => void; total: number; label: string }) =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-xs text-gray-400">
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {label}
        </p>
        <div className="flex gap-1">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-3 py-1 rounded-lg text-sm border ${page === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{p}</button>
          ))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next →</button>
        </div>
      </div>
    ) : null;

  // ────────────────────────────────────────────────────────────────────────────
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
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Purchase Order</h1>
            <p className="text-xs text-gray-400 hidden md:block">Create and manage PO from suppliers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
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

        {/* Tab Bar */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6">
          <div className="flex">
            {([
              { key: "create",    label: "Create Order", icon: "📋" },
              { key: "receiving", label: "Receiving",     icon: "📦" },
              { key: "history",   label: "PO History",   icon: "🕐" },
            ] as { key: Tab; label: string; icon: string }[]).map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.key === "receiving" && approvedOrders.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none ml-1">
                    {approvedOrders.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">

          {/* ══════════════════════════════════════════════════════════════════
              TAB: CREATE ORDER
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "create" && (
            <div className="flex flex-col lg:flex-row gap-4">

              {/* Form side */}
              <div className="flex-1 flex flex-col gap-4">

                {/* Supplier & Date */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">🏢 Select Supplier / Company</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Supplier</label>
                      <select
                        value={form.supplierId}
                        onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white"
                      >
                        <option value="">Select a supplier...</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Order Date</label>
                      <input type="date" value={form.orderDate}
                        onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white" />
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-700">🛒 Products</h2>
                    <button onClick={addLineItem}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50">
                      + Add Item
                    </button>
                  </div>

                  {form.lineItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No items added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                        <div className="col-span-5">Product</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-3">Unit Price</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                      </div>
                      {form.lineItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2">
                          <div className="col-span-5">
                            <select value={item.productId}
                              onChange={(e) => updateLineItem(idx, "productId", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white">
                              <option value="">-- Select Product --</option>
                              {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="1" value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-center text-gray-900 bg-white"
                              placeholder="Qty" />
                          </div>
                          <div className="col-span-3">
                            <input type="number" min="0" step="0.01" value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white"
                              placeholder="₱0.00" />
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            <span className="text-xs font-medium text-gray-700">
                              ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                            </span>
                            {form.lineItems.length > 1 && (
                              <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600 ml-1 text-sm">✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order List sidebar */}
              <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">📋 Order List</h2>

                  {validLineItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="text-4xl mb-3">📋</span>
                      <p className="text-xs text-gray-400">No items yet. Select a supplier and add products.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {validLineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-50">
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{item.productName}</p>
                            <p className="text-xs text-gray-400">{item.quantity} × ₱{Number(item.unitPrice).toLocaleString()}</p>
                          </div>
                          <span className="text-xs font-semibold text-indigo-700">
                            ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-600">Total</span>
                        <span className="text-base font-bold text-indigo-900">
                          ₱{calculateTotal(validLineItems).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {form.supplierId && (
                    <div className="mb-3 p-2.5 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">Supplier</p>
                      <p className="text-sm font-medium text-gray-800">
                        {suppliers.find((s) => s.id === form.supplierId)?.supplierName || "—"}
                      </p>
                    </div>
                  )}

                  <button onClick={handleSave}
                    disabled={saving || validLineItems.length === 0 || !form.supplierId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    {saving
                      ? <><span className="animate-spin inline-block">⏳</span> Submitting...</>
                      : <><span>📤</span> Submit Purchase Order</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: RECEIVING
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "receiving" && (
            <div className="flex flex-col lg:flex-row gap-4">

              {/* List */}
              <div className="flex-1">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-gray-700">📦 Approved Orders — Ready to Receive</h2>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                      <span className="text-gray-400 text-sm">🔍</span>
                      <input type="text" placeholder="Search..." value={receivingSearch}
                        onChange={(e) => { setReceivingSearch(e.target.value); setReceivePage(1); }}
                        className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="bg-indigo-900 text-white text-xs">
                          <th className="p-3 text-left">PO Number</th>
                          <th className="p-3 text-left">Supplier</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Items</th>
                          <th className="p-3 text-left">Total</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td></tr>
                        ) : paginatedReceiving.length === 0 ? (
                          <tr><td colSpan={6} className="p-10 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-3xl">📭</span>
                              <p className="text-gray-400 text-sm">No approved orders to receive.</p>
                            </div>
                          </td></tr>
                        ) : paginatedReceiving.map((row) => (
                          <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${receivingOrder?.id === row.id ? "bg-indigo-50" : ""}`}>
                            <td className="p-3">
                              <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.poNumber}</span>
                            </td>
                            <td className="p-3 text-gray-700">{row.supplierName}</td>
                            <td className="p-3 text-gray-500 text-xs">{new Date(row.orderDate).toLocaleDateString()}</td>
                            <td className="p-3 text-center text-gray-700">{row.lineItems?.length || 0}</td>
                            <td className="p-3 font-medium text-gray-800">₱{row.totalAmount?.toLocaleString() || 0}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button onClick={() => setReceivingOrder(row)}
                                  className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                                <button onClick={() => handleReceive(row.id)}
                                  className="border border-green-300 text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 text-xs font-medium">✓ Receive</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar page={receivePage} totalPages={receiveTotalPages} setPage={setReceivePage} total={filteredReceiving.length} label="orders" />
                </div>
              </div>

              {/* Detail sidebar */}
              <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Order Details</h2>
                  {!receivingOrder ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="text-3xl mb-2">👆</span>
                      <p className="text-xs text-gray-400">Click View on an order to see its details here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">PO Number</p>
                        <p className="text-sm font-bold text-gray-800 font-mono">{receivingOrder.poNumber}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Supplier</p>
                        <p className="text-sm font-medium text-gray-800">{receivingOrder.supplierName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-2">Line Items</p>
                        {receivingOrder.lineItems?.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-700 py-1.5 border-b border-gray-100 last:border-0">
                            <span className="font-medium">{item.productName}</span>
                            <span className="text-gray-500">{item.quantity} × ₱{item.unitPrice}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">Total</span>
                        <span className="text-base font-bold text-indigo-900">₱{receivingOrder.totalAmount?.toLocaleString()}</span>
                      </div>
                      <button onClick={() => handleReceive(receivingOrder.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-semibold">
                        ✓ Mark as Received
                      </button>
                      <button onClick={() => setReceivingOrder(null)}
                        className="w-full border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: PO HISTORY
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-700">🕐 Purchase Order History</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                    <span className="text-gray-400 text-sm">🔍</span>
                    <input type="text" placeholder="Search PO..." value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                  </div>

                  <div className="relative" ref={historyStatusRef}>
                    <button onClick={() => setShowHistoryStatusDrop(!showHistoryStatusDrop)}
                      className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-xs transition-colors ${historyStatus !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      🔖 {historyStatus === "All" ? "All Status" : historyStatus} ▾
                    </button>
                    {showHistoryStatusDrop && (
                      <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40">
                        {["All","PENDING","APPROVED","COMPLETED","CANCELLED"].map((opt) => (
                          <button key={opt} onClick={() => { setHistoryStatus(opt); setHistoryPage(1); setShowHistoryStatusDrop(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${historyStatus === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                            {opt === "All" ? "All Status" : opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {historyStatus !== "All" && (
                    <button onClick={() => { setHistoryStatus("All"); setHistoryPage(1); }}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
                  )}

                  <button onClick={handleExport}
                    className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                    📤 Export
                  </button>
                </div>
              </div>

              {/* Summary pills */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { label: "Total",     count: orders.length,                                       color: "bg-indigo-100 text-indigo-700"  },
                  { label: "Pending",   count: orders.filter(o => o.status==="PENDING").length,     color: "bg-yellow-100 text-yellow-800"  },
                  { label: "Approved",  count: orders.filter(o => o.status==="APPROVED").length,    color: "bg-blue-100 text-blue-800"      },
                  { label: "Completed", count: orders.filter(o => o.status==="COMPLETED").length,   color: "bg-green-100 text-green-800"    },
                  { label: "Cancelled", count: orders.filter(o => o.status==="CANCELLED").length,   color: "bg-red-100 text-red-700"        },
                ].map((s) => (
                  <span key={s.label} className={`${s.color} rounded-full px-3 py-1 text-xs font-semibold`}>
                    {s.label}: {s.count}
                  </span>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      <th className="p-3 text-left">PO Number</th>
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Items</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-6 text-center text-gray-400">Loading orders...</td></tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">📭</span>
                          <p className="text-gray-400 text-sm">No orders found.</p>
                        </div>
                      </td></tr>
                    ) : paginatedHistory.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.poNumber}</span>
                        </td>
                        <td className="p-3 text-gray-700">{row.supplierName}</td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(row.orderDate).toLocaleDateString()}</td>
                        <td className="p-3 text-center text-gray-700">{row.lineItems?.length || 0}</td>
                        <td className="p-3 font-medium text-gray-800">₱{row.totalAmount?.toLocaleString() || 0}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => setViewOrder(row)}
                              className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                            {row.status === "PENDING" && (
                              <button onClick={() => handleApprove(row.id)}
                                className="border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-1 text-xs font-medium">Approve</button>
                            )}
                            {row.status !== "COMPLETED" && row.status !== "CANCELLED" && (
                              <button onClick={() => handleCancel(row.id)}
                                className="border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium">Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={historyPage} totalPages={historyTotalPages} setPage={setHistoryPage} total={filteredHistory.length} label="orders" />
            </div>
          )}

        </div>
      </main>

      {/* VIEW ORDER MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Purchase Order</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewOrder.poNumber}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewOrder.status]?.bg} ${STATUS_CONFIG[viewOrder.status]?.text}`}>
                {viewOrder.status}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-800">{viewOrder.supplierName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Order Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(viewOrder.orderDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Created By</p>
                  <p className="text-sm font-medium text-gray-800">{viewOrder.createdBy || "—"}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Line Items</p>
                <div className="space-y-2">
                  {viewOrder.lineItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">
                      <span className="font-medium">{item.productName || item.productId}</span>
                      <span className="text-gray-500">
                        {item.quantity} × ₱{item.unitPrice} ={" "}
                        <span className="font-semibold text-gray-800">₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-lg font-bold text-indigo-900">₱{viewOrder.totalAmount?.toLocaleString() || 0}</p>
              </div>
            </div>
            <button onClick={() => setViewOrder(null)}
              className="w-full mt-5 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}