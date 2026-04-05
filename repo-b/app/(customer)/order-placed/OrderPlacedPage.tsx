"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function OrderPlacedPage() {
  const { items, clearCart } = useCart();

  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Snapshot items immediately so clearCart doesn't wipe them mid-flight
    const snapshot = [...items];
    if (snapshot.length === 0) {
      setLoading(false);
      return;
    }

    const sub = snapshot.reduce((sum, i) => sum + i.price * i.qty, 0);
    const del = sub >= 1000 ? 0 : 50;
    setSubtotal(sub);
    setDelivery(del);
    setTotal(sub + del);

    const customerId =
      typeof window !== "undefined" ? localStorage.getItem("customerId") ?? "" : "";

    api
      .placeOrder({
        customerId,
        paymentMethod: "cod",
        items: snapshot.map((i) => ({
          productId: String(i.id),
          quantity: i.qty,
          price: i.price,
        })),
      })
      .then((data) => {
        setOrderNo(data.saleId ?? data.orderId ?? `ORD-${Date.now()}`);
        clearCart();
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to place order.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f0faf2 0%, #e8f5e9 100%)",
        }}
      >
        <p style={{ fontSize: "16px", color: "#2d7a3a", fontWeight: 600 }}>
          Placing your order…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
          padding: "28px",
          background: "linear-gradient(160deg, #fff5f5 0%, #fce4e4 100%)",
        }}
      >
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#c62828" }}>
          ⚠️ Order Failed
        </p>
        <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
          {error}
        </p>
        <Link
          href="/cart"
          style={{
            background: "#c62828",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: "30px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          ← Back to Cart
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        background: "linear-gradient(160deg, #f0faf2 0%, #e8f5e9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px",
      }}
    >
      <div style={{ maxWidth: "560px", width: "100%", textAlign: "center" }}>
        {/* Check Icon */}
        <div
          style={{
            width: "110px",
            height: "110px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            boxShadow: "0 12px 32px rgba(45,122,58,0.3)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
            <path d="M14 26l9 9 15-18" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a1a", marginBottom: "12px" }}>
          Order Placed! 🎉
        </h1>
        <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, marginBottom: "8px" }}>
          Your order has been placed successfully!
        </p>
        <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, marginBottom: "28px" }}>
          We will process it and deliver it to your address soon.
        </p>

        {/* Order Number */}
        <div
          style={{
            background: "#e8f5e9",
            borderRadius: "12px",
            padding: "10px 20px",
            display: "inline-block",
            marginBottom: "24px",
            border: "1px solid #a5d6a7",
          }}
        >
          <p style={{ fontSize: "13px", color: "#2d7a3a", fontWeight: 600 }}>
            Order Number: <span style={{ fontWeight: 800 }}>{orderNo}</span>
          </p>
        </div>

        {/* Order Summary Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            border: "0.5px solid #e8e8e8",
            padding: "24px",
            marginBottom: "24px",
            textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px", textAlign: "center" }}>
            Order Summary
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", color: "#888" }}>Subtotal:</span>
              <span style={{ fontSize: "14px", color: "#1a1a1a" }}>₱{subtotal.toLocaleString()}.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", color: "#888" }}>Delivery Fee:</span>
              <span style={{ fontSize: "14px", color: delivery === 0 ? "#2e7d32" : "#1a1a1a" }}>
                {delivery === 0 ? "FREE" : `₱${delivery}.00`}
              </span>
            </div>
          </div>
          <div style={{ height: "1px", background: "#f0f0f0", margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>Total:</span>
            <span style={{ fontSize: "26px", fontWeight: 800, color: "#2d7a3a" }}>
              ₱{total.toLocaleString()}.00
            </span>
          </div>
        </div>

        {/* Estimated Delivery */}
        <div
          style={{
            background: "#fff8e1",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "28px",
            border: "1px solid #ffe082",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "18px" }}>🚚</span>
          <p style={{ fontSize: "13px", color: "#f57f17", fontWeight: 600 }}>
            Estimated delivery: 1–2 hours
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <Link
            href="/products"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#2d7a3a",
              color: "#fff",
              textDecoration: "none",
              padding: "14px",
              borderRadius: "30px",
              fontSize: "14px",
              fontWeight: 700,
              boxShadow: "0 6px 20px rgba(45,122,58,0.3)",
            }}
          >
            🛍️ Products
          </Link>
          <Link
            href="/orders"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#2d7a3a",
              color: "#fff",
              textDecoration: "none",
              padding: "14px",
              borderRadius: "30px",
              fontSize: "14px",
              fontWeight: 700,
              boxShadow: "0 6px 20px rgba(45,122,58,0.3)",
            }}
          >
            📦 My Orders
          </Link>
        </div>

        <p style={{ fontSize: "12px", color: "#aaa", marginTop: "20px", lineHeight: 1.6 }}>
          You can track your order status in the My Orders section
        </p>
      </div>
    </div>
  );
}
