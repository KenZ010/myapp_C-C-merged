"use client";
import { useState, useEffect, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";

type OrderStatus =
  | "Waiting"
  | "Processing"
  | "Out For Delivery"
  | "Received"
  | "Return"
  | "Cancelled";

const statusColors: Record<OrderStatus, { bg: string; color: string }> = {
  Waiting: { bg: "#fff9c4", color: "#f57f17" },
  Processing: { bg: "#e3f2fd", color: "#1565c0" },
  "Out For Delivery": { bg: "#fff3e0", color: "#e65100" },
  Received: { bg: "#e8f5e9", color: "#2e7d32" },
  Return: { bg: "#ffebee", color: "#c62828" },
  Cancelled: { bg: "#f5f5f5", color: "#757575" },
};

type OrderItem = { name: string; qty: number; price: number };

type Order = {
  id: string;
  orderId: string;
  date: string;
  status: OrderStatus;
  note: string;
  items: OrderItem[];
};

const statusSteps: OrderStatus[] = [
  "Waiting",
  "Processing",
  "Out For Delivery",
  "Received",
];

const statusNote: Record<OrderStatus, string> = {
  Waiting: "Your order is being verified by the cashier",
  Processing: "Your order is being prepared",
  "Out For Delivery": "Your order is out for delivery",
  Received: "Your order has been delivered",
  Return: "This order has been returned",
  Cancelled: "This order has been cancelled",
};

function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = (o.status ?? o.orderStatus ?? "Waiting") as string;
  const statusMap: Record<string, OrderStatus> = {
    waiting: "Waiting",
    pending: "Waiting",
    processing: "Processing",
    out_for_delivery: "Out For Delivery",
    "out for delivery": "Out For Delivery",
    outfordelivery: "Out For Delivery",
    received: "Received",
    delivered: "Received",
    completed: "Received",   // ← COMPLETED maps to "Received" display
    return: "Return",
    returned: "Return",
    partially_returned: "Return",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    refunded: "Cancelled",
  };
  const status: OrderStatus = statusMap[rawStatus.toLowerCase()] ?? "Waiting";

  const rawItems =
    (o.items ?? o.orderItems ?? o.saleItems ?? []) as Record<string, unknown>[];
  const items: OrderItem[] = rawItems.map((i) => ({
    name: (i.productName ?? i.name ?? i.product ?? "Item") as string,
    qty: Number(i.quantity ?? i.qty ?? 1),
    price: Number(i.price ?? i.unitPrice ?? 0),
  }));

  const id = String(o._id ?? o.id ?? o.saleId ?? o.orderId ?? "");
  const orderId = String(o.orderId ?? o.saleId ?? o._id ?? id);
  const rawDate = (o.createdAt ?? o.date ?? o.orderDate ?? "") as string;
  const date = rawDate
    ? new Date(rawDate).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return { id, orderId, date, status, note: statusNote[status], items };
}

export default function OrdersPage() {
  const { addTransaction } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchOrders = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getCustomerOrders(customerId);
      const raw: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data.orders ?? data.sales ?? []);
      setOrders(
        raw.map(normalizeOrder).filter((o) => o.status !== "Cancelled")
      );
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const markReceived = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "Out For Delivery") return;

    setReceivingId(id);

    // Optimistically update UI to "Received"
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Received" } : o))
    );
    if (selectedOrder?.id === id)
      setSelectedOrder((prev) => (prev ? { ...prev, status: "Received" } : null));

    try {
      // ✅ Send COMPLETED to backend
      await api.updateOrderStatus(id, "COMPLETED");
    } catch {
      // keep optimistic state even if request fails
    } finally {
      setReceivingId(null);
    }

    // Add to transaction history
    const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    addTransaction({
      txId: `TX-${Date.now()}`,
      orderId: order.orderId,
      date: order.date,
      items: order.items,
      total,
      paymentMethod: "COD",
    });

    // Remove from active orders after short delay
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 2000);
  };

  const cancelOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || (order.status !== "Waiting" && order.status !== "Processing")) return;

    setCancellingId(id);
    setShowCancelConfirm(null);

    try {
      await api.updateOrderStatus(id, "CANCELLED");
    } catch {
      // keep optimistic state
    } finally {
      setCancellingId(null);
    }

    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id && o.status !== "Cancelled"));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 1500);
  };

  const getStepIndex = (status: OrderStatus) => statusSteps.indexOf(status);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <p style={{ fontSize: "16px", color: "#2d7a3a", fontWeight: 600 }}>Loading your orders…</p>
      </div>
    );
  }

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

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Cancel this order?</p>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px", lineHeight: 1.6 }}>
              This action cannot be undone. Your order will be cancelled.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowCancelConfirm(null)}
                style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#555", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                Keep Order
              </button>
              <button
                onClick={() => cancelOrder(showCancelConfirm)}
                disabled={cancellingId === showCancelConfirm}
                style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "none", background: "#c62828", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                {cancellingId === showCancelConfirm ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "1fr 420px" : "1fr", gap: "20px", alignItems: "start" }}>

        {/* ── Orders List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {orders.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "16px", padding: "60px", textAlign: "center", border: "0.5px solid #e8e8e8" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>📦</div>
              <p style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>No active orders</p>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "20px" }}>All completed orders are in your Transaction History</p>
              <a href="/transactions" style={{ background: "#2d7a3a", color: "#fff", textDecoration: "none", padding: "11px 28px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                View Transaction History
              </a>
            </div>
          ) : (
            orders.map((order) => {
              const s = statusColors[order.status];
              const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
              const isSelected = selectedOrder?.id === order.id;
              const canCancel = order.status === "Waiting" || order.status === "Processing";
              const canReceive = order.status === "Out For Delivery";
              const isReceiving = receivingId === order.id;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: isSelected ? "2px solid #2d7a3a" : "0.5px solid #e8e8e8",
                    padding: "20px 24px",
                    transition: "border 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div>
                      <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "2px" }}>Order ID</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>{order.orderId}</p>
                    </div>
                    <span style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color, display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                      🕐 {order.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "14px" }}>📅 {order.date}</p>

                  <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{order.note}</p>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", color: "#555" }}>
                          {item.name} <span style={{ color: "#aaa" }}>x{item.qty}</span>
                        </span>
                        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>₱{(item.price * item.qty).toLocaleString()}.00</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: "12px", color: "#aaa" }}>Total Amount:</p>
                      <p style={{ fontSize: "22px", fontWeight: 800, color: "#7c3aed" }}>₱{total.toLocaleString()}.00</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setSelectedOrder(isSelected ? null : order)}
                        style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                      >
                        {isSelected ? "Hide" : "Details"}
                      </button>

                      {canCancel && (
                        <button
                          onClick={() => setShowCancelConfirm(order.id)}
                          style={{ background: "#fff", color: "#c62828", border: "1.5px solid #c62828", borderRadius: "20px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => markReceived(order.id)}
                        disabled={!canReceive || isReceiving}
                        style={{
                          background: order.status === "Received" ? "#2d7a3a" : canReceive ? "#2d7a3a" : "#e0e0e0",
                          color: canReceive || order.status === "Received" ? "#fff" : "#aaa",
                          border: "none",
                          borderRadius: "20px",
                          padding: "10px 18px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: canReceive && !isReceiving ? "pointer" : "not-allowed",
                          opacity: isReceiving ? 0.7 : 1,
                        }}
                      >
                        {isReceiving ? "Updating…" : order.status === "Received" ? "✓ Completed" : "Received"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Order Details Panel ── */}
        {selectedOrder &&
          (() => {
            const s = statusColors[selectedOrder.status];
            const total = selectedOrder.items.reduce((sum, i) => sum + i.price * i.qty, 0);
            const stepIndex = getStepIndex(selectedOrder.status);
            const canCancel = selectedOrder.status === "Waiting" || selectedOrder.status === "Processing";
            const canReceive = selectedOrder.status === "Out For Delivery";
            const isReceiving = receivingId === selectedOrder.id;

            return (
              <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>Order Details</p>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px" }}>✕</button>
                </div>

                <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "2px" }}>Order ID</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>{selectedOrder.orderId}</p>
                  <span style={{ padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Progress Tracker */}
                {selectedOrder.status !== "Return" && selectedOrder.status !== "Cancelled" && (
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
                            <p style={{ fontSize: "9px", color: done ? "#2d7a3a" : "#bbb", fontWeight: done ? 600 : 400, textAlign: "center", lineHeight: 1.3 }}>{step}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "10px" }}>Items Ordered</p>
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{item.name}</p>
                        <p style={{ fontSize: "11px", color: "#aaa" }}>qty: {item.qty}</p>
                      </div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2d7a3a" }}>₱{(item.price * item.qty).toLocaleString()}.00</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid #f0f0f0", marginBottom: "16px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>Total Amount</span>
                  <span style={{ fontSize: "22px", fontWeight: 800, color: "#7c3aed" }}>₱{total.toLocaleString()}.00</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    onClick={() => markReceived(selectedOrder.id)}
                    disabled={(!canReceive && selectedOrder.status !== "Received") || isReceiving}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "20px", border: "none",
                      background: selectedOrder.status === "Received" ? "#bbb" : canReceive ? "#2d7a3a" : "#e0e0e0",
                      color: canReceive || selectedOrder.status === "Received" ? "#fff" : "#aaa",
                      fontSize: "14px", fontWeight: 700,
                      cursor: canReceive && !isReceiving ? "pointer" : "not-allowed",
                      opacity: isReceiving ? 0.7 : 1,
                    }}
                  >
                    {isReceiving
                      ? "Updating to Completed…"
                      : selectedOrder.status === "Received"
                      ? "✓ Moving to Transaction History..."
                      : canReceive
                      ? "Mark as Received"
                      : "Awaiting Delivery"}
                  </button>

                  {canCancel && (
                    <button
                      onClick={() => setShowCancelConfirm(selectedOrder.id)}
                      disabled={cancellingId === selectedOrder.id}
                      style={{ width: "100%", padding: "12px", borderRadius: "20px", border: "1.5px solid #c62828", background: "#fff", color: "#c62828", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                    >
                      {cancellingId === selectedOrder.id ? "Cancelling…" : "🚫 Cancel Order"}
                    </button>
                  )}

                  <button style={{ width: "100%", padding: "12px", borderRadius: "20px", border: "1.5px solid #e8e8e8", background: "#fff", color: "#555", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                    🔄 Reorder
                  </button>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}