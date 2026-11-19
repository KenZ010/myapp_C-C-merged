"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSocket } from "@/app/providers";

// ── Theme (same green design as the other pages) ──────────────────────────────
// GREEN #2e7d3e · DARK #1f5f2d · MID #3f9a52 · LIGHT #e8f5ea · TINT #f4faf5
// BORDER #d6e8d9 · INK #14301b · MUTED #5f7a66 · FAINT #8fa596

// ── Types ─────────────────────────────────────────────────────────────────────
type ReturnRequestStatus =
  | "PENDING" | "APPROVED" | "OUT_FOR_DELIVERY" | "REJECTED" | "COMPLETED" | "CANCELLED";
type ReturnReason    = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";
type ReturnCondition = "RESELLABLE" | "DAMAGED" | "EXPIRED";
type StatusFilter    = "ALL" | "PENDING" | "ACTIVE" | "COMPLETED" | "REJECTED" | "CANCELLED";
type ConfirmAction   = "APPROVE" | "REJECT" | "DISPATCH" | "COMPLETE" | "CANCEL";

type Driver = { id: string; name: string; phone?: string };

type ReturnRequestItem = {
  id: string;
  returnRequestId: string;
  orderLineId: string;
  returnQty: number;                 // PIECES to replace
  receivedQty?: number | null;       // PIECES actually collected
  condition?: ReturnCondition | null;
  createdAt: string;
  orderLine: {
    id: string;
    quantity: number;                // cases ordered
    price: number;                   // price of one CASE
    subtotal: number;
    product: {
      id: string;
      productName: string;
      size?: string;
      image?: string;
      category: string;
      piecesPerCase?: number;
    };
  };
};

type ReturnRequest = {
  id: string;
  saleId: string;
  customerId: string;
  reason: ReturnReason;
  status: ReturnRequestStatus;
  proofImages?: string[];
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  driverId?: string | null;
  driver?: Driver | null;
  outForDeliveryAt?: string | null;
  receivedAt?: string | null;        // customer confirmed the replacement arrived
  // Added by the backend for APPROVED requests: can we cover it from stock right now?
  fulfillment?: {
    canDispatch: boolean;
    shortages: { productId: string; productName: string; needed: string; available: string }[];
  } | null;
  closedAt?: string | null;
  closeNote?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    image?: string;
  };
  saleRecord?: {
    id: string;
    totalAmount: number;
    saleDate?: string;
    createdAt?: string;
    completedAt?: string | null;
    status?: string;
  } | null;
  reviewer?: { id: string; name: string } | null;
  items: ReturnRequestItem[];
};

type CollectRow = { cases: string; pieces: string; condition: ReturnCondition };

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

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: authHeaders() });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

/** Normalises the backend list response: { requests, total, totalPages, page } or a plain array */
function normaliseResponse(raw: unknown): {
  data: ReturnRequest[]; total: number; totalPages: number; page: number;
} {
  if (Array.isArray(raw)) {
    return { data: raw as ReturnRequest[], total: raw.length, totalPages: 1, page: 1 };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.requests)) {
      return {
        data:       obj.requests as ReturnRequest[],
        total:      Number(obj.total      ?? obj.requests.length),
        totalPages: Number(obj.totalPages ?? 1),
        page:       Number(obj.page       ?? 1),
      };
    }
  }
  console.error("[ReturnPage] Unexpected response shape:", raw);
  return { data: [], total: 0, totalPages: 1, page: 1 };
}

async function getReturnRequests(params: { status: StatusFilter; page: number; limit: number }) {
  // "Active" = APPROVED + OUT_FOR_DELIVERY, served by its own endpoint (not paginated)
  if (params.status === "ACTIVE") {
    return normaliseResponse(await request("/returns/active"));
  }
  const q = new URLSearchParams();
  if (params.status !== "ALL") q.set("status", params.status);
  q.set("page",  String(params.page));
  q.set("limit", String(params.limit));
  return normaliseResponse(await request(`/returns?${q.toString()}`));
}

async function getReturnRequestDetail(id: string): Promise<ReturnRequest | null> {
  try {
    const raw = await request(`/returns/${id}`);
    const node = raw?.returnRequest ?? raw?.data ?? raw;
    return node && typeof node === "object" ? (node as ReturnRequest) : null;
  } catch {
    return null;
  }
}

const reviewReturnRequest = (id: string, action: "APPROVE" | "REJECT", reviewNote?: string) =>
  request(`/returns/${id}`, { method: "PATCH", body: JSON.stringify({ action, reviewNote }) });

const dispatchReplacement = (id: string, driverId: string) =>
  request(`/returns/${id}/dispatch`, { method: "PATCH", body: JSON.stringify({ driverId }) });

const completeReturn = (
  id: string,
  items: { itemId: string; cases: number; pieces: number; condition: ReturnCondition }[],
  closeNote?: string
) => request(`/returns/${id}/complete`, { method: "PATCH", body: JSON.stringify({ items, closeNote }) });

const cancelReturn = (id: string, closeNote?: string) =>
  request(`/returns/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ closeNote }) });

// Same endpoint the order dispatch screen uses (GET /orders/drivers)
const getDrivers = async (): Promise<Driver[]> => {
  const data = await request("/orders/drivers");
  return Array.isArray(data) ? data : [];
};

// ── Formatting ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong Item Sent",
  DAMAGED:         "Damaged",
  EXPIRED:         "Expired",
  OTHER:           "Other",
};

const DEFAULT_CONDITION: Record<ReturnReason, ReturnCondition> = {
  WRONG_ITEM_SENT: "RESELLABLE",
  DAMAGED:         "DAMAGED",
  EXPIRED:         "EXPIRED",
  OTHER:           "DAMAGED",
};

const CONDITION_LABELS: Record<ReturnCondition, string> = {
  RESELLABLE: "Resellable (back to stock)",
  DAMAGED:    "Damaged (not restocked)",
  EXPIRED:    "Expired (not restocked)",
};

const reasonClasses: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "bg-[#e0f2ee] text-[#0f6b5e] border-[#b5dfd6]",
  DAMAGED:         "bg-[#e8f5ea] text-[#1f5f2d] border-[#c3e0c8]",
  EXPIRED:         "bg-[#eef6dc] text-[#476b1c] border-[#d7e6b4]",
  OTHER:           "bg-[#f1f5f2] text-[#5f7a66] border-[#dbe5dd]",
};
const reasonLabel = (r: string) => REASON_LABELS[r as ReturnReason] ?? r;
const reasonClass = (r: string) => reasonClasses[r as ReturnReason] ?? "bg-[#f1f5f2] text-[#5f7a66] border-[#dbe5dd]";

const STATUS_LABEL: Record<ReturnRequestStatus, string> = {
  PENDING:          "Pending",
  APPROVED:         "Approved · to dispatch",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED:        "Completed",
  REJECTED:         "Rejected",
  CANCELLED:        "Cancelled",
};

const statusClasses: Record<ReturnRequestStatus, { badge: string; dot: string }> = {
  PENDING:          { badge: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]", dot: "bg-[#f59e0b]" },
  APPROVED:         { badge: "bg-[#e8f5ea] text-[#1f5f2d] border-[#b7dcbd]", dot: "bg-[#3f9a52]" },
  OUT_FOR_DELIVERY: { badge: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]", dot: "bg-[#3b82f6]" },
  COMPLETED:        { badge: "bg-[#e0f2ee] text-[#0f6b5e] border-[#b5dfd6]", dot: "bg-[#0f6b5e]" },
  REJECTED:         { badge: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]", dot: "bg-[#ef4444]" },
  CANCELLED:        { badge: "bg-[#f1f5f2] text-[#5f7a66] border-[#dbe5dd]", dot: "bg-[#8fa596]" },
};

// ── Quantity helpers (cases + pieces) ─────────────────────────────────────────
const perCaseOf = (item: ReturnRequestItem) =>
  Math.max(1, item.orderLine?.product?.piecesPerCase || 1);

const splitQty = (total: number, perCase: number) => ({
  cases:  Math.floor(total / perCase),
  pieces: total % perCase,
});

/** 36 pcs of a 24/case product → "1 case + 12 pcs" */
const qtyText = (total: number, perCase: number) => {
  const { cases, pieces } = splitQty(total, perCase);
  const parts: string[] = [];
  if (cases)            parts.push(`${cases} case${cases === 1 ? "" : "s"}`);
  if (pieces || !cases) parts.push(`${pieces} pc${pieces === 1 ? "" : "s"}`);
  return parts.join(" + ");
};

const toInt = (v: string) => {
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
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
  truck:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  truckLg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
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
const inputCls   = "w-full px-3.5 py-2.5 rounded-[10px] border border-[#d6e8d9] bg-white text-[13px] text-[#14301b] outline-none placeholder:text-[#8fa596] transition-all focus:border-[#2e7d3e] focus:ring-[3px] focus:ring-[rgba(46,125,62,0.14)]";

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL",       label: "All" },
  { key: "PENDING",   label: "Pending" },
  { key: "ACTIVE",    label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED",  label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
];

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
  const [statusFil, setStatusFil] = useState<StatusFilter>("ALL");
  const [reasonFil, setReasonFil] = useState<ReturnReason | "ALL">("ALL");

  const [viewItem,      setViewItem]      = useState<ReturnRequest | null>(null);
  const [note,          setNote]          = useState("");
  const [busy,          setBusy]          = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [drivers,       setDrivers]       = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driverId,      setDriverId]      = useState("");
  const [collect,       setCollect]       = useState<Record<string, CollectRow>>({});
  const socket = useSocket();

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReturnRequests({ page, limit: LIMIT, status: statusFil });
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

  // Quiet refresh (no spinner) for live updates
  const refreshQuiet = useCallback(async () => {
    try {
      const result = await getReturnRequests({ page, limit: LIMIT, status: statusFil });
      setRecords(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch { /* keep what we already have */ }
  }, [page, statusFil]);

  // Live updates: new request, customer confirmed receipt, status changes.
  // Also reloads the open modal so "Customer confirmed" shows up without closing it.
  const openId = viewItem?.id ?? null;
  useEffect(() => {
    if (!socket) return;
    const onChange = () => {
      void refreshQuiet();
      if (openId) {
        void getReturnRequestDetail(openId).then((d) => {
          if (d) setViewItem((prev) => (prev && prev.id === d.id ? { ...prev, ...d } : prev));
        });
      }
    };
    socket.on("return:new",      onChange);
    socket.on("return:status",   onChange);
    socket.on("return:received", onChange);
    return () => {
      socket.off("return:new",      onChange);
      socket.off("return:status",   onChange);
      socket.off("return:received", onChange);
    };
  }, [socket, refreshQuiet, openId]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchReason = reasonFil === "ALL" || r.reason === reasonFil;
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.saleId.toLowerCase().includes(q) ||
        (r.customer?.name ?? "").toLowerCase().includes(q) ||
        (r.customer?.phone ?? "").includes(q) ||
        r.items.some((i) => i.orderLine.product.productName.toLowerCase().includes(q));
      return matchReason && matchSearch;
    });
  }, [records, search, reasonFil]);

  const pendingCnt   = records.filter((r) => r.status === "PENDING").length;
  const activeCnt    = records.filter((r) => r.status === "APPROVED" || r.status === "OUT_FOR_DELIVERY").length;
  const completedCnt = records.filter((r) => r.status === "COMPLETED").length;

  // Return quantities are in pieces; orderLine.price is the price of one CASE.
  const unitPrice    = (item: ReturnRequestItem) => (item.orderLine?.price ?? 0) / perCaseOf(item);
  const itemValue    = (item: ReturnRequestItem) => item.returnQty * unitPrice(item);
  const requestTotal = (r: ReturnRequest) => r.items.reduce((s, i) => s + itemValue(i), 0);

  const summary = [
    { label: "Total Requests", value: total,        icon: Icons.boxLg,   tile: "bg-[#e8f5ea]", color: "text-[#2e7d3e]" },
    { label: "Pending Review", value: pendingCnt,   icon: Icons.clock,   tile: "bg-[#fffbeb]", color: "text-[#d97706]" },
    { label: "Active",         value: activeCnt,    icon: Icons.truckLg, tile: "bg-[#eff6ff]", color: "text-[#1d4ed8]" },
    { label: "Completed",      value: completedCnt, icon: Icons.checkLg, tile: "bg-[#e0f2ee]", color: "text-[#0f6b5e]" },
  ];

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const resetModalState = () => {
    setNote(""); setConfirmAction(null); setActionError(null); setDriverId("");
  };

  const closeModal = () => { setViewItem(null); resetModalState(); };

  const openView = async (r: ReturnRequest) => {
    setViewItem(r);
    resetModalState();
    const detail = await getReturnRequestDetail(r.id);
    if (!detail) return;
    setViewItem((prev) => (prev && prev.id === r.id ? { ...prev, ...detail } : prev));
  };

  // Stock can change while the modal is open (a delivery was received, another dispatch went out)
  const recheckStock = async () => {
    if (!viewItem) return;
    const d = await getReturnRequestDetail(viewItem.id);
    if (d) setViewItem((prev) => (prev && prev.id === d.id ? { ...prev, ...d } : prev));
  };

  const startAction = async (action: ConfirmAction) => {
    if (!viewItem) return;
    setActionError(null);
    setNote("");
    setConfirmAction(action);

    if (action === "DISPATCH") {
      setDriversLoading(true);
      try { setDrivers(await getDrivers()); }
      catch (e) { setActionError(e instanceof Error ? e.message : "Could not load drivers."); }
      finally { setDriversLoading(false); }
    }

    if (action === "COMPLETE") {
      const next: Record<string, CollectRow> = {};
      for (const it of viewItem.items) {
        const { cases, pieces } = splitQty(it.returnQty, perCaseOf(it));
        next[it.id] = {
          cases:     String(cases),
          pieces:    String(pieces),
          condition: DEFAULT_CONDITION[viewItem.reason] ?? "DAMAGED",
        };
      }
      setCollect(next);
    }
  };

  const collectedPieces = (it: ReturnRequestItem) => {
    const row = collect[it.id];
    if (!row) return 0;
    return toInt(row.cases) * perCaseOf(it) + toInt(row.pieces);
  };
  const collectOverMax = (it: ReturnRequestItem) => collectedPieces(it) > it.returnQty;
  const anyCollectInvalid = viewItem ? viewItem.items.some(collectOverMax) : false;

  const setCollectField = (id: string, patch: Partial<CollectRow>) =>
    setCollect((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // Runs an action, refreshes the list, then reloads this request's detail
  const runAction = async (fn: () => Promise<unknown>, fallbackStatus?: ReturnRequestStatus) => {
    if (!viewItem) return;
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      const id = viewItem.id;
      await fetchRecords();
      const detail = await getReturnRequestDetail(id);
      setViewItem((prev) => {
        if (!prev) return null;
        if (detail) return { ...prev, ...detail };
        return fallbackStatus ? { ...prev, status: fallbackStatus } : prev;
      });
      setConfirmAction(null);
      setNote("");
      setDriverId("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (!viewItem || !confirmAction) return;
    const id = viewItem.id;
    const trimmed = note.trim();

    switch (confirmAction) {
      case "APPROVE":
        return runAction(() => reviewReturnRequest(id, "APPROVE", trimmed || undefined), "APPROVED");
      case "REJECT":
        if (!trimmed) { setActionError("Please enter a reason for rejecting this request."); return; }
        return runAction(() => reviewReturnRequest(id, "REJECT", trimmed), "REJECTED");
      case "DISPATCH":
        if (!driverId) { setActionError("Select a driver first."); return; }
        return runAction(() => dispatchReplacement(id, driverId), "OUT_FOR_DELIVERY");
      case "COMPLETE": {
        if (anyCollectInvalid) { setActionError("Collected quantity can't be more than the replaced quantity."); return; }
        const items = viewItem.items.map((it) => ({
          itemId:    it.id,
          cases:     toInt(collect[it.id]?.cases ?? "0"),
          pieces:    toInt(collect[it.id]?.pieces ?? "0"),
          condition: collect[it.id]?.condition ?? "DAMAGED",
        }));
        return runAction(() => completeReturn(id, items, trimmed || undefined), "COMPLETED");
      }
      case "CANCEL":
        return runAction(() => cancelReturn(id, trimmed || undefined), "CANCELLED");
    }
  };

  const CONFIRM_META: Record<ConfirmAction, { title: string; cta: string; tone: "green" | "red" | "blue"; notePh: string; noteLabel: string }> = {
    APPROVE:  { title: "Confirm Approval",   cta: "Confirm Approval",   tone: "green", noteLabel: "Review Note (optional)",        notePh: "Add any notes for the customer…" },
    REJECT:   { title: "Confirm Rejection",  cta: "Confirm Rejection",  tone: "red",   noteLabel: "Reason for rejection (required)", notePh: "Tell the customer why this was rejected…" },
    DISPATCH: { title: "Dispatch Replacement", cta: "Dispatch & Deduct Stock", tone: "blue", noteLabel: "", notePh: "" },
    COMPLETE: { title: "Complete Return",    cta: "Mark Completed",     tone: "green", noteLabel: "Note (optional)",               notePh: "Anything worth recording about the pickup…" },
    CANCEL:   { title: "Cancel Return",      cta: "Cancel This Return", tone: "red",   noteLabel: "Reason (optional)",             notePh: "Why is this return being cancelled?" },
  };

  const toneBox: Record<"green" | "red" | "blue", string> = {
    green: "bg-[#e8f5ea] border-[#b7dcbd]",
    red:   "bg-[#fef2f2] border-[#fecaca]",
    blue:  "bg-[#eff6ff] border-[#bfdbfe]",
  };
  const toneText: Record<"green" | "red" | "blue", string> = {
    green: "text-[#1f5f2d]", red: "text-[#b91c1c]", blue: "text-[#1d4ed8]",
  };
  const toneBtn: Record<"green" | "red" | "blue", string> = {
    green: "bg-[#2e7d3e] hover:bg-[#1f5f2d] shadow-[0_4px_12px_rgba(46,125,62,0.28)]",
    red:   "bg-[#e11d48] hover:bg-[#be123c] shadow-[0_4px_12px_rgba(225,29,72,0.28)]",
    blue:  "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_4px_12px_rgba(37,99,235,0.28)]",
  };

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
                Review returns, dispatch replacements with a driver, and close them out
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
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa596] m-0">{s.label}</p>
                <p className="text-[26px] font-extrabold text-[#14301b] m-0 leading-tight tracking-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-[14px] border border-[#d6e8d9] px-[18px] py-3.5 mb-4 flex flex-wrap items-center gap-3">
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
          <div className="flex gap-0.5 bg-[#e8f5ea] rounded-xl p-1 flex-wrap">
            {FILTER_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setStatusFil(t.key); setPage(1); }}
                className={`px-3.5 py-[7px] rounded-[9px] text-[12.5px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  statusFil === t.key
                    ? "bg-[#2e7d3e] text-white shadow-[0_2px_8px_rgba(46,125,62,0.3)]"
                    : "bg-transparent text-[#5f7a66] hover:text-[#1f5f2d]"
                }`}
              >
                {t.label}
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
            <table className="w-full border-collapse" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  {["Request ID", "Customer", "Sale ID", "Reason", "To Replace", "Value", "Date", "Status", ""].map((h) => (
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
                        <p className="text-[13px] text-[#5f7a66] m-0">Adjust your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const sc = statusClasses[r.status];
                    const rc = reasonClass(r.reason);
                    return (
                      <tr key={r.id} className="ret-row transition-colors">
                        <td className="px-4 py-3.5 text-[13px] border-b border-[#e8f5ea] align-middle">
                          <span className="font-mono text-[12px] font-bold text-[#1f5f2d] bg-[#e8f5ea] border border-[#c3e0c8] px-[9px] py-[3px] rounded-md">
                            {r.id.slice(0, 8).toUpperCase()}…
                          </span>
                        </td>

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

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className="font-mono text-[11.5px] text-[#5f7a66] bg-[#f1f5f2] px-2 py-[3px] rounded-md">
                            {r.saleId.slice(0, 8)}…
                          </span>
                        </td>

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className={`inline-block px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap ${rc}`}>
                            {reasonLabel(r.reason)}
                          </span>
                        </td>

                        {/* Exact amount to replace */}
                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          {r.items.slice(0, 2).map((it) => (
                            <p key={it.id} className="text-[12px] text-[#14301b] m-0 leading-snug">
                              <span className="font-semibold">{qtyText(it.returnQty, perCaseOf(it))}</span>
                              <span className="text-[#8fa596]"> · {it.orderLine.product.productName}</span>
                            </p>
                          ))}
                          {r.items.length > 2 && (
                            <p className="text-[11px] text-[#8fa596] m-0">+{r.items.length - 2} more</p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle font-bold text-[#2e7d3e] text-[13px]">
                          {fmt(requestTotal(r))}
                        </td>

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle text-[12px] text-[#5f7a66]">
                          {fmtDate(r.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {STATUS_LABEL[r.status]}
                          </span>
                          {r.status === "APPROVED" && r.fulfillment?.canDispatch === false && (
                            <p className="text-[11px] font-semibold text-[#b91c1c] m-0 mt-1">⚠️ Not enough stock</p>
                          )}
                          {r.status === "OUT_FOR_DELIVERY" && (
                            <p className={`text-[11px] font-semibold m-0 mt-1 ${r.receivedAt ? "text-[#6d28d9]" : "text-[#b45309]"}`}>
                              {r.receivedAt ? "✓ Customer received" : "Awaiting customer"}
                            </p>
                          )}
                          {r.driver && r.status === "OUT_FOR_DELIVERY" && (
                            <p className="text-[11px] text-[#8fa596] m-0 mt-1">Driver: {r.driver.name}</p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 border-b border-[#e8f5ea] align-middle">
                          <button
                            onClick={() => { void openView(r); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#d6e8d9] bg-white text-[#2e7d3e] text-[12px] font-semibold cursor-pointer hover:bg-[#2e7d3e] hover:text-white hover:border-[#2e7d3e] transition-all"
                          >
                            {Icons.eye} {r.status === "PENDING" ? "Review" : r.status === "APPROVED" ? "Dispatch" : "View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (the Active tab returns everything at once, so no paging there) */}
          {totalPages > 1 && statusFil !== "ACTIVE" && (
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
          VIEW / ACTION MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div onClick={closeModal} className="fixed inset-0 bg-[rgba(10,30,15,0.55)] z-40 backdrop-blur-sm" />
          <div
            className="modal-scroll ret-page fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-[18px] overflow-y-auto flex flex-col border border-[#d6e8d9]"
            style={{ width: "min(96vw,580px)", maxHeight: "93vh", animation: "fadeUp 0.25s ease", boxShadow: "0 24px 70px rgba(10,30,15,0.3)" }}
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
                      {STATUS_LABEL[viewItem.status]}
                    </span>
                    <span className={`px-2.5 py-[3px] rounded-full border text-[11.5px] font-semibold ${reasonClass(viewItem.reason)}`}>
                      {reasonLabel(viewItem.reason)}
                    </span>
                  </div>
                  <p className="text-[20px] font-extrabold text-white m-0 tracking-tight">Return Request</p>
                  <p className="text-[13px] text-white/75 m-0 mt-0.5">Filed {fmtDate(viewItem.createdAt)}</p>
                </div>
                <button
                  onClick={closeModal}
                  aria-label="Close"
                  className="w-[34px] h-[34px] rounded-full bg-white/20 border-0 text-white flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors flex-shrink-0"
                >
                  {Icons.close}
                </button>
              </div>

              <div className="mt-4 bg-black/20 rounded-[14px] px-5 py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10.5px] text-white/65 uppercase tracking-wider font-semibold m-0">Replacement Value</p>
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
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#14301b] m-0">{viewItem.customer?.name ?? "—"}</p>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {viewItem.customer?.phone && (
                        <span className="text-[12px] text-[#5f7a66] flex items-center gap-1">{Icons.phone} {viewItem.customer.phone}</span>
                      )}
                      {viewItem.customer?.email && (
                        <span className="text-[12px] text-[#5f7a66]">{viewItem.customer.email}</span>
                      )}
                    </div>
                    {viewItem.customer?.address && (
                      <p className="text-[12px] text-[#5f7a66] m-0 mt-1">📍 {viewItem.customer.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sale reference */}
              <div>
                <p className={labelCls}>Sale Reference</p>
                <div className="bg-[#f4faf5] rounded-xl overflow-hidden border border-[#d6e8d9]">
                  {(() => {
                    const sale = viewItem.saleRecord ?? null;
                    const done = sale?.completedAt ?? sale?.saleDate ?? sale?.createdAt;
                    return [
                      ["Sale ID",       viewItem.saleId ?? "—"],
                      ["Order Received", done ? fmtDateTime(done) : "—"],
                      ["Sale Total",    sale?.totalAmount != null ? fmt(sale.totalAmount) : "—"],
                    ];
                  })().map(([l, v], i, arr) => (
                    <div key={l} className={`flex justify-between items-center gap-3 px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#d6e8d9]" : ""}`}>
                      <span className="text-[12px] text-[#8fa596]">{l}</span>
                      <span className={`text-[13px] font-semibold text-[#14301b] ${l === "Sale ID" ? "font-mono break-all text-right" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items to replace */}
              <div>
                <p className={labelCls}>Items to Replace</p>
                <div className="flex flex-col gap-2">
                  {viewItem.items.map((item) => {
                    const product = item.orderLine?.product;
                    const perCase = perCaseOf(item);
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
                            {[product?.size ? `Size: ${product.size}` : null, `${perCase} pcs per case`].filter(Boolean).join(" · ")}
                          </p>
                          {item.receivedQty != null && (
                            <p className="text-[11.5px] text-[#0f6b5e] m-0 mt-0.5">
                              Collected: {qtyText(item.receivedQty, perCase)}
                              {item.condition ? ` · ${item.condition.toLowerCase()}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[14px] font-extrabold text-[#14301b] m-0">{qtyText(item.returnQty, perCase)}</p>
                          <p className="text-[11px] text-[#8fa596] m-0 mt-0.5">{item.returnQty} pcs · {fmt(itemValue(item))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Photo proof */}
              <div>
                <p className={labelCls}>Photo Proof</p>
                {viewItem.proofImages && viewItem.proofImages.length > 0 ? (
                  <>
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                      {viewItem.proofImages.map((url, i) => (
                        <a
                          key={url + i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open full size"
                          className="block rounded-xl overflow-hidden border border-[#d6e8d9] bg-[#f4faf5] hover:border-[#2e7d3e] transition-colors"
                        >
                          <img src={url} alt={`Return proof ${i + 1}`} className="w-full object-cover" style={{ height: 150 }} />
                        </a>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#8fa596] m-0 mt-1.5">Click a photo to open it full size.</p>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#d6e8d9] bg-[#f4faf5] px-4 py-6 text-center">
                    <p className="text-[12.5px] text-[#8fa596] m-0">No photo proof attached to this request.</p>
                  </div>
                )}
              </div>

              {/* Delivery info */}
              {viewItem.driver && (
                <div className="rounded-xl px-4 py-3.5 border bg-[#eff6ff] border-[#bfdbfe]">
                  <p className="text-[10.5px] font-bold text-[#8fa596] uppercase tracking-wider m-0 mb-1.5">Replacement Delivery</p>
                  <p className="text-[13px] font-bold text-[#1d4ed8] m-0 flex items-center gap-2">
                    {Icons.truck} {viewItem.driver.name}
                    {viewItem.driver.phone && <span className="font-normal text-[#5f7a66]">· {viewItem.driver.phone}</span>}
                  </p>
                  {viewItem.outForDeliveryAt && (
                    <>
                      <p className="text-[12px] text-[#5f7a66] m-0 mt-1">Dispatched {fmtDateTime(viewItem.outForDeliveryAt)}</p>
                      {viewItem.status === "OUT_FOR_DELIVERY" && (
                        viewItem.receivedAt ? (
                          <p className="text-[12.5px] font-bold text-[#6d28d9] m-0 mt-1.5">
                            ✓ Customer confirmed receiving it · {fmtDateTime(viewItem.receivedAt)}
                          </p>
                        ) : (
                          <p className="text-[12.5px] font-semibold text-[#b45309] m-0 mt-1.5">
                            Waiting for the customer to confirm they received it
                          </p>
                        )
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Review info */}
              {viewItem.status !== "PENDING" && (viewItem.reviewedAt || viewItem.reviewNote) && (
                <div className={`rounded-xl px-4 py-3.5 border ${viewItem.status === "REJECTED" ? "bg-[#fef2f2] border-[#fecaca]" : "bg-[#e8f5ea] border-[#b7dcbd]"}`}>
                  <p className="text-[10.5px] font-bold text-[#8fa596] uppercase tracking-wider m-0 mb-1.5">Review Decision</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold inline-flex items-center gap-1.5 ${viewItem.status === "REJECTED" ? "text-[#b91c1c]" : "text-[#1f5f2d]"}`}>
                      {viewItem.status === "REJECTED" ? <>{Icons.x} Rejected</> : <>{Icons.check} Approved</>}
                    </span>
                    {viewItem.reviewer && <span className="text-[12px] text-[#5f7a66]">by {viewItem.reviewer.name}</span>}
                    {viewItem.reviewedAt && <span className="text-[12px] text-[#5f7a66]">· {fmtDate(viewItem.reviewedAt)}</span>}
                  </div>
                  {viewItem.reviewNote && (
                    <p className="text-[13px] text-[#14301b] m-0 mt-2 leading-relaxed">{viewItem.reviewNote}</p>
                  )}
                </div>
              )}

              {/* Closing info */}
              {(viewItem.status === "COMPLETED" || viewItem.status === "CANCELLED") && viewItem.closedAt && (
                <div className="rounded-xl px-4 py-3.5 border bg-[#f4faf5] border-[#d6e8d9]">
                  <p className="text-[10.5px] font-bold text-[#8fa596] uppercase tracking-wider m-0 mb-1.5">
                    {viewItem.status === "COMPLETED" ? "Completed" : "Cancelled"}
                  </p>
                  <p className="text-[12px] text-[#5f7a66] m-0">{fmtDateTime(viewItem.closedAt)}</p>
                  {viewItem.closeNote && <p className="text-[13px] text-[#14301b] m-0 mt-1.5">{viewItem.closeNote}</p>}
                </div>
              )}

              {/* Not enough stock to dispatch (approval is still allowed; dispatch is blocked) */}
              {viewItem.status === "APPROVED" && viewItem.fulfillment && !viewItem.fulfillment.canDispatch && !confirmAction && (
                <div className="rounded-xl px-4 py-3.5 border bg-[#fef2f2] border-[#fecaca]">
                  <p className="text-[13px] font-bold text-[#b91c1c] m-0 flex items-center gap-2">
                    {Icons.alert} Not enough stock to dispatch
                  </p>
                  {viewItem.fulfillment.shortages.map((s) => (
                    <p key={s.productId} className="text-[12.5px] text-[#b91c1c] m-0 mt-1">
                      {s.productName}: need {s.needed}, only {s.available} in stock
                    </p>
                  ))}
                  <p className="text-[12px] text-[#7f1d1d] m-0 mt-2">
                    Restock, then re-check. You can also cancel this return.
                  </p>
                  <button
                    onClick={() => { void recheckStock(); }}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#fecaca] bg-white text-[#b91c1c] text-[12px] font-semibold cursor-pointer hover:bg-[#fee2e2] transition-colors"
                  >
                    {Icons.refresh} Re-check stock
                  </button>
                </div>
              )}

              {/* Action error */}
              {actionError && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 flex items-center gap-2 text-[#b91c1c] text-[13px] font-medium">
                  {Icons.alert} {actionError}
                </div>
              )}

              {/* ── Confirmation panels ─────────────────────────────────── */}
              {confirmAction && (() => {
                const meta = CONFIRM_META[confirmAction];
                return (
                  <div className={`rounded-xl p-[18px] border ${toneBox[meta.tone]}`}>
                    <p className={`text-[14px] font-bold m-0 mb-3 inline-flex items-center gap-2 ${toneText[meta.tone]}`}>
                      {confirmAction === "DISPATCH" ? Icons.truck : meta.tone === "red" ? Icons.x : Icons.check} {meta.title}
                    </p>

                    {/* Dispatch: driver picker */}
                    {confirmAction === "DISPATCH" && (
                      <div className="mb-3">
                        <label className={labelCls}>Driver</label>
                        <select
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          disabled={driversLoading}
                          className={`${inputCls} cursor-pointer`}
                        >
                          <option value="">{driversLoading ? "Loading drivers…" : "Select a driver…"}</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
                          ))}
                        </select>
                        <p className="text-[12px] text-[#1d4ed8] m-0 mt-2 leading-relaxed">
                          ⚠️ Inventory is deducted <strong>now</strong> for the replacement
                          ({viewItem.items.map((it) => `${qtyText(it.returnQty, perCaseOf(it))} ${it.orderLine.product.productName}`).join(", ")}).
                        </p>
                      </div>
                    )}

                    {/* Complete: collected qty + condition per item */}
                    {confirmAction === "COMPLETE" && (
                      <div className="flex flex-col gap-2.5 mb-3">
                        <p className="text-[12px] text-[#5f7a66] m-0 leading-relaxed">
                          Enter what was collected from the customer. Resellable items go back to stock; damaged and expired items don&apos;t.
                          {!viewItem.receivedAt && (
                            <span className="block mt-1.5 font-semibold text-[#b45309]">
                              ⚠️ The customer hasn&apos;t confirmed receiving the replacement yet.
                            </span>
                          )}
                        </p>
                        {viewItem.items.map((it) => {
                          const row     = collect[it.id];
                          const perCase = perCaseOf(it);
                          const over    = collectOverMax(it);
                          if (!row) return null;
                          return (
                            <div key={it.id} className="bg-white rounded-[10px] border border-[#d6e8d9] px-3.5 py-3">
                              <p className="text-[13px] font-bold text-[#14301b] m-0">{it.orderLine.product.productName}</p>
                              <p className="text-[11.5px] text-[#8fa596] m-0 mt-0.5">Replaced: {qtyText(it.returnQty, perCase)}</p>
                              <div className="flex gap-2 mt-2 flex-wrap items-end">
                                {perCase > 1 && (
                                  <div className="w-[84px]">
                                    <label className={labelCls}>Cases</label>
                                    <input
                                      value={row.cases}
                                      inputMode="numeric"
                                      onChange={(e) => /^\d*$/.test(e.target.value) && setCollectField(it.id, { cases: e.target.value })}
                                      className={`${inputCls} text-center ${over ? "!border-[#e53935] !bg-[#fff0f0]" : ""}`}
                                    />
                                  </div>
                                )}
                                <div className="w-[84px]">
                                  <label className={labelCls}>Pieces</label>
                                  <input
                                    value={row.pieces}
                                    inputMode="numeric"
                                    onChange={(e) => /^\d*$/.test(e.target.value) && setCollectField(it.id, { pieces: e.target.value })}
                                    className={`${inputCls} text-center ${over ? "!border-[#e53935] !bg-[#fff0f0]" : ""}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-[170px]">
                                  <label className={labelCls}>Condition</label>
                                  <select
                                    value={row.condition}
                                    onChange={(e) => setCollectField(it.id, { condition: e.target.value as ReturnCondition })}
                                    className={`${inputCls} cursor-pointer`}
                                  >
                                    {(Object.keys(CONDITION_LABELS) as ReturnCondition[]).map((c) => (
                                      <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {over && (
                                <p className="text-[11.5px] text-[#e53935] m-0 mt-1.5">
                                  ⚠️ That&apos;s more than the {qtyText(it.returnQty, perCase)} that was replaced.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Cancel: explain */}
                    {confirmAction === "CANCEL" && (
                      <p className="text-[12px] text-[#5f7a66] m-0 mb-3 leading-relaxed">
                        The customer&apos;s returnable quantity is released. No stock was deducted yet, so inventory is unchanged.
                      </p>
                    )}

                    {/* Note box (all except dispatch) */}
                    {confirmAction !== "DISPATCH" && (
                      <div className="mb-3">
                        <label className={labelCls}>{meta.noteLabel}</label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={3}
                          placeholder={meta.notePh}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setConfirmAction(null); setActionError(null); }}
                        disabled={busy}
                        className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-60 ${btnOutline}`}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={busy || (confirmAction === "DISPATCH" && !driverId) || (confirmAction === "COMPLETE" && anyCollectInvalid)}
                        className={`flex-[2] py-2.5 rounded-[10px] border-0 text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${toneBtn[meta.tone]}`}
                      >
                        {busy ? <span className="spin">{Icons.refresh}</span> : confirmAction === "DISPATCH" ? Icons.truck : meta.tone === "red" ? Icons.x : Icons.check}
                        {busy ? "Processing…" : meta.cta}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── Action buttons per status ───────────────────────────── */}
              {!confirmAction && (
                <div className="flex gap-2.5 mt-1">
                  <button
                    onClick={closeModal}
                    className={`flex-1 py-[11px] rounded-[10px] text-[13px] font-semibold cursor-pointer ${btnOutline}`}
                  >
                    Close
                  </button>

                  {viewItem.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => startAction("REJECT")}
                        className="flex-1 py-[11px] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px] font-bold cursor-pointer hover:bg-[#fee2e2] transition-colors flex items-center justify-center gap-2"
                      >
                        {Icons.x} Reject
                      </button>
                      <button
                        onClick={() => startAction("APPROVE")}
                        className="flex-1 py-[11px] rounded-[10px] border-0 bg-[#2e7d3e] text-white text-[13px] font-bold cursor-pointer hover:bg-[#1f5f2d] transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(46,125,62,0.28)]"
                      >
                        {Icons.check} Approve
                      </button>
                    </>
                  )}

                  {viewItem.status === "APPROVED" && (
                    <>
                      <button
                        onClick={() => startAction("CANCEL")}
                        className="flex-1 py-[11px] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px] font-bold cursor-pointer hover:bg-[#fee2e2] transition-colors flex items-center justify-center gap-2"
                      >
                        {Icons.x} Cancel
                      </button>
                      <button
                        onClick={() => startAction("DISPATCH")}
                        disabled={viewItem.fulfillment?.canDispatch === false}
                        title={viewItem.fulfillment?.canDispatch === false ? "Not enough stock to dispatch" : undefined}
                        className="flex-[1.4] py-[11px] rounded-[10px] border-0 bg-[#2563eb] text-white text-[13px] font-bold cursor-pointer hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(37,99,235,0.28)]"
                      >
                        {Icons.truck} Dispatch
                      </button>
                    </>
                  )}

                  {viewItem.status === "OUT_FOR_DELIVERY" && (
                    <button
                      onClick={() => startAction("COMPLETE")}
                      className="flex-[2] py-[11px] rounded-[10px] border-0 bg-[#2e7d3e] text-white text-[13px] font-bold cursor-pointer hover:bg-[#1f5f2d] transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(46,125,62,0.28)]"
                    >
                      {Icons.check} Mark Completed
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}