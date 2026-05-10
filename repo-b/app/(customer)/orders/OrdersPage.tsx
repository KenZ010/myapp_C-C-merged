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

type OrderItem = { name: string; qty: number; price: number };

type Order = {
  id:     string;
  date:   string;
  status: OrderStatus;
  note:   string;
  total:  number;
  items:  OrderItem[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const statusBadge: Record<OrderStatus, string> = {
  Waiting:           "bg-yellow-100 text-yellow-800",
  Processing:        "bg-blue-100 text-blue-800",
  "Out For Delivery":"bg-orange-100 text-orange-800",
  Received:          "bg-green-100 text-green-800",
  Cancelled:         "bg-gray-100 text-gray-500",
};

const statusNote: Record<OrderStatus, string> = {
  Waiting:           "Your order is being verified by the cashier",
  Processing:        "Your order is being prepared",
  "Out For Delivery":"Your order is out for delivery",
  Received:          "Your order has been delivered",
  Cancelled:         "This order has been cancelled",
};

const statusIcon: Record<OrderStatus, string> = {
  Waiting:           "⏳",
  Processing:        "⚙️",
  "Out For Delivery":"🚚",
  Received:          "✅",
  Cancelled:         "✕",
};

const statusSteps: OrderStatus[] = ["Waiting", "Processing", "Out For Delivery", "Received"];

const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING:            "Waiting",
  PROCESSING:         "Processing",
  OUT_FOR_DELIVERY:   "Out For Delivery",
  COMPLETED:          "Received",
  CANCELLED:          "Cancelled",
  CANCELED:           "Cancelled",
  REFUNDED:           "Cancelled",
  PARTIALLY_RETURNED: "Cancelled",
};

const ACTIVE_STATUSES: OrderStatus[] = ["Waiting", "Processing", "Out For Delivery"];

type TabFilter = "All" | OrderStatus;
const TABS: TabFilter[] = ["All", "Waiting", "Processing", "Out For Delivery"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const status: OrderStatus = STATUS_MAP[rawStatus] ?? "Waiting";

  const rawLines = (o.orderLines ?? o.items ?? []) as Record<string, unknown>[];
  const items: OrderItem[] = rawLines.map((l) => {
    const product = l.product as Record<string, unknown> | null;
    return {
      name:  product ? String(product.productName ?? "Item") : String(l.name ?? "Item"),
      qty:   Number(l.quantity ?? l.qty ?? 1),
      price: Number(l.price ?? 0),
    };
  });

  const total   = Number(o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0));
  const rawDate = String(o.createdAt ?? o.date ?? "");
  const date    = rawDate
    ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return { id: String(o.id ?? ""), date, status, note: statusNote[status], total, items };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [isMobile,          setIsMobile]          = useState(false);
  const [orders,            setOrders]            = useState<Order[]>([]);
  const [selectedOrder,     setSelectedOrder]     = useState<Order | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [activeTab,         setActiveTab]         = useState<TabFilter>("All");
  const [cancellingId,      setCancellingId]      = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [toast,             setToast]             = useState<string | null>(null); // ← added

  const socket = useSocket(); // ← moved to top level

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

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

  // ── Real-time socket notifications ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Order completed (customer marked as received)
    socket.on("order:completed", ({ message }: { orderId: string; message: string }) => {
      showToast(`✅ ${message}`);
      fetchOrders();
    });

    // All other status changes (processing, out for delivery, cancelled)
    socket.on("order:status", ({ message }: { orderId: string; status: string; message: string }) => {
      showToast(message);
      fetchOrders();
    });

    return () => {
      socket.off("order:completed");
      socket.off("order:status");
    };
  }, [socket, fetchOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const markReceived = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "Out For Delivery") return;
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Received" } : o));
    if (selectedOrder?.id === id)
      setSelectedOrder((p) => p ? { ...p, status: "Received" } : null);
    try { await api.updateOrderStatus(id, "COMPLETED"); } catch { /* optimistic */ }
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 1800);
  };

  const cancelOrder = async (id: string) => {
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
      <div className="min-h-[calc(100vh-56px)] bg-[#f5f5f5] p-7 flex flex-col gap-3.5">
        {[190, 190, 170].map((h, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#f5f5f5] flex flex-col items-center justify-center gap-3">
        <p className="text-base font-bold text-red-700">⚠️ {error}</p>
        <button
          onClick={fetchOrders}
          className="bg-[#2d7a3a] text-white border-0 rounded-full px-6 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-[#245f2d] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-56px)] bg-[#f5f5f5] ${isMobile ? "p-4" : "p-7"}`}>

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 9999,
          background: "#1a1a2e", color: "#fff", padding: "14px 20px",
          borderRadius: "12px", fontSize: "14px", fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: "10px",
          animation: "slideIn 0.3s ease",
        }}>
          {toast}
          <button onClick={() => setToast(null)}
            style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "16px" }}>
            ✕
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>

      {/* ── Cancel Confirmation Modal ────────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-2xl p-7 max-w-[360px] w-[90%] text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-[17px] font-bold text-gray-900 mb-2">Cancel this order?</p>
            <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
              This action cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-3 rounded-full border border-gray-200 bg-white text-gray-500 text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => cancelOrder(showCancelConfirm)}
                disabled={cancellingId === showCancelConfirm}
                className="flex-1 py-3 rounded-full border-0 bg-red-700 text-white text-sm font-bold cursor-pointer hover:bg-red-800 transition-colors disabled:opacity-60"
              >
                {cancellingId === showCancelConfirm ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Filter ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "flex items-center gap-1.5 px-[18px] py-2 rounded-full text-[13px] cursor-pointer transition-all duration-200",
              activeTab === tab
                ? "bg-[#2d7a3a] text-white font-semibold border-0"
                : "bg-white text-gray-500 font-normal border border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            {tab !== "All" && statusIcon[tab as OrderStatus]}
            {tab}
            <span
              className={[
                "px-1.5 py-px rounded-[10px] text-[11px] font-bold",
                activeTab === tab ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400",
              ].join(" ")}
            >
              {tabCount(tab)}
            </span>
          </button>
        ))}

        <button
          onClick={fetchOrders}
          className="ml-auto px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div
        className="grid gap-5 items-start"
        style={{
          gridTemplateColumns: isMobile ? "1fr" : selectedOrder ? "1fr 420px" : "1fr",
        }}
      >
        {/* Orders List */}
        <div className="flex flex-col gap-3.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-[60px] text-center border border-gray-100">
              <div className="text-[56px] mb-4">📦</div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === "All" ? "No active orders" : `No ${activeTab} orders`}
              </p>
              <p className="text-[13px] text-gray-400 mb-5">
                Completed orders are in your Transaction History
              </p>
              <Link
                href="/transactions"
                className="bg-[#2d7a3a] text-white no-underline px-7 py-2.5 rounded-full text-[13px] font-semibold hover:bg-[#245f2d] transition-colors"
              >
                View Transaction History
              </Link>
            </div>
          ) : (
            filtered.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const canCancel  = order.status === "Waiting" || order.status === "Processing";
              const canReceive = order.status === "Out For Delivery";

              return (
                <div
                  key={order.id}
                  className={[
                    "bg-white rounded-2xl px-6 py-5 transition-all duration-200",
                    isSelected ? "border-2 border-[#2d7a3a]" : "border border-gray-100",
                  ].join(" ")}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-[11px] text-gray-400 m-0">Order ID</p>
                      <p className="text-sm font-bold text-gray-900 m-0">{order.id}</p>
                    </div>
                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${statusBadge[order.status]}`}>
                      {statusIcon[order.status]} {order.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-3.5">📅 {order.date}</p>

                  {/* Items */}
                  <div className="bg-gray-50 rounded-xl px-3.5 py-3 mb-3.5">
                    <p className="text-xs text-gray-400 mb-2">{order.note}</p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between mb-1">
                        <span className="text-[13px] text-gray-600">
                          {item.name} <span className="text-gray-300">x{item.qty}</span>
                        </span>
                        <span className="text-[13px] text-gray-900">
                          ₱{(item.price * item.qty).toLocaleString()}.00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400 m-0">Total Amount:</p>
                      <p className="text-[22px] font-extrabold text-violet-600 m-0">
                        ₱{order.total.toLocaleString()}.00
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => setSelectedOrder(isSelected ? null : order)}
                        className="bg-violet-600 text-white border-0 rounded-full px-[18px] py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-violet-700 transition-colors"
                      >
                        {isSelected ? "Hide" : "Details"}
                      </button>
                      {canCancel && (
                        <button
                          onClick={() => setShowCancelConfirm(order.id)}
                          className="bg-white text-red-700 border border-red-700 rounded-full px-[18px] py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => markReceived(order.id)}
                        disabled={!canReceive}
                        className={[
                          "border-0 rounded-full px-[18px] py-2.5 text-[13px] font-semibold transition-colors",
                          canReceive
                            ? "bg-[#2d7a3a] text-white cursor-pointer hover:bg-[#245f2d]"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {order.status === "Received" ? "✓ Received" : "Received"}
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
          const stepIndex = selectedOrder.status !== "Cancelled"
            ? statusSteps.indexOf(selectedOrder.status)
            : -1;
          const canCancel  = selectedOrder.status === "Waiting" || selectedOrder.status === "Processing";
          const canReceive = selectedOrder.status === "Out For Delivery";

          return (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-5">
              {/* Panel header */}
              <div className="flex justify-between items-center mb-5">
                <p className="text-base font-bold text-gray-900 m-0">Order Details</p>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 border-0 cursor-pointer text-sm flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Order ID + status */}
              <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-4">
                <p className="text-[11px] text-gray-400 m-0">Order ID</p>
                <p className="text-sm font-bold text-gray-900 mb-2">{selectedOrder.id}</p>
                <span className={`px-3.5 py-1 rounded-full text-xs font-semibold ${statusBadge[selectedOrder.status]}`}>
                  {statusIcon[selectedOrder.status]} {selectedOrder.status}
                </span>
              </div>

              {/* Progress tracker */}
              {selectedOrder.status !== "Cancelled" && (
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-3">Order Progress</p>
                  <div className="relative flex justify-between items-start">
                    {/* Track */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 h-[3px] bg-gray-200 z-0">
                      <div
                        className="h-full bg-[#2d7a3a] transition-all duration-500"
                        style={{
                          width: stepIndex >= 0
                            ? `${(stepIndex / (statusSteps.length - 1)) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    {statusSteps.map((step, i) => {
                      const done = i <= stepIndex;
                      return (
                        <div key={step} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                          <div
                            className={[
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs",
                              done ? "bg-[#2d7a3a]" : "bg-gray-200",
                            ].join(" ")}
                          >
                            {done
                              ? <span className="text-white">✓</span>
                              : <span className="text-gray-300">○</span>
                            }
                          </div>
                          <p
                            className={[
                              "text-[9px] text-center leading-tight m-0",
                              done ? "text-[#2d7a3a] font-semibold" : "text-gray-300 font-normal",
                            ].join(" ")}
                          >
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-gray-900 mb-2.5">Items Ordered</p>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2.5 border-b border-gray-50">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 m-0">{item.name}</p>
                      <p className="text-[11px] text-gray-400 m-0">qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2d7a3a] m-0">
                      ₱{(item.price * item.qty).toLocaleString()}.00
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-3.5 border-t border-gray-100 mb-4">
                <span className="text-[15px] font-bold text-gray-900">Total Amount</span>
                <span className="text-[22px] font-extrabold text-violet-600">
                  ₱{selectedOrder.total.toLocaleString()}.00
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => markReceived(selectedOrder.id)}
                  disabled={!canReceive}
                  className={[
                    "w-full py-3 rounded-full border-0 text-sm font-bold transition-colors",
                    selectedOrder.status === "Received"
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : canReceive
                        ? "bg-[#2d7a3a] text-white cursor-pointer hover:bg-[#245f2d]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed",
                  ].join(" ")}
                >
                  {selectedOrder.status === "Received"
                    ? "✓ Moving to Transaction History..."
                    : canReceive
                      ? "Mark as Received"
                      : "Awaiting Delivery"}
                </button>
                {canCancel && (
                  <button
                    onClick={() => setShowCancelConfirm(selectedOrder.id)}
                    disabled={cancellingId === selectedOrder.id}
                    className="w-full py-3 rounded-full border border-red-700 bg-white text-red-700 text-sm font-bold cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {cancellingId === selectedOrder.id ? "Cancelling…" : "🚫 Cancel Order"}
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