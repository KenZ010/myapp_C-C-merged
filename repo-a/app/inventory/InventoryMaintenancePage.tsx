"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
type DeliveryItem = {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  returnedQty: number;
  costPrice: number;
  product?: { id: string; productName: string; price: number };
};

type Delivery = {
  id: string;
  supplierId: string;
  deliveryDate: string;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
  totalItems: number;
  notes?: string;
  createdAt: string;
  supplier?: { id: string; supplierName: string };
  items: DeliveryItem[];
};

type LineItem = {
  productId: string;
  productName: string;
  quantity: number | string;
  unitPrice: number | string;
};

type DeliveryForm = {
  supplierId: string;
  deliveryDate: string;
  lineItems: LineItem[];
  notes: string;
};

type Supplier = { id: string; supplierName: string };
type Product  = { id: string; productName: string; price: number; supplierId: string };
type ReceiveQty = { deliveryItemId: string; receivedQty: number };

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:            { bg: "bg-yellow-100", text: "text-yellow-800" },
  PARTIALLY_RECEIVED: { bg: "bg-blue-100",   text: "text-blue-800"   },
  DELIVERED:          { bg: "bg-green-100",  text: "text-green-800"  },
  CANCELLED:          { bg: "bg-red-100",    text: "text-red-700"    },
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
const makeEmptyForm  = (): DeliveryForm => ({
  supplierId:   "",
  deliveryDate: new Date().toISOString().split("T")[0],
  lineItems:    [emptyLineItem()],
  notes:        "",
});

type Tab = "create" | "receiving" | "history";

export default function PurchaseOrderPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [activeTab,       setActiveTab]       = useState<Tab>("create");
  const [showUserMenu,    setShowUserMenu]    = useState(false);
  const [showMobileMenu,  setShowMobileMenu]  = useState(false);
  const [deliveries,      setDeliveries]      = useState<Delivery[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [suppliers,       setSuppliers]       = useState<Supplier[]>([]);
  const [products,        setProducts]        = useState<Product[]>([]);
  const [form,            setForm]            = useState<DeliveryForm>(makeEmptyForm());
  const [saving,          setSaving]          = useState(false);

  // History
  const [historySearch,         setHistorySearch]         = useState("");
  const [historyStatus,         setHistoryStatus]         = useState("All");
  const [historyPage,           setHistoryPage]           = useState(1);
  const [viewDelivery,          setViewDelivery]          = useState<Delivery | null>(null);
  const [showHistoryStatusDrop, setShowHistoryStatusDrop] = useState(false);
  const historyStatusRef = useRef<HTMLDivElement>(null);

  // Receiving
  const [receivingSearch,   setReceivingSearch]   = useState("");
  const [receivePage,       setReceivePage]       = useState(1);
  const [receivingDelivery, setReceivingDelivery] = useState<Delivery | null>(null);
  const [receiveQtys,       setReceiveQtys]       = useState<ReceiveQty[]>([]);
  const [receiving,         setReceiving]         = useState(false);

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
      const [deliveriesData, suppliersData, productsData] = await Promise.all([
        api.getDeliveries(),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Products filtered by selected supplier
  const supplierProducts = form.supplierId
    ? products.filter((p) => p.supplierId === form.supplierId)
    : [];

  const calculateTotal = (items: LineItem[]) =>
    items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);

  const validLineItems = form.lineItems.filter((i) => i.productId);

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const handleSupplierChange = (supplierId: string) => {
    setForm({
      ...form,
      supplierId,
      lineItems: [emptyLineItem()], // reset items when supplier changes
    });
  };

  const handleSave = async () => {
    if (!form.supplierId) { alert("Please select a supplier."); return; }
    if (validLineItems.length === 0) { alert("Please add at least one product."); return; }

    try {
      setSaving(true);
      const saveData = {
        supplierId:   form.supplierId,
        deliveryDate: form.deliveryDate,
        totalItems:   validLineItems.reduce((sum, i) => sum + Number(i.quantity), 0),
        notes:        form.notes || "",
        items:        validLineItems.map((i) => ({
          productId: i.productId,
          quantity:  Number(i.quantity) || 1,
          costPrice: Number(i.unitPrice) || 0,
        })),
      };

      const result = await api.createDelivery(saveData);
      if (result?.error || result?.message?.toLowerCase().includes("error")) {
        alert(result.message || "Failed to create delivery.");
        return;
      }

      setForm(makeEmptyForm());
      await fetchAll();
      alert("Delivery created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create delivery. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addLineItem    = () => setForm({ ...form, lineItems: [...form.lineItems, emptyLineItem()] });
  const removeLineItem = (idx: number) => setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });
  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const items = [...form.lineItems];
    if (field === "productId") {
      const p = supplierProducts.find((p) => p.id === value);
      items[idx] = {
        ...items[idx],
        productId:   String(value),
        productName: p?.productName || "",
        unitPrice:   p?.price || 0,
      };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm({ ...form, lineItems: items });
  };

  // ── RECEIVING ────────────────────────────────────────────────────────────────
  const pendingDeliveries  = deliveries.filter((d) => d.status === "PENDING" || d.status === "PARTIALLY_RECEIVED");
  const filteredReceiving  = pendingDeliveries.filter((d) =>
    d.id.toLowerCase().includes(receivingSearch.toLowerCase()) ||
    (d.supplier?.supplierName || "").toLowerCase().includes(receivingSearch.toLowerCase())
  );
  const receiveTotalPages  = Math.ceil(filteredReceiving.length / ITEMS_PER_PAGE);
  const paginatedReceiving = filteredReceiving.slice((receivePage - 1) * ITEMS_PER_PAGE, receivePage * ITEMS_PER_PAGE);

  const openReceiveModal = (delivery: Delivery) => {
    setReceivingDelivery(delivery);
    setReceiveQtys(
      delivery.items.map((item) => ({
        deliveryItemId: item.id,
        receivedQty:    item.orderedQty - item.receivedQty, // default = remaining
      }))
    );
  };

  const handleReceive = async () => {
    if (!receivingDelivery) return;
    const employee = JSON.parse(localStorage.getItem("employee") || "{}");
    if (!employee?.id) { alert("Employee not found. Please log in again."); return; }

    try {
      setReceiving(true);
      const result = await api.receiveDelivery(
        receivingDelivery.id,
        employee.id,
        receiveQtys.filter((r) => r.receivedQty > 0)
      );
      if (result?.message?.toLowerCase().includes("error")) {
        alert(result.message);
        return;
      }
      setReceivingDelivery(null);
      await fetchAll();
      alert("Items received! Stock has been updated in Inventory.");
    } catch (err) {
      console.error(err);
      alert("Failed to receive items.");
    } finally {
      setReceiving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this delivery?")) return;
    try {
      await api.updateDelivery(id, { status: "CANCELLED" });
      await fetchAll();
    } catch (err) { console.error(err); }
  };

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  const filteredHistory = deliveries.filter((d) => {
    const ms = d.id.toLowerCase().includes(historySearch.toLowerCase()) ||
               (d.supplier?.supplierName || "").toLowerCase().includes(historySearch.toLowerCase());
    const ss = historyStatus === "All" || d.status === historyStatus;
    return ms && ss;
  });
  const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory  = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  const handleExport = () => {
    const headers = ["ID","Supplier","Delivery Date","Total Items","Status","Notes"];
    const rows    = deliveries.map((d) => [
      d.id,
      d.supplier?.supplierName || d.supplierId,
      new Date(d.deliveryDate).toLocaleDateString(),
      d.totalItems,
      d.status,
      d.notes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "deliveries.csv";
    a.click();
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("employee");
    router.push("/");
  };

  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

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
            <p className="text-xs text-gray-400 hidden md:block">Create and manage deliveries from suppliers</p>
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
                {tab.key === "receiving" && pendingDeliveries.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none ml-1">
                    {pendingDeliveries.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">

          {/* ══ TAB: CREATE ══ */}
          {activeTab === "create" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-4">

                {/* Supplier & Date */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-700 mb-3">🏢 Select Supplier / Company</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Supplier</label>
                      <select
                        value={form.supplierId}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white">
                        <option value="">Select a supplier...</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.supplierName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Delivery Date</label>
                      <input type="date" value={form.deliveryDate}
                        onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white" />
                    </div>
                  </div>

                  {/* Supplier info hint */}
                  {form.supplierId && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl flex items-center gap-2">
                      <span className="text-indigo-500 text-sm">ℹ️</span>
                      <p className="text-xs text-indigo-700">
                        Showing <span className="font-semibold">{supplierProducts.length}</span> product(s) from{" "}
                        <span className="font-semibold">{suppliers.find(s => s.id === form.supplierId)?.supplierName}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                  <textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white resize-none"
                    placeholder="Optional notes about this delivery..." />
                </div>

                {/* Products */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-700">🛒 Products</h2>
                    <button onClick={addLineItem}
                      disabled={!form.supplierId}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      + Add Item
                    </button>
                  </div>

                  {!form.supplierId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <span className="text-3xl mb-2">🏢</span>
                      <p className="text-sm text-gray-400">Please select a supplier first to see their products.</p>
                    </div>
                  ) : supplierProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <span className="text-3xl mb-2">📭</span>
                      <p className="text-sm text-gray-400">No products found for this supplier.</p>
                      <p className="text-xs text-gray-400 mt-1">Add products linked to this supplier in Product Management.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                        <div className="col-span-5">Product</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-3">Cost Price</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                      </div>
                      {form.lineItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2">
                          <div className="col-span-5">
                            <select value={item.productId}
                              onChange={(e) => updateLineItem(idx, "productId", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white">
                              <option value="">-- Select Product --</option>
                              {supplierProducts.map((p) => (
                                <option key={p.id} value={p.id}>{p.productName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="1" value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-center text-gray-900 bg-white" />
                          </div>
                          <div className="col-span-3">
                            <input type="number" min="0" step="0.01" value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white"
                              placeholder="₱0.00" />
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            <span className="text-xs font-medium text-gray-700">
                              ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                            </span>
                            {form.lineItems.length > 1 && (
                              <button onClick={() => removeLineItem(idx)}
                                className="text-red-400 hover:text-red-600 ml-1 text-sm">✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order summary sidebar */}
              <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">📋 Order List</h2>

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
                      : <><span>📤</span> Submit Delivery</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: RECEIVING ══ */}
          {activeTab === "receiving" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-gray-700">📦 Pending Deliveries — Ready to Receive</h2>
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
                          <th className="p-3 text-left">Delivery ID</th>
                          <th className="p-3 text-left">Supplier</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Items</th>
                          <th className="p-3 text-left">Status</th>
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
                              <p className="text-gray-400 text-sm">No pending deliveries.</p>
                            </div>
                          </td></tr>
                        ) : paginatedReceiving.map((row) => (
                          <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${receivingDelivery?.id === row.id ? "bg-indigo-50" : ""}`}>
                            <td className="p-3">
                              <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span>
                            </td>
                            <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                            <td className="p-3 text-gray-500 text-xs">{new Date(row.deliveryDate).toLocaleDateString()}</td>
                            <td className="p-3 text-center text-gray-700">{row.items?.length || 0}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button onClick={() => openReceiveModal(row)}
                                  className="border border-green-300 text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 text-xs font-medium">
                                  ✓ Receive
                                </button>
                                <button onClick={() => handleCancel(row.id)}
                                  className="border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium">
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar page={receivePage} totalPages={receiveTotalPages} setPage={setReceivePage} total={filteredReceiving.length} label="deliveries" />
                </div>
              </div>

              {/* Receive detail sidebar */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Receive Items</h2>
                  {!receivingDelivery ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="text-3xl mb-2">👆</span>
                      <p className="text-xs text-gray-400">Click Receive on a delivery to confirm quantities</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Supplier</p>
                        <p className="text-sm font-medium text-gray-800">{receivingDelivery.supplier?.supplierName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-2">Confirm received quantities</p>
                        <div className="space-y-2">
                          {receivingDelivery.items.map((item, i) => {
                            const rq        = receiveQtys.find((r) => r.deliveryItemId === item.id);
                            const remaining = item.orderedQty - item.receivedQty;
                            return (
                              <div key={i} className="py-1.5 border-b border-gray-100 last:border-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">
                                      {item.product?.productName || item.productId}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Ordered: {item.orderedQty} | Got: {item.receivedQty} | Left: {remaining}
                                    </p>
                                  </div>
                                  <input
                                    type="number" min="0" max={remaining}
                                    value={rq?.receivedQty ?? 0}
                                    onChange={(e) => setReceiveQtys((prev) =>
                                      prev.map((r) => r.deliveryItemId === item.id
                                        ? { ...r, receivedQty: Math.min(Number(e.target.value), remaining) }
                                        : r
                                      )
                                    )}
                                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-indigo-400 shrink-0"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 rounded-xl">
                        <p className="text-xs text-green-700 font-medium">
                          ✅ Stock will be updated automatically in Inventory Maintenance after confirming.
                        </p>
                      </div>

                      <button onClick={handleReceive} disabled={receiving}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
                        {receiving
                          ? <><span className="animate-spin">⏳</span> Processing...</>
                          : "✓ Confirm Receipt & Update Stock"}
                      </button>
                      <button onClick={() => setReceivingDelivery(null)}
                        className="w-full border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: HISTORY ══ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-700">🕐 Delivery History</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                    <span className="text-gray-400 text-sm">🔍</span>
                    <input type="text" placeholder="Search..." value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                  </div>

                  <div className="relative" ref={historyStatusRef}>
                    <button onClick={() => setShowHistoryStatusDrop(!showHistoryStatusDrop)}
                      className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-xs transition-colors ${historyStatus !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      🔖 {historyStatus === "All" ? "All Status" : historyStatus} ▾
                    </button>
                    {showHistoryStatusDrop && (
                      <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-52">
                        {["All","PENDING","PARTIALLY_RECEIVED","DELIVERED","CANCELLED"].map((opt) => (
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
                  { label: "Total",     count: deliveries.length,                                              color: "bg-indigo-100 text-indigo-700" },
                  { label: "Pending",   count: deliveries.filter(d => d.status === "PENDING").length,           color: "bg-yellow-100 text-yellow-800" },
                  { label: "Partial",   count: deliveries.filter(d => d.status === "PARTIALLY_RECEIVED").length, color: "bg-blue-100 text-blue-800"    },
                  { label: "Delivered", count: deliveries.filter(d => d.status === "DELIVERED").length,         color: "bg-green-100 text-green-800"   },
                  { label: "Cancelled", count: deliveries.filter(d => d.status === "CANCELLED").length,         color: "bg-red-100 text-red-700"       },
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
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-left">Delivery Date</th>
                      <th className="p-3 text-left">Items</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td></tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">📭</span>
                          <p className="text-gray-400 text-sm">No deliveries found.</p>
                        </div>
                      </td></tr>
                    ) : paginatedHistory.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(row.deliveryDate).toLocaleDateString()}</td>
                        <td className="p-3 text-center text-gray-700">{row.items?.length || 0}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewDelivery(row)}
                              className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                            {row.status !== "DELIVERED" && row.status !== "CANCELLED" && (
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
              <PaginationBar page={historyPage} totalPages={historyTotalPages} setPage={setHistoryPage} total={filteredHistory.length} label="deliveries" />
            </div>
          )}
        </div>
      </main>

      {/* VIEW DELIVERY MODAL */}
      {viewDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Delivery Details</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewDelivery.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewDelivery.status]?.bg} ${STATUS_CONFIG[viewDelivery.status]?.text}`}>
                {viewDelivery.status}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-800">{viewDelivery.supplier?.supplierName || viewDelivery.supplierId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Delivery Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(viewDelivery.deliveryDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Total Items Ordered</p>
                  <p className="text-sm font-medium text-gray-800">{viewDelivery.totalItems}</p>
                </div>
              </div>
              {viewDelivery.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{viewDelivery.notes}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Items</p>
                <div className="space-y-2">
                  {viewDelivery.items?.map((item, idx) => (
                    <div key={idx} className="py-1.5 border-b border-gray-100 last:border-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-700">
                          {item.product?.productName || item.productId}
                        </p>
                        <span className="text-xs text-gray-500">₱{item.costPrice}</span>
                      </div>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-gray-400">Ordered: <span className="font-medium text-gray-600">{item.orderedQty}</span></span>
                        <span className="text-xs text-gray-400">Received: <span className="font-medium text-green-600">{item.receivedQty}</span></span>
                        <span className="text-xs text-gray-400">Returned: <span className="font-medium text-red-500">{item.returnedQty}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setViewDelivery(null)}
              className="w-full mt-5 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
