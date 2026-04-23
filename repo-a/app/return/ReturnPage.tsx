"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, Gift,
  Search, Box
} from "lucide-react";

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: Users, path: "/supplier"       },
  { label: "Sales Reports",         icon: LineChart, path: "/sales"          },
  { label: "Transaction Logs",      icon: FileText, path: "/transaction"    },
  { label: "Product Management",    icon: Package, path: "/product"        },
  { label: "Account Management",    icon: User, path: "/account"        },
  { label: "Purchase Order",        icon: ClipboardList, path: "/purchase-order" },
  { label: "Return",              icon: RotateCcw, path: "/return"         },
  { label: "Promo Management",      icon: Gift, path: "/promo"          },
];

const ITEMS_PER_PAGE = 8;

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
  items: DeliveryItem[];
};

type Tab = "pending" | "history";

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:            { bg: "bg-yellow-100", text: "text-yellow-800" },
  PARTIALLY_RECEIVED: { bg: "bg-blue-100",   text: "text-blue-800"   },
  DELIVERED:          { bg: "bg-green-100",  text: "text-green-800"  },
  CANCELLED:          { bg: "bg-red-100",    text: "text-red-700"    },
};

export default function ReturnPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState<{ show: boolean; message: string; onConfirm: () => void }>({ show: false, message: "", onConfirm: () => {} });

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  const showConfirm = (msg: string, fn: () => void) => setShowConfirmModal({ show: true, message: msg, onConfirm: fn });

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const d = await api.getDeliveries();
      setDeliveries(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const deliveriesWithReturns = deliveries.filter(d => 
    d.items?.some(item => item.returnedQty > 0)
  );

  const filtered = deliveriesWithReturns.filter(d =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    (d.supplier?.supplierName || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const deliveriesWithReturnsHistory = deliveries.filter(d =>
    d.status === "DELIVERED" || d.status === "CANCELLED"
  ).filter(d =>
    d.items?.some(item => item.returnedQty > 0)
  ).filter(d =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    (d.supplier?.supplierName || "").toLowerCase().includes(search.toLowerCase())
  );

  const historyFiltered = activeTab === "history" ? deliveriesWithReturnsHistory : [];
  const historyPages = Math.ceil(historyFiltered.length / ITEMS_PER_PAGE);
  const historyPaginated = historyFiltered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getReturnItems = (delivery: Delivery) => {
    return delivery.items?.filter(item => item.returnedQty > 0) || [];
  };

  const getTotalReturnQty = (delivery: Delivery) => {
    return getReturnItems(delivery).reduce((sum, item) => sum + item.returnedQty, 0);
  };

  const handleExport = () => {
    const dataToExport = activeTab === "pending" ? filtered : historyFiltered;
    const headers = ["Delivery ID", "Supplier", "Date", "Total Returned", "Status"];
    const rows = dataToExport.map(d => [
      d.id,
      d.supplier?.supplierName || d.supplierId,
      new Date(d.deliveryDate).toLocaleDateString(),
      getTotalReturnQty(d),
      d.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "returns.csv"; a.click();
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {showConfirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <RotateCcw className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-700 mb-5">{showConfirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal({ show: false, message: "", onConfirm: () => {} })}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { showConfirmModal.onConfirm(); setShowConfirmModal({ show: false, message: "", onConfirm: () => {} }); }}
                className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">Confirm</button>
            </div>
          </div>
        </div>
      )}

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
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Return Management</h1>
            <p className="text-xs text-gray-400 hidden md:block">Track and manage product returns</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
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

        <div className="bg-white border-b border-gray-100 px-4 md:px-6">
          <div className="flex">
            {([
              { key: "pending" as Tab, label: "Pending Returns", icon: "⏳" },
              { key: "history" as Tab, label: "Return History", icon: "📜" },
            ] as { key: Tab; label: string; icon: string }[]).map((tab) => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Product Returns</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input type="text" placeholder="Search..." value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                </div>
                <button onClick={handleExport} className="border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  📤 Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left">Delivery ID</th>
                    <th className="p-3 text-left">Supplier</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-center">Returned Qty</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td></tr>
                  ) : (activeTab === "pending" ? paginated.length === 0 : historyPaginated.length === 0) ? (
                    <tr><td colSpan={6} className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Box className="w-8 h-8 text-gray-300" />
                        <p className="text-gray-400 text-sm">No returns found.</p>
                      </div>
                    </td></tr>
                  ) : (activeTab === "pending" ? paginated : historyPaginated).map((row) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedDelivery?.id === row.id ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span></td>
                      <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(row.deliveryDate).toLocaleDateString()}</td>
                      <td className="p-3 text-center">
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
                          {getTotalReturnQty(row)} items
                        </span>
                      </td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>{row.status}</span></td>
                      <td className="p-3">
                        <button onClick={() => setSelectedDelivery(row)} className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">👁️ View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activeTab === "pending" && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                <p className="text-xs text-gray-400">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</p>
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
            )}

            {activeTab === "history" && historyPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                <p className="text-xs text-gray-400">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, historyFiltered.length)} of {historyFiltered.length}</p>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                  {Array.from({ length: historyPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg text-sm border ${page === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage(Math.min(historyPages, page + 1))} disabled={page === historyPages}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Return Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">ID: {selectedDelivery.id.slice(0, 8)}...</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedDelivery.status]?.bg} ${STATUS_CONFIG[selectedDelivery.status]?.text}`}>
                {selectedDelivery.status}
              </span>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Supplier</p>
                <p className="text-sm font-medium text-gray-800">{selectedDelivery.supplier?.supplierName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Delivery Date</p>
                <p className="text-sm font-medium text-gray-800">{new Date(selectedDelivery.deliveryDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Returned Items</p>
              <div className="space-y-2">
                {getReturnItems(selectedDelivery).map((item, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.product?.productName || item.productId}</p>
                        <p className="text-xs text-gray-400">{item.product?.size}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">-{item.returnedQty}</p>
                        <p className="text-xs text-gray-400">₱{item.costPrice} each</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Total Return Value</p>
                <p className="text-lg font-bold text-red-600">
                  ₱{getReturnItems(selectedDelivery).reduce((sum, item) => sum + (item.returnedQty * item.costPrice), 0).toLocaleString()}
                </p>
              </div>
            </div>

            <button onClick={() => setSelectedDelivery(null)} className="w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span><span className="text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>❌</span><span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}