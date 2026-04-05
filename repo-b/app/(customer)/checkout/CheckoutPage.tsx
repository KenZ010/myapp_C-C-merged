"use client";
import { useState, useEffect, useCallback } from "react";
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
  };
};

type Customer = {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
};

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤", ENERGY_DRINK: "⚡", BEER: "🍺",
  JUICE: "🍹", WATER: "💧", OTHER: "🛒",
};
const BG_MAP: Record<string, string> = {
  SOFTDRINKS: "#b71c1c", ENERGY_DRINK: "#1a237e", BEER: "#f57f17",
  JUICE: "#2e7d32", WATER: "#0288d1", OTHER: "#424242",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";
const getBg    = (cat?: string) => BG_MAP[cat?.toUpperCase() || ""]    || "#424242";
const getEffectivePrice = (item: CartItem) =>
  item.product.finalPrice != null && item.product.finalPrice < item.product.price
    ? item.product.finalPrice
    : item.product.price;

const getCustomerId = () => {
  if (typeof window === "undefined") return "";
  return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
};

export default function CheckoutPage() {
  const router = useRouter();

  const [items,         setItems]         = useState<CartItem[]>([]);
  const [customer,      setCustomer]      = useState<Customer | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [placing,       setPlacing]       = useState(false);
  const [note,          setNote]          = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [gcashRef,      setGcashRef]      = useState("");

  const fetchCart = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setLoading(false); return; }
    try {
      const data = await api.getCart(customerId);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const customerId = getCustomerId();

    // Fetch full customer details from API
    if (customerId) {
      api.getCustomer(customerId)
        .then((data) => setCustomer({
          id:      data.id,
          name:    data.name    || "—",
          phone:   data.phone   || data.contactNumber || "—",
          address: data.address || "—",
        }))
        .catch(() => {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          setCustomer(stored);
        });
    }

    // Load payment info saved by cart page
    const pm  = sessionStorage.getItem("paymentMethod") as "cod" | "gcash" | null;
    const ref = sessionStorage.getItem("gcashRef") || "";
    if (pm)  setPaymentMethod(pm);
    if (ref) setGcashRef(ref);

    fetchCart();
  }, [fetchCart]);

  const subtotal = items.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0);
  const totalDiscount = items.reduce((sum, i) => {
    const fp = i.product.finalPrice;
    if (fp != null && fp < i.product.price) return sum + (i.product.price - fp) * i.quantity;
    return sum;
  }, 0);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    const customerId = getCustomerId();
    if (!customerId || items.length === 0) return;

    setPlacing(true);
    try {
      await api.placeOrder({
        customerId,
        paymentMethod,
        gcashRef: paymentMethod === "gcash" ? gcashRef : undefined,
        note:     note.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity:  i.quantity,
          price:     getEffectivePrice(i),
        })),
      });

      sessionStorage.removeItem("paymentMethod");
      sessionStorage.removeItem("gcashRef");
      router.push("/order-placed");
    } catch (err: any) {
      console.error("Failed to place order:", err);
      alert(err?.message || "Something went wrong placing your order. Please try again.");
      setPlacing(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: "28px", background: "#f5f5f5", minHeight: "calc(100vh - 56px)" }}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[140, 100, 260, 100].map((h, i) => (
              <div key={i} style={{ height: `${h}px`, borderRadius: "16px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ))}
          </div>
          <div style={{ height: "420px", borderRadius: "20px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛒</div>
        <p style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>No items to checkout</p>
        <Link href="/products" style={{ background: "#2d7a3a", color: "#fff", textDecoration: "none", padding: "12px 32px", borderRadius: "30px", fontSize: "14px", fontWeight: 600 }}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div style={{ padding: "28px", background: "#f5f5f5", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", maxWidth: "1000px", margin: "0 auto", alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Delivery Address */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px 24px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "14px" }}>📍 Delivery Address</p>
              <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "14px 16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                  {customer?.name || "—"}
                </p>
                <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>{customer?.phone   || "—"}</p>
                <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>{customer?.address || "—"}</p>
              </div>
            </div>

            {/* Payment Method — read-only */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px 24px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "14px" }}>💳 Payment Method</p>
              {paymentMethod === "cod" ? (
                <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 16px", border: "1px solid #a5d6a7", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>💵</span>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#2e7d32", margin: 0 }}>Cash on Delivery</p>
                    <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>Please prepare the exact amount upon delivery.</p>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8f0ff", borderRadius: "10px", padding: "12px 16px", border: "1px solid #e0c8ff", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>📱</span>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#6a1b9a", margin: 0 }}>GCash</p>
                    <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
                      Ref no: <span style={{ fontWeight: 600, color: "#6a1b9a" }}>{gcashRef}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px 24px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>🛒 Order Items</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {items.map((item) => {
                  const effectivePrice = getEffectivePrice(item);
                  const hasDiscount    = item.product.finalPrice != null && item.product.finalPrice < item.product.price;
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px", background: "#f9f9f9", borderRadius: "12px" }}>
                      <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: getBg(item.product.category), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                        {getEmoji(item.product.category)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{item.product.productName}</p>
                        <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                          {item.product.size ? `Size: ${item.product.size}` : item.product.category || ""}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {hasDiscount && (
                          <p style={{ fontSize: "11px", color: "#bbb", textDecoration: "line-through", margin: 0 }}>
                            ₱{(item.product.price * item.quantity).toLocaleString()}.00
                          </p>
                        )}
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#2d7a3a", margin: 0 }}>
                          ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                        </p>
                        <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>qty: {item.quantity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Note */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px 24px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>
                📝 Delivery Note <span style={{ fontSize: "12px", fontWeight: 400, color: "#aaa" }}>(Optional)</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please call before delivery, leave at gate..."
                rows={3}
                style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #e8e8e8", fontSize: "13px", outline: "none", resize: "none", fontFamily: "sans-serif", boxSizing: "border-box", color: "#1a1a1a" }}
              />
            </div>
          </div>

          {/* RIGHT: Summary */}
          <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>Order Summary</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {items.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const hasDiscount    = item.product.finalPrice != null && item.product.finalPrice < item.product.price;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {item.product.productName} × {item.quantity}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      {hasDiscount && (
                        <div style={{ fontSize: "11px", color: "#bbb", textDecoration: "line-through" }}>
                          ₱{(item.product.price * item.quantity).toLocaleString()}.00
                        </div>
                      )}
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#2d7a3a" }}>
                        ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px" }}>₱{subtotal.toLocaleString()}.00</span>
            </div>

            {totalDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#e53935" }}>🏷️ Promo Discount</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e53935" }}>
                  −₱{totalDiscount.toLocaleString()}.00
                </span>
              </div>
            )}

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#2d7a3a" }}>₱{total.toLocaleString()}.00</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              style={{ width: "100%", padding: "15px", borderRadius: "30px", border: "none", background: placing ? "#aaa" : "#2d7a3a", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: placing ? "not-allowed" : "pointer", boxShadow: placing ? "none" : "0 6px 20px rgba(45,122,58,0.3)", transition: "background 0.2s" }}
            >
              {placing ? "Placing Order..." : "✅ Place Order"}
            </button>

            <Link href="/cart" style={{ display: "block", textAlign: "center", fontSize: "13px", color: "#888", marginTop: "14px", textDecoration: "none" }}>
              ← Back to Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
