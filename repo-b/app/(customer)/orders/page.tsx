"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

// Counter outside component — never causes re-render issues
let txCounter = 1000;

type OrderStatus =
  | "Waiting"
  | "Processing"
  | "Out For Delivery"
  | "Received"
  | "Return";

const statusColors: Record<OrderStatus, { bg: string; color: string }> = {
  Waiting: { bg: "#fff9c4", color: "#f57f17" },
  Processing: { bg: "#e3f2fd", color: "#1565c0" },
  "Out For Delivery": { bg: "#fff3e0", color: "#e65100" },
  Received: { bg: "#e8f5e9", color: "#2e7d32" },
  Return: { bg: "#ffebee", color: "#c62828" },
};

type Order = {
  id: string;
  orderId: string;
  date: string;
  status: OrderStatus;
  note: string;
  items: { name: string; qty: number; price: number }[];
};

const sampleOrders: Order[] = [
  {
    id: "1",
    orderId: "ORD-1769542089081",
    date: "March 15, 2026 • 10:30 AM",
    status: "Out For Delivery",
    note: "Your order is out for delivery",
    items: [{ name: "Cola Regular", qty: 1, price: 480 }],
  },
  {
    id: "2",
    orderId: "ORD-1769542089082",
    date: "March 15, 2026 • 09:15 AM",
    status: "Waiting",
    note: "Your order is being verified by the cashier",
    items: [
      { name: "Cola Regular", qty: 1, price: 480 },
      { name: "Orange Soda", qty: 2, price: 450 },
    ],
  },
];

const statusSteps: OrderStatus[] = [
  "Waiting",
  "Processing",
  "Out For Delivery",
  "Received",
];

export default function OrdersPage() {
  const { addTransaction } = useCart();
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const markReceived = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status === "Received") return;

    // Update status to Received
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "Received" as OrderStatus } : o,
      ),
    );
    if (selectedOrder?.id === id)
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: "Received" } : null,
      );

    // Save to Transaction History
    const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const txId = `TX-${txCounter++}`;
    addTransaction({
      txId,
      orderId: order.orderId,
      date: order.date,
      items: order.items,
      total,
      paymentMethod: "COD",
    });

    // Remove from orders list after 2 seconds
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }, 2000);
  };

  const getStepIndex = (status: OrderStatus) => statusSteps.indexOf(status);

  return (
    <div
      style={{
        padding: "28px",
        minHeight: "calc(100vh - 56px)",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedOrder ? "1fr 420px" : "1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ── Orders List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {orders.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "60px",
                textAlign: "center",
                border: "0.5px solid #e8e8e8",
              }}
            >
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>📦</div>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "8px",
                }}
              >
                No active orders
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#aaa",
                  marginBottom: "20px",
                }}
              >
                All completed orders are in your Transaction History
              </p>
              <a
                href="/transactions"
                style={{
                  background: "#2d7a3a",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 28px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                View Transaction History
              </a>
            </div>
          ) : (
            orders.map((order) => {
              const s = statusColors[order.status];
              const total = order.items.reduce(
                (sum, i) => sum + i.price * i.qty,
                0,
              );
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: isSelected
                      ? "2px solid #2d7a3a"
                      : "0.5px solid #e8e8e8",
                    padding: "20px 24px",
                    transition: "border 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#aaa",
                          marginBottom: "2px",
                        }}
                      >
                        Order ID
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#1a1a1a",
                        }}
                      >
                        {order.orderId}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "5px 14px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: s.bg,
                        color: s.color,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        flexShrink: 0,
                      }}
                    >
                      🕐 {order.status}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      marginBottom: "14px",
                    }}
                  >
                    📅 {order.date}
                  </p>

                  <div
                    style={{
                      background: "#f9f9f9",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginBottom: "8px",
                      }}
                    >
                      {order.note}
                    </p>
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#555" }}>
                          {item.name}{" "}
                          <span style={{ color: "#aaa" }}>x{item.qty}</span>
                        </span>
                        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
                          ₱{(item.price * item.qty).toLocaleString()}.00
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "12px", color: "#aaa" }}>
                        Total Amount:
                      </p>
                      <p
                        style={{
                          fontSize: "22px",
                          fontWeight: 800,
                          color: "#7c3aed",
                        }}
                      >
                        ₱{total.toLocaleString()}.00
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() =>
                          setSelectedOrder(isSelected ? null : order)
                        }
                        style={{
                          background: "#7c3aed",
                          color: "#fff",
                          border: "none",
                          borderRadius: "20px",
                          padding: "10px 22px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isSelected ? "Hide Details" : "View Details"}
                      </button>
                      <button
                        onClick={() => markReceived(order.id)}
                        disabled={
                          order.status === "Received" ||
                          order.status === "Return"
                        }
                        style={{
                          background:
                            order.status === "Received"
                              ? "#2d7a3a"
                              : order.status === "Return"
                                ? "#ffebee"
                                : "#2d7a3a",
                          color: order.status === "Return" ? "#c62828" : "#fff",
                          border: "none",
                          borderRadius: "20px",
                          padding: "10px 22px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor:
                            order.status === "Received" ||
                            order.status === "Return"
                              ? "not-allowed"
                              : "pointer",
                          opacity: order.status === "Received" ? 0.7 : 1,
                        }}
                      >
                        {order.status === "Received"
                          ? "✓ Received"
                          : "Received Order"}
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
            const total = selectedOrder.items.reduce(
              (sum, i) => sum + i.price * i.qty,
              0,
            );
            const stepIndex = getStepIndex(selectedOrder.status);
            return (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  border: "0.5px solid #e8e8e8",
                  padding: "24px",
                  position: "sticky",
                  top: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                    }}
                  >
                    Order Details
                  </p>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{
                      background: "#f5f5f5",
                      border: "none",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    background: "#f9f9f9",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      marginBottom: "2px",
                    }}
                  >
                    Order ID
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "8px",
                    }}
                  >
                    {selectedOrder.orderId}
                  </p>
                  <span
                    style={{
                      padding: "4px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: s.bg,
                      color: s.color,
                    }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Progress Tracker */}
                {selectedOrder.status !== "Return" && (
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginBottom: "12px",
                      }}
                    >
                      Order Progress
                    </p>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "14px",
                          right: "14px",
                          height: "3px",
                          background: "#e8e8e8",
                          zIndex: 0,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "#2d7a3a",
                            width:
                              stepIndex >= 0
                                ? `${(stepIndex / (statusSteps.length - 1)) * 100}%`
                                : "0%",
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                      {statusSteps.map((step, i) => {
                        const done = i <= stepIndex;
                        return (
                          <div
                            key={step}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                              zIndex: 1,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: done ? "#2d7a3a" : "#e8e8e8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                              }}
                            >
                              {done ? (
                                <span style={{ color: "#fff" }}>✓</span>
                              ) : (
                                <span style={{ color: "#bbb" }}>○</span>
                              )}
                            </div>
                            <p
                              style={{
                                fontSize: "9px",
                                color: done ? "#2d7a3a" : "#bbb",
                                fontWeight: done ? 600 : 400,
                                textAlign: "center",
                                lineHeight: 1.3,
                              }}
                            >
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "16px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                      marginBottom: "10px",
                    }}
                  >
                    Items Ordered
                  </p>
                  {selectedOrder.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "0.5px solid #f5f5f5",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#1a1a1a",
                          }}
                        >
                          {item.name}
                        </p>
                        <p style={{ fontSize: "11px", color: "#aaa" }}>
                          qty: {item.qty}
                        </p>
                      </div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#2d7a3a",
                        }}
                      >
                        ₱{(item.price * item.qty).toLocaleString()}.00
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderTop: "1px solid #f0f0f0",
                    marginBottom: "16px",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>
                    Total Amount
                  </span>
                  <span
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#7c3aed",
                    }}
                  >
                    ₱{total.toLocaleString()}.00
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => markReceived(selectedOrder.id)}
                    disabled={
                      selectedOrder.status === "Received" ||
                      selectedOrder.status === "Return"
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "20px",
                      border: "none",
                      background:
                        selectedOrder.status === "Received"
                          ? "#bbb"
                          : "#2d7a3a",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor:
                        selectedOrder.status === "Received"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {selectedOrder.status === "Received"
                      ? "✓ Moving to Transaction History..."
                      : "Mark as Received"}
                  </button>
                  <button
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "20px",
                      border: "1.5px solid #e8e8e8",
                      background: "#fff",
                      color: "#555",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
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
