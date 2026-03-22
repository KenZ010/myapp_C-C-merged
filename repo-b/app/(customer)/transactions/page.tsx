"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Transaction } from "@/context/CartContext";

export default function TransactionHistoryPage() {
  const { transactions } = useCart();
  const [selected, setSelected] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #e8f5f0, #dff0ea)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "rgba(99,155,230,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect
              x="8"
              y="10"
              width="40"
              height="36"
              rx="6"
              stroke="#4a90d9"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M20 10V8a8 8 0 0 1 16 0v2"
              stroke="#4a90d9"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="28"
              cy="30"
              r="6"
              stroke="#4a90d9"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M25 30l2 2 4-4"
              stroke="#4a90d9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "10px",
          }}
        >
          No transactions yet
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#7a8fa6",
            textAlign: "center",
            maxWidth: "280px",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          Your completed orders will appear here once you mark them as received.
        </p>
        <Link
          href="/products"
          style={{
            background: "linear-gradient(135deg, #4a90d9, #357abd)",
            color: "#fff",
            textDecoration: "none",
            padding: "14px 48px",
            borderRadius: "30px",
            fontSize: "15px",
            fontWeight: 600,
            boxShadow: "0 6px 20px rgba(74,144,217,0.35)",
          }}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "28px",
        minHeight: "calc(100vh - 56px)",
        background: "#f5f5f5",
      }}
    >
      {/* Summary Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
          borderRadius: "16px",
          padding: "20px 28px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              marginBottom: "4px",
            }}
          >
            Total Completed Orders
          </p>
          <p style={{ fontSize: "28px", fontWeight: 800, color: "#fff" }}>
            {transactions.length}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              marginBottom: "4px",
            }}
          >
            Total Amount Spent
          </p>
          <p style={{ fontSize: "28px", fontWeight: 800, color: "#f5c842" }}>
            ₱
            {transactions.reduce((sum, t) => sum + t.total, 0).toLocaleString()}
            .00
          </p>
        </div>
      </div>

      {/* 4-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        {transactions.map((tx) => (
          <div
            key={tx.txId}
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Card Top — green header */}
            <div
              style={{
                background: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.7)",
                      marginBottom: "2px",
                    }}
                  >
                    Transaction
                  </p>
                  <p
                    style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}
                  >
                    {tx.txId}
                  </p>
                </div>
                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  ✅ Completed
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div
              style={{
                padding: "14px 18px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div>
                <p style={{ fontSize: "10px", color: "#aaa" }}>Order ID</p>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>
                  {tx.orderId}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "10px", color: "#aaa" }}>Date</p>
                <p style={{ fontSize: "12px", color: "#555" }}>📅 {tx.date}</p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "#aaa",
                    marginBottom: "4px",
                  }}
                >
                  Items
                </p>
                {tx.items.slice(0, 2).map((item, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "#555" }}>
                    • {item.name} x{item.qty}
                  </p>
                ))}
                {tx.items.length > 2 && (
                  <p style={{ fontSize: "11px", color: "#aaa" }}>
                    +{tx.items.length - 2} more item
                    {tx.items.length - 2 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "10px",
                  borderTop: "0.5px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontSize: "10px", color: "#aaa" }}>Total</p>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#2d7a3a",
                    }}
                  >
                    ₱{tx.total.toLocaleString()}.00
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    background: "#f5f5f5",
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  💳 {tx.paymentMethod}
                </span>
              </div>
            </div>

            {/* View Details Button */}
            <button
              onClick={() => setSelected(tx)}
              style={{
                margin: "0 14px 14px",
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid #2d7a3a",
                background: "#fff",
                color: "#2d7a3a",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🧾 View Receipt
            </button>
          </div>
        ))}
      </div>

      {/* ── Receipt Modal ── */}
      {selected && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />

          {/* Receipt */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
              width: "380px",
              background: "#fff",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Receipt Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
                padding: "24px 28px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                  fontSize: "24px",
                }}
              >
                🧾
              </div>
              <p
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 800,
                  marginBottom: "2px",
                }}
              >
                Julieta Soft Drinks
              </p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>
                Official Receipt
              </p>
            </div>

            {/* Zigzag effect */}
            <div
              style={{
                height: "12px",
                background:
                  "linear-gradient(135deg, #2d7a3a 25%, transparent 25%) -10px 0, linear-gradient(225deg, #2d7a3a 25%, transparent 25%) -10px 0, linear-gradient(315deg, #2d7a3a 25%, transparent 25%), linear-gradient(45deg, #2d7a3a 25%, transparent 25%)",
                backgroundSize: "20px 12px",
                backgroundRepeat: "repeat-x",
              }}
            />

            {/* Receipt Body */}
            <div style={{ padding: "20px 28px" }}>
              {/* IDs */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  Transaction ID
                </span>
                <span
                  style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}
                >
                  {selected.txId}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  Order ID
                </span>
                <span
                  style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}
                >
                  {selected.orderId}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#aaa" }}>Date</span>
                <span style={{ fontSize: "12px", color: "#333" }}>
                  {selected.date}
                </span>
              </div>

              {/* Divider */}
              <div
                style={{
                  borderTop: "1px dashed #e0e0e0",
                  marginBottom: "16px",
                }}
              />

              {/* Items */}
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Items Ordered
              </p>
              {selected.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "13px", color: "#333" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "#aaa" }}>
                      x{item.qty} × ₱{item.price.toLocaleString()}.00
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                    }}
                  >
                    ₱{(item.price * item.qty).toLocaleString()}.00
                  </span>
                </div>
              ))}

              {/* Divider */}
              <div
                style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }}
              />

              {/* Totals */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#888" }}>
                  Subtotal
                </span>
                <span style={{ fontSize: "13px", color: "#333" }}>
                  ₱
                  {selected.items
                    .reduce((s, i) => s + i.price * i.qty, 0)
                    .toLocaleString()}
                  .00
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#888" }}>
                  Delivery Fee
                </span>
                <span style={{ fontSize: "13px", color: "#2e7d32" }}>
                  {selected.total -
                    selected.items.reduce((s, i) => s + i.price * i.qty, 0) ===
                  0
                    ? "FREE"
                    : `₱${selected.total - selected.items.reduce((s, i) => s + i.price * i.qty, 0)}.00`}
                </span>
              </div>

              <div
                style={{
                  background: "#f0faf2",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  TOTAL
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#2d7a3a",
                  }}
                >
                  ₱{selected.total.toLocaleString()}.00
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  Payment Method
                </span>
                <span
                  style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}
                >
                  💳 {selected.paymentMethod}
                </span>
              </div>

              {/* Footer */}
              <div
                style={{
                  textAlign: "center",
                  paddingTop: "14px",
                  borderTop: "1px dashed #e0e0e0",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#2d7a3a",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Thank you for your purchase! 🎉
                </p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>
                  Julieta Soft Drink Store
                </p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>
                  TECHNOLOGIA @2026
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
