"use client";
import { useState } from "react";

type OrderStatus =
  | "Pending"
  | "Approved"
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
  Approved: { bg: "#e8f5e9", color: "#2e7d32" },
  "Out for Delivery": { bg: "#e3f2fd", color: "#1565c0" },
  Completed: { bg: "#e8f5e9", color: "#2e7d32" },
  Cancelled: { bg: "#ffebee", color: "#c62828" },
};

const initialOrders: Order[] = [
  {
    id: "Order #1",
    date: "2026-03-02 10:30 AM",
    customer: "Ken Masilungan",
    address: "123 Main St, Quezon City",
    total: 960,
    status: "Pending",
    isOnline: true,
    items: [
      { name: "Coca Cola 1.5L", qty: 12, price: 45 },
      { name: "Pepsi 1.5L", qty: 12, price: 45 },
    ],
  },
  {
    id: "Order #2",
    date: "2026-03-02 11:15 AM",
    customer: "James Renoblas",
    address: "456 Oak Ave, Manila",
    total: 1000,
    status: "Approved",
    isOnline: false,
    items: [
      { name: "Pepsi 1.5L", qty: 10, price: 45 },
      { name: "Royal 1.5L", qty: 10, price: 45 },
    ],
  },
  {
    id: "Order #3",
    date: "2026-03-02 06:45 AM",
    customer: "Maria Santos",
    address: "789 Pine Rd, Makati",
    total: 675,
    status: "Out for Delivery",
    isOnline: true,
    items: [{ name: "Sprite 1.5L", qty: 15, price: 45 }],
  },
  {
    id: "Order #4",
    date: "2026-03-02 09:00 AM",
    customer: "Ana Cruz",
    address: "321 Elm St, Pasig",
    total: 480,
    status: "Completed",
    isOnline: false,
    items: [{ name: "Fanta 1.5L", qty: 12, price: 40 }],
  },
  {
    id: "Order #5",
    date: "2026-03-02 08:30 AM",
    customer: "Pedro Lim",
    address: "654 Maple Blvd, Taguig",
    total: 540,
    status: "Pending",
    isOnline: true,
    items: [{ name: "Mountain Dew", qty: 12, price: 45 }],
  },
];

type FilterTab = "All Orders" | OrderStatus;
const filterTabs: FilterTab[] = [
  "All Orders",
  "Pending",
  "Approved",
  "Out for Delivery",
  "Completed",
];

export default function PendingPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<FilterTab>("All Orders");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateStatus = (id: string, status: OrderStatus) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const filtered =
    activeTab === "All Orders"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  const tabCount = (tab: FilterTab) =>
    tab === "All Orders"
      ? orders.length
      : orders.filter((o) => o.status === tab).length;

  return (
    <div style={{ padding: "28px" }}>
      {/* ── Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a3c2e, #2d7a3a, #1565c0)",
          borderRadius: "16px",
          padding: "24px 32px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#fff",
              marginBottom: "6px",
            }}
          >
            Pending Orders
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            Monitor and update the status of incoming customer orders
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            {
              label: "Pending",
              count: orders.filter((o) => o.status === "Pending").length,
              bg: "rgba(255,193,7,0.2)",
              color: "#f5c842",
            },
            {
              label: "Approved",
              count: orders.filter((o) => o.status === "Approved").length,
              bg: "rgba(76,175,80,0.2)",
              color: "#a5d6a7",
            },
            {
              label: "In Transit",
              count: orders.filter((o) => o.status === "Out for Delivery")
                .length,
              bg: "rgba(33,150,243,0.2)",
              color: "#90caf9",
            },
            {
              label: "Completed",
              count: orders.filter((o) => o.status === "Completed").length,
              bg: "rgba(76,175,80,0.2)",
              color: "#a5d6a7",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: s.bg,
                borderRadius: "12px",
                padding: "10px 16px",
                textAlign: "center",
                minWidth: "70px",
              }}
            >
              <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
                {s.count}
              </p>
              <p style={{ fontSize: "10px", color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              border: activeTab === tab ? "none" : "1px solid #e0e0e0",
              background: activeTab === tab ? "#1a3c2e" : "#fff",
              color: activeTab === tab ? "#fff" : "#555",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab}
            <span
              style={{
                background:
                  activeTab === tab ? "rgba(255,255,255,0.2)" : "#f0f0f0",
                color: activeTab === tab ? "#fff" : "#888",
                padding: "1px 7px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {tabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* ── Orders Grid — 3 columns ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {filtered.map((order) => {
          const s = statusStyle[order.status];
          const isExpanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "0.5px solid #e8e8e8",
                overflow: "hidden",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "0.5px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                    }}
                  >
                    {order.id}
                  </p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>
                    {order.date}
                  </p>
                </div>
                <div
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  {order.isOnline && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "#e8f5e9",
                        color: "#2e7d32",
                      }}
                    >
                      Online
                    </span>
                  )}
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: s.bg,
                      color: s.color,
                    }}
                  >
                    {order.status === "Pending"
                      ? "⏳"
                      : order.status === "Approved"
                        ? "✅"
                        : order.status === "Out for Delivery"
                          ? "🚚"
                          : order.status === "Completed"
                            ? "🎉"
                            : "✕"}{" "}
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: "14px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {[
                    { icon: "👤", label: "Customer", value: order.customer },
                    { icon: "📍", label: "Address", value: order.address },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "14px", marginTop: "1px" }}>
                        {row.icon}
                      </span>
                      <div>
                        <p style={{ fontSize: "10px", color: "#aaa" }}>
                          {row.label}
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#1a1a1a",
                          }}
                        >
                          {row.value}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "14px", marginTop: "1px" }}>
                      💰
                    </span>
                    <div>
                      <p style={{ fontSize: "10px", color: "#aaa" }}>
                        Total Amount
                      </p>
                      <p
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: "#1a3c2e",
                        }}
                      >
                        ₱{order.total.toLocaleString()}.00
                      </p>
                    </div>
                  </div>
                </div>

                {/* View / Hide Items */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1a3c2e",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "0",
                    marginBottom: "10px",
                  }}
                >
                  {isExpanded ? "Hide Items ▲" : "View Items ▼"}
                </button>

                {/* Items Expanded */}
                {isExpanded && (
                  <div
                    style={{
                      background: "#f9f9f9",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "12px",
                    }}
                  >
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: i < order.items.length - 1 ? "6px" : 0,
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#555" }}>
                          {item.name} x {item.qty}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                          }}
                        >
                          ₱{(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {order.status === "Pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => updateStatus(order.id, "Approved")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "10px",
                          border: "none",
                          background: "#2d7a3a",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, "Cancelled")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "10px",
                          border: "none",
                          background: "#ffebee",
                          color: "#c62828",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                  {order.status === "Approved" && (
                    <button
                      onClick={() => updateStatus(order.id, "Out for Delivery")}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#7c3aed",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🚚 Out for Delivery
                    </button>
                  )}
                  {order.status === "Out for Delivery" && (
                    <button
                      onClick={() => updateStatus(order.id, "Completed")}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#1a3c2e",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🎉 Mark as Complete
                    </button>
                  )}
                  {order.status === "Completed" && (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "#e8f5e9",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#2e7d32",
                      }}
                    >
                      ✅ Order Completed
                    </div>
                  )}
                  {order.status === "Cancelled" && (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "#ffebee",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#c62828",
                      }}
                    >
                      ✕ Order Cancelled
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
