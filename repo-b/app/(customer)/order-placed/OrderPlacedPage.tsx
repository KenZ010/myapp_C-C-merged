"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PendingOrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface PendingOrder {
  customerId: string;
  paymentMethod: "cod" | "gcash";
  items: PendingOrderItem[];
}

export default function OrderPlacedPage() {
  const [orderNo,  setOrderNo]  = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [vat,   setVat]   = useState(0);
  const [total, setTotal]  = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("pendingOrder");
    if (!raw) {
      setError("No order data found. Please go back to your cart.");
      setLoading(false);
      return;
    }

    let pending: PendingOrder;
    try {
      pending = JSON.parse(raw) as PendingOrder;
    } catch {
      setError("Invalid order data. Please try again.");
      setLoading(false);
      return;
    }

    const sub = pending.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const v = sub * 0.12;
    setSubtotal(sub);
    setVat(v);
    setTotal(sub + v);

    api
      .placeOrder(pending)
      .then((data) => {
        setOrderNo(data.saleId ?? data.orderId ?? `ORD-${Date.now()}`);
        localStorage.removeItem("pendingOrder");
        localStorage.removeItem("cart");
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to place order.");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-gradient-to-br from-[#f0faf2] to-[#e8f5e9]">
        <p className="text-sm font-semibold text-green-700 animate-pulse">
          Placing your order…
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 px-6 bg-gradient-to-br from-red-50 to-red-100">
        <p className="text-lg font-bold text-red-700">⚠️ Order Failed</p>
        <p className="text-sm text-gray-500 text-center">{error}</p>
        <Link
          href="/cart"
          className="bg-red-700 text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-red-800 transition-colors"
        >
          ← Back to Cart
        </Link>
      </div>
    );
  }

  // ── Success ──
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-gradient-to-br from-[#f0faf2] to-[#e8f5e9] p-7">
      <div className="w-full max-w-[560px] text-center">

        {/* Check icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center mx-auto mb-7 shadow-lg shadow-green-700/30">
          <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
            <path d="M14 26l9 9 15-18" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Order Placed! 🎉</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-1">
          Your order has been placed successfully!
        </p>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          We will process it and deliver it to your address soon.
        </p>

        {/* Order number badge */}
        <div className="inline-block bg-green-50 border border-green-200 rounded-xl px-5 py-2.5 mb-6">
          <p className="text-[13px] font-semibold text-green-700">
            Order Number:{" "}
            <span className="font-extrabold">{orderNo ?? "—"}</span>
          </p>
        </div>

        {/* Order summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-left">
          <p className="text-sm font-bold text-gray-900 text-center mb-4">
            Order Summary
          </p>

          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Subtotal:</span>
              <span className="text-sm text-gray-900">
                ₱{subtotal.toLocaleString()}.00
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">VAT (12%):</span>
              <span className="text-sm text-gray-900">
                ₱{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="h-px bg-gray-100 my-3" />

          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-gray-900">Total:</span>
            <span className="text-2xl font-extrabold text-green-700">
              ₱{total.toLocaleString()}.00
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold py-3.5 rounded-full transition-colors shadow-lg shadow-green-700/30 active:scale-95"
          >
            🛍️ Products
          </Link>
          <Link
            href="/orders"
            className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold py-3.5 rounded-full transition-colors shadow-lg shadow-green-700/30 active:scale-95"
          >
            📦 My Orders
          </Link>
        </div>

        <p className="text-xs text-gray-300 mt-5 leading-relaxed">
          You can track your order status in the My Orders section
        </p>
      </div>
    </div>
  );
}