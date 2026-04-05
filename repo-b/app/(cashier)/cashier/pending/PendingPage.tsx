"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

type OrderStatus =
  | "Pending"
  | "Processing"
  | "Out for Delivery"
  | "Completed"
  | "Cancelled";

type OrderItem = { name: string; qty: number; price: number };

type Order = {
  id: string;
  date: string;
  customer: string;
  address: string;
  total: number;
  status: OrderStatus;
  isOnline: boolean;
  items: OrderItem[];
};

const statusStyle: Record<OrderStatus, { bg: string; color: string }> = {
  Pending: { bg: "#fff9c4", color: "#f57f17" },
  Processing: { bg: "#e3f2fd", color: "#1565c0" },
  "Out for Delivery": { bg: "#fff3e0", color: "#e65100" },
  Completed: { bg: "#e8f5e9", color: "#2e7d32" },
  Cancelled: { bg: "#ffebee", color: "#c62828" },
};

const statusIcon: Record<OrderStatus, string> = {
  Pending: "⏳",
  Processing: "⚙️",
  "Out for Delivery": "🚚",
  Completed: "🎉",
  Cancelled: "✕",
};

function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const statusMap: Record<string, OrderStatus> = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    OUT_FOR_DELIVERY: "Out for Delivery",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
  };
  const status: OrderStatus = statusMap[rawStatus] ?? "Pending";

  const customer = o.customer as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];

  return {
    id: String(o.id ?? ""),
    date: o.createdAt
      ? new Date(String(o.createdAt)).toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—",
    customer: customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    address: customer ? String((customer.address as string) ?? "—") : "—",
    total: Number(o.totalAmount ?? 0),
    status,
    isOnline: !!customer,
    items: rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        name: product ? String(product.productName ?? "Item") : "Item",
        qty: Number(l.quantity ?? 0),
        price: Number(l.price ?? 0),
      };
    }),
  };
}

type FilterTab = "All Orders" | OrderStatus;
const filterTabs: FilterTab[] = [
  "All Orders",
  "Pending",
  "Processing",
  "Out for Delivery",
];

// Map UI status → backend enum value
const backendStatus: Record<OrderStatus, string> = {
  Pending: "PENDING",
  Processing: "PROCESSING",
  "Out for Delivery": "OUT_FOR_DELIVERY",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
};

export default function PendingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("All Orders");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getActiveOrders();
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      setOrders(raw.map(normalizeOrder));
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await api.updateOrderStatus(id, backendStatus[status]);
      // If completed/cancelled, remove from active list after delay
      if (status === "Completed" || status === "Cancelled") {
        setTimeout(() => {
          setOrders((prev) => prev.filter((o) => o.id !== id));
        }, 2000);
      }
    } catch {
      // keep optimistic state
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered =
    activeTab === "All Orders"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  const tabCount = (tab: FilterTab) =>
    tab === "All Orders"
      ? orders.length
      : orders.filter((o) => o.status === tab).length;

  if (loading) {
    return (
      <div style={{ padding: "28px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)" }}>
        <p style={{ fontSize: "16px", color: "#2d7a3a", fontWeight: 600 }}>Loading orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)", gap: "12px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#c62828" }}>⚠️ {error}</p>
        <button onClick={fetchOrders} style={{ background: "#2d7a3a", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px" }}>

      {/* ── Banner ── */}
      <div style={{ background: "linear-gradient(135deg, #1a3c2e, #2d7a3a, #1565c0)", borderRadius: "16px", padding: "24px 32px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>Active Orders</h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            Monitor and update the status of incoming customer orders
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {[
            { label: "Pending", status: "Pending" as OrderStatus, bg: "rgba(255,193,7,0.2)", color: "#f5c842" },
            { label: "Processing", status: "Processing" as OrderStatus, bg: "rgba(33,150,243,0.2)", color: "#90caf9" },
            { label: "In Transit", status: "Out for Delivery" as OrderStatus, bg: "rgba(255,152,0,0.2)", color: "#ffcc80" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "10px 16px", textAlign: "center", minWidth: "70px" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
                {orders.filter((o) => o.status === s.status).length}
              </p>
              <p style={{ fontSize: "10px", color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {filterTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: activeTab === tab ? 600 : 400, cursor: "pointer", border: activeTab === tab ? "none" : "1px solid #e0e0e0", background: activeTab === tab ? "#1a3c2e" : "#fff", color: activeTab === tab ? "#fff" : "#555", display: "flex", alignItems: "center", gap: "6px" }}>
            {tab}
            <span style={{ background: activeTab === tab ? "rgba(255,255,255,0.2)" : "#f0f0f0", color: activeTab === tab ? "#fff" : "#888", padding: "1px 7px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
              {tabCount(tab)}
            </span>
          </button>
        ))}
        <button onClick={fetchOrders} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid #e0e0e0", background: "#fff", color: "#555", display: "flex", alignItems: "center", gap: "6px" }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "60px", textAlign: "center", border: "0.5px solid #e8e8e8" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>No active orders</p>
          <p style={{ fontSize: "13px", color: "#aaa" }}>
            {activeTab === "All Orders" ? "All orders are completed or cancelled." : `No orders with status "${activeTab}".`}
          </p>
        </div>
      )}

      {/* ── Orders Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {filtered.map((order) => {
          const s = statusStyle[order.status];
          const isExpanded = expandedId === order.id;
          const isUpdating = updatingId === order.id;

          return (
            <div key={order.id} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", overflow: "hidden" }}>

              {/* Card Header */}
              <div style={{ padding: "14px 18px", borderBottom: "0.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{order.id}</p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>{order.date}</p>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {order.isOnline && (
                    <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#e8f5e9", color: "#2e7d32" }}>
                      Online
                    </span>
                  )}
                  <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: s.bg, color: s.color }}>
                    {statusIcon[order.status]} {order.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {[
                    { icon: "👤", label: "Customer", value: order.customer },
                    { icon: "📍", label: "Address", value: order.address },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontSize: "14px", marginTop: "1px" }}>{row.icon}</span>
                      <div>
                        <p style={{ fontSize: "10px", color: "#aaa" }}>{row.label}</p>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{row.value}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", marginTop: "1px" }}>💰</span>
                    <div>
                      <p style={{ fontSize: "10px", color: "#aaa" }}>Total Amount</p>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a3c2e" }}>₱{order.total.toLocaleString()}.00</p>
                    </div>
                  </div>
                </div>

                {/* View Items Toggle */}
                <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ background: "none", border: "none", color: "#1a3c2e", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "0", marginBottom: "10px" }}>
                  {isExpanded ? "Hide Items ▲" : "View Items ▼"}
                </button>

                {isExpanded && (
                  <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < order.items.length - 1 ? "6px" : 0 }}>
                        <span style={{ fontSize: "13px", color: "#555" }}>{item.name} x {item.qty}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>₱{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {order.status === "Pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => updateStatus(order.id, "Processing")} disabled={isUpdating}
                        style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#2d7a3a", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: isUpdating ? 0.6 : 1 }}>
                        ✅ Approve
                      </button>
                      <button onClick={() => updateStatus(order.id, "Cancelled")} disabled={isUpdating}
                        style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#ffebee", color: "#c62828", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: isUpdating ? 0.6 : 1 }}>
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                  {order.status === "Processing" && (
                    <button onClick={() => updateStatus(order.id, "Out for Delivery")} disabled={isUpdating}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: isUpdating ? 0.6 : 1 }}>
                      🚚 Out for Delivery
                    </button>
                  )}
                  {order.status === "Out for Delivery" && (
                    <div style={{ padding: "10px", borderRadius: "10px", background: "#fff3e0", textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#e65100" }}>
                      🚚 Awaiting customer confirmation
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
