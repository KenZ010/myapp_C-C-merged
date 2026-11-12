"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { exportStyledExcel } from "@/lib/excelExport";
import {
  LayoutDashboard, ShoppingCart, Users, LineChart,
  Package, User, ClipboardList, AlertTriangle, Gift,
  Clock, Inbox, Search,
} from "lucide-react";

// ─── CASE UNIT SYSTEM ────────────────────────────────────────────────────────
type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: { value: CaseUnit; label: string; short: string; bottlesPerCase: number | null; detail: string }[] = [
  { value: "case_24", label: "Case (24 pieces)", short: "24-cs", bottlesPerCase: 24, detail: "1 case = 24 pieces" },
  { value: "case_12", label: "Case (12 pieces)", short: "12-cs", bottlesPerCase: 12, detail: "1 case = 12 pieces" },
  { value: "case_6",  label: "Case (6 pieces)",  short: "6-cs",  bottlesPerCase: 6,  detail: "1 case = 6 pieces"  },
  { value: "btl",     label: "Bottles",          short: "btl",   bottlesPerCase: null, detail: "Individual bottle" },
  { value: "pcs",     label: "Pieces",           short: "pcs",   bottlesPerCase: null, detail: "Single piece"      },
];

const getUnit = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];

const pluralize = (n: number, singular: string, plural = `${singular}s`) =>
  `${n.toLocaleString()} ${n === 1 ? singular : plural}`;

const getUnitName = (u?: string) => (getUnit(u).bottlesPerCase ? "case" : "piece");

const formatQty = (qty: number, u?: string) => pluralize(qty, getUnitName(u));

function getCaseBreakdown(qty: number, unit?: string): string | null {
  const u = getUnit(unit);
  if (!u.bottlesPerCase) return null;
  return `${pluralize(qty, "case")} × ${pluralize(u.bottlesPerCase, "piece")} = ${pluralize(qty * u.bottlesPerCase, "piece")}`;
}

function UnitPill({ unit, qty }: { unit?: string; qty?: number }) {
  const u = getUnit(unit);
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      <span className={qty != null ? "text-gray-700 font-semibold" : ""}>
        {qty != null ? formatQty(qty, unit) : u.label}
      </span>
    </span>
  );
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
type DeliveryItem = {
  id: string; productId: string;
  orderedQty: number; receivedQty: number; returnedQty: number;
  costPrice: number; unit?: string;
  product?: { id: string; productName: string; price: number; stockUnit?: string; size?: string | null };
};

type Delivery = {
  id: string; supplierId: string; deliveryDate: string;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
  totalItems: number; notes?: string; createdAt: string;
  supplier?: { id: string; supplierName: string };
  employee?: { id: string; name: string; role: string };
  items: DeliveryItem[];
};

type Product = {
  id: string; productName: string; price: number; costPrice?: number | null;
  supplierId?: string; supplier?: { id: string; supplierName: string } | string;
  status?: string; stockUnit?: string; stockQuantity?: number; size?: string | null;
};

// Order Request — created by the inventory manager, reviewed by the admin
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type OrderRequestItem = {
  id: string; productId: string; quantity: number; costPrice: number; unit?: string;
  product?: { id: string; productName: string; size?: string | null; stockUnit?: string };
};

type OrderRequest = {
  id: string; supplierId: string; status: RequestStatus;
  notes?: string; adminRemarks?: string; createdAt: string;
  supplier?: { id: string; supplierName: string };
  requestedBy?: { id: string; name: string; role: string };
  items: OrderRequestItem[];
};

type Tab = "requests" | "history";

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:            { bg: "bg-yellow-100", text: "text-yellow-800" },
  PARTIALLY_RECEIVED: { bg: "bg-blue-100",   text: "text-blue-800"   },
  DELIVERED:          { bg: "bg-green-100",  text: "text-green-800"  },
  CANCELLED:          { bg: "bg-red-100",    text: "text-red-700"    },
};

const REQUEST_STATUS_CONFIG: Record<RequestStatus, { bg: string; text: string }> = {
  PENDING:  { bg: "bg-yellow-100", text: "text-yellow-800" },
  APPROVED: { bg: "bg-green-100",  text: "text-green-800"  },
  REJECTED: { bg: "bg-red-100",    text: "text-red-700"    },
};

const requestTotal = (r: OrderRequest) =>
  r.items?.reduce((s, i) => s + Number(i.quantity) * Number(i.costPrice), 0) || 0;

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/admin/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart,    path: "/admin/inventory"      },
  { label: "Supplier Maintenance",  icon: Users,           path: "/admin/supplier"       },
  { label: "Sales Reports",         icon: LineChart,       path: "/admin/sales"          },
  { label: "Product Management",    icon: Package,         path: "/admin/product"        },
  { label: "Account Management",    icon: User,            path: "/admin/account"        },
  { label: "Purchase Order",        icon: ClipboardList,   path: "/admin/purchase-order" },
  { label: "Loss Report",           icon: AlertTriangle,   path: "/admin/loss-report"    },
  { label: "Promo Management",      icon: Gift,            path: "/admin/promo"          },
];

const ITEMS_PER_PAGE = 8;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [activeTab,      setActiveTab]      = useState<Tab>("requests");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [deliveries,     setDeliveries]     = useState<Delivery[]>([]);
  const [orderRequests,  setOrderRequests]  = useState<OrderRequest[]>([]);
  const [allProducts,    setAllProducts]    = useState<Product[]>([]);
  const [loading,        setLoading]        = useState(true);

  const [pageError,   setPageError]   = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm: () => void }>({ show: false, message: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmModal({ show: false, message: "", onConfirm: () => {} });
  const showConfirm  = (msg: string, fn: () => void) => setConfirmModal({ show: true, message: msg, onConfirm: fn });

  // Order Request state
  const [requestSearch,  setRequestSearch]  = useState("");
  const [requestStatus,  setRequestStatus]  = useState<"All" | RequestStatus>("PENDING");
  const [requestPage,    setRequestPage]    = useState(1);
  const [viewRequest,    setViewRequest]    = useState<OrderRequest | null>(null);
  const [rejectTarget,   setRejectTarget]   = useState<OrderRequest | null>(null);
  const [rejectReason,   setRejectReason]   = useState("");
  const [processingId,   setProcessingId]   = useState<string | null>(null);

  // PO History state
  const [historySearch,         setHistorySearch]         = useState("");
  const [historyStatus,         setHistoryStatus]         = useState("All");
  const [historyPage,           setHistoryPage]           = useState(1);
  const [viewDelivery,          setViewDelivery]          = useState<Delivery | null>(null);
  const [showHistoryStatusDrop, setShowHistoryStatusDrop] = useState(false);
  const historyStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (historyStatusRef.current && !historyStatusRef.current.contains(e.target as Node)) setShowHistoryStatusDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [d, p, reqs] = await Promise.all([
        api.getDeliveries(),
        api.getProducts(),
        api.getOrderRequests().catch(() => []),
      ]);
      setDeliveries(Array.isArray(d) ? d : []);
      setOrderRequests(Array.isArray(reqs) ? reqs : []);
      const normalized = (Array.isArray(p) ? p : []).map((prod: Product) => ({
        ...prod,
        supplierId: prod.supplierId || (typeof prod.supplier === "object" ? prod.supplier?.id : prod.supplier) || "",
        stockQuantity: Number(prod.stockQuantity ?? (prod as any).stock ?? 0),
        stockUnit: (prod.stockUnit as CaseUnit) || "case_24",
        costPrice: prod.costPrice != null ? Number(prod.costPrice) : null,
      }));
      setAllProducts(normalized);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const productNameFor = (item: { productId: string; product?: { productName: string } }) =>
    item.product?.productName || allProducts.find((p) => p.id === item.productId)?.productName || item.productId;

  // ── Order Request actions ──
  const handleApproveRequest = (r: OrderRequest) =>
    showConfirm("Approve this request and create the purchase order?", async () => {
      try {
        setProcessingId(r.id);
        setPageError("");
        const employeeId = localStorage.getItem("userId") || "";
        const res = await api.createDelivery({
          supplierId: r.supplierId,
          employeeId,
          deliveryDate: new Date().toISOString().split("T")[0],
          totalItems: r.items.reduce((s, i) => s + Number(i.quantity), 0),
          notes: r.notes || "",
          items: r.items.map((i) => ({
            productId: i.productId,
            quantity: Number(i.quantity) || 1,
            costPrice: Number(i.costPrice) || 0,
            unit: i.unit || "case_24",
          })),
        });
        if (res?.error || res?.message?.toLowerCase().includes("error")) {
          setPageError(res.message || "Failed to create delivery.");
          return;
        }
        await api.updateOrderRequest(r.id, { status: "APPROVED" });
        await fetchAll();
        setViewRequest(null);
        setPageSuccess("Request approved — purchase order created.");
        setTimeout(() => setPageSuccess(""), 3000);
      } catch (e) {
        console.error(e);
        setPageError("Failed to approve request. Please try again.");
      } finally {
        setProcessingId(null);
        closeConfirm();
      }
    });

  const handleRejectRequest = async () => {
    if (!rejectTarget) return;
    try {
      setProcessingId(rejectTarget.id);
      setPageError("");
      await api.updateOrderRequest(rejectTarget.id, { status: "REJECTED", adminRemarks: rejectReason });
      await fetchAll();
      setRejectTarget(null);
      setRejectReason("");
      setViewRequest(null);
      setPageSuccess("Request rejected.");
      setTimeout(() => setPageSuccess(""), 3000);
    } catch (e) {
      console.error(e);
      setPageError("Failed to reject request. Please try again.");
    } finally { setProcessingId(null); }
  };

  // ── Delivery actions ──
  const handleCancel = (id: string) => showConfirm("Cancel this delivery?", async () => {
    try { await api.updateDelivery(id, { status: "CANCELLED" }); await fetchAll(); closeConfirm(); }
    catch (e) { console.error(e); }
  });

  // ── Derived lists ──
  const filteredRequests = orderRequests.filter((r) => {
    const q = requestSearch.toLowerCase();
    return (
      (r.id.toLowerCase().includes(q) ||
        (r.supplier?.supplierName || "").toLowerCase().includes(q) ||
        (r.requestedBy?.name || "").toLowerCase().includes(q)) &&
      (requestStatus === "All" || r.status === requestStatus)
    );
  });
  const requestTotalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice((requestPage - 1) * ITEMS_PER_PAGE, requestPage * ITEMS_PER_PAGE);
  const pendingCount      = orderRequests.filter((r) => r.status === "PENDING").length;

  const filteredHistory = deliveries.filter((d) =>
    (d.id.toLowerCase().includes(historySearch.toLowerCase()) || (d.supplier?.supplierName || "").toLowerCase().includes(historySearch.toLowerCase()))
    && (historyStatus === "All" || d.status === historyStatus)
  );
  const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory  = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  const handleExport = async () => {
    try {
      await exportStyledExcel({
        fileName: "Deliveries",
        sheetName: "Deliveries",
        title: "Purchase Orders / Deliveries",
        cols: [
          { header: "ID",            width: 26 },
          { header: "Supplier",      width: 30 },
          { header: "Delivery Date", width: 18, align: "center" },
          { header: "Total Items",   width: 14, format: "#,##0", align: "right" },
          { header: "Status",        width: 16, align: "center" },
          { header: "Notes",         width: 40 },
        ],
        rows: deliveries.map((d) => [
          d.id,
          d.supplier?.supplierName || d.supplierId,
          new Date(d.createdAt || d.deliveryDate).toLocaleDateString(),
          d.totalItems,
          d.status,
          d.notes || "",
        ]),
        totals: [
          "TOTAL", "", "",
          deliveries.reduce((s, d) => s + Number(d.totalItems || 0), 0),
          "", "",
        ],
      });
    } catch {
      setPageError("Failed to export deliveries.");
    }
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("token"); localStorage.removeItem("employee"); router.push("/"); };
  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };

  const PaginationBar = ({ page, totalPages, setPage, total, label }: {
    page: number; totalPages: number; setPage: (p: number) => void; total: number; label: string;
  }) => totalPages <= 1 ? null : (
    <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
      <p className="text-xs text-gray-400">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {label}</p>
      <div className="flex gap-1 flex-wrap">
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
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Confirm modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-sm text-gray-700 mb-5">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={closeConfirm}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-0 relative">
            <Image src="/logo-new.png" alt="Logo" fill className="object-cover" sizes="96px" />
          </div>
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide mt-3">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
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
        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Purchase Order</h1>
            <p className="text-xs text-gray-400 hidden md:block">Review order requests and manage deliveries from suppliers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm md:text-base">R</div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </div>
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
            <button onClick={handleLogout} className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
              Log Out
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6">
          <div className="flex">
            {([
              { key: "requests", label: "Order Request", icon: Inbox },
              { key: "history",  label: "PO History",    icon: Clock },
            ] as { key: Tab; label: string; icon: typeof ClipboardList }[]).map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
                {tab.key === "requests" && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">

          {pageError && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <span>⚠️</span><span>{pageError}</span>
              <button onClick={() => setPageError("")} className="ml-auto">✕</button>
            </div>
          )}

          {/* ORDER REQUESTS */}
          {activeTab === "requests" && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-gray-600" /> Order Requests
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Requests submitted by the inventory manager for your approval</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-48">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search..." value={requestSearch}
                      onChange={(e) => { setRequestSearch(e.target.value); setRequestPage(1); }}
                      className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                  </div>
                  {(["PENDING", "APPROVED", "REJECTED", "All"] as const).map((opt) => (
                    <button key={opt} onClick={() => { setRequestStatus(opt); setRequestPage(1); }}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        requestStatus === opt ? "border-indigo-400 text-indigo-600 bg-indigo-50 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {opt === "All" ? "All" : opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { label: "Total",    count: orderRequests.length,                                          color: "bg-indigo-100 text-indigo-700" },
                  { label: "Pending",  count: orderRequests.filter((r) => r.status === "PENDING").length,    color: "bg-yellow-100 text-yellow-800" },
                  { label: "Approved", count: orderRequests.filter((r) => r.status === "APPROVED").length,   color: "bg-green-100 text-green-800"   },
                  { label: "Rejected", count: orderRequests.filter((r) => r.status === "REJECTED").length,   color: "bg-red-100 text-red-700"       },
                ].map((s) => <span key={s.label} className={`${s.color} rounded-full px-3 py-1 text-xs font-semibold`}>{s.label}: {s.count}</span>)}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      <th className="p-3 text-left">Request ID</th>
                      <th className="p-3 text-left">Requested By</th>
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-left">Products</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading...</td></tr>
                    ) : paginatedRequests.length === 0 ? (
                      <tr><td colSpan={8} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Inbox className="w-8 h-8 text-gray-300" />
                          <p className="text-gray-400 text-sm">No order requests found.</p>
                        </div>
                      </td></tr>
                    ) : paginatedRequests.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{r.id.slice(0, 8)}...</span></td>
                        <td className="p-3 text-xs text-gray-600">
                          {r.requestedBy ? (
                            <div>
                              <p className="font-medium">{r.requestedBy.name}</p>
                              <p className="text-gray-400">{r.requestedBy.role}</p>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-gray-700">{r.supplier?.supplierName || r.supplierId}</td>
                        <td className="p-3 text-gray-600 text-xs max-w-xs">
                          <div className="space-y-1">
                            {r.items?.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="truncate">{productNameFor(item)}</div>
                            ))}
                            {(r.items?.length || 0) > 3 && <p className="text-gray-400">+{r.items.length - 3} more</p>}
                          </div>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">₱{requestTotal(r).toLocaleString()}</td>
                        <td className="p-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${REQUEST_STATUS_CONFIG[r.status]?.bg} ${REQUEST_STATUS_CONFIG[r.status]?.text}`}>{r.status}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewRequest(r)} className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                            {r.status === "PENDING" && (
                              <>
                                <button disabled={processingId === r.id} onClick={() => handleApproveRequest(r)}
                                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg px-2 py-1 text-xs font-medium">Approve</button>
                                <button disabled={processingId === r.id} onClick={() => setRejectTarget(r)}
                                  className="border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg px-2 py-1 text-xs font-medium">Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={requestPage} totalPages={requestTotalPages} setPage={setRequestPage} total={filteredRequests.length} label="requests" />
            </div>
          )}

          {/* HISTORY */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  Delivery History</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                    <Search className="w-4 h-4 text-gray-400" />
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
                      <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-48">
                        {["All", "PARTIALLY_RECEIVED", "DELIVERED", "CANCELLED"].map((opt) => (
                          <button key={opt} onClick={() => { setHistoryStatus(opt); setHistoryPage(1); setShowHistoryStatusDrop(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${historyStatus === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                            {opt === "All" ? "All Status" : opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {historyStatus !== "All" && (
                    <button onClick={() => { setHistoryStatus("All"); setHistoryPage(1); }} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
                  )}
                  <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">📤 Export to Excel</button>
                </div>
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { label: "Total",     count: deliveries.length,                                              color: "bg-indigo-100 text-indigo-700" },
                  { label: "Partial",   count: deliveries.filter((d) => d.status === "PARTIALLY_RECEIVED").length, color: "bg-blue-100 text-blue-800"     },
                  { label: "Delivered", count: deliveries.filter((d) => d.status === "DELIVERED").length,          color: "bg-green-100 text-green-800"   },
                  { label: "Cancelled", count: deliveries.filter((d) => d.status === "CANCELLED").length,          color: "bg-red-100 text-red-700"       },
                ].map((s) => <span key={s.label} className={`${s.color} rounded-full px-3 py-1 text-xs font-semibold`}>{s.label}: {s.count}</span>)}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Products</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-6 text-center text-gray-400">Loading...</td></tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center"><div className="flex flex-col items-center gap-2"><Inbox className="w-8 h-8 text-gray-300" /><p className="text-gray-400 text-sm">No deliveries found.</p></div></td></tr>
                    ) : paginatedHistory.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span></td>
                        <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                        <td className="p-3 text-gray-600 text-xs">
                          {row.employee ? (
                            <div>
                              <p className="font-medium">{row.employee.name}</p>
                              <p className="text-gray-400">{row.employee.role}</p>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-gray-600 text-xs max-w-xs">
                          <div className="space-y-1">
                            {row.items?.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="truncate">{productNameFor(item)}</div>
                            ))}
                            {(row.items?.length || 0) > 3 && <p className="text-gray-400">+{(row.items?.length || 0) - 3} more</p>}
                          </div>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          ₱{row.items?.reduce((sum, item) => sum + (item.orderedQty * item.costPrice), 0).toLocaleString() || 0}
                        </td>
                        <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>{row.status}</span></td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewDelivery(row)} className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                            {row.status !== "DELIVERED" && row.status !== "CANCELLED" && (
                              <button onClick={() => handleCancel(row.id)} className="border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium">Cancel</button>
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

      {/* VIEW ORDER REQUEST MODAL */}
      {viewRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Order Request</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewRequest.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${REQUEST_STATUS_CONFIG[viewRequest.status]?.bg} ${REQUEST_STATUS_CONFIG[viewRequest.status]?.text}`}>{viewRequest.status}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-indigo-400 mb-1">Supplier</p>
                  <p className="text-sm font-semibold text-indigo-800">{viewRequest.supplier?.supplierName || viewRequest.supplierId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Requested By</p>
                  <p className="text-sm font-medium text-gray-800">{viewRequest.requestedBy?.name || "—"}</p>
                  <p className="text-xs text-gray-500">{viewRequest.requestedBy?.role}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Date Requested</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(viewRequest.createdAt).toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {viewRequest.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Notes from Inventory Manager</p>
                  <p className="text-sm text-gray-700">{viewRequest.notes}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-3">Requested Products ({viewRequest.items.length})</p>
                <div className="space-y-3">
                  {viewRequest.items.map((item, idx) => {
                    const breakdown = getCaseBreakdown(Number(item.quantity), item.unit || item.product?.stockUnit);
                    return (
                      <div key={idx} className="py-2 border-b border-gray-100 last:border-0 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm text-gray-800">
                            {productNameFor(item)}
                            {item.product?.size && <span className="text-gray-500 font-normal ml-1">{item.product.size}</span>}
                          </p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <UnitPill unit={item.unit || item.product?.stockUnit} qty={Number(item.quantity)} />
                            <span className="text-xs text-gray-400">× ₱{Number(item.costPrice).toLocaleString()}</span>
                          </div>
                          {breakdown && <p className="text-xs text-indigo-500 font-medium mt-0.5">{breakdown}</p>}
                        </div>
                        <span className="text-sm font-semibold text-indigo-700 ml-3 shrink-0">
                          ₱{(Number(item.quantity) * Number(item.costPrice)).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-indigo-700">₱{requestTotal(viewRequest).toLocaleString()}</p>
                </div>
              </div>

              {viewRequest.status === "REJECTED" && viewRequest.adminRemarks && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs text-red-400 mb-1">Reason for rejection</p>
                  <p className="text-sm text-red-700">{viewRequest.adminRemarks}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setViewRequest(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
              {viewRequest.status === "PENDING" && (
                <>
                  <button onClick={() => setRejectTarget(viewRequest)} className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg py-2 text-sm font-medium">Reject</button>
                  <button onClick={() => handleApproveRequest(viewRequest)} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-semibold">Approve</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[70] px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-bold text-gray-800 mb-1">Reject this request?</h2>
            <p className="text-xs text-gray-400 mb-3">The inventory manager will see your reason.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              placeholder="Reason (optional)..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRejectRequest} disabled={processingId === rejectTarget.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DELIVERY MODAL */}
      {viewDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Delivery Details</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewDelivery.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewDelivery.status]?.bg} ${STATUS_CONFIG[viewDelivery.status]?.text}`}>{viewDelivery.status}</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-800">{viewDelivery.supplier?.supplierName || viewDelivery.supplierId}</p>
              </div>
              {viewDelivery.employee && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Created By</p>
                  <p className="text-sm font-medium text-gray-800">{viewDelivery.employee.name}</p>
                  <p className="text-xs text-gray-500">{viewDelivery.employee.role}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Delivery Date Created</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(viewDelivery.createdAt || viewDelivery.deliveryDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Total Amount</p>
                  <p className="text-sm font-medium text-gray-800">
                    ₱{viewDelivery.items?.reduce((sum, item) => sum + (item.orderedQty * item.costPrice), 0).toLocaleString() || 0}
                  </p>
                </div>
              </div>
              {viewDelivery.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{viewDelivery.notes}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Products Ordered</p>
                <div className="space-y-3">
                  {viewDelivery.items?.map((item, idx) => {
                    const unitInfo   = getUnit(item.unit || item.product?.stockUnit);
                    const orderedBtl = unitInfo.bottlesPerCase ? item.orderedQty * unitInfo.bottlesPerCase : null;
                    return (
                      <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">
                              {productNameFor(item)}
                              {item.product?.size && <span className="text-gray-500 font-normal ml-1">{item.product.size}</span>}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <UnitPill unit={item.unit || item.product?.stockUnit} qty={item.orderedQty} />
                              <span className="text-xs text-gray-400">{unitInfo.label}</span>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-xs text-gray-500">
                                Ordered: <span className="font-medium text-gray-700">{formatQty(item.orderedQty, item.unit || item.product?.stockUnit)}</span>
                                {orderedBtl !== null && <span className="text-indigo-500 ml-1">= {pluralize(orderedBtl, "piece")}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <span className="text-sm font-medium text-gray-800">₱{(item.orderedQty * item.costPrice).toLocaleString()}</span>
                            <p className="text-xs text-gray-400">₱{item.costPrice} each</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-indigo-700">
                    ₱{viewDelivery.items?.reduce((sum, item) => sum + (item.orderedQty * item.costPrice), 0).toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setViewDelivery(null)} className="w-full mt-5 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {pageSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span><span className="text-sm font-medium">{pageSuccess}</span>
        </div>
      )}
    </div>
  );
}