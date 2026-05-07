"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

// ── Types matching Prisma schema ──────────────────────────────────────────────
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
  reviewer?: {
    id: string;
    name: string;
  } | null;
  items: ReturnRequestItem[];
};

type PaginatedResponse = {
  data: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── API (matches your existing api.ts) ───────────────────────────────────────
const API_URL = "https://backend-production-740c.up.railway.app/api";

const getToken = () => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) return token;
  }
  if (typeof document === "undefined") return "";
  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
  if (!tokenCookie) return "";
  return tokenCookie.trim().slice("token=".length);
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

async function getReturnRequests(params?: {
  status?: string;
  customerId?: string;
  saleId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.saleId) query.set("saleId", params.saleId);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const res = await fetch(`${API_URL}/returns?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch return requests");
  return res.json();
}

async function reviewReturnRequest(
  returnRequestId: string,
  action: "APPROVE" | "REJECT",
  reviewNote?: string
) {
  const res = await fetch(`${API_URL}/returns/${returnRequestId}`, {
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
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong Item Sent",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
  OTHER: "Other",
};

// ── Color maps ────────────────────────────────────────────────────────────────
const reasonColor: Record<ReturnReason, { bg: string; text: string }> = {
  WRONG_ITEM_SENT: { bg: "#eff6ff", text: "#1d4ed8" },
  DAMAGED: { bg: "#fff7ed", text: "#c2410c" },
  EXPIRED: { bg: "#fef9c3", text: "#854d0e" },
  OTHER: { bg: "#f5f3ff", text: "#7c3aed" },
};

const statusColor: Record<ReturnRequestStatus, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: "#fff7ed", text: "#c2410c", dot: "#ea580c" },
  APPROVED: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  REJECTED: { bg: "#fef2f2", text: "#dc2626", dot: "#dc2626" },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  return: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  close: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  clock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  box: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  phone: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.72 19.79 19.79 0 0 1 1.07 3.1 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const IS: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: "8px",
  border: "1px solid #e2e8f0", fontSize: "13px", outline: "none",
  background: "#fff", boxSizing: "border-box", color: "#0f172a",
};
const LBL: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: "6px",
};
const TD: React.CSSProperties = {
  padding: "13px 14px", fontSize: "13px", color: "#374151",
  borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ReturnPage() {
  const [records, setRecords] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const [search, setSearch] = useState("");
  const [statusFil, setStatusFil] = useState<"ALL" | ReturnRequestStatus>("ALL");
  const [reasonFil, setReasonFil] = useState<ReturnReason | "ALL">("ALL");

  const [viewItem, setViewItem] = useState<ReturnRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getReturnRequests>[0] = {
        page,
        limit: LIMIT,
      };
      if (statusFil !== "ALL") params.status = statusFil.toUpperCase();
      const result = await getReturnRequests(params);
      setRecords(result.data ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load return requests");
    } finally {
      setLoading(false);
    }
  }, [page, statusFil]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Client-side filter (search + reason) ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchReason = reasonFil === "ALL" || r.reason.toUpperCase() === reasonFil.toUpperCase();
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.saleId.toLowerCase().includes(q) ||
        r.customer.name.toLowerCase().includes(q) ||
        (r.customer.phone ?? "").toLowerCase().includes(q) ||
        r.items.some((i) =>
          i.orderLine.product.productName.toLowerCase().includes(q)
        );
      return matchReason && matchSearch;
    });
  }, [records, search, reasonFil]);

  // ── Summary counts ──────────────────────────────────────────────────────────
  const pendingCnt  = records.filter((r) => r.status === "PENDING").length;
  const approvedCnt = records.filter((r) => r.status === "APPROVED").length;
  const rejectedCnt = records.filter((r) => r.status === "REJECTED").length;

  // ── Review action ───────────────────────────────────────────────────────────
  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!viewItem) return;
    setReviewing(true);
    setReviewError(null);
    try {
      const updated = await reviewReturnRequest(viewItem.id, action, reviewNote || undefined);
      // Refresh list
      await fetchRecords();
      // Update modal with fresh data
      setViewItem((prev) => prev ? { ...prev, ...updated, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : null);
      setConfirmAction(null);
      setReviewNote("");
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setReviewing(false);
    }
  };

  // ── Total return value of an item ───────────────────────────────────────────
  const itemValue = (item: ReturnRequestItem) =>
    item.returnQty * item.orderLine.price;

  const requestTotal = (r: ReturnRequest) =>
    r.items.reduce((s, i) => s + itemValue(i), 0);

  // ── Table header helper ──────────────────────────────────────────────────────
  const TH = (label: string) => (
    <th
      key={label}
      style={{
        padding: "11px 14px", textAlign: "left", fontSize: "10.5px",
        fontWeight: 700, color: "#64748b", textTransform: "uppercase",
        letterSpacing: "0.07em", background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        .ret-row:hover { background:#f8faff !important; }
        .modal-scroll::-webkit-scrollbar { width:5px; }
        .modal-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
      `}</style>

      <div style={{ padding: "28px 32px", background: "#f4f6fb", minHeight: "100vh" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "14px", animation: "fadeUp 0.35s ease" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
                {Icons.return}
              </div>
              <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Return Requests
              </h1>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, paddingLeft: "46px" }}>
              Review and action customer return requests — approve or reject with notes
            </p>
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "9px", border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            <span className={loading ? "spin" : ""}>{Icons.refresh}</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "14px", marginBottom: "22px", animation: "fadeUp 0.45s ease" }}>
          {[
            { label: "Total Requests", value: String(total),        icon: Icons.box,   accent: "#4f46e5", light: "#eef2ff" },
            { label: "Pending",        value: String(pendingCnt),   icon: Icons.clock, accent: "#ea580c", light: "#fff7ed" },
            { label: "Approved",       value: String(approvedCnt),  icon: Icons.check, accent: "#16a34a", light: "#f0fdf4" },
            { label: "Rejected",       value: String(rejectedCnt),  icon: Icons.x,     accent: "#dc2626", light: "#fef2f2" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "17px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "2px 0 0", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "13px 16px", marginBottom: "14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>{Icons.search}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, customer, product..."
              style={{ ...IS, paddingLeft: "34px", width: "260px" }}
            />
          </div>

          {/* Status filter — server-side */}
          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFil(s); setPage(1); }}
                style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", border: "none", background: statusFil === s ? "#fff" : "transparent", color: statusFil === s ? "#0f172a" : "#64748b", boxShadow: statusFil === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.14s", whiteSpace: "nowrap" }}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Reason filter — client-side */}
          <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["ALL", "WRONG_ITEM_SENT", "DAMAGED", "EXPIRED", "OTHER"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReasonFil(r)}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", background: reasonFil === r ? "#fff" : "transparent", color: reasonFil === r ? "#0f172a" : "#64748b", boxShadow: reasonFil === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.14s", whiteSpace: "nowrap" }}
              >
                {r === "ALL" ? "All Reasons" : REASON_LABELS[r as ReturnReason]}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            {filtered.length} of {total} requests
          </span>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px", color: "#dc2626" }}>
            {Icons.alert}
            <span style={{ fontSize: "13px", fontWeight: 500 }}>{error}</span>
            <button onClick={fetchRecords} style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 600, background: "none", border: "none", color: "#dc2626", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", overflow: "hidden", animation: "fadeUp 0.5s ease" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "960px" }}>
              <thead>
                <tr>{["Request ID", "Customer", "Sale ID", "Reason", "Items", "Est. Value", "Date", "Status", ""].map(TH)}</tr>
              </thead>
              <tbody>
                {loading && records.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "64px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                        <span className="spin" style={{ color: "#4f46e5" }}>{Icons.refresh}</span>
                        <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>Loading return requests…</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "64px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                        <div style={{ color: "#cbd5e1" }}>{Icons.box}</div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "#475569", margin: 0 }}>No return requests found</p>
                        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Adjust your filters or wait for customers to submit returns.</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((r) => {
                  const sc = statusColor[r.status];
                  const rc = reasonColor[r.reason];
                  return (
                    <tr key={r.id} className="ret-row" style={{ transition: "background 0.12s" }}>
                      <td style={TD}>
                        <span style={{ fontFamily: "monospace", fontSize: "11.5px", fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "3px 9px", borderRadius: "5px" }}>
                          {r.id.slice(0, 8).toUpperCase()}…
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {r.customer.image ? (
                            <img src={r.customer.image} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0 }}>
                              {Icons.user}
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0 }}>{r.customer.name}</p>
                            {r.customer.phone && (
                              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "1px 0 0", display: "flex", alignItems: "center", gap: "3px" }}>
                                {Icons.phone} {r.customer.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={TD}>
                        <span style={{ fontFamily: "monospace", fontSize: "11.5px", color: "#64748b", background: "#f8fafc", padding: "3px 8px", borderRadius: "4px" }}>
                          {r.saleId.slice(0, 8)}…
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: rc.bg, color: rc.text }}>
                          {REASON_LABELS[r.reason]}
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{r.items.length}</span>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>item{r.items.length !== 1 ? "s" : ""}</p>
                      </td>
                      <td style={{ ...TD, fontWeight: 700, color: "#dc2626" }}>
                        {fmt(requestTotal(r))}
                      </td>
                      <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>
                        {fmtDate(r.createdAt)}
                      </td>
                      <td style={TD}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: sc.bg, color: sc.text }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot }} />
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td style={TD}>
                        <button
                          onClick={() => { setViewItem(r); setReviewNote(""); setConfirmAction(null); setReviewError(null); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                        >
                          {Icons.eye} View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                Page <strong style={{ color: "#0f172a" }}>{page}</strong> of <strong style={{ color: "#0f172a" }}>{totalPages}</strong>
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#cbd5e1" : "#374151" }}>
                  ← Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#cbd5e1" : "#374151" }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW / REVIEW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div onClick={() => { setViewItem(null); setConfirmAction(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 40, backdropFilter: "blur(3px)" }} />
          <div className="modal-scroll"
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "16px", width: "min(96vw,560px)", maxHeight: "93vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", animation: "fadeUp 0.25s ease" }}>

            {/* Header */}
            <div style={{ background: "#0f172a", borderRadius: "16px 16px 0 0", padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "11.5px", fontWeight: 700, color: "#94a3b8", background: "rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: "5px" }}>
                      {viewItem.id.slice(0, 8).toUpperCase()}…
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: statusColor[viewItem.status].bg, color: statusColor[viewItem.status].text }}>
                      {viewItem.status.charAt(0) + viewItem.status.slice(1).toLowerCase()}
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, background: reasonColor[viewItem.reason].bg, color: reasonColor[viewItem.reason].text }}>
                      {REASON_LABELS[viewItem.reason]}
                    </span>
                  </div>
                  <p style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: 0 }}>Return Request</p>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "3px 0 0" }}>
                    Filed {fmtDate(viewItem.createdAt)}
                  </p>
                </div>
                <button onClick={() => { setViewItem(null); setConfirmAction(null); }}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Icons.close}
                </button>
              </div>

              {/* Value summary */}
              <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Total Return Value</p>
                  <p style={{ fontSize: "26px", fontWeight: 900, color: "#fff", margin: "4px 0 0", letterSpacing: "-0.02em" }}>{fmt(requestTotal(viewItem))}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Items</p>
                  <p style={{ fontSize: "26px", fontWeight: 900, color: "rgba(255,255,255,0.85)", margin: "4px 0 0" }}>{viewItem.items.length}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "22px 24px" }}>

              {/* Customer */}
              <p style={LBL}>Customer</p>
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "12px" }}>
                {viewItem.customer.image ? (
                  <img src={viewItem.customer.image} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0 }}>
                    {Icons.user}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{viewItem.customer.name}</p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "3px" }}>
                    {viewItem.customer.phone && (
                      <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        {Icons.phone} {viewItem.customer.phone}
                      </span>
                    )}
                    {viewItem.customer.email && (
                      <span style={{ fontSize: "12px", color: "#64748b" }}>{viewItem.customer.email}</span>
                    )}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0", fontFamily: "monospace" }}>
                    Customer ID: {viewItem.customerId}
                  </p>
                </div>
              </div>

              {/* Sale reference */}
              <p style={LBL}>Sale Reference</p>
              <div style={{ background: "#f8fafc", borderRadius: "10px", overflow: "hidden", border: "1px solid #f1f5f9", marginBottom: "18px" }}>
                {[
                  ["Sale ID", viewItem.saleId],
                  ["Sale Date", fmtDate(viewItem.saleRecord.saleDate)],
                  ["Sale Total", fmt(viewItem.saleRecord.totalAmount)],
                ].map(([l, v], i, arr) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{l}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", fontFamily: l === "Sale ID" ? "monospace" : "inherit" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Return items */}
              <p style={LBL}>Items Being Returned</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                {viewItem.items.map((item) => (
                  <div key={item.id} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "12px" }}>
                    {item.orderLine.product.image ? (
                      <img src={item.orderLine.product.image} alt="" style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0 }}>
                        {Icons.box}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{item.orderLine.product.productName}</p>
                      <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
                        {item.orderLine.product.size} · {item.orderLine.product.category}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#dc2626", margin: 0 }}>{fmt(itemValue(item))}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
                        {item.returnQty} × {fmt(item.orderLine.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Review info (if already reviewed) */}
              {viewItem.status !== "PENDING" && (
                <div style={{ background: viewItem.status === "APPROVED" ? "#f0fdf4" : "#fef2f2", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px", border: `1px solid ${viewItem.status === "APPROVED" ? "#bbf7d0" : "#fecaca"}` }}>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Review Decision</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: viewItem.reviewNote ? "8px" : 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: viewItem.status === "APPROVED" ? "#15803d" : "#dc2626" }}>
                      {viewItem.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    </span>
                    {viewItem.reviewer && (
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>by {viewItem.reviewer.name}</span>
                    )}
                    {viewItem.reviewedAt && (
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>· {fmtDate(viewItem.reviewedAt)}</span>
                    )}
                  </div>
                  {viewItem.reviewNote && (
                    <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.5 }}>{viewItem.reviewNote}</p>
                  )}
                </div>
              )}

              {/* Review error */}
              {reviewError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", color: "#dc2626", fontSize: "13px" }}>
                  {Icons.alert} {reviewError}
                </div>
              )}

              {/* Action area — only for PENDING */}
              {viewItem.status === "PENDING" && (
                <>
                  {confirmAction ? (
                    <div style={{ background: confirmAction === "APPROVE" ? "#f0fdf4" : "#fef2f2", borderRadius: "12px", padding: "18px", border: `1px solid ${confirmAction === "APPROVE" ? "#bbf7d0" : "#fecaca"}`, marginBottom: "4px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: confirmAction === "APPROVE" ? "#15803d" : "#dc2626", margin: "0 0 12px" }}>
                        {confirmAction === "APPROVE" ? "✓ Confirm Approval" : "✗ Confirm Rejection"}
                      </p>
                      <div style={{ marginBottom: "12px" }}>
                        <label style={LBL}>Review Note (optional)</label>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={3}
                          placeholder={confirmAction === "APPROVE" ? "Add any notes for the customer…" : "Reason for rejection…"}
                          style={{ ...IS, resize: "none" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setConfirmAction(null)} disabled={reviewing}
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          Cancel
                        </button>
                        <button onClick={() => handleReview(confirmAction)} disabled={reviewing}
                          style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: confirmAction === "APPROVE" ? "#16a34a" : "#dc2626", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: reviewing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: reviewing ? 0.7 : 1 }}>
                          {reviewing ? <span className="spin">{Icons.refresh}</span> : (confirmAction === "APPROVE" ? Icons.check : Icons.x)}
                          {reviewing ? "Processing…" : (confirmAction === "APPROVE" ? "Confirm Approval" : "Confirm Rejection")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <button onClick={() => setViewItem(null)}
                        style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        Close
                      </button>
                      <button onClick={() => setConfirmAction("REJECT")}
                        style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        {Icons.x} Reject
                      </button>
                      <button onClick={() => setConfirmAction("APPROVE")}
                        style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "none", background: "#0f172a", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        {Icons.check} Approve
                      </button>
                    </div>
                  )}
                </>
              )}

              {viewItem.status !== "PENDING" && (
                <button onClick={() => setViewItem(null)}
                  style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "4px" }}>
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