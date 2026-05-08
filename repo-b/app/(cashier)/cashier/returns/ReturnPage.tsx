"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type ReturnReason = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";
type ReturnRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type Product = {
  id: string;
  productName: string;
  size?: string;
  category: string;
  image?: string;
};

type OrderLine = {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: Product;
};

type Sale = {
  id: string;
  orderId?: string;           // the order ID used to look up
  totalAmount: number;
  saleDate: string;
  orderDate?: string;         // orders may use orderDate instead
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    image?: string;
  };
  orderLines: OrderLine[];
};

type MyReturnRequest = {
  id: string;
  saleId: string;
  reason: ReturnReason;
  status: ReturnRequestStatus;
  createdAt: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewer?: { id: string; name: string } | null;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    image?: string;
  };
  items: {
    id: string;
    returnQty: number;
    orderLine: {
      id: string;
      quantity: number;
      price: number;
      product: Product;
    };
  }[];
};

// ── API ────────────────────────────────────────────────────────────────────────
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

async function searchByOrderId(orderId: string): Promise<Sale | null> {
  const res = await fetch(`${API_URL}/orders/${orderId}`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  // normalise common wrapper shapes
  const raw = data?.order ?? data?.data ?? data?.sale ?? data;
  if (!raw || typeof raw !== "object") return null;
  // orders may nest the sale or expose lines differently — normalise here
  const sale: Sale = {
    id:          raw.saleId  ?? raw.id,
    orderId:     raw.id      ?? orderId,
    totalAmount: raw.totalAmount ?? raw.total ?? 0,
    saleDate:    raw.saleDate   ?? raw.orderDate ?? raw.createdAt ?? "",
    customer:    raw.customer   ?? { id: "", name: "Unknown" },
    orderLines:  raw.orderLines ?? raw.items ?? [],
  };
  return sale;
}

async function getMyReturnRequests(): Promise<MyReturnRequest[]> {
  const res = await fetch(`${API_URL}/returns?limit=50`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  const arr = data?.requests ?? data?.data ?? data?.returns ?? data;
  return Array.isArray(arr) ? arr : [];
}

async function createReturnRequest(payload: {
  saleId: string;
  customerId: string;
  reason: ReturnReason;
  items: { orderLineId: string; returnQty: number }[];
}): Promise<MyReturnRequest> {
  const res = await fetch(`${API_URL}/returns`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create return request");
  return data?.returnRequest ?? data?.data ?? data;
}

// ── Formatting ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong Item Sent",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
  OTHER: "Other",
};

const REASON_COLORS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "bg-blue-50 text-blue-700 border-blue-200",
  DAMAGED: "bg-orange-50 text-orange-700 border-orange-200",
  EXPIRED: "bg-yellow-50 text-yellow-800 border-yellow-200",
  OTHER: "bg-violet-50 text-violet-700 border-violet-200",
};

const STATUS_STYLES: Record<ReturnRequestStatus, { badge: string; dot: string; label: string }> = {
  PENDING: { badge: "bg-orange-50 text-orange-700", dot: "bg-orange-400", label: "Pending" },
  APPROVED: { badge: "bg-green-50 text-green-700", dot: "bg-green-500", label: "Approved" },
  REJECTED: { badge: "bg-red-50 text-red-600", dot: "bg-red-500", label: "Rejected" },
};

// ── Icons ──────────────────────────────────────────────────────────────────────
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
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  receipt: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  minus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
          done
            ? "bg-indigo-600 text-white"
            : active
            ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? Icons.check : step}
      </div>
      <span className={`text-[10.5px] font-semibold whitespace-nowrap ${active ? "text-indigo-600" : done ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CashierReturnPage() {
  // Tabs: "create" | "history"
  const [tab, setTab] = useState<"create" | "history">("create");

  // ── Create Return State ────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Order lookup
  const [orderInput, setOrderInput] = useState("");
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [foundSale, setFoundSale] = useState<Sale | null>(null);

  // Step 2 — Item selection
  const [reason, setReason] = useState<ReturnReason>("WRONG_ITEM_SENT");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // orderLineId → qty

  // Step 3 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<MyReturnRequest | null>(null);

  // ── History State ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<MyReturnRequest[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<MyReturnRequest | null>(null);
  const [histSearch, setHistSearch] = useState("");

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const data = await getMyReturnRequests();
      setHistory(data);
    } catch (e) {
      setHistError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  // ── Step 1: Find Sale ──────────────────────────────────────────────────────
  const handleFindSale = async () => {
    if (!orderInput.trim()) return;
    setSaleLoading(true);
    setSaleError(null);
    setFoundSale(null);
    try {
      const sale = await searchByOrderId(orderInput.trim());
      if (!sale) throw new Error("Order not found. Please check the Order ID.");
      setFoundSale(sale);
      setSelectedItems({});
      setStep(2);
    } catch (e) {
      setSaleError(e instanceof Error ? e.message : "Error looking up order");
    } finally {
      setSaleLoading(false);
    }
  };

  // ── Step 2: Qty helpers ────────────────────────────────────────────────────
  const toggleItem = (lineId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      if (prev[lineId]) {
        const next = { ...prev };
        delete next[lineId];
        return next;
      }
      return { ...prev, [lineId]: 1 };
    });
  };

  const setQty = (lineId: string, qty: number, maxQty: number) => {
    if (qty < 1) {
      setSelectedItems((prev) => { const n = { ...prev }; delete n[lineId]; return n; });
    } else {
      setSelectedItems((prev) => ({ ...prev, [lineId]: Math.min(qty, maxQty) }));
    }
  };

  const selectedCount = Object.keys(selectedItems).length;
  const returnTotal = useMemo(() => {
    if (!foundSale) return 0;
    return foundSale.orderLines.reduce((sum, line) => {
      const qty = selectedItems[line.id] ?? 0;
      return sum + qty * line.price;
    }, 0);
  }, [foundSale, selectedItems]);

  // ── Step 3: Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!foundSale || selectedCount === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createReturnRequest({
        saleId: foundSale.id,
        customerId: foundSale.customer.id,
        reason,
        items: Object.entries(selectedItems).map(([orderLineId, returnQty]) => ({
          orderLineId,
          returnQty,
        })),
      });
      setSubmitted(result);
      setStep(3);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setOrderInput("");
    setFoundSale(null);
    setSaleError(null);
    setSelectedItems({});
    setReason("WRONG_ITEM_SENT");
    setSubmitted(null);
    setSubmitError(null);
  };

  // ── Filtered history ───────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.saleId.toLowerCase().includes(q) ||
        r.customer?.name?.toLowerCase().includes(q) ||
        r.items.some((i) => i.orderLine.product.productName.toLowerCase().includes(q))
    );
  }, [history, histSearch]);

  const pendingCnt  = history.filter((r) => r.status === "PENDING").length;
  const approvedCnt = history.filter((r) => r.status === "APPROVED").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .spin { animation:spin 0.8s linear infinite; display:inline-block; }
        .modal-scroll::-webkit-scrollbar{width:5px;}
        .modal-scroll::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}
        .ret-row:hover{background:#f8faff !important;}
        .item-card:hover{border-color:#a5b4fc !important;}
        .tab-btn{transition:all 0.18s ease;}
      `}</style>

      <div className="px-8 py-7 bg-slate-50 min-h-screen">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3" style={{ animation: "fadeUp 0.3s ease" }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                {Icons.return}
              </div>
              <h1 className="text-[21px] font-extrabold text-slate-900 tracking-tight m-0">
                Returns
              </h1>
            </div>
            <p className="text-[13px] text-slate-400 m-0 pl-[46px]">
              File a new return request or track previously submitted returns
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 w-fit" style={{ animation: "fadeUp 0.35s ease" }}>
          {[
            { id: "create", label: "New Return Request", icon: Icons.plus },
            { id: "history", label: "My Return History", icon: Icons.clock },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "create" | "history")}
              className={`tab-btn flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold border-0 cursor-pointer ${
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB: CREATE NEW RETURN
        ════════════════════════════════════════ */}
        {tab === "create" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Step Indicator */}
            <div className="bg-white border border-slate-100 rounded-xl px-6 py-4 mb-5 flex items-center gap-0">
              <StepDot step={1} current={step} label="Find Sale" />
              <div className="flex-1 h-[2px] mx-3 rounded-full" style={{ background: step > 1 ? "#6366f1" : "#e2e8f0" }} />
              <StepDot step={2} current={step} label="Select Items" />
              <div className="flex-1 h-[2px] mx-3 rounded-full" style={{ background: step > 2 ? "#6366f1" : "#e2e8f0" }} />
              <StepDot step={3} current={step} label="Submitted" />
            </div>

            {/* ── STEP 1: Find Sale ── */}
            {step === 1 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 max-w-[520px] mx-auto shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    {Icons.receipt}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900 m-0">Find the Original Order</p>
                    <p className="text-[12px] text-slate-400 m-0">Enter the Order ID to look up the transaction</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Order ID
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
                    <input
                      value={orderInput}
                      onChange={(e) => setOrderInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFindSale()}
                      placeholder="Paste or type the Order ID…"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-indigo-400 transition-colors bg-slate-50"
                    />
                  </div>
                </div>

                {saleError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 text-red-600 text-[13px]">
                    {Icons.alert} {saleError}
                  </div>
                )}

                <button
                  onClick={handleFindSale}
                  disabled={!orderInput.trim() || saleLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white text-[13.5px] font-bold border-0 cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saleLoading ? (
                    <><span className="spin">{Icons.refresh}</span> Looking up order…</>
                  ) : (
                    <>{Icons.search} Look Up Order</>
                  )}
                </button>
              </div>
            )}

            {/* ── STEP 2: Select Items & Reason ── */}
            {step === 2 && foundSale && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px", alignItems: "start" }}>

                {/* Left: items */}
                <div>
                  {/* Sale info card */}
                  <div className="bg-white border border-indigo-100 rounded-xl px-5 py-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {foundSale.customer.image ? (
                        <img src={foundSale.customer.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
                          {Icons.user}
                        </div>
                      )}
                      <div>
                        <p className="text-[14px] font-bold text-slate-900 m-0">{foundSale.customer.name}</p>
                        {foundSale.customer.phone && (
                          <p className="text-[11.5px] text-slate-400 m-0">{foundSale.customer.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] text-slate-400 uppercase tracking-wide m-0">Sale Date</p>
                      <p className="text-[13px] font-semibold text-slate-700 m-0">{fmtDate(foundSale.saleDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] text-slate-400 uppercase tracking-wide m-0">Sale Total</p>
                      <p className="text-[13px] font-bold text-slate-900 m-0">{fmt(foundSale.totalAmount)}</p>
                    </div>
                    <button
                      onClick={() => { setFoundSale(null); setStep(1); setOrderInput(""); }}
                      className="text-[12px] text-indigo-600 font-semibold bg-indigo-50 border-0 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
                    >
                      Change Order
                    </button>
                  </div>

                  {/* Item list */}
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    Select Items to Return
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {foundSale.orderLines.map((line) => {
                      const selected = !!selectedItems[line.id];
                      const qty = selectedItems[line.id] ?? 0;
                      return (
                        <div
                          key={line.id}
                          onClick={() => toggleItem(line.id, line.quantity)}
                          className={`item-card bg-white rounded-xl border-2 px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                            selected ? "border-indigo-400 bg-indigo-50/30" : "border-slate-100 hover:border-indigo-200"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              selected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && <span className="text-white" style={{ transform: "scale(0.85)" }}>{Icons.check}</span>}
                          </div>

                          {/* Product image */}
                          {line.product.image ? (
                            <img src={line.product.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                              {Icons.box}
                            </div>
                          )}

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold text-slate-900 m-0 truncate">{line.product.productName}</p>
                            <p className="text-[11.5px] text-slate-400 m-0">
                              {[line.product.size, line.product.category].filter(Boolean).join(" · ")} · {line.quantity} purchased
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-[13.5px] font-bold text-slate-900 m-0">{fmt(line.price)}</p>
                            <p className="text-[11px] text-slate-400 m-0">per item</p>
                          </div>

                          {/* Qty spinner */}
                          {selected && (
                            <div
                              className="flex items-center gap-1.5 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setQty(line.id, qty - 1, line.quantity)}
                                className="w-7 h-7 rounded-lg bg-slate-100 border-0 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                {Icons.minus}
                              </button>
                              <span className="text-[14px] font-bold text-slate-900 w-5 text-center">{qty}</span>
                              <button
                                onClick={() => setQty(line.id, qty + 1, line.quantity)}
                                disabled={qty >= line.quantity}
                                className="w-7 h-7 rounded-lg bg-slate-100 border-0 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {Icons.plus}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: reason + summary */}
                <div className="sticky top-4 flex flex-col gap-3.5">

                  {/* Return Reason */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Return Reason</p>
                    <div className="flex flex-col gap-2">
                      {(Object.keys(REASON_LABELS) as ReturnReason[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={`w-full py-2.5 px-3.5 rounded-xl border-2 text-left text-[13px] font-semibold cursor-pointer transition-all ${
                            reason === r
                              ? `${REASON_COLORS[r]} border-current`
                              : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                          }`}
                        >
                          {REASON_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Summary</p>
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-400">Items selected</span>
                        <span className="font-bold text-slate-900">{selectedCount}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-400">Total qty</span>
                        <span className="font-bold text-slate-900">
                          {Object.values(selectedItems).reduce((a, b) => a + b, 0)}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 flex justify-between">
                        <span className="text-[13px] text-slate-500">Return value</span>
                        <span className="text-[15px] font-extrabold text-red-600">{fmt(returnTotal)}</span>
                      </div>
                    </div>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3 flex items-start gap-2 text-red-600 text-[12px]">
                        {Icons.alert} {submitError}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={selectedCount === 0 || submitting}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white text-[13.5px] font-bold border-0 cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <><span className="spin">{Icons.refresh}</span> Submitting…</>
                      ) : (
                        <>{Icons.return} Submit Return Request</>
                      )}
                    </button>

                    {selectedCount === 0 && (
                      <p className="text-[11.5px] text-slate-400 text-center mt-2 m-0">
                        Select at least one item above
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && submitted && (
              <div className="max-w-[480px] mx-auto">
                <div className="bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-4" style={{ fontSize: 28 }}>
                    ✓
                  </div>
                  <h2 className="text-[20px] font-extrabold text-slate-900 m-0 mb-1">Return Filed!</h2>
                  <p className="text-[13px] text-slate-400 m-0 mb-5">
                    Your return request has been submitted and is now pending review by a manager.
                  </p>

                  <div className="bg-slate-50 rounded-xl p-4 mb-5 text-left border border-slate-100">
                    {[
                      ["Request ID", submitted.id.slice(0, 8).toUpperCase() + "…"],
                      ["Order ID",   (foundSale?.orderId ?? submitted.saleId ?? "—").slice(0, 8) + "…"],
                      ["Reason",     REASON_LABELS[submitted.reason]],
                      ["Status",     "Pending Review"],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-[12px] text-slate-400">{l}</span>
                        <span className="text-[12.5px] font-semibold text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => { resetForm(); setTab("history"); fetchHistory(); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      View History
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold border-0 cursor-pointer hover:bg-indigo-700 transition-colors"
                    >
                      New Return
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: RETURN HISTORY
        ════════════════════════════════════════ */}
        {tab === "history" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Summary row */}
            <div className="grid gap-3.5 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
              {[
                { label: "Total Filed", value: history.length, bg: "bg-indigo-50", color: "text-indigo-600" },
                { label: "Pending",     value: pendingCnt,     bg: "bg-orange-50", color: "text-orange-600" },
                { label: "Approved",    value: approvedCnt,    bg: "bg-green-50",  color: "text-green-600" },
                { label: "Rejected",    value: history.filter(r => r.status === "REJECTED").length, bg: "bg-red-50", color: "text-red-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-[18px] font-black flex-shrink-0`}>
                    {s.value}
                  </div>
                  <p className="text-[12px] font-semibold text-slate-400 m-0 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Search + Refresh */}
            <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 mb-3.5 flex items-center gap-3 flex-wrap">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
                <input
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  placeholder="Search by ID, customer, product…"
                  className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] w-[260px] outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <button
                onClick={fetchHistory}
                disabled={histLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                <span className={histLoading ? "spin" : ""}>{Icons.refresh}</span>
                {histLoading ? "Loading…" : "Refresh"}
              </button>
              <span className="ml-auto text-[12px] text-slate-400 font-medium">
                {filteredHistory.length} request{filteredHistory.length !== 1 ? "s" : ""}
              </span>
            </div>

            {histError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3.5 flex items-center gap-2.5 text-red-600 text-[13px]">
                {Icons.alert} {histError}
                <button onClick={fetchHistory} className="ml-auto text-[12px] underline font-semibold bg-transparent border-0 cursor-pointer text-red-600">Retry</button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 780 }}>
                  <thead>
                    <tr>
                      {["Request ID", "Customer", "Reason", "Items", "Est. Return", "Date Filed", "Status", ""].map((h) => (
                        <th key={h} className="px-3.5 py-[11px] text-left text-[10.5px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histLoading && history.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2.5">
                            <span className="spin text-indigo-500">{Icons.refresh}</span>
                            <p className="text-[14px] text-slate-400 m-0">Loading your returns…</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2.5">
                            <span className="text-slate-300">{Icons.box}</span>
                            <p className="text-[15px] font-semibold text-slate-500 m-0">No return requests yet</p>
                            <p className="text-[13px] text-slate-400 m-0">
                              {histSearch ? "Try adjusting your search." : "File your first return using the 'New Return Request' tab."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((r) => {
                        const ss = STATUS_STYLES[r.status];
                        const rc = REASON_COLORS[r.reason];
                        const rTotal = r.items.reduce((s, i) => s + i.returnQty * i.orderLine.price, 0);
                        return (
                          <tr key={r.id} className="ret-row transition-colors">
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                              <span className="font-mono text-[11.5px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {r.id.slice(0, 8).toUpperCase()}…
                              </span>
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                              <div className="flex items-center gap-2">
                                {r.customer?.image ? (
                                  <img src={r.customer.image} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                    {Icons.user}
                                  </div>
                                )}
                                <span className="text-[13px] font-semibold text-slate-800">{r.customer?.name ?? "—"}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                              <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold border ${rc}`}>
                                {REASON_LABELS[r.reason]}
                              </span>
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-center">
                              <span className="text-[14px] font-bold text-slate-900">{r.items.length}</span>
                              <p className="text-[10px] text-slate-400 m-0">item{r.items.length !== 1 ? "s" : ""}</p>
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle font-bold text-red-600 text-[13px]">
                              {fmt(rTotal)}
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-[12px] text-slate-500">
                              {fmtDate(r.createdAt)}
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11.5px] font-bold ${ss.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                                {ss.label}
                              </span>
                            </td>
                            <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                              <button
                                onClick={() => setViewItem(r)}
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
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          HISTORY DETAIL MODAL
      ════════════════════════════════════════ */}
      {viewItem && (
        <>
          <div onClick={() => setViewItem(null)} className="fixed inset-0 bg-slate-900/55 z-40 backdrop-blur-sm" />
          <div
            className="modal-scroll fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl overflow-y-auto shadow-2xl"
            style={{ width: "min(96vw,520px)", maxHeight: "90vh", animation: "fadeUp 0.25s ease" }}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 rounded-t-2xl px-6 py-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[11.5px] font-bold text-slate-400 bg-white/10 px-2.5 py-0.5 rounded">
                      {viewItem.id.slice(0, 8).toUpperCase()}…
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11.5px] font-bold ${STATUS_STYLES[viewItem.status].badge}`}>
                      {STATUS_STYLES[viewItem.status].label}
                    </span>
                  </div>
                  <p className="text-[17px] font-extrabold text-white m-0">Return Request</p>
                  <p className="text-[12.5px] text-slate-500 m-0 mt-0.5">Filed {fmtDate(viewItem.createdAt)}</p>
                </div>
                <button
                  onClick={() => setViewItem(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 border-0 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                >
                  {Icons.close}
                </button>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 flex justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide m-0">Return Value</p>
                  <p className="text-[22px] font-black text-white m-0">
                    {fmt(viewItem.items.reduce((s, i) => s + i.returnQty * i.orderLine.price, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide m-0">Reason</p>
                  <p className="text-[13px] font-bold text-white/80 m-0 mt-1">{REASON_LABELS[viewItem.reason]}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Customer */}
              <div className="bg-slate-50 rounded-xl px-4 py-3.5 border border-slate-100 flex items-center gap-3">
                {viewItem.customer?.image ? (
                  <img src={viewItem.customer.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">{Icons.user}</div>
                )}
                <div>
                  <p className="text-[13.5px] font-bold text-slate-900 m-0">{viewItem.customer?.name ?? "—"}</p>
                  {viewItem.customer?.phone && <p className="text-[12px] text-slate-400 m-0">{viewItem.customer.phone}</p>}
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-2">Items Returned</p>
                <div className="flex flex-col gap-2">
                  {viewItem.items.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-xl px-3.5 py-3 border border-slate-100 flex items-center gap-3">
                      {item.orderLine.product.image ? (
                        <img src={item.orderLine.product.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">{Icons.box}</div>
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-900 m-0">{item.orderLine.product.productName}</p>
                        <p className="text-[11.5px] text-slate-400 m-0">{item.returnQty} × {fmt(item.orderLine.price)}</p>
                      </div>
                      <p className="text-[13px] font-extrabold text-red-600 m-0">{fmt(item.returnQty * item.orderLine.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review decision */}
              {viewItem.status !== "PENDING" && (
                <div className={`rounded-xl px-4 py-3.5 border ${viewItem.status === "APPROVED" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider m-0 mb-1.5">Manager Decision</p>
                  <p className={`text-[13.5px] font-bold m-0 ${viewItem.status === "APPROVED" ? "text-green-700" : "text-red-600"}`}>
                    {viewItem.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    {viewItem.reviewer && <span className="font-normal text-slate-400 text-[12px]"> by {viewItem.reviewer.name}</span>}
                  </p>
                  {viewItem.reviewNote && (
                    <p className="text-[12.5px] text-slate-600 m-0 mt-1.5 leading-relaxed">{viewItem.reviewNote}</p>
                  )}
                </div>
              )}

              <button
                onClick={() => setViewItem(null)}
                className="w-full py-[11px] rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}