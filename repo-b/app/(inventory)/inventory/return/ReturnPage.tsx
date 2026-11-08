"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

// ── Theme (same green design as the other pages) ──────────────────────────────
// GREEN #2e7d3e · DARK #1f5f2d · MID #3f9a52 · LIGHT #e8f5ea · TINT #f4faf5
// BORDER #d6e8d9 · INK #14301b · MUTED #5f7a66 · FAINT #8fa596

// ── Types ─────────────────────────────────────────────────────────────────────
type ReturnRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type ReturnReason = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";

type ReturnRequestItem = {
  id: string;
  returnRequestId: string;
  orderLineId: string;
  returnQty: number; // bottles / pieces the customer wants to return
  createdAt: string;
  orderLine: {
    id: string;
    quantity: number;
    price: number; // price of one CASE
    subtotal: number;
    product: {
      id: string;
      productName: string;
      size?: string;
      image?: string;
      category: string;
      piecesPerCase?: number; // bottles per case
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
  // backend may return this as "saleRecord" OR "sale"
  saleRecord?: {
    id: string;
    totalAmount: number;
    saleDate: string;
  } | null;
  sale?: {
    id: string;
    totalAmount: number;
    saleDate: string;
  } | null;
  reviewer?: { id: string; name: string } | null;
  items: ReturnRequestItem[];
};

// ── API ───────────────────────────────────────────────────────────────────────
const API_URL = "https://backend-production-dcaab.up.railway.app/api";

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
 * Normalises the backend response regardless of shape.
 * Your backend returns: { limit, page, requests: [...], total, totalPages }
 */
function normaliseResponse(raw: unknown): {
  data: ReturnRequest[];
  total: number;
  totalPages: number;
  page: number;
} {
  console.log("[ReturnPage] raw API response:", raw);

  if (Array.isArray(raw)) {
    return { data: raw as ReturnRequest[], total: raw.length, totalPages: 1, page: 1 };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    // ✅ Your backend's actual shape: { requests: [...], total, totalPages, page }
    if (Array.isArray(obj.requests)) {
      return {
        data:       obj.requests as ReturnRequest[],
        total:      Number(obj.total      ?? obj.requests.length),
        totalPages: Number(obj.totalPages ?? 1),
        page:       Number(obj.page       ?? 1),
      };
    }
    // Other common wrapper shapes — kept as fallbacks
    if (Array.isArray(obj.data)) {
      return {
        data:       obj.data as ReturnRequest[],
        total:      Number(obj.total      ?? obj.data.length),
        totalPages: Number(obj.totalPages ?? 1),
        page:       Number(obj.page       ?? 1),
      };
    }
    if (Array.isArray(obj.returns)) {
      const arr = obj.returns as ReturnRequest[];
      return { data: arr, total: Number(obj.total ?? arr.length), totalPages: Number(obj.totalPages ?? 1), page: Number(obj.page ?? 1) };
    }
    if (Array.isArray(obj.returnRequests)) {
      const arr = obj.returnRequests as ReturnRequest[];
      return { data: arr, total: Number(obj.total ?? arr.length), totalPages: Number(obj.totalPages ?? 1), page: Number(obj.page ?? 1) };
    }
    if (Array.isArray(obj.items)) {
      const arr = obj.items as ReturnRequest[];
      return { data: arr, total: Number(obj.total ?? arr.length), totalPages: Number(obj.totalPages ?? 1), page: Number(obj.page ?? 1) };
    }
  }
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

// ── Colour helpers (green family — reasons are told apart by shade) ──────────
const reasonClasses: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "bg-[#e0f2ee] text-[#0f6b5e] border-[#b5dfd6]",
  DAMAGED:         "bg-[#e8f5ea] text-[#1f5f2d] border-[#c3e0c8]",
  EXPIRED:         "bg-[#eef6dc] text-[#476b1c] border-[#d7e6b4]",
  OTHER:           "bg-[#f1f5f2] text-[#5f7a66] border-[#dbe5dd]",
};

// Safe lookups: older records in the database may still carry a reason that no longer exists here
const reasonLabel = (r: string) => REASON_LABELS[r as ReturnReason] ?? r;
const reasonClass = (r: string) => reasonClasses[r as ReturnReason] ?? "bg-[#f1f5f2] text-[#5f7a66] border-[#dbe5dd]";

// Only the status colours that carry meaning stay non-green: waiting = amber, rejected = red
const statusClasses: Record<ReturnRequestStatus, { badge: string; dot: string }> = {
  PENDING:  { badge: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]", dot: "bg-[#f59e0b]" },
  APPROVED: { badge: "bg-[#e8f5ea] text-[#1f5f2d] border-[#b7dcbd]", dot: "bg-[#3f9a52]" },
  REJECTED: { badge: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]", dot: "bg-[#ef4444]" },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  return:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" /></svg>,
  search:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  close:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  eye:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  check:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  clock:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  checkLg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  xLg:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  box:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  boxLg:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  emptyBox:<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  user:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  phone:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.72 19.79 19.79 0 0 1 1.07 3.1 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" /></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  alert:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

// Shared class strings
const labelCls   = "block text-[11px] font-bold text-[#5f7a66] uppercase tracking-wider mb-1.5";
const btnOutline = "border border-[#d6e8d9] bg-white text-[#5f7a66] hover:bg-[#f4faf5] hover:border-[#2e7d3e] hover:text-[#1f5f2d] transition-colors";

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

  // Return quantities are in bottles; orderLine.price is the price of one CASE.
  // Value per bottle = case price ÷ bottles per case (falls back to 1 if the field is missing).
  const unitPrice = (item: ReturnRequestItem) => {
    const perCase = item.orderLine?.product?.piecesPerCase || 1;
    return (item.orderLine?.price ?? 0) / perCase;
  };
  const itemValue    = (item: ReturnRequestItem) => item.returnQty * unitPrice(item);
  const requestTotal = (r: ReturnRequest) => r.items.reduce((s, i) => s + itemValue(i), 0);

 const summary = [
  { label: "Total Requests", value: total,       icon: Icons.boxLg,   tile: "bg-[#e8f5ea]", color: "text-[#2e7d3e]" },
  { label: "Pending",        value: pendingCnt,  icon: Icons.clock,   tile: "bg-[#fffbeb]", color: "text-[#d97706]" },
  { label: "Approved",       value: approvedCnt, icon: Icons.checkLg, tile: "bg-[#e0f2ee]", color: "text-[#0f6b5e]" },
  { label: "Rejected",       value: rejectedCnt, icon: Icons.xLg,     tile: "bg-[#fef2f2]", color: "text-[#dc2626]" },
];
  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
        .modal-scroll::-webkit-scrollbar { width:5px; }
        .modal-scroll::-webkit-scrollbar-thumb { background:#cfe3d3; border-radius:4px; }
        .ret-row:hover { background:#f4faf5 !important; }
        .ret-page button:focus-visible { outline: 2px solid #2e7d3e; outline-offset: 2px; }
      `}</style>

      <div className="ret-page px-8 py-7 bg-[#f6faf7] min-h-screen">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4" style={{ animation: "fadeUp 0.35s ease" }}>
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#3f9a52,#1f5f2d)", boxShadow: "0 4px 12px rgba(46,125,62,0.28)" }}
            >
              {Icons.return}
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#14301b] tracking-tight m-0">Return Requests</h1>
              <p className="text-[13px] text-[#5f7a66] m-0 mt-0.5">
                Review and action customer return requests — approve or reject with notes
              </p>
            </div>
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] border border-[#d6e8d9] bg-white text-[#2e7d3e] text-[13px] font-semibold cursor-pointer hover:bg-[#f4faf5] hover:border-[#2e7d3e] transition-all disabled:opacity-60"
          >
            <span className={loading ? "spin" : ""}>{Icons.refresh}</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

{/* Summary Cards */}
<div
  className="grid gap-4 mb-6"
  style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", animation: "fadeUp 0.45s ease" }}
>
  {summary.map((s) => (
    <div
      key={s.label}
      className="flex items-center gap-3.5 bg-white rounded-2xl px-5 py-4 border border-[#e6efe8] shadow-[0_1px_4px_rgba(20,48,27,0.06)]"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.tile} ${s.color}`}>
        {s.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa596] m-0">
          {s.label}
        </p>
        <p className="text-[26px] font-extrabold text-[#14301b] m-0 leading-tight tracking-tight">
          {s.value}
        </p>
      </div>
    </div>
  ))}
</div>

        {/* Filter Bar */}
        <div className="bg-white rounded-[14px] border border-[#d6e8d9] px-[18px] py-3.5 mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa596] flex">{Icons.search}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, customer, product..."
              className="pl-9 pr-3.5 py-2.5 rounded-[10px] border border-[#d6e8d9] text-[13px] w-[270px] max-w-full outline-none text-[#14301b] placeholder:text-[#8fa596] transition-all focus:border-[#2e7d3e] focus:ring-[3px] focus:ring-[rgba(46,125,62,0.14)]"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-0.5 bg-[#e8f5ea] rounded-xl p-1">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFil(s); setPage(1); }}
                className={`px-3.5 py-[7px] rounded-[9px] text-[12.5px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  statusFil === s
                    ? "bg-[#2e7d3e] text-white shadow-[0_2px_8px_rgba(46,125,62,0.3)]"
                    : "bg-transparent text-[#5f7a66] hover:text-[#1f5f2d]"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Reason filter */}
          <div className="flex gap-0.5 bg-[#e8f5ea] rounded-xl p-1 flex-wrap">
            {(["ALL", "WRONG_ITEM_SENT", "DAMAGED", "EXPIRED", "OTHER"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReasonFil(r)}
                className={`px-3 py-[7px] rounded-[9px] text-[12px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  reasonFil === r
                    ? "bg-[#2e7d3e] text-white shadow-[0_2px_8px_rgba(46,125,62,0.3)]"
                    : "bg-transparent text-[#5f7a66] hover:text-[#1f5f2d]"
                }`}
              >
                {r === "ALL" ? "All Reasons" : REASON_LABELS[r as ReturnReason]}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[12px] text-[#5f7a66] font-medium">
            {filtered.length} of {total} requests
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl px-[18px] py-3 mb-4 flex items-center gap-2.5 text-[#b91c1c]">
            {Icons.alert}
            <span className="text-[13px] font-semibold">{error}</span>
            <button onClick={fetchRecords} className="ml-auto text-[12px] font-semibold bg-[#b91c1c] text-white border-0 rounded-lg px-3.5 py-1.5 cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-[14px] border border-[#d6e8d9] overflow-hidden" style={{ animation: "fadeUp 0.5s ease" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  {["Request ID", "Customer", "Sale ID", "Reason", "Items", "Est. Value", "Date", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold text-[#1f5f2d] uppercase tracking-wider bg-[#f4faf5] border-b border-[#d6e8d9] whitespace-nowrap"
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
                        <span className="spin text-[#2e7d3e]">{Icons.refresh}</span>
                        <p className="text-[14px] text-[#5f7a66] m-0">Loading return requests…</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 px-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-[84px] h-[84px] rounded-full bg-[#f4faf5] flex items-center justify-center">
                          {Icons.emptyBox}
                        </div>
                        <p className="text-[16px] font-bold text-[#14301b] m-0">No return requests found</p>
                        <p className="text-[13px] text-[#5f7a66] m-0">
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
                    const rc = reasonClass(r.reason);
                    return (
                      <tr key={r.id} className="ret-row transition-colors">
                        {/* Request ID */}
                        <td className="px-4 py-3.5 text-[13px] border-b border-[#e8f5ea] align-middle">
                          <span className="font-mono text-[12px] font-bold text-[#1f5f2d] bg-[#e8f5ea] border border-[#c3e0c8] px-[9px] py-[3px] rounded-md">
                            {r.id.slice(0, 8).toUpperCase()}…
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <div className="flex items-center gap-2.5">
                            {r.customer?.image ? (
                              <img src={r.customer.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#d6e8d9]" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#e8f5ea] flex items-center justify-center text-[#2e7d3e] flex-shrink-0">
                                {Icons.user}
                              </div>
                            )}
                            <div>
                              <p className="text-[13px] font-semibold text-[#14301b] m-0">{r.customer?.name ?? "—"}</p>
                              {r.customer?.phone && (
                                <p className="text-[11px] text-[#8fa596] m-0 mt-0.5 flex items-center gap-1">
                                  {Icons.phone} {r.customer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sale ID */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className="font-mono text-[11.5px] text-[#5f7a66] bg-[#f1f5f2] px-2 py-[3px] rounded-md">
                            {r.saleId.slice(0, 8)}…
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className={`inline-block px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap ${rc}`}>
                            {reasonLabel(r.reason)}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle text-center">
                          <span className="text-[15px] font-bold text-[#14301b]">{r.items.length}</span>
                          <p className="text-[10px] text-[#8fa596] m-0">item{r.items.length !== 1 ? "s" : ""}</p>
                        </td>

                        {/* Value */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle font-bold text-[#2e7d3e] text-[13px]">
                          {fmt(requestTotal(r))}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle text-[12px] text-[#5f7a66]">
                          {fmtDate(r.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <button
                            onClick={() => { setViewItem(r); setReviewNote(""); setConfirmAction(null); setReviewError(null); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#d6e8d9] bg-white text-[#2e7d3e] text-[12px] font-semibold cursor-pointer hover:bg-[#2e7d3e] hover:text-white hover:border-[#2e7d3e] transition-all"
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
            <div className="px-5 py-3 border-t border-[#d6e8d9] bg-[#f4faf5] flex items-center justify-between">
              <p className="text-[12px] text-[#5f7a66] m-0">
                Page <strong className="text-[#14301b]">{page}</strong> of <strong className="text-[#14301b]">{totalPages}</strong>
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnOutline}`}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnOutline}`}
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
            className="fixed inset-0 bg-[rgba(10,30,15,0.55)] z-40 backdrop-blur-sm"
          />
          <div
            className="modal-scroll ret-page fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-[18px] overflow-y-auto flex flex-col border border-[#d6e8d9]"
            style={{ width: "min(96vw,560px)", maxHeight: "93vh", animation: "fadeUp 0.25s ease", boxShadow: "0 24px 70px rgba(10,30,15,0.3)" }}
          >
            {/* Header */}
            <div className="px-6 py-[22px]" style={{ background: "linear-gradient(135deg,#2e7d3e,#1f5f2d)" }}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="font-mono text-[11.5px] font-bold text-white bg-white/20 px-2.5 py-[3px] rounded-full">
                      {viewItem.id.slice(0, 8).toUpperCase()}…
                    </span>
                    <span className={`px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold ${statusClasses[viewItem.status].badge}`}>
                      {viewItem.status.charAt(0) + viewItem.status.slice(1).toLowerCase()}
                    </span>
                    <span className={`px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold ${reasonClass(viewItem.reason)}`}>
                      {reasonLabel(viewItem.reason)}
                    </span>
                  </div>
                  <p className="text-[20px] font-extrabold text-white m-0 tracking-tight">Return Request</p>
                  <p className="text-[13px] text-white/75 m-0 mt-0.5">Filed {fmtDate(viewItem.createdAt)}</p>
                </div>
                <button
                  onClick={() => { setViewItem(null); setConfirmAction(null); }}
                  aria-label="Close"
                  className="w-[34px] h-[34px] rounded-full bg-white/20 border-0 text-white flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors flex-shrink-0"
                >
                  {Icons.close}
                </button>
              </div>

              {/* Value summary */}
              <div className="mt-4 bg-black/20 rounded-[14px] px-5 py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10.5px] text-white/65 uppercase tracking-wider font-semibold m-0">Total Return Value</p>
                  <p className="text-[28px] font-extrabold text-white m-0 mt-1 tracking-tight leading-none">{fmt(requestTotal(viewItem))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] text-white/65 uppercase tracking-wider font-semibold m-0">Items</p>
                  <p className="text-[28px] font-extrabold text-white m-0 mt-1 leading-none">{viewItem.items.length}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-[22px] flex flex-col gap-[18px]">

              {/* Customer */}
              <div>
                <p className={labelCls}>Customer</p>
                <div className="bg-[#f4faf5] rounded-xl px-4 py-3.5 border border-[#d6e8d9] flex items-center gap-3">
                  {viewItem.customer?.image ? (
                    <img src={viewItem.customer.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#d6e8d9]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#e8f5ea] flex items-center justify-center text-[#2e7d3e] flex-shrink-0">
                      {Icons.user}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-bold text-[#14301b] m-0">{viewItem.customer?.name ?? "—"}</p>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {viewItem.customer?.phone && (
                        <span className="text-[12px] text-[#5f7a66] flex items-center gap-1">{Icons.phone} {viewItem.customer.phone}</span>
                      )}
                      {viewItem.customer?.email && (
                        <span className="text-[12px] text-[#5f7a66]">{viewItem.customer.email}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8fa596] m-0 mt-0.5 font-mono">ID: {viewItem.customerId}</p>
                  </div>
                </div>
              </div>

              {/* Sale reference */}
              <div>
                <p className={labelCls}>Sale Reference</p>
                <div className="bg-[#f4faf5] rounded-xl overflow-hidden border border-[#d6e8d9]">
                  {[
                    ["Sale ID",    viewItem.saleId ?? "—"],
                    ["Sale Date",  viewItem.saleRecord?.saleDate
                                    ? fmtDate(viewItem.saleRecord.saleDate)
                                    : viewItem.sale?.saleDate
                                      ? fmtDate(viewItem.sale.saleDate)
                                      : "—"],
                    ["Sale Total", viewItem.saleRecord?.totalAmount != null
                                    ? fmt(viewItem.saleRecord.totalAmount)
                                    : viewItem.sale?.totalAmount != null
                                      ? fmt(viewItem.sale.totalAmount)
                                      : "—"],
                  ].map(([l, v], i, arr) => (
                    <div key={l} className={`flex justify-between items-center gap-3 px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#d6e8d9]" : ""}`}>
                      <span className="text-[12px] text-[#8fa596]">{l}</span>
                      <span className={`text-[13px] font-semibold text-[#14301b] ${l === "Sale ID" ? "font-mono break-all text-right" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return items */}
              <div>
                <p className={labelCls}>Items Being Returned</p>
                <div className="flex flex-col gap-2">
                  {viewItem.items.map((item) => {
                    const product = item.orderLine?.product;
                    const price   = unitPrice(item); // price per bottle
                    return (
                    <div key={item.id} className="bg-white rounded-xl px-3.5 py-3 border border-[#d6e8d9] flex items-center gap-3">
                      {product?.image ? (
                        <img src={product.image} alt="" className="w-11 h-11 rounded-[10px] object-cover flex-shrink-0 border border-[#d6e8d9]" />
                      ) : (
                        <div className="w-11 h-11 rounded-[10px] bg-[#e8f5ea] flex items-center justify-center text-[#2e7d3e] flex-shrink-0">
                          {Icons.box}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#14301b] m-0">{product?.productName ?? "—"}</p>
                        <p className="text-[11.5px] text-[#8fa596] m-0 mt-0.5">
                          {[product?.size, product?.category].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-extrabold text-[#2e7d3e] m-0">{fmt(item.returnQty * price)}</p>
                        <p className="text-[11px] text-[#8fa596] m-0 mt-0.5">{item.returnQty} pcs × {fmt(price)}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Review info (already reviewed) */}
              {viewItem.status !== "PENDING" && (
                <div className={`rounded-xl px-4 py-3.5 border ${viewItem.status === "APPROVED" ? "bg-[#e8f5ea] border-[#b7dcbd]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
                  <p className="text-[10.5px] font-bold text-[#8fa596] uppercase tracking-wider m-0 mb-1.5">Review Decision</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold inline-flex items-center gap-1.5 ${viewItem.status === "APPROVED" ? "text-[#1f5f2d]" : "text-[#b91c1c]"}`}>
                      {viewItem.status === "APPROVED" ? <>{Icons.check} Approved</> : <>{Icons.x} Rejected</>}
                    </span>
                    {viewItem.reviewer && <span className="text-[12px] text-[#5f7a66]">by {viewItem.reviewer.name}</span>}
                    {viewItem.reviewedAt && <span className="text-[12px] text-[#5f7a66]">· {fmtDate(viewItem.reviewedAt)}</span>}
                  </div>
                  {viewItem.reviewNote && (
                    <p className="text-[13px] text-[#14301b] m-0 mt-2 leading-relaxed">{viewItem.reviewNote}</p>
                  )}
                </div>
              )}

              {/* Review error */}
              {reviewError && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 flex items-center gap-2 text-[#b91c1c] text-[13px] font-medium">
                  {Icons.alert} {reviewError}
                </div>
              )}

              {/* Action area — PENDING only */}
              {viewItem.status === "PENDING" && (
                <>
                  {confirmAction ? (
                    <div className={`rounded-xl p-[18px] border ${confirmAction === "APPROVE" ? "bg-[#e8f5ea] border-[#b7dcbd]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
                      <p className={`text-[14px] font-bold m-0 mb-3 inline-flex items-center gap-2 ${confirmAction === "APPROVE" ? "text-[#1f5f2d]" : "text-[#b91c1c]"}`}>
                        {confirmAction === "APPROVE" ? <>{Icons.check} Confirm Approval</> : <>{Icons.x} Confirm Rejection</>}
                      </p>
                      <div className="mb-3">
                        <label className={labelCls}>Review Note (optional)</label>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={3}
                          placeholder={confirmAction === "APPROVE" ? "Add any notes for the customer…" : "Reason for rejection…"}
                          className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#d6e8d9] bg-white text-[13px] text-[#14301b] outline-none resize-none placeholder:text-[#8fa596] transition-all focus:border-[#2e7d3e] focus:ring-[3px] focus:ring-[rgba(46,125,62,0.14)]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmAction(null)}
                          disabled={reviewing}
                          className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-60 ${btnOutline}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReview(confirmAction)}
                          disabled={reviewing}
                          className={`flex-[2] py-2.5 rounded-[10px] border-0 text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
                            confirmAction === "APPROVE"
                              ? "bg-[#2e7d3e] hover:bg-[#1f5f2d] shadow-[0_4px_12px_rgba(46,125,62,0.28)]"
                              : "bg-[#e11d48] hover:bg-[#be123c] shadow-[0_4px_12px_rgba(225,29,72,0.28)]"
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
                        className={`flex-1 py-[11px] rounded-[10px] text-[13px] font-semibold cursor-pointer ${btnOutline}`}
                      >
                        Close
                      </button>
                      <button
                        onClick={() => setConfirmAction("REJECT")}
                        className="flex-1 py-[11px] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px] font-bold cursor-pointer hover:bg-[#fee2e2] transition-colors flex items-center justify-center gap-2"
                      >
                        {Icons.x} Reject
                      </button>
                      <button
                        onClick={() => setConfirmAction("APPROVE")}
                        className="flex-1 py-[11px] rounded-[10px] border-0 bg-[#2e7d3e] text-white text-[13px] font-bold cursor-pointer hover:bg-[#1f5f2d] transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(46,125,62,0.28)]"
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
                  className={`w-full py-[11px] rounded-[10px] text-[13px] font-semibold cursor-pointer ${btnOutline}`}
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