"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, Gift,
  Search, Box, AlertTriangle, X, Plus
} from "lucide-react";

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart,    path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: Users,           path: "/supplier"       },
  { label: "Sales Reports",         icon: LineChart,       path: "/sales"          },
  { label: "Transaction Logs",      icon: FileText,        path: "/transaction"    },
  { label: "Product Management",    icon: Package,         path: "/product"        },
  { label: "Account Management",    icon: User,            path: "/account"        },
  { label: "Purchase Order",        icon: ClipboardList,   path: "/purchase-order" },
  { label: "Loss Report",           icon: AlertTriangle,   path: "/loss-report"         },
  { label: "Promo Management",      icon: Gift,            path: "/promo"          },
];

const LOSS_REASONS = [
  { value: "EXPIRED",     label: "Expired" },
  { value: "DAMAGED",     label: "Damaged" },
  { value: "THEFT",       label: "Theft" },
  { value: "COUNT_ERROR", label: "Count Error" },
  { value: "OTHER",       label: "Other" },
] as const;

type LossReason = typeof LOSS_REASONS[number]["value"];

type LossReport = {
  id: string;
  productId: string;
  employeeId: string;
  quantity: number;
  type: string;
  reason: string | null;
  lossReason: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  product: {
    productName: string;
    category: string;
    size?: string | null;
    image?: string | null;
  };
  employee: {
    name: string;
    role: string;
  };
};

type Product = {
  id: string;
  productName: string;
  size?: string | null;
  category: string;
};

const REASON_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  EXPIRED:     { label: "Expired",     bg: "#fff3e0", color: "#e65100" },
  DAMAGED:     { label: "Damaged",     bg: "#ffebee", color: "#c62828" },
  THEFT:       { label: "Theft",       bg: "#f3e5f5", color: "#6a1b9a" },
  COUNT_ERROR: { label: "Count Error", bg: "#e3f2fd", color: "#1565c0" },
  OTHER:       { label: "Other",       bg: "#e8eaf6", color: "#3949ab" },
};

const ITEMS_PER_PAGE = 10;

function fmtDate(str: string) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function LossReportPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"reports" | "file">("reports");

  // Loss reports list
  const [reports, setReports] = useState<LossReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [lossReasonFilter, setLossReasonFilter] = useState("ALL");
  const [reportSearch, setReportSearch] = useState("");

  // File report form
  const [products, setProducts] = useState<Product[]>([]);
  const [formProductId, setFormProductId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formLossReason, setFormLossReason] = useState<LossReason>("DAMAGED");
  const [formReason, setFormReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const navigate = (path: string) => { router.push(path); setShowMobileMenu(false); };

  const fetchReports = async (page = 1, lossReason = "ALL") => {
    try {
      setReportsLoading(true);
      const data = await api.getLossReports({
        page,
        limit: ITEMS_PER_PAGE,
        lossReason: lossReason === "ALL" ? undefined : lossReason,
      });
      if (data?.message) return;
      setReports(data.logs ?? []);
      setReportsTotal(data.total ?? 0);
      setReportsTotalPages(data.totalPages ?? 1);
      setReportsPage(page);
    } catch (err) { console.error("Failed to fetch loss reports", err); }
    finally { setReportsLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Failed to fetch products", err); }
  };

  useEffect(() => {
    fetchReports(1, lossReasonFilter);
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchReports(1, lossReasonFilter);
  }, [lossReasonFilter]);

  const handleFileReport = async () => {
    if (!formProductId) { setError("Please select a product"); return; }
    const qty = parseInt(formQuantity, 10);
    if (!qty || qty <= 0) { setError("Please enter a valid quantity"); return; }

    setSubmitting(true);
    setError("");
    try {
      await api.fileLossReport({
        productId: formProductId,
        quantity: qty,
        lossReason: formLossReason,
        reason: formReason || undefined,
      });
      setSuccess("Loss report filed successfully");
      setFormProductId("");
      setFormQuantity("");
      setFormLossReason("DAMAGED");
      setFormReason("");
      fetchReports(1, lossReasonFilter);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to file loss report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    router.push("/");
  };

  const filteredReports = reports.filter(r =>
    reportSearch === "" ||
    r.product?.productName?.toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* ── Success/Error toasts ── */}
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

      {/* ── Sidebar ── */}
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

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Loss Reports</h1>
            <p className="text-xs text-gray-400 hidden md:block">File and track inventory loss reports</p>
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

        {/* ── Tab Bar ── */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6">
          <div className="flex">
            {([
              { key: "reports" as const, label: "Reports", icon: AlertTriangle },
              { key: "file" as const,    label: "File Report", icon: Plus },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(""); }}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">

          {/* ── REPORTS TAB ── */}
          {activeTab === "reports" && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Loss Reports</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{reportsTotal} total records</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input type="text" placeholder="Search product..." value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="outline-none text-sm text-gray-700 w-36 bg-transparent" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {["ALL", ...LOSS_REASONS.map(r => r.value)].map((lr) => (
                      <button key={lr} onClick={() => { setLossReasonFilter(lr); setReportsPage(1); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          lossReasonFilter === lr ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>
                        {lr === "ALL" ? "All" : REASON_STYLES[lr]?.label ?? lr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      {["Date & Time", "Product", "Category", "Size", "Qty Lost", "Loss Reason", "Notes", "Filed By"].map((h) => (
                        <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportsLoading ? (
                      <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading...</td></tr>
                    ) : filteredReports.length === 0 ? (
                      <tr><td colSpan={8} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Box className="w-8 h-8 text-gray-300" />
                          <p className="text-gray-400 text-sm">No loss reports found.</p>
                        </div>
                      </td></tr>
                    ) : filteredReports.map((r) => {
                      const style = REASON_STYLES[r.lossReason] || REASON_STYLES.OTHER;
                      return (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</td>
                          <td className="p-3">
                            <span className="font-medium text-gray-800">{r.product?.productName || r.productId}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                              {r.product?.category || "—"}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-500">{r.product?.size || "—"}</td>
                          <td className="p-3">
                            <span className="font-bold text-red-600">-{Math.abs(r.quantity)}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: style.bg, color: style.color }}>
                              {style.label}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                {r.employee?.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span className="text-xs text-gray-600">{r.employee?.name || "—"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {reportsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                  <p className="text-xs text-gray-400">Page {reportsPage} of {reportsTotalPages} · {reportsTotal} records</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button onClick={() => fetchReports(reportsPage - 1, lossReasonFilter)} disabled={reportsPage === 1}
                      className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, reportsTotalPages) }, (_, i) => {
                      const p = Math.max(1, reportsPage - 2) + i;
                      if (p > reportsTotalPages) return null;
                      return (
                        <button key={p} onClick={() => fetchReports(p, lossReasonFilter)}
                          className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                            reportsPage === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}>{p}</button>
                      );
                    })}
                    <button onClick={() => fetchReports(reportsPage + 1, lossReasonFilter)} disabled={reportsPage === reportsTotalPages}
                      className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FILE REPORT TAB ── */}
          {activeTab === "file" && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">File a Loss Report</h2>
                    <p className="text-xs text-gray-400">Record damaged, expired, or missing stock</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Product */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product *</label>
                    <select value={formProductId} onChange={(e) => setFormProductId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 bg-white">
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.productName}{p.size ? ` (${p.size})` : ""} — {p.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity Lost *</label>
                    <input type="number" min="1" value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      placeholder="Enter quantity..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
                  </div>

                  {/* Loss Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Loss Reason *</label>
                    <div className="flex flex-wrap gap-2">
                      {LOSS_REASONS.map((lr) => {
                        const active = formLossReason === lr.value;
                        const style = REASON_STYLES[lr.value];
                        return (
                          <button key={lr.value} onClick={() => setFormLossReason(lr.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              active
                                ? "text-white border-transparent"
                                : `${style.bg} ${style.color} border-transparent hover:opacity-80`
                            }`}
                            style={active ? { background: style.color, color: "#fff" } : {}}>
                            {lr.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
                    <textarea value={formReason} onChange={(e) => setFormReason(e.target.value)}
                      placeholder="Additional details about the loss..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" />
                  </div>

                  {/* Submit */}
                  <button onClick={handleFileReport} disabled={submitting}
                    className="w-full py-3 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>Submitting...</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" /> File Loss Report</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
