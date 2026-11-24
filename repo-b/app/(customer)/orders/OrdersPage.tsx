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
const GREEN = "#2d7a3a";

// Full class strings so Tailwind can see them.
const statusDot: Record<OrderStatus, string> = {
  Waiting:            "bg-amber-400",
  Processing:         "bg-sky-500",
  "Out For Delivery": "bg-orange-500",
  Received:           "bg-green-600",
  Cancelled:          "bg-gray-300",
};

const statusNote: Record<OrderStatus, string> = {
  Waiting:            "The cashier is verifying your order",
  Processing:         "Your order is being prepared",
  "Out For Delivery": "Your order is on its way",
  Received:           "Your order has been delivered",
  Cancelled:          "This order has been cancelled",
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

function paymentLabel(method: string): string {
  if (method.includes("GCASH")) return "GCash";
  if (method.includes("CASH"))  return "Cash";
  return method ? method.charAt(0) + method.slice(1).toLowerCase() : "Cash";
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
function StatusLabel({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700 whitespace-nowrap">
      <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
      {status}
    </span>
  );
}

// Thin segmented bar (list cards) or labelled steps (details panel)
function StepTracker({ status, labelled = false }: { status: OrderStatus; labelled?: boolean }) {
  if (status === "Cancelled") return null;
  const stepIndex = statusSteps.indexOf(status);

  return (
    <div>
      <div className="flex gap-1.5">
        {statusSteps.map((s, i) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-colors duration-500"
            style={{ backgroundColor: i <= stepIndex ? GREEN : "#e5e7eb" }}
          />
        ))}
      </div>
      {labelled && (
        <div className="flex gap-1.5 mt-2">
          {statusSteps.map((s, i) => (
            <span
              key={s}
              className={`flex-1 text-[10px] leading-tight ${
                i <= stepIndex ? "text-gray-800 font-medium" : "text-gray-300"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[14px] text-gray-900 m-0 truncate">{item.name}</p>
        <p className="text-[12px] text-gray-400 m-0 mt-0.5">{qtyLabel(item)}</p>
      </div>
      <span className="text-[14px] text-gray-700 shrink-0 tabular-nums">
        ₱{money(item.price * item.qty)}
      </span>
    </div>
  );
}

// Simple key/value line
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

// Driver + cash details, shown as quiet key/value lines
function DeliveryInfo({ order }: { order: Order }) {
  const showCash = !isGcash(order) && order.amountTendered !== null;
  if (!order.driver && !showCash) return null;
  return (
    <div className="flex flex-col gap-2 py-4 border-t border-gray-100">
      {order.driver && <Meta label="Driver" value={order.driver.name} />}
      {showCash && <Meta label="You hand over" value={`₱${money(order.amountTendered as number)}`} />}
      {showCash && <Meta label="Change to receive" value={`₱${money(order.change ?? 0)}`} />}
    </div>
  );
}

function Totals({ subtotal, vat, grandTotal }: { subtotal: number; vat: number; grandTotal: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[13px]">
        <span className="text-gray-400">Subtotal</span>
        <span className="text-gray-600 tabular-nums">₱{money(subtotal)}</span>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="text-gray-400">VAT (12%)</span>
        <span className="text-gray-600 tabular-nums">₱{money(vat)}</span>
      </div>
      <div className="flex justify-between items-baseline pt-3 mt-1.5 border-t border-gray-100">
        <span className="text-[14px] font-semibold text-gray-900">Total</span>
        <span className="text-[22px] font-bold text-gray-900 tabular-nums">₱{money(grandTotal)}</span>
      </div>
    </div>
  );
}

const btnPrimary =
  "rounded-full border-0 bg-[#2d7a3a] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#245f2d] transition-colors";
const btnGhost =
  "rounded-full border border-gray-200 bg-white text-gray-700 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors";
const btnDisabled =
  "rounded-full border-0 bg-gray-100 text-gray-400 text-[13px] font-medium cursor-not-allowed";

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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-5"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[420px] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 shrink-0">
          <p className="text-[17px] font-semibold text-gray-900 m-0">Confirm you received this order</p>
          <p className="text-[13px] text-gray-400 m-0 mt-1">
            {order.id} · {order.date}
          </p>
        </div>

        <div className="px-6 overflow-y-auto">
          <div className="flex flex-col gap-3.5 py-4 border-y border-gray-100">
            {order.items.map((item, i) => <ItemRow key={i} item={item} />)}
          </div>

          <div className="py-4">
            <Totals subtotal={subtotal} vat={vat} grandTotal={grandTotal} />
          </div>

          <p className="text-[12px] text-gray-400 leading-relaxed m-0 pb-4">
            By confirming, you say you received every item above in good condition.
          </p>
        </div>

        <div className="px-6 py-4 flex gap-2.5 border-t border-gray-100 shrink-0">
          <button onClick={onCancel} className={`flex-1 py-3 ${btnGhost}`}>
            Not yet
          </button>
          <button onClick={onConfirm} className={`flex-1 py-3 ${btnPrimary}`}>
            Yes, received
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
      <div className="min-h-[calc(100vh-56px)] bg-[#fafaf9] p-4 md:p-8 flex flex-col gap-4">
        <div className="h-7 w-36 rounded-md animate-pulse bg-gray-200" />
        {[230, 230, 200].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse bg-white border border-gray-100" style={{ height: h }} />
        ))}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#fafaf9] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[15px] font-semibold text-gray-900 m-0">Couldn&apos;t load your orders</p>
        <p className="text-[13px] text-gray-400 m-0 max-w-xs">{error}</p>
        <button onClick={fetchOrders} className={`px-6 py-2.5 ${btnPrimary}`}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-56px)] bg-[#fafaf9] ${isMobile ? "p-4" : "p-8"}`}>

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
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-5"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={() => setShowCancelConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-[360px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
            <p className="text-[17px] font-semibold text-gray-900 m-0 mb-1.5">Cancel this order?</p>
            <p className="text-[13px] text-gray-400 m-0 mb-6 leading-relaxed">
              You can&apos;t undo this. You&apos;ll need to place a new order.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowCancelConfirm(null)} className={`flex-1 py-3 ${btnGhost}`}>
                Keep order
              </button>
              <button
                onClick={() => cancelOrder(showCancelConfirm)}
                disabled={cancellingId === showCancelConfirm}
                className="flex-1 py-3 rounded-full border-0 bg-red-600 text-white text-[13px] font-semibold cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancellingId === showCancelConfirm ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 m-0 tracking-tight">My orders</h1>
          <p className="text-[13px] text-gray-400 m-0 mt-1">
            {orders.length === 0
              ? "Nothing in progress"
              : `${orders.length} in progress`}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-transparent border-0 p-0 text-[13px] font-medium text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ── Action error banner ──────────────────────────────────────────── */}
      {actionError && (
        <div className="mb-5 bg-red-50 text-red-700 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-[13px] m-0 leading-relaxed">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="bg-transparent border-0 text-red-700 cursor-pointer text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "relative pb-3 bg-transparent border-0 text-[14px] cursor-pointer whitespace-nowrap transition-colors",
                active ? "text-gray-900 font-semibold" : "text-gray-400 font-medium hover:text-gray-700",
              ].join(" ")}
            >
              {tab}
              <span className={`ml-1.5 text-[12px] ${active ? "text-[#2d7a3a]" : "text-gray-300"}`}>
                {tabCount(tab)}
              </span>
              {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#2d7a3a] rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div
        className="grid gap-6 items-start"
        style={{
          gridTemplateColumns: isMobile ? "1fr" : selectedOrder ? "1fr 400px" : "1fr",
        }}
      >
        {/* Orders List */}
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl px-8 py-16 text-center border border-gray-100">
              <p className="text-[16px] font-semibold text-gray-900 m-0 mb-1.5">
                {activeTab === "All" ? "No active orders" : `No ${activeTab.toLowerCase()} orders`}
              </p>
              <p className="text-[13px] text-gray-400 m-0 mb-6">
                Finished orders are in your Transaction History.
              </p>
              <Link
                href="/transactions"
                className={`inline-block no-underline px-6 py-2.5 ${btnPrimary}`}
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
              const { grandTotal } = withVat(order);
              const shown  = order.items.slice(0, MAX_ITEMS_ON_CARD);
              const hidden = order.items.length - shown.length;

              return (
                <div
                  key={order.id}
                  className={[
                    "bg-white rounded-2xl p-5 md:p-6 transition-all duration-200",
                    isSelected
                      ? "border border-[#2d7a3a] shadow-[0_0_0_3px_rgba(45,122,58,0.08)]"
                      : "border border-gray-100 hover:border-gray-200",
                  ].join(" ")}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <p className="text-[15px] font-semibold text-gray-900 m-0 truncate">{order.id}</p>
                    <StatusLabel status={order.status} />
                  </div>
                  <p className="text-[12px] text-gray-400 m-0 mb-5">
                    {order.date} · {paymentLabel(order.paymentMethod)}
                  </p>

                  {/* Progress */}
                  <div className="mb-5">
                    <p className="text-[13px] text-gray-600 m-0 mb-2.5">{order.note}</p>
                    <StepTracker status={order.status} />
                  </div>

                  {/* Items */}
                  <div className="flex flex-col gap-3.5 py-4 border-t border-gray-100">
                    {shown.map((item, i) => <ItemRow key={i} item={item} />)}
                    {hidden > 0 && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="self-start bg-transparent border-0 p-0 text-[12px] font-medium text-[#2d7a3a] cursor-pointer hover:underline"
                      >
                        +{hidden} more item{hidden !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>

                  {/* Driver + cash (only while on the way) */}
                  {order.status === "Out For Delivery" && <DeliveryInfo order={order} />}

                  {gcashLocked && (
                    <p className="text-[12px] text-gray-400 m-0 mb-4">
                      Paid via GCash, so this order can&apos;t be cancelled.
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center gap-3 flex-wrap pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-400 m-0">Total</p>
                      <p className="text-[20px] font-bold text-gray-900 m-0 tabular-nums leading-tight">
                        ₱{money(grandTotal)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => setSelectedOrder(isSelected ? null : order)}
                        className={`px-4 py-2.5 ${btnGhost}`}
                      >
                        {isSelected ? "Hide" : "Details"}
                      </button>
                      {canCancel && (
                        <button
                          onClick={() => setShowCancelConfirm(order.id)}
                          className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-red-600 text-[13px] font-medium cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => canReceive && setShowReceiveConfirm(order)}
                        disabled={!canReceive}
                        className={`px-5 py-2.5 ${canReceive ? btnPrimary : btnDisabled}`}
                      >
                        {order.status === "Received" ? "Received ✓" : "Received"}
                      </button>
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
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-5">
              <div className="flex justify-between items-start mb-5">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-gray-900 m-0 break-all">{selectedOrder.id}</p>
                  <p className="text-[12px] text-gray-400 m-0 mt-1">
                    {selectedOrder.date} · {paymentLabel(selectedOrder.paymentMethod)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close details"
                  className="w-8 h-8 shrink-0 rounded-full bg-transparent border-0 cursor-pointer text-gray-400 text-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-5">
                <div className="mb-3"><StatusLabel status={selectedOrder.status} /></div>
                <StepTracker status={selectedOrder.status} labelled />
              </div>

              {/* Items */}
              <div className="flex flex-col gap-3.5 py-4 border-t border-gray-100 max-h-[260px] overflow-y-auto">
                {selectedOrder.items.map((item, i) => <ItemRow key={i} item={item} />)}
              </div>

              <DeliveryInfo order={selectedOrder} />

              <div className="py-4 border-t border-gray-100">
                <Totals subtotal={subtotal} vat={vat} grandTotal={grandTotal} />
              </div>

              {gcashLocked && (
                <p className="text-[12px] text-gray-400 m-0 mb-4">
                  Paid via GCash, so this order can&apos;t be cancelled.
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => canReceive && setShowReceiveConfirm(selectedOrder)}
                  disabled={!canReceive}
                  className={`w-full py-3 ${canReceive ? btnPrimary : btnDisabled}`}
                >
                  {selectedOrder.status === "Received"
                    ? "Moving to Transaction History…"
                    : canReceive
                      ? "Mark as received"
                      : "Awaiting delivery"}
                </button>
                {canCancel && (
                  <button
                    onClick={() => setShowCancelConfirm(selectedOrder.id)}
                    disabled={cancellingId === selectedOrder.id}
                    className="w-full py-3 rounded-full border border-gray-200 bg-white text-red-600 text-[13px] font-medium cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-60"
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