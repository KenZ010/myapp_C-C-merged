"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ReturnRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type ReturnReason = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";

type ReturnRequestItem = {
  id: string;
  returnRequestId: string;
  orderLineId: string;
  returnQty: number;
  createdAt: string;
  orderLine: {
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
      id: string;
      productName: string;
      size?: string;
      image?: string;
      category: string;
    };
  };
};

type ReturnRequest = {
  id: string;
  saleId: string;
  customerId: string;
  reason: ReturnReason;
  status: ReturnRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    image?: string;
  };
  saleRecord: {
    id: string;
    totalAmount: number;
    saleDate: string;
  };
  reviewer?: { id: string; name: string } | null;
  items: ReturnRequestItem[];
};

// ── API ───────────────────────────────────────────────────────────────────────
const API_URL = "https://backend-production-740c.up.railway.app/api";

const getToken = () => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) return t;
  }
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("token="));
  return cookie ? cookie.trim().slice("token=".length) : "";
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/**
 * Normalises the backend response regardless of shape:
 *   - { data: [...], total, page, totalPages }   ← paginated
 *   - [...]                                       ← plain array
 *   - { returns: [...] }                          ← other common wrapper
 */
function normaliseResponse(raw: unknown): {
  data: ReturnRequest[];
  total: number;
  totalPages: number;
  page: number;
} {
  // Log the raw shape so you can see exactly what the backend returns
  console.log("[ReturnPage] raw API response:", raw);

  if (Array.isArray(raw)) {
    return { data: raw as ReturnRequest[], total: raw.length, totalPages: 1, page: 1 };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    // Standard paginated shape
    if (Array.isArray(obj.data)) {
      return {
        data:       obj.data as ReturnRequest[],
        total:      Number(obj.total      ?? obj.data.length),
        totalPages: Number(obj.totalPages ?? 1),
        page:       Number(obj.page       ?? 1),
      };
    }
    // { returns: [...] }
    if (Array.isArray(obj.returns)) {
      const arr = obj.returns as ReturnRequest[];
      return { data: arr, total: arr.length, totalPages: 1, page: 1 };
    }
    // { returnRequests: [...] }
    if (Array.isArray(obj.returnRequests)) {
      const arr = obj.returnRequests as ReturnRequest[];
      return { data: arr, total: arr.length, totalPages: 1, page: 1 };
    }
    // { items: [...] }
    if (Array.isArray(obj.items)) {
      const arr = obj.items as ReturnRequest[];
      return { data: arr, total: arr.length, totalPages: 1, page: 1 };
    }
  }
  // Unknown shape — log it and return empty so the error is visible
  console.error("[ReturnPage] Unexpected response shape — could not extract data:", raw);
  return { data: [], total: 0, totalPages: 1, page: 1 };
}

async function getReturnRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ReturnRequest[]; total: number; totalPages: number; page: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  if (params?.page)  query.set("page",  String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const url = `${API_URL}/returns?${query.toString()}`;
  console.log("[ReturnPage] fetching:", url);

  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) {
    const text = await res.text();
    console.error("[ReturnPage] HTTP error", res.status, text);
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const raw = await res.json();
  return normaliseResponse(raw);
}

async function reviewReturnRequest(
  id: string,
  action: "APPROVE" | "REJECT",
  reviewNote?: string
) {
  const res = await fetch(`${API_URL}/returns/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ action, reviewNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to review return request");
  return data;
}

// ── Formatting ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong Item Sent",
  DAMAGED:         "Damaged",
  EXPIRED:         "Expired",
  OTHER:           "Other",
};

// ── Tailwind colour helpers ───────────────────────────────────────────────────
const reasonClasses: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "bg-blue-50 text-blue-700",
  DAMAGED:         "bg-orange-50 text-orange-700",
  EXPIRED:         "bg-yellow-50 text-yellow-800",
  OTHER:           "bg-violet-50 text-violet-700",
};

const statusClasses: Record<ReturnRequestStatus, { badge: string; dot: string }> = {
  PENDING:  { badge: "bg-orange-50 text-orange-700",  dot: "bg-orange-500"  },
  APPROVED: { badge: "bg-green-50  text-green-700",   dot: "bg-green-500"   },
  REJECTED: { badge: "bg-red-50    text-red-600",     dot: "bg-red-500"     },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  return:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" /></svg>,
  search:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  close:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  eye:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  check:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  clock:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  box:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  user:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  phone:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.72 19.79 19.79 0 0 1 1.07 3.1 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" /></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  alert:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ReturnPage() {
  const [records,    setRecords]    = useState<ReturnRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const [search,    setSearch]    = useState("");
  const [statusFil, setStatusFil] = useState<"ALL" | ReturnRequestStatus>("ALL");
  const [reasonFil, setReasonFil] = useState<ReturnReason | "ALL">("ALL");

  const [viewItem,       setViewItem]       = useState<ReturnRequest | null>(null);
  const [reviewNote,     setReviewNote]     = useState("");
  const [reviewing,      setReviewing]      = useState(false);
  const [reviewError,    setReviewError]    = useState<string | null>(null);
  const [confirmAction,  setConfirmAction]  = useState<"APPROVE" | "REJECT" | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReturnRequests({
        page,
        limit: LIMIT,
        status: statusFil !== "ALL" ? statusFil : undefined,
      });

      if (result.data.length === 0 && result.total === 0) {
        console.warn("[ReturnPage] fetch succeeded but returned 0 records — check token/permissions or response shape above");
      }

      setRecords(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load return requests");
    } finally {
      setLoading(false);
    }
  }, [page, statusFil]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchReason = reasonFil === "ALL" || r.reason === reasonFil;
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.saleId.toLowerCase().includes(q) ||
        r.customer.name.toLowerCase().includes(q) ||
        (r.customer.phone ?? "").includes(q) ||
        r.items.some((i) =>
          i.orderLine.product.productName.toLowerCase().includes(q)
        );
      return matchReason && matchSearch;
    });
  }, [records, search, reasonFil]);

  const pendingCnt  = records.filter((r) => r.status === "PENDING").length;
  const approvedCnt = records.filter((r) => r.status === "APPROVED").length;
  const rejectedCnt = records.filter((r) => r.status === "REJECTED").length;

  // ── Review action ─────────────────────────────────────────────────────────
  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!viewItem) return;
    setReviewing(true);
    setReviewError(null);
    try {
      const updated = await reviewReturnRequest(viewItem.id, action, reviewNote || undefined);
      await fetchRecords();
      setViewItem((prev) =>
        prev ? { ...prev, ...updated, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : null
      );
      setConfirmAction(null);
      setReviewNote("");
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setReviewing(false);
    }
  };

  const itemValue    = (item: ReturnRequestItem) => item.returnQty * item.orderLine.price;
  const requestTotal = (r: ReturnRequest) => r.items.reduce((s, i) => s + itemValue(i), 0);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
        .modal-scroll::-webkit-scrollbar { width:5px; }
        .modal-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
        .ret-row:hover { background:#f8faff !important; }
      `}</style>

      <div className="px-8 py-7 bg-slate-50 min-h-screen">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3" style={{ animation: "fadeUp 0.35s ease" }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                {Icons.return}
              </div>
              <h1 className="text-[21px] font-extrabold text-slate-900 tracking-tight m-0">
                Return Requests
              </h1>
            </div>
            <p className="text-[13px] text-slate-400 m-0 pl-[46px]">
              Review and action customer return requests — approve or reject with notes
            </p>
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 px-[18px] py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <span className={loading ? "spin" : ""}>{Icons.refresh}</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", animation: "fadeUp 0.45s ease" }}>
          {[
            { label: "Total Requests", value: total,      icon: Icons.box,   accent: "text-indigo-600", bg: "bg-indigo-50"  },
            { label: "Pending",        value: pendingCnt, icon: Icons.clock, accent: "text-orange-600", bg: "bg-orange-50"  },
            { label: "Approved",       value: approvedCnt,icon: Icons.check, accent: "text-green-600",  bg: "bg-green-50"   },
            { label: "Rejected",       value: rejectedCnt,icon: Icons.x,     accent: "text-red-600",    bg: "bg-red-50"     },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-[17px] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.accent} flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10.5px] font-semibold text-slate-400 m-0 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-extrabold text-slate-900 m-0 mt-0.5 leading-none tracking-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 mb-3.5 flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, customer, product..."
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] w-[260px] outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFil(s); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  statusFil === s
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Reason filter */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(["ALL", "WRONG_ITEM_SENT", "DAMAGED", "EXPIRED", "OTHER"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReasonFil(r)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  reasonFil === r
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {r === "ALL" ? "All Reasons" : REASON_LABELS[r as ReturnReason]}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[12px] text-slate-400 font-medium">
            {filtered.length} of {total} requests
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3.5 flex items-center gap-2.5 text-red-600">
            {Icons.alert}
            <span className="text-[13px] font-medium">{error}</span>
            <button onClick={fetchRecords} className="ml-auto text-[12px] font-semibold bg-transparent border-0 text-red-600 cursor-pointer underline">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden" style={{ animation: "fadeUp 0.5s ease" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  {["Request ID", "Customer", "Sale ID", "Reason", "Items", "Est. Value", "Date", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-[11px] text-left text-[10.5px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        <span className="spin text-indigo-500">{Icons.refresh}</span>
                        <p className="text-[14px] text-slate-400 m-0">Loading return requests…</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        <span className="text-slate-300">{Icons.box}</span>
                        <p className="text-[15px] font-semibold text-slate-500 m-0">No return requests found</p>
                        <p className="text-[13px] text-slate-400 m-0">
                          {records.length === 0
                            ? "Check the browser console for the raw API response to debug."
                            : "Adjust your filters."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const sc = statusClasses[r.status];
                    const rc = reasonClasses[r.reason];
                    return (
                      <tr key={r.id} className="ret-row transition-colors">
                        {/* Request ID */}
                        <td className="px-3.5 py-[13px] text-[13px] text-slate-700 border-b border-slate-50 align-middle">
                          <span className="font-mono text-[11.5px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {r.id.slice(0, 8).toUpperCase()}…
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                          <div className="flex items-center gap-2">
                            {r.customer.image ? (
                              <img src={r.customer.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                {Icons.user}
                              </div>
                            )}
                            <div>
                              <p className="text-[13px] font-semibold text-slate-900 m-0">{r.customer.name}</p>
                              {r.customer.phone && (
                                <p className="text-[11px] text-slate-400 m-0 flex items-center gap-1">
                                  {Icons.phone} {r.customer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sale ID */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                          <span className="font-mono text-[11.5px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                            {r.saleId.slice(0, 8)}…
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                          <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold ${rc}`}>
                            {REASON_LABELS[r.reason]}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-center">
                          <span className="text-[15px] font-bold text-slate-900">{r.items.length}</span>
                          <p className="text-[10px] text-slate-400 m-0">item{r.items.length !== 1 ? "s" : ""}</p>
                        </td>

                        {/* Value */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle font-bold text-red-600 text-[13px]">
                          {fmt(requestTotal(r))}
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-[12px] text-slate-500">
                          {fmtDate(r.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11.5px] font-bold ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                          <button
                            onClick={() => { setViewItem(r); setReviewNote(""); setConfirmAction(null); setReviewError(null); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            {Icons.eye} View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-[18px] py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[12px] text-slate-400 m-0">
                Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW / REVIEW MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div
            onClick={() => { setViewItem(null); setConfirmAction(null); }}
            className="fixed inset-0 bg-slate-900/55 z-40 backdrop-blur-sm"
          />
          <div
            className="modal-scroll fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl overflow-y-auto shadow-2xl flex flex-col"
            style={{ width: "min(96vw,560px)", maxHeight: "93vh", animation: "fadeUp 0.25s ease" }}
          >
            {/* Header */}
            <div className="bg-slate-900 rounded-t-2xl px-6 py-[22px]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="font-mono text-[11.5px] font-bold text-slate-400 bg-white/10 px-2.5 py-0.5 rounded">
                      {viewItem.id.slice(0, 8).toUpperCase()}…
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11.5px] font-bold ${statusClasses[viewItem.status].badge}`}>
                      {viewItem.status.charAt(0) + viewItem.status.slice(1).toLowerCase()}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11.5px] font-bold ${reasonClasses[viewItem.reason]}`}>
                      {REASON_LABELS[viewItem.reason]}
                    </span>
                  </div>
                  <p className="text-[18px] font-extrabold text-white m-0">Return Request</p>
                  <p className="text-[13px] text-slate-500 m-0 mt-0.5">Filed {fmtDate(viewItem.createdAt)}</p>
                </div>
                <button
                  onClick={() => { setViewItem(null); setConfirmAction(null); }}
                  className="w-8 h-8 rounded-lg bg-white/10 border-0 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                >
                  {Icons.close}
                </button>
              </div>

              {/* Value summary */}
              <div className="mt-4 bg-white/5 rounded-xl px-[18px] py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10.5px] text-slate-500 uppercase tracking-wide m-0">Total Return Value</p>
                  <p className="text-[26px] font-black text-white m-0 mt-1 tracking-tight">{fmt(requestTotal(viewItem))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] text-slate-500 uppercase tracking-wide m-0">Items</p>
                  <p className="text-[26px] font-black text-white/85 m-0 mt-1">{viewItem.items.length}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-[22px] flex flex-col gap-[18px]">

              {/* Customer */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer</p>
                <div className="bg-slate-50 rounded-xl px-4 py-3.5 border border-slate-100 flex items-center gap-3">
                  {viewItem.customer.image ? (
                    <img src={viewItem.customer.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                      {Icons.user}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 m-0">{viewItem.customer.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      {viewItem.customer.phone && (
                        <span className="text-[12px] text-slate-500 flex items-center gap-1">{Icons.phone} {viewItem.customer.phone}</span>
                      )}
                      {viewItem.customer.email && (
                        <span className="text-[12px] text-slate-500">{viewItem.customer.email}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 m-0 mt-0.5 font-mono">ID: {viewItem.customerId}</p>
                  </div>
                </div>
              </div>

              {/* Sale reference */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sale Reference</p>
                <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                  {[
                    ["Sale ID",   viewItem.saleId],
                    ["Sale Date", fmtDate(viewItem.saleRecord.saleDate)],
                    ["Sale Total",fmt(viewItem.saleRecord.totalAmount)],
                  ].map(([l, v], i, arr) => (
                    <div key={l} className={`flex justify-between items-center px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <span className="text-[12px] text-slate-400">{l}</span>
                      <span className={`text-[13px] font-semibold text-slate-900 ${l === "Sale ID" ? "font-mono" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return items */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Items Being Returned</p>
                <div className="flex flex-col gap-2">
                  {viewItem.items.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-xl px-3.5 py-3 border border-slate-100 flex items-center gap-3">
                      {item.orderLine.product.image ? (
                        <img src={item.orderLine.product.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                          {Icons.box}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-900 m-0">{item.orderLine.product.productName}</p>
                        <p className="text-[11.5px] text-slate-400 m-0 mt-0.5">
                          {item.orderLine.product.size} · {item.orderLine.product.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-extrabold text-red-600 m-0">{fmt(itemValue(item))}</p>
                        <p className="text-[11px] text-slate-400 m-0 mt-0.5">{item.returnQty} × {fmt(item.orderLine.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review info (already reviewed) */}
              {viewItem.status !== "PENDING" && (
                <div className={`rounded-xl px-4 py-3.5 border ${viewItem.status === "APPROVED" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider m-0 mb-1.5">Review Decision</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold ${viewItem.status === "APPROVED" ? "text-green-700" : "text-red-600"}`}>
                      {viewItem.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    </span>
                    {viewItem.reviewer && <span className="text-[12px] text-slate-400">by {viewItem.reviewer.name}</span>}
                    {viewItem.reviewedAt && <span className="text-[12px] text-slate-400">· {fmtDate(viewItem.reviewedAt)}</span>}
                  </div>
                  {viewItem.reviewNote && (
                    <p className="text-[13px] text-slate-600 m-0 mt-2 leading-relaxed">{viewItem.reviewNote}</p>
                  )}
                </div>
              )}

              {/* Review error */}
              {reviewError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-red-600 text-[13px]">
                  {Icons.alert} {reviewError}
                </div>
              )}

              {/* Action area — PENDING only */}
              {viewItem.status === "PENDING" && (
                <>
                  {confirmAction ? (
                    <div className={`rounded-xl p-[18px] border ${confirmAction === "APPROVE" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                      <p className={`text-[14px] font-bold m-0 mb-3 ${confirmAction === "APPROVE" ? "text-green-700" : "text-red-600"}`}>
                        {confirmAction === "APPROVE" ? "✓ Confirm Approval" : "✗ Confirm Rejection"}
                      </p>
                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                          Review Note (optional)
                        </label>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={3}
                          placeholder={confirmAction === "APPROVE" ? "Add any notes for the customer…" : "Reason for rejection…"}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] outline-none resize-none focus:border-indigo-400 transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmAction(null)}
                          disabled={reviewing}
                          className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReview(confirmAction)}
                          disabled={reviewing}
                          className={`flex-[2] py-2.5 rounded-lg border-0 text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-opacity disabled:opacity-70 ${
                            confirmAction === "APPROVE" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {reviewing ? <span className="spin">{Icons.refresh}</span> : (confirmAction === "APPROVE" ? Icons.check : Icons.x)}
                          {reviewing ? "Processing…" : confirmAction === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 mt-1">
                      <button
                        onClick={() => setViewItem(null)}
                        className="flex-1 py-[11px] rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => setConfirmAction("REJECT")}
                        className="flex-1 py-[11px] rounded-lg border border-red-200 bg-red-50 text-red-600 text-[13px] font-bold cursor-pointer hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                      >
                        {Icons.x} Reject
                      </button>
                      <button
                        onClick={() => setConfirmAction("APPROVE")}
                        className="flex-1 py-[11px] rounded-lg border-0 bg-slate-900 text-white text-[13px] font-bold cursor-pointer hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                        {Icons.check} Approve
                      </button>
                    </div>
                  )}
                </>
              )}

              {viewItem.status !== "PENDING" && (
                <button
                  onClick={() => setViewItem(null)}
                  className="w-full py-[11px] rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}