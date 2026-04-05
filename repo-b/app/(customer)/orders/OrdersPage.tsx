"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

type OrderStatus =
  | "Waiting"
  | "Processing"
  | "Out For Delivery"
  | "Received"
  | "Cancelled";

const statusColors: Record<OrderStatus, { bg: string; color: string }> = {
  Waiting:           { bg: "#fff9c4", color: "#f57f17" },
  Processing:        { bg: "#e3f2fd", color: "#1565c0" },
  "Out For Delivery":{ bg: "#fff3e0", color: "#e65100" },
  Received:          { bg: "#e8f5e9", color: "#2e7d32" },
  Cancelled:         { bg: "#f5f5f5", color: "#757575" },
};

const statusNote: Record<OrderStatus, string> = {
  Waiting:           "Your order is being verified by the cashier",
  Processing:        "Your order is being prepared",
  "Out For Delivery":"Your order is out for delivery",
  Received:          "Your order has been delivered",
  Cancelled:         "This order has been cancelled",
};

type OrderItem = { name: string; qty: number; price: number };

type Order = {
  id:     string;
  date:   string;
  status: OrderStatus;
  note:   string;
  total:  number;
  items:  OrderItem[];
};

const statusSteps: OrderStatus[] = [
  "Waiting",
  "Processing",
  "Out For Delivery",
  "Received",
];

// Maps backend SaleStatus enum → UI OrderStatus
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

function normalizeOrder(o: Record<string, unknown>): Order {
  // status comes as e.g. "PENDING", "OUT_FOR_DELIVERY"
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const status: OrderStatus = STATUS_MAP[rawStatus] ?? "Waiting";

  // Backend returns orderLines[].{ product: { productName }, quantity, price }
  const rawLines = (o.orderLines ?? o.items ?? []) as Record<string, unknown>[];
  const items: OrderItem[] = rawLines.map((l) => {
    const product = l.product as Record<string, unknown> | null;
    return {
      name:  product ? String(product.productName ?? "Item") : String(l.name ?? "Item"),
      qty:   Number(l.quantity ?? l.qty ?? 1),
      price: Number(l.price ?? 0),
    };
  });

  const total = Number(o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0));

  const rawDate = String(o.createdAt ?? o.date ?? "");
  const date = rawDate
    ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return {
    id:     String(o.id ?? ""),
    date,
    status,
    note:   statusNote[status],
    total,
    items,
  };
}

export default function OrdersPage() {
  const [orders,           setOrders]           = useState<Order[]>([]);
  const [selectedOrder,    setSelectedOrder]    = useState<Order | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [cancellingId,     setCancellingId]     = useState<string | null>(null);
  const [showCancelConfirm,setShowCancelConfirm]= useState<string | null>(null);

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchOrders = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setError("Not logged in."); setLoading(false); return; }
    try {
      setLoading(true);
      const data = await api.getCustomerOrders(customerId);

      if (data?.message) { setError(data.message); setOrders([]); return; }

      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.orders ?? data.sales ?? []);

      // Only show active orders (Waiting, Processing, Out For Delivery)
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

  const markReceived = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "Out For Delivery") return;

    // Optimistic
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Received" } : o));
    if (selectedOrder?.id === id) setSelectedOrder((p) => p ? { ...p, status: "Received" } : null);

    try { await api.updateOrderStatus(id, "COMPLETED"); } catch { /* keep optimistic */ }

    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 1800);
  };

  const cancelOrder = async (id: string) => {
    setCancellingId(id);
    setShowCancelConfirm(null);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Cancelled" } : o));
    try { await api.updateOrderStatus(id, "CANCELLED"); } catch { /* keep optimistic */ }
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
      setCancellingId(null);
    }, 1500);
  };

  const getStepIndex = (status: OrderStatus) => statusSteps.indexOf(status);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "700px", padding: "28px" }}>
          {[180, 180, 160].map((h, i) => (
            <div key={i} style={{ height: `${h}px`, borderRadius: "16px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", background: "#f5f5f5" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#c62828" }}>⚠️ {error}</p>
        <button onClick={fetchOrders} style={{ background: "#2d7a3a", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", minHeight: "calc(100vh - 56px)", background: "#f5f5f5" }}>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Cancel this order?</p>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px", lineHeight: 1.6 }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowCancelConfirm(null)}
                style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#555", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Keep Order
              </button>
              <button onClick={() => cancelOrder(showCancelConfirm)} disabled={cancellingId === showCancelConfirm}
                style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "none", background: "#c62828", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                {cancellingId === showCancelConfirm ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "1fr 420px" : "1fr", gap: "20px", alignItems: "start" }}>

        {/* Orders List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {orders.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "16px", padding: "60px", textAlign: "center", border: "0.5px solid #e8e8e8" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>📦</div>
              <p style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>No active orders</p>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "20px" }}>Completed orders are in your Transaction History</p>
              <a href="/transactions" style={{ background: "#2d7a3a", color: "#fff", textDecoration: "none", padding: "11px 28px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                View Transaction History
              </a>
            </div>
          ) : (
            orders.map((order) => {
              const s          = statusColors[order.status];
              const isSelected = selectedOrder?.id === order.id;
              const canCancel  = order.status === "Waiting" || order.status === "Processing";
              const canReceive = order.status === "Out For Delivery";

              return (
                <div key={order.id} style={{ background: "#fff", borderRadius: "16px", border: isSelected ? "2px solid #2d7a3a" : "0.5px solid #e8e8e8", padding: "20px 24px", transition: "border 0.2s" }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div>
                      <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>Order ID</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{order.id}</p>
                    </div>
                    <span style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>
                      🕐 {order.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "14px" }}>📅 {order.date}</p>

                  <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{order.note}</p>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", color: "#555" }}>{item.name} <span style={{ color: "#aaa" }}>x{item.qty}</span></span>
                        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>₱{(item.price * item.qty).toLocaleString()}.00</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>Total Amount:</p>
                      <p style={{ fontSize: "22px", fontWeight: 800, color: "#7c3aed", margin: 0 }}>₱{order.total.toLocaleString()}.00</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => setSelectedOrder(isSelected ? null : order)}
                        style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        {isSelected ? "Hide" : "Details"}
                      </button>
                      {canCancel && (
                        <button onClick={() => setShowCancelConfirm(order.id)}
                          style={{ background: "#fff", color: "#c62828", border: "1.5px solid #c62828", borderRadius: "20px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          Cancel
                        </button>
                      )}
                      <button onClick={() => markReceived(order.id)} disabled={!canReceive}
                        style={{ background: canReceive ? "#2d7a3a" : "#e0e0e0", color: canReceive ? "#fff" : "#aaa", border: "none", borderRadius: "20px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: canReceive ? "pointer" : "not-allowed" }}>
                        {order.status === "Received" ? "✓ Received" : "Received"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Details Panel */}
        {selectedOrder && (() => {
          const s          = statusColors[selectedOrder.status];
          const stepIndex  = getStepIndex(selectedOrder.status);
          const canCancel  = selectedOrder.status === "Waiting" || selectedOrder.status === "Processing";
          const canReceive = selectedOrder.status === "Out For Delivery";

          return (
            <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Order Details</p>
                <button onClick={() => setSelectedOrder(null)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>

              <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>Order ID</p>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>{selectedOrder.id}</p>
                <span style={{ padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Progress Tracker */}
              {selectedOrder.status !== "Cancelled" && (
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "12px" }}>Order Progress</p>
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ position: "absolute", top: "14px", left: "14px", right: "14px", height: "3px", background: "#e8e8e8", zIndex: 0 }}>
                      <div style={{ height: "100%", background: "#2d7a3a", width: stepIndex >= 0 ? `${(stepIndex / (statusSteps.length - 1)) * 100}%` : "0%", transition: "width 0.5s" }} />
                    </div>
                    {statusSteps.map((step, i) => {
                      const done = i <= stepIndex;
                      return (
                        <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 1, flex: 1 }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: done ? "#2d7a3a" : "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                            {done ? <span style={{ color: "#fff" }}>✓</span> : <span style={{ color: "#bbb" }}>○</span>}
                          </div>
                          <p style={{ fontSize: "9px", color: done ? "#2d7a3a" : "#bbb", fontWeight: done ? 600 : 400, textAlign: "center", lineHeight: 1.3, margin: 0 }}>{step}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "10px" }}>Items Ordered</p>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a", margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>qty: {item.qty}</p>
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#2d7a3a", margin: 0 }}>₱{(item.price * item.qty).toLocaleString()}.00</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid #f0f0f0", marginBottom: "16px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700 }}>Total Amount</span>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#7c3aed" }}>₱{selectedOrder.total.toLocaleString()}.00</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => markReceived(selectedOrder.id)} disabled={!canReceive}
                  style={{ width: "100%", padding: "12px", borderRadius: "20px", border: "none", background: selectedOrder.status === "Received" ? "#bbb" : canReceive ? "#2d7a3a" : "#e0e0e0", color: canReceive || selectedOrder.status === "Received" ? "#fff" : "#aaa", fontSize: "14px", fontWeight: 700, cursor: canReceive ? "pointer" : "not-allowed" }}>
                  {selectedOrder.status === "Received" ? "✓ Moving to Transaction History..." : canReceive ? "Mark as Received" : "Awaiting Delivery"}
                </button>
                {canCancel && (
                  <button onClick={() => setShowCancelConfirm(selectedOrder.id)} disabled={cancellingId === selectedOrder.id}
                    style={{ width: "100%", padding: "12px", borderRadius: "20px", border: "1.5px solid #c62828", background: "#fff", color: "#c62828", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
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
