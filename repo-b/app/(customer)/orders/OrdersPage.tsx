"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useSocket } from "@/app/providers";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "Waiting"
  | "Processing"
  | "Out For Delivery"
  | "Received"
  | "Cancelled";

type OrderItem = {
  name:          string;
  qty:           number;  // cases ordered
  piecesPerCase: number;
  price:         number;
};

type Driver = {
  name:  string;
  phone: string | null;
};

type Order = {
  id:             string;
  date:           string;
  status:         OrderStatus;
  note:           string;
  total:          number;
  paymentMethod:  string;  // raw, uppercased (e.g. "CASH", "GCASH")
  items:          OrderItem[];
  driver:         Driver | null;
  amountTendered: number | null;
  change:         number | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
// Full class strings so Tailwind can see them.
const statusStyle: Record<OrderStatus, { badge: string; bar: string; soft: string }> = {
  Waiting:            { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",   bar: "bg-amber-400",  soft: "bg-amber-50"  },
  Processing:         { badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",         bar: "bg-sky-500",    soft: "bg-sky-50"    },
  "Out For Delivery": { badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",bar: "bg-orange-500", soft: "bg-orange-50" },
  Received:           { badge: "bg-green-50 text-green-700 ring-1 ring-green-200",   bar: "bg-green-600",  soft: "bg-green-50"  },
  Cancelled:          { badge: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",     bar: "bg-gray-300",   soft: "bg-gray-50"   },
};

const statusNote: Record<OrderStatus, string> = {
  Waiting:            "The cashier is verifying your order",
  Processing:         "Your order is being prepared",
  "Out For Delivery": "Your order is on its way",
  Received:           "Your order has been delivered",
  Cancelled:          "This order has been cancelled",
};

const statusIcon: Record<OrderStatus, string> = {
  Waiting:            "⏳",
  Processing:         "⚙️",
  "Out For Delivery": "🚚",
  Received:           "✅",
  Cancelled:          "✕",
};

const statusSteps: OrderStatus[] = ["Waiting", "Processing", "Out For Delivery", "Received"];

const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING:            "Waiting",
  PROCESSING:         "Processing",
  OUT_FOR_DELIVERY:   "Out For Delivery",
  RECEIVED:           "Received",   // customer confirmed arrival, cashier still has to complete it
  COMPLETED:          "Received",
  CANCELLED:          "Cancelled",
  CANCELED:           "Cancelled",
  REFUNDED:           "Cancelled",
  PARTIALLY_RETURNED: "Cancelled",
};

const ACTIVE_STATUSES: OrderStatus[] = ["Waiting", "Processing", "Out For Delivery"];

const VAT_RATE = 0.12;
// order.total from the server is already VAT-inclusive, so derive the
// subtotal and VAT from the items and use order.total as the grand total.
function withVat(order: { items: OrderItem[]; total: number }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * VAT_RATE;
  return { subtotal, vat, grandTotal: order.total };
}
const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type TabFilter = "All" | OrderStatus;
const TABS: TabFilter[] = ["All", "Waiting", "Processing", "Out For Delivery"];

const MAX_ITEMS_ON_CARD = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const status: OrderStatus = STATUS_MAP[rawStatus] ?? "Waiting";

  const rawLines = (o.orderLines ?? o.items ?? []) as Record<string, unknown>[];
  const items: OrderItem[] = rawLines.map((l) => {
    const product = l.product as Record<string, unknown> | null;
    return {
      name:          product ? String(product.productName ?? "Item") : String(l.name ?? "Item"),
      qty:           Number(l.quantity ?? l.qty ?? 1),
      piecesPerCase: Math.max(1, Number(product?.productPiecesPerCase ?? product?.piecesPerCase ?? l.piecesPerCase ?? 1)),
      price:         Number(l.price ?? 0),
    };
  });

  const total   = Number(o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0));
  const rawDate = String(o.createdAt ?? o.date ?? "");
  const date    = rawDate
    ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const payment = o.payment as Record<string, unknown> | null;
  const paymentMethod = String(payment?.method ?? o.paymentMethod ?? "CASH")
    .toUpperCase()
    .replace(/[\s_-]/g, "");

  const rawDriver = o.driver as Record<string, unknown> | null | undefined;
  const driver: Driver | null = rawDriver
    ? {
        name:  String(rawDriver.name ?? "Driver"),
        phone: rawDriver.phone ? String(rawDriver.phone) : null,
      }
    : null;

  const toNum = (v: unknown): number | null =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  const amountTendered = toNum(payment?.amountTendered);
  const change =
    toNum(payment?.change) ??
    (amountTendered !== null ? Math.max(0, amountTendered - total) : null);

  return {
    id: String(o.id ?? ""), date, status, note: statusNote[status], total, paymentMethod, items,
    driver, amountTendered, change,
  };
}

function responseError(res: unknown): string | null {
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if (typeof r.message === "string" && !("id" in r)) return r.message;
  }
  return null;
}

// GCash orders are already paid, so they can't be cancelled by the customer
const isGcash = (order: Pick<Order, "paymentMethod">) => order.paymentMethod.includes("GCASH");

const canCancelOrder = (order: Order) =>
  (order.status === "Waiting" || order.status === "Processing") && !isGcash(order);

function paymentLabel(method: string): { icon: string; label: string; badge: string } {
  if (method.includes("GCASH")) return { icon: "📱", label: "GCash", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-100" };
  if (method.includes("CASH"))  return { icon: "💵", label: "Cash",  badge: "bg-green-50 text-green-700 ring-1 ring-green-100" };
  const pretty = method ? method.charAt(0) + method.slice(1).toLowerCase() : "Cash";
  return { icon: "💳", label: pretty, badge: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" };
}

// "2 cases · 48 pcs" (or "5 pcs" when the product has no case size)
function qtyLabel(item: OrderItem): string {
  if (item.piecesPerCase > 1) {
    const pcs = item.qty * item.piecesPerCase;
    return `${item.qty} case${item.qty !== 1 ? "s" : ""} · ${pcs} pcs`;
  }
  return `${item.qty} pc${item.qty !== 1 ? "s" : ""}`;
}

// ── Small components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle[status].badge}`}>
      <span aria-hidden>{statusIcon[status]}</span> {status}
    </span>
  );
}

function PaymentChip({ method }: { method: string }) {
  const p = paymentLabel(method);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${p.badge}`}>
      {p.icon} {p.label}
    </span>
  );
}

// Step tracker. compact = thin bar for list cards, full = labelled dots for the details panel.
function StepTracker({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  if (status === "Cancelled") return null;
  const stepIndex = statusSteps.indexOf(status);

  if (compact) {
    return (
      <div className="mb-4">
        <div className="flex gap-1.5">
          {statusSteps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                i <= stepIndex ? statusStyle[status].bar : "bg-gray-100"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {statusSteps.map((s, i) => (
            <span
              key={s}
              className={`flex-1 text-[10px] leading-tight ${
                i === 0 ? "text-left" : i === statusSteps.length - 1 ? "text-right" : "text-center"
              } ${i === stepIndex ? "font-bold text-gray-800" : i < stepIndex ? "text-gray-500" : "text-gray-300"}`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex justify-between items-start">
      <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-[3px] bg-gray-100 rounded-full z-0">
        <div
          className="h-full bg-[#2d7a3a] rounded-full transition-all duration-500"
          style={{ width: `${(stepIndex / (statusSteps.length - 1)) * 100}%` }}
        />
      </div>
      {statusSteps.map((step, i) => {
        const done = i <= stepIndex;
        const current = i === stepIndex;
        return (
          <div key={step} className="flex flex-col items-center gap-1.5 z-10 flex-1">
            <div
              className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all",
                done ? "bg-[#2d7a3a] text-white" : "bg-white border-2 border-gray-200 text-gray-300",
                current ? "ring-4 ring-[#2d7a3a]/20" : "",
              ].join(" ")}
            >
              {done ? "✓" : ""}
            </div>
            <p className={`text-[10px] text-center leading-tight m-0 ${done ? "text-[#2d7a3a] font-semibold" : "text-gray-400"}`}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({ item, large = false }: { item: OrderItem; large?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`${large ? "w-10 h-10" : "w-9 h-9"} rounded-xl bg-[#2d7a3a]/10 flex items-center justify-center text-base shrink-0`}>
          🛒
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{item.name}</p>
          <p className="text-[11px] text-gray-400 m-0">{qtyLabel(item)}</p>
        </div>
      </div>
      <span className="text-[13px] font-semibold text-gray-800 shrink-0">
        ₱{money(item.price * item.qty)}
      </span>
    </div>
  );
}

function DriverCard({ driver }: { driver: Driver }) {
  const initial = driver.name.trim().charAt(0).toUpperCase() || "D";
  return (
    <div className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-orange-700/70 m-0">Your driver</p>
          <p className="text-[13px] font-bold text-gray-900 m-0 truncate">{driver.name}</p>
        </div>
      </div>
      {driver.phone && (
        <a
          href={`tel:${driver.phone}`}
          className="shrink-0 no-underline bg-white text-orange-700 border border-orange-200 rounded-full px-3.5 py-1.5 text-xs font-semibold hover:bg-orange-100 transition-colors"
        >
          📞 Call
        </a>
      )}
    </div>
  );
}

function CashInfo({ order }: { order: Order }) {
  if (isGcash(order) || order.amountTendered === null) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-100 rounded-xl px-3.5 py-3">
      <div>
        <p className="text-[11px] text-green-700/70 m-0">You&apos;ll hand over</p>
        <p className="text-[14px] font-bold text-gray-900 m-0">₱{money(order.amountTendered)}</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-green-700/70 m-0">Change to receive</p>
        <p className="text-[14px] font-bold text-[#2d7a3a] m-0">₱{money(order.change ?? 0)}</p>
      </div>
    </div>
  );
}

function TotalsBlock({ subtotal, vat, grandTotal }: { subtotal: number; vat: number; grandTotal: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[12px]">
        <span className="text-gray-400">Subtotal</span>
        <span className="text-gray-600">₱{money(subtotal)}</span>
      </div>
      <div className="flex justify-between text-[12px]">
        <span className="text-gray-400">VAT (12%)</span>
        <span className="text-gray-600">₱{money(vat)}</span>
      </div>
      <div className="flex justify-between items-baseline pt-2.5 mt-1 border-t border-dashed border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Total</span>
        <span className="text-[22px] font-extrabold text-[#2d7a3a] leading-none">₱{money(grandTotal)}</span>
      </div>
    </div>
  );
}

// ── Receive Confirmation Modal ─────────────────────────────────────────────────
function ReceiveModal({
  order,
  onConfirm,
  onCancel,
}: {
  order: Order;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { subtotal, vat, grandTotal } = withVat(order);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      style={{ backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-[430px] max-h-[92vh] flex flex-col shadow-[0_24px_70px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2d7a3a] to-[#1f5a29] px-6 py-5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">📦</div>
            <div>
              <p className="text-base font-bold m-0">Confirm order received</p>
              <p className="text-[12px] text-green-100 m-0 mt-0.5">Check your items before you confirm</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto">
          {/* Order meta */}
          <div className="px-6 py-4 flex justify-between items-center gap-3 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 m-0">Order ID</p>
              <p className="text-[13px] font-bold text-gray-900 m-0 truncate">{order.id}</p>
              <p className="text-[11px] text-gray-400 m-0 mt-0.5">{order.date}</p>
            </div>
            <PaymentChip method={order.paymentMethod} />
          </div>

          {/* Items */}
          <div className="px-6 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2.5">
              Items ({order.items.length})
            </p>
            <div className="flex flex-col gap-2">
              {order.items.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl px-3.5 py-2.5">
                  <ItemRow item={item} />
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mx-6 mt-4 bg-gray-50 rounded-xl px-4 py-3.5">
            <TotalsBlock subtotal={subtotal} vat={vat} grandTotal={grandTotal} />
          </div>

          {order.change !== null && !isGcash(order) && (
            <p className="mx-6 mt-3 text-[12px] text-gray-500 m-0">
              💵 Your driver owes you <b className="text-gray-800">₱{money(order.change)}</b> in change.
            </p>
          )}

          {/* Notice */}
          <div className="mx-6 my-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex gap-2 items-start">
            <span className="text-base shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-700 m-0 leading-relaxed">
              By confirming, you say you received every item above in good condition.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 flex gap-2.5 border-t border-gray-100 shrink-0 bg-white">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-200 bg-white text-gray-500 text-[14px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Not yet
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full border-0 bg-[#2d7a3a] text-white text-[14px] font-bold cursor-pointer hover:bg-[#245f2d] transition-colors shadow-[0_6px_16px_rgba(45,122,58,0.35)]"
          >
            ✅ Yes, received
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [isMobile,           setIsMobile]           = useState(false);
  const [orders,             setOrders]             = useState<Order[]>([]);
  const [selectedOrder,      setSelectedOrder]      = useState<Order | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [actionError,        setActionError]        = useState<string | null>(null);
  const [activeTab,          setActiveTab]          = useState<TabFilter>("All");
  const [cancellingId,       setCancellingId]       = useState<string | null>(null);
  const [showCancelConfirm,  setShowCancelConfirm]  = useState<string | null>(null);
  const [showReceiveConfirm, setShowReceiveConfirm] = useState<Order | null>(null);

  const socket = useSocket();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchOrders = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setError("Not logged in."); setLoading(false); return; }
    try {
      setLoading(true);
      const data = await api.getCustomerOrders(customerId);
      if (data?.message) { setError(data.message); setOrders([]); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data.orders ?? data.sales ?? []);
      const active = raw.map(normalizeOrder).filter((o) => ACTIVE_STATUSES.includes(o.status));
      setOrders(active);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    // Named handler so cleanup removes ONLY this page's listener.
    const refresh = () => fetchOrders();

    socket.on("order:completed", refresh);
    socket.on("order:status",    refresh);
    return () => {
      socket.off("order:completed", refresh);
      socket.off("order:status",    refresh);
    };
  }, [socket, fetchOrders]);

  // The customer only confirms arrival (OUT_FOR_DELIVERY -> RECEIVED).
  // The cashier completes the order later, after collecting the driver's cash.
  const markReceived = async (id: string) => {
    setShowReceiveConfirm(null);
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "Out For Delivery") return;

    setActionError(null);
    try {
      const res = await api.updateOrderStatus(id, "RECEIVED");
      const msg = responseError(res);
      if (msg) {
        setActionError(msg);
        fetchOrders();
        return;
      }
    } catch (err) {
      setActionError((err as Error).message || "Could not confirm receipt. Please try again.");
      fetchOrders();
      return;
    }

    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Received" } : o));
    if (selectedOrder?.id === id)
      setSelectedOrder((p) => p ? { ...p, status: "Received" } : null);
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 1800);
  };

  const cancelOrder = async (id: string) => {
    // Safety guard: never cancel a GCash (already paid) order from the client
    const target = orders.find((o) => o.id === id);
    if (!target || !canCancelOrder(target)) {
      setShowCancelConfirm(null);
      return;
    }
    setCancellingId(id);
    setShowCancelConfirm(null);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Cancelled" } : o));
    try { await api.updateOrderStatus(id, "CANCELLED"); } catch { /* optimistic */ }
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
      setCancellingId(null);
    }, 1500);
  };

  const filtered = activeTab === "All" ? orders : orders.filter((o) => o.status === activeTab);
  const tabCount = (tab: TabFilter) =>
    tab === "All" ? orders.length : orders.filter((o) => o.status === tab).length;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#f3f6f3] p-4 md:p-7 flex flex-col gap-4">
        <div className="h-8 w-40 rounded-lg animate-pulse bg-gray-200" />
        <div className="h-11 w-full max-w-md rounded-full animate-pulse bg-gray-200" />
        {[250, 250, 220].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse bg-white border border-gray-100" style={{ height: h }} />
        ))}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#f3f6f3] flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-white border border-red-100 rounded-2xl px-8 py-7 text-center max-w-sm shadow-sm">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-base font-bold text-gray-900 m-0 mb-1">Couldn&apos;t load your orders</p>
          <p className="text-[13px] text-red-600 m-0 mb-5">{error}</p>
          <button
            onClick={fetchOrders}
            className="bg-[#2d7a3a] text-white border-0 rounded-full px-7 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-[#245f2d] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-56px)] bg-[#f3f6f3] ${isMobile ? "p-4" : "p-7"}`}>

      {/* ── Receive Confirmation Modal ───────────────────────────────────── */}
      {showReceiveConfirm && (
        <ReceiveModal
          order={showReceiveConfirm}
          onConfirm={() => markReceived(showReceiveConfirm.id)}
          onCancel={() => setShowReceiveConfirm(null)}
        />
      )}

      {/* ── Cancel Confirmation Modal ────────────────────────────────────── */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
          style={{ backdropFilter: "blur(3px)" }}
          onClick={() => setShowCancelConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-7 max-w-[380px] w-full text-center shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl mx-auto mb-4">🚫</div>
            <p className="text-[17px] font-bold text-gray-900 mb-1.5">Cancel this order?</p>
            <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
              You can&apos;t undo this. You&apos;ll need to place a new order.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-3 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Keep order
              </button>
              <button
                onClick={() => cancelOrder(showCancelConfirm)}
                disabled={cancellingId === showCancelConfirm}
                className="flex-1 py-3 rounded-full border-0 bg-red-600 text-white text-sm font-bold cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancellingId === showCancelConfirm ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900 m-0 leading-tight">My Orders</h1>
          <p className="text-[13px] text-gray-500 m-0 mt-0.5">
            {orders.length === 0
              ? "Nothing in progress right now"
              : `${orders.length} order${orders.length !== 1 ? "s" : ""} in progress`}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Action error banner ──────────────────────────────────────────── */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-[13px] m-0 leading-relaxed">⚠️ {actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="bg-transparent border-0 text-red-700 cursor-pointer text-sm font-bold leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Tab Filter ──────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-5 p-1.5 bg-white rounded-full border border-gray-100 shadow-sm overflow-x-auto w-fit max-w-full">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] cursor-pointer transition-all duration-200 border-0 whitespace-nowrap",
                active
                  ? "bg-[#2d7a3a] text-white font-semibold shadow-[0_4px_12px_rgba(45,122,58,0.3)]"
                  : "bg-transparent text-gray-500 font-medium hover:bg-gray-50",
              ].join(" ")}
            >
              {tab !== "All" && <span aria-hidden>{statusIcon[tab as OrderStatus]}</span>}
              {tab}
              <span
                className={[
                  "min-w-[20px] text-center px-1.5 py-px rounded-full text-[11px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500",
                ].join(" ")}
              >
                {tabCount(tab)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div
        className="grid gap-5 items-start"
        style={{
          gridTemplateColumns: isMobile ? "1fr" : selectedOrder ? "1fr 420px" : "1fr",
        }}
      >
        {/* Orders List */}
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl px-8 py-14 text-center border border-gray-100 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-[#2d7a3a]/10 flex items-center justify-center text-4xl mx-auto mb-4">📦</div>
              <p className="text-lg font-bold text-gray-900 mb-1.5">
                {activeTab === "All" ? "No active orders" : `No ${activeTab.toLowerCase()} orders`}
              </p>
              <p className="text-[13px] text-gray-400 mb-6">
                Finished orders are in your Transaction History.
              </p>
              <Link
                href="/transactions"
                className="inline-block bg-[#2d7a3a] text-white no-underline px-7 py-2.5 rounded-full text-[13px] font-semibold hover:bg-[#245f2d] transition-colors"
              >
                View transaction history
              </Link>
            </div>
          ) : (
            filtered.map((order) => {
              const isSelected  = selectedOrder?.id === order.id;
              const canCancel   = canCancelOrder(order);
              const gcashLocked = isGcash(order) && (order.status === "Waiting" || order.status === "Processing");
              const canReceive  = order.status === "Out For Delivery";
              const { subtotal, vat, grandTotal } = withVat(order);
              const shown  = order.items.slice(0, MAX_ITEMS_ON_CARD);
              const hidden = order.items.length - shown.length;
              const style  = statusStyle[order.status];

              return (
                <div
                  key={order.id}
                  className={[
                    "relative bg-white rounded-2xl overflow-hidden transition-all duration-200",
                    isSelected
                      ? "ring-2 ring-[#2d7a3a] shadow-[0_8px_28px_rgba(45,122,58,0.15)]"
                      : "border border-gray-100 shadow-sm hover:shadow-md",
                  ].join(" ")}
                >
                  {/* Status stripe */}
                  <div className={`h-1 w-full ${style.bar}`} />

                  <div className="px-5 pt-4 pb-5 md:px-6">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 m-0">Order ID</p>
                        <p className="text-sm font-bold text-gray-900 m-0 truncate">{order.id}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                      <p className="text-xs text-gray-400 m-0">📅 {order.date}</p>
                      <PaymentChip method={order.paymentMethod} />
                    </div>

                    {/* Status message + progress */}
                    <div className={`${style.soft} rounded-xl px-3.5 py-3 mb-4`}>
                      <p className="text-[13px] font-medium text-gray-700 m-0 mb-3">{order.note}</p>
                      <StepTracker status={order.status} compact />
                    </div>

                    {/* Driver + cash (only when available) */}
                    {order.driver && order.status === "Out For Delivery" && (
                      <div className="flex flex-col gap-2 mb-4">
                        <DriverCard driver={order.driver} />
                        <CashInfo order={order} />
                      </div>
                    )}

                    {/* Items */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-semibold text-gray-500 m-0">
                          Items ({order.items.length})
                        </p>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {shown.map((item, i) => <ItemRow key={i} item={item} />)}
                      </div>
                      {hidden > 0 && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="mt-2.5 bg-transparent border-0 p-0 text-xs font-semibold text-[#2d7a3a] cursor-pointer hover:underline"
                        >
                          +{hidden} more item{hidden !== 1 ? "s" : ""}
                        </button>
                      )}
                    </div>

                    {/* GCash no-cancel notice */}
                    {gcashLocked && (
                      <p className="text-[11px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-4 m-0">
                        📱 Paid via GCash, so this order can&apos;t be cancelled.
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-end gap-3 flex-wrap pt-4 border-t border-dashed border-gray-200">
                      <div>
                        <p className="text-[11px] text-gray-400 m-0">
                          Subtotal ₱{money(subtotal)} + VAT ₱{money(vat)}
                        </p>
                        <p className="text-xs text-gray-500 m-0 mt-1">Total amount</p>
                        <p className="text-[24px] font-extrabold text-[#2d7a3a] m-0 leading-tight">
                          ₱{money(grandTotal)}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button
                          onClick={() => setSelectedOrder(isSelected ? null : order)}
                          className="bg-white text-gray-700 border border-gray-200 rounded-full px-[18px] py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          {isSelected ? "Hide details" : "Details"}
                        </button>
                        {canCancel && (
                          <button
                            onClick={() => setShowCancelConfirm(order.id)}
                            className="bg-white text-red-600 border border-red-200 rounded-full px-[18px] py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => canReceive && setShowReceiveConfirm(order)}
                          disabled={!canReceive}
                          className={[
                            "border-0 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors",
                            canReceive
                              ? "bg-[#2d7a3a] text-white cursor-pointer hover:bg-[#245f2d] shadow-[0_4px_12px_rgba(45,122,58,0.3)]"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed",
                          ].join(" ")}
                        >
                          {order.status === "Received" ? "✓ Received" : "Received"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Order Details Panel ────────────────────────────────────────── */}
        {selectedOrder && (() => {
          const canCancel   = canCancelOrder(selectedOrder);
          const gcashLocked = isGcash(selectedOrder) &&
            (selectedOrder.status === "Waiting" || selectedOrder.status === "Processing");
          const canReceive  = selectedOrder.status === "Out For Delivery";
          const { subtotal, vat, grandTotal } = withVat(selectedOrder);

          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-5">
              {/* Panel header */}
              <div className="flex justify-between items-center mb-5">
                <p className="text-base font-bold text-gray-900 m-0">Order details</p>
                <button
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close details"
                  className="w-8 h-8 rounded-full bg-gray-100 border-0 cursor-pointer text-sm flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Order ID + status */}
              <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-5">
                <p className="text-[11px] text-gray-400 m-0">Order ID</p>
                <p className="text-sm font-bold text-gray-900 m-0 mb-0.5 break-all">{selectedOrder.id}</p>
                <p className="text-[11px] text-gray-400 m-0 mb-2.5">{selectedOrder.date}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={selectedOrder.status} />
                  <PaymentChip method={selectedOrder.paymentMethod} />
                </div>
              </div>

              {/* Progress tracker */}
              {selectedOrder.status !== "Cancelled" && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Order progress</p>
                  <StepTracker status={selectedOrder.status} />
                </div>
              )}

              {/* Driver + cash */}
              {(selectedOrder.driver || (selectedOrder.amountTendered !== null && !isGcash(selectedOrder))) && (
                <div className="flex flex-col gap-2 mb-5">
                  {selectedOrder.driver && <DriverCard driver={selectedOrder.driver} />}
                  <CashInfo order={selectedOrder} />
                </div>
              )}

              {/* Items */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  Items ({selectedOrder.items.length})
                </p>
                <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, i) => (
                    <ItemRow key={i} item={item} large />
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-4">
                <TotalsBlock subtotal={subtotal} vat={vat} grandTotal={grandTotal} />
              </div>

              {/* GCash no-cancel notice */}
              {gcashLocked && (
                <p className="text-[11px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3 m-0">
                  📱 Paid via GCash, so this order can&apos;t be cancelled.
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => canReceive && setShowReceiveConfirm(selectedOrder)}
                  disabled={!canReceive}
                  className={[
                    "w-full py-3 rounded-full border-0 text-sm font-bold transition-colors",
                    selectedOrder.status === "Received"
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : canReceive
                        ? "bg-[#2d7a3a] text-white cursor-pointer hover:bg-[#245f2d] shadow-[0_6px_16px_rgba(45,122,58,0.3)]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed",
                  ].join(" ")}
                >
                  {selectedOrder.status === "Received"
                    ? "✓ Moving to Transaction History…"
                    : canReceive
                      ? "Mark as received"
                      : "Awaiting delivery"}
                </button>
                {canCancel && (
                  <button
                    onClick={() => setShowCancelConfirm(selectedOrder.id)}
                    disabled={cancellingId === selectedOrder.id}
                    className="w-full py-3 rounded-full border border-red-200 bg-white text-red-600 text-sm font-bold cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {cancellingId === selectedOrder.id ? "Cancelling…" : "Cancel order"}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}