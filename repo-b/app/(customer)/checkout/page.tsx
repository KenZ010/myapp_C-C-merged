"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items } = useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState("");

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const delivery = subtotal >= 1000 ? 0 : 50;
  const total = subtotal + delivery;

  const handlePlaceOrder = () => {
    setPlacing(true);
    setTimeout(() => router.push("/order-placed"), 1500);
  };

  if (items.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <p
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#1a1a1a",
            marginBottom: "16px",
          }}
        >
          No items to checkout
        </p>
        <Link
          href="/products"
          style={{
            background: "#2d7a3a",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 32px",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "28px",
        background: "#f5f5f5",
        minHeight: "calc(100vh - 56px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "24px",
          maxWidth: "1000px",
          margin: "0 auto",
          alignItems: "start",
        }}
      >
        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Delivery Address */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              padding: "22px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <p
                style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}
              >
                📍 Delivery Address
              </p>
              <button
                style={{
                  fontSize: "12px",
                  color: "#2d7a3a",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            </div>
            <div
              style={{
                background: "#f9f9f9",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "4px",
                }}
              >
                Ken Masilungan
              </p>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
                09321431241
              </p>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
                #41 Buick, Quezon City, Metro Manila, Philippines
              </p>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
                Barangay San Jose
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              padding: "22px 24px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "16px",
              }}
            >
              🛒 Order Items
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "12px",
                    background: "#f9f9f9",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "10px",
                      background: item.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      flexShrink: 0,
                    }}
                  >
                    {item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                      }}
                    >
                      {item.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "#aaa" }}>
                      {item.desc}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#2d7a3a",
                      }}
                    >
                      ₱{(item.price * item.qty).toLocaleString()}.00
                    </p>
                    <p style={{ fontSize: "12px", color: "#aaa" }}>
                      qty: {item.qty}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Note */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              padding: "22px 24px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "12px",
              }}
            >
              📝 Delivery Note{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 400, color: "#aaa" }}
              >
                (Optional)
              </span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please call before delivery, leave at gate..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1.5px solid #e8e8e8",
                fontSize: "13px",
                outline: "none",
                resize: "none",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                color: "#1a1a1a",
              }}
            />
          </div>
        </div>

        {/* ── RIGHT: Summary ── */}
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
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "20px",
            }}
          >
            Order Summary
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: "13px", color: "#555" }}>
                  {item.name} × {item.qty}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>
                  ₱{(item.price * item.qty).toLocaleString()}.00
                </span>
              </div>
            ))}
          </div>

          <div
            style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px" }}>
                ₱{subtotal.toLocaleString()}.00
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>
                Delivery Fee
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: delivery === 0 ? "#2e7d32" : "#1a1a1a",
                  fontWeight: delivery === 0 ? 600 : 400,
                }}
              >
                {delivery === 0 ? "FREE" : `₱${delivery}.00`}
              </span>
            </div>
          </div>

          <div
            style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: 700 }}>Total</span>
            <span
              style={{ fontSize: "24px", fontWeight: 700, color: "#2d7a3a" }}
            >
              ₱{total.toLocaleString()}.00
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "30px",
              border: "none",
              background: placing ? "#aaa" : "#2d7a3a",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: placing ? "not-allowed" : "pointer",
              boxShadow: placing ? "none" : "0 6px 20px rgba(45,122,58,0.3)",
            }}
          >
            {placing ? "Placing Order..." : "✅ Place Order"}
          </button>

          <Link
            href="/cart"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "13px",
              color: "#888",
              marginTop: "14px",
              textDecoration: "none",
            }}
          >
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
