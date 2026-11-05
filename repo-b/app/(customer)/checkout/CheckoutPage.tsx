"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    productName: string;
    price: number;
    finalPrice?: number;
    category?: string;
    size?: string;
    stock?: number;
    image?: string | null;
  };
};

type PaymentInfo = {
  method: "cod" | "gcash";
  cashGiven: string;
  gcashRef: string;
  gcashProof: string | null;
};

const VAT_RATE = 0.12;

const peso = (n: number) =>
  "₱" +
  n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const round2 = (n: number) => Math.round(n * 100) / 100;

const getCustomerId = () => {
  if (typeof window === "undefined") return "";
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
  } catch {
    return "";
  }
};

const getEffectivePrice = (item: CartItem) =>
  item.product.finalPrice != null && item.product.finalPrice < item.product.price
    ? item.product.finalPrice
    : item.product.price;

const clearCheckoutSession = () => {
  sessionStorage.removeItem("paymentMethod");
  sessionStorage.removeItem("cashGiven");
  sessionStorage.removeItem("gcashRef");
  sessionStorage.removeItem("gcashProof");
};

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<PaymentInfo | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // ── Load payment details (from the cart page) and the cart itself ─────────
  useEffect(() => {
    let cancelled = false;

    const method = sessionStorage.getItem("paymentMethod");
    if (method !== "cod" && method !== "gcash") {
      router.replace("/cart"); // nothing was chosen yet, go back to the cart
      return;
    }

    setPay({
      method,
      cashGiven: sessionStorage.getItem("cashGiven") || "",
      gcashRef: sessionStorage.getItem("gcashRef") || "",
      gcashProof: sessionStorage.getItem("gcashProof"),
    });

    const id = getCustomerId();
    setCustomerId(id);
    if (!id) {
      setLoadError("Please log in again to place your order.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await api.getCart(id);
        const list: CartItem[] = Array.isArray(data?.items) ? data.items : [];
        if (cancelled) return;
        if (list.length === 0) {
          router.replace("/cart");
          return;
        }
        setItems(list);
      } catch {
        if (!cancelled) setLoadError("We couldn't load your cart. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = round2(items.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0));
  const vat = round2(subtotal * VAT_RATE);
  const total = round2(subtotal + vat);

  const cashAmount = parseFloat((pay?.cashGiven || "").replace(/,/g, "")) || 0;
  const cashProvided = !!pay && pay.method === "cod" && pay.cashGiven !== "";
  const cashShort = cashProvided && cashAmount + 0.005 < total;
  const change = cashProvided && !cashShort ? round2(cashAmount - total) : 0;

  const hasStockIssue = items.some((i) => i.quantity > (i.product.stock ?? Infinity));
  const gcashMissing = pay?.method === "gcash" && pay.gcashRef.length === 0;

  const canPlace =
    !!pay && items.length > 0 && !hasStockIssue && !cashShort && !gcashMissing && !!customerId;

  // ── Place the order ───────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (placing || !canPlace || !pay) return;
    setPlacing(true);
    setError("");

    try {
      const res = await api.placeOrder({
        customerId,
        paymentMethod: pay.method,
        ...(pay.method === "cod" && cashProvided && { cashGiven: cashAmount }),
        ...(pay.method === "gcash" && { gcashRef: pay.gcashRef }),
        ...(note.trim() && { note: note.trim() }),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: getEffectivePrice(i),
        })),
      });

      const orderId =
        res?.order?.id ?? res?.id ?? res?.orderId ?? res?.data?.id ?? res?.data?.order?.id ?? "";

      // the order is saved, so a failure to clear the cart shouldn't block the confirmation
      try {
        await api.clearCart(customerId);
      } catch {
        /* ignore */
      }
      clearCheckoutSession();
      setPlacedOrderId(String(orderId || "done"));
    } catch (err: any) {
      setError(err?.message || "We couldn't place your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Screens ───────────────────────────────────────────────────────────────
  if (placedOrderId) {
    const shownId = placedOrderId === "done" ? "" : placedOrderId.slice(-6).toUpperCase();
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #f0faf2, #e8f5e9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "40px 32px",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "12px" }}>✅</div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>
            Order placed!
          </h2>
          {shownId && (
            <p style={{ fontSize: "14px", color: "#2d7a3a", fontWeight: 700, marginBottom: "8px" }}>
              Order #{shownId}
            </p>
          )}
          <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.6, marginBottom: "28px" }}>
            Thank you! We received your order and will prepare it shortly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/home"
              style={{
                background: "#2d7a3a",
                color: "#fff",
                textDecoration: "none",
                padding: "13px",
                borderRadius: "30px",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(45,122,58,0.3)",
              }}
            >
              Back to Home
            </Link>
            <Link
              href="/products"
              style={{ color: "#2d7a3a", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#aaa", fontSize: "14px" }}>Loading checkout...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#e53935", fontSize: "14px", fontWeight: 600 }}>⚠️ {loadError}</p>
        <Link href="/cart" style={{ color: "#2d7a3a", fontSize: "13px", fontWeight: 600 }}>
          ← Back to cart
        </Link>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: "20px",
    border: "0.5px solid #e8e8e8",
    padding: "24px",
  };

  const buttonLabel = placing
    ? "Placing your order..."
    : hasStockIssue
    ? "⚠️ Reduce quantity to match stock"
    : cashShort
    ? "⚠️ Cash is less than the total"
    : gcashMissing
    ? "⚠️ GCash reference is missing"
    : `Place Order · ${peso(total)}`;

  return (
    <div
      style={{
        padding: "clamp(14px, 3vw, 28px)",
        background: "#f5f5f5",
        minHeight: "calc(100vh - 56px)",
        color: "#1a1a1a",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <Link
          href="/cart"
          style={{
            display: "inline-block",
            color: "#2d7a3a",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: "16px",
          }}
        >
          ← Back to cart
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── LEFT: payment + note ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={cardStyle}>
              <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Payment</p>

              {pay?.method === "cod" ? (
                <div
                  style={{
                    background: "#f0faf2",
                    border: "1px solid #a5d6a7",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#2e7d32", marginBottom: "6px" }}>
                    💵 Cash on Delivery
                  </p>
                  <p style={{ fontSize: "12.5px", color: "#555", lineHeight: 1.6 }}>
                    Pay <strong style={{ color: "#2d7a3a" }}>{peso(total)}</strong> in cash when your order
                    arrives.
                  </p>
                  {cashProvided && (
                    <div
                      style={{
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid #c8e6c9",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#777" }}>Cash you'll hand over</span>
                        <strong>{peso(cashAmount)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#777" }}>{cashShort ? "Short by" : "Change"}</span>
                        <strong style={{ color: cashShort ? "#e53935" : "#2d7a3a" }}>
                          {cashShort ? peso(total - cashAmount) : peso(change)}
                        </strong>
                      </div>
                    </div>
                  )}
                  {cashShort && (
                    <p style={{ fontSize: "12px", color: "#e53935", marginTop: "10px" }}>
                      The cash amount is lower than the total. Go back to the cart to change it.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: "#f8f0ff",
                    border: "1px solid #e0c8ff",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#6a1b9a", marginBottom: "10px" }}>
                    📱 GCash
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#777" }}>Reference number</span>
                    <strong style={{ letterSpacing: "0.5px" }}>{pay?.gcashRef || "—"}</strong>
                  </div>
                  {pay?.gcashProof && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pay.gcashProof}
                      alt="Payment screenshot"
                      style={{
                        width: "100%",
                        maxHeight: "180px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        border: "1px solid #e0c8ff",
                        marginTop: "12px",
                        display: "block",
                      }}
                    />
                  )}
                  <p style={{ fontSize: "11.5px", color: "#8e6bb0", lineHeight: 1.5, marginTop: "10px" }}>
                    We check your GCash payment before confirming the order.
                  </p>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <label
                htmlFor="order-note"
                style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}
              >
                📝 Note for the store <span style={{ color: "#aaa", fontWeight: 500 }}>(optional)</span>
              </label>
              <textarea
                id="order-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                rows={3}
                placeholder="e.g. Please deliver in the afternoon"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #e0e0e0",
                  fontSize: "13px",
                  fontFamily: "sans-serif",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  color: "#1a1a1a",
                  background: "#fff",
                }}
              />
              <p style={{ fontSize: "11px", color: "#aaa", textAlign: "right", marginTop: "4px" }}>
                {note.length}/200
              </p>
            </div>
          </div>

          {/* ── RIGHT: order summary ── */}
          <div style={cardStyle}>
            <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "18px" }}>Order Summary</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
              {items.map((item) => {
                const price = getEffectivePrice(item);
                const hasDiscount =
                  item.product.finalPrice != null && item.product.finalPrice < item.product.price;
                const overStock = item.quantity > (item.product.stock ?? Infinity);
                return (
                  <div key={item.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <span style={{ fontSize: "13px", color: "#555" }}>
                        {item.product.productName} × {item.quantity}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        {hasDiscount && (
                          <div style={{ fontSize: "11px", color: "#bbb", textDecoration: "line-through" }}>
                            {peso(item.product.price * item.quantity)}
                          </div>
                        )}
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2d7a3a" }}>
                          {peso(price * item.quantity)}
                        </div>
                      </div>
                    </div>
                    {overStock && (
                      <p style={{ fontSize: "11px", color: "#e53935", marginTop: "2px" }}>
                        Only {item.product.stock ?? 0} in stock. Update your cart.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px" }}>{peso(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>VAT (12%)</span>
              <span style={{ fontSize: "13px" }}>{peso(vat)}</span>
            </div>

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#2d7a3a" }}>{peso(total)}</span>
            </div>

            {error && (
              <div
                style={{
                  background: "#ffebee",
                  border: "1px solid #ef9a9a",
                  color: "#c62828",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  marginBottom: "14px",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={!canPlace || placing}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "30px",
                border: "none",
                fontSize: "15px",
                fontWeight: 700,
                color: "#fff",
                background: canPlace && !placing ? "#2d7a3a" : "#ccc",
                cursor: canPlace && !placing ? "pointer" : "not-allowed",
                boxShadow: canPlace && !placing ? "0 6px 20px rgba(45,122,58,0.3)" : "none",
              }}
            >
              {buttonLabel}
            </button>

            <p style={{ textAlign: "center", fontSize: "11px", color: "#bbb", marginTop: "14px" }}>
              🔒 Secure checkout — your info is safe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}