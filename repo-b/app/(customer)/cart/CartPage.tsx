"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type CartItem = {
  id: string;          // ShoppingCartItem id
  productId: string;
  quantity: number;
  product: {
    id: string;
    productName: string;
    price: number;
    finalPrice?: number;
    category?: string;
    size?: string;
  };
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

export default function CartPage() {
  const [items,         setItems]         = useState<CartItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [gcashRef,      setGcashRef]      = useState("");
  const [gcashImage,    setGcashImage]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const getCustomerId = () => {
    if (typeof window === "undefined") return "";
    return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
  };

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

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const handleUpdateQty = async (item: CartItem, delta: number) => {
    const customerId = getCustomerId();
    const newQty = item.quantity + delta;
    setUpdating(item.id);
    try {
      if (newQty <= 0) {
        await api.removeCartItem(customerId, item.id);
      } else {
        await api.updateCartItem(customerId, item.id, newQty);
      }
      await fetchCart();
    } catch (err) {
      console.error("Failed to update cart:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    const customerId = getCustomerId();
    setUpdating(item.id);
    try {
      await api.removeCartItem(customerId, item.id);
      await fetchCart();
    } catch (err) {
      console.error("Failed to remove item:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setGcashImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const subtotal = items.reduce((sum, i) => {
  const price = i.product.finalPrice ?? i.product.price;
  return sum + price * i.quantity;
}, 0);
  const delivery = subtotal >= 1000 ? 0 : 50;
  const total    = subtotal + delivery;

  const canCheckout =
    items.length > 0 &&
    (paymentMethod === "cod" ||
      (paymentMethod === "gcash" && gcashRef.trim() !== "" && gcashImage !== null));

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#aaa", fontSize: "14px" }}>Loading cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg, #f0faf2, #e8f5e9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>🛒</div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>Your cart is empty</h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px" }}>Add some products to get started!</p>
        <Link href="/products" style={{ background: "#2d7a3a", color: "#fff", textDecoration: "none", padding: "13px 40px", borderRadius: "30px", fontSize: "15px", fontWeight: 600, boxShadow: "0 6px 20px rgba(45,122,58,0.3)" }}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", background: "#f5f5f5", minHeight: "calc(100vh - 56px)" }}>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
        🛒 {items.length} item{items.length !== 1 ? "s" : ""} in your cart
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "start" }}>

        {/* ── LEFT: Cart Items ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {items.map((item) => {
            const isUpdating = updating === item.id;
            const emoji = getEmoji(item.product.category);
            const bg    = getBg(item.product.category);

            const price = item.product.finalPrice ?? item.product.price;
            
            return (
              <div key={item.id} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "18px 22px", display: "flex", alignItems: "center", gap: "18px", opacity: isUpdating ? 0.6 : 1, transition: "opacity 0.2s" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "14px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "3px" }}>{item.product.productName}</p>
                  <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>
                    {item.product.size ? `Size: ${item.product.size}` : item.product.category || ""}
                  </p>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#2d7a3a" }}>
                    ₱{(price * item.quantity).toLocaleString()}.00
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e8e8e8", borderRadius: "30px", overflow: "hidden" }}>
                    <button onClick={() => handleUpdateQty(item, -1)} disabled={isUpdating}
                      style={{ width: "36px", height: "36px", background: "none", border: "none", fontSize: "18px", cursor: isUpdating ? "not-allowed" : "pointer", color: "#2d7a3a", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      −
                    </button>
                    <span style={{ minWidth: "32px", textAlign: "center", fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => handleUpdateQty(item, 1)} disabled={isUpdating}
                      style={{ width: "36px", height: "36px", background: "none", border: "none", fontSize: "18px", cursor: isUpdating ? "not-allowed" : "pointer", color: "#2d7a3a", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      +
                    </button>
                  </div>
                  <button onClick={() => handleRemove(item)} disabled={isUpdating}
                    style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ffebee", border: "none", cursor: isUpdating ? "not-allowed" : "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
          <Link href="/products" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2d7a3a", fontSize: "13px", fontWeight: 500, textDecoration: "none", padding: "4px 0" }}>
            ← Continue Shopping
          </Link>
        </div>

        {/* ── RIGHT: Order Summary ── */}
        <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
          {/* ── RIGHT: Order Summary ── */}
            <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>Order Summary</p>

              {/* Itemized list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {items.map((item) => {
                  const basePrice   = item.product.price;
                  const finalPrice  = item.product.finalPrice ?? item.product.price;
                  const hasDiscount = item.product.finalPrice && item.product.finalPrice < item.product.price;

                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{item.product.productName} × {item.quantity}</span>
                      <div style={{ textAlign: "right" }}>
                        {hasDiscount && (
                          <div style={{ fontSize: "12px", color: "#888", textDecoration: "line-through" }}>
                            ₱{(basePrice * item.quantity).toLocaleString()}.00
                          </div>
                        )}
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#2d7a3a" }}>
                          ₱{(finalPrice * item.quantity).toLocaleString()}.00
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString()}.00</span>
              </div>

              {/* Delivery */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Delivery</span>
                <span style={{ color: delivery === 0 ? "#2d7a3a" : "#1a1a1a" }}>
                  {delivery === 0 ? "FREE" : `₱${delivery}.00`}
                </span>
              </div>

              {/* Promo Discount */}
              {items.some(i => i.product.finalPrice && i.product.finalPrice < i.product.price) && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#2d7a3a" }}>
                  <span>Promo Discount</span>
                  <span>
                    -₱{items.reduce((sum, i) => {
                      if (i.product.finalPrice && i.product.finalPrice < i.product.price) {
                        return sum + (i.product.price - i.product.finalPrice) * i.quantity;
                      }
                      return sum;
                    }, 0).toLocaleString()}.00
                  </span>
                </div>
              )}

              <hr style={{ margin: "12px 0" }} />

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "16px" }}>
                <span>Total</span>
                <span>₱{total.toLocaleString()}.00</span>
              </div>
            </div>


          <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px", color: "#1a1a1a" }}>₱{subtotal.toLocaleString()}.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Delivery Fee</span>
              <span style={{ fontSize: "13px", color: delivery === 0 ? "#2e7d32" : "#1a1a1a", fontWeight: delivery === 0 ? 600 : 400 }}>
                {delivery === 0 ? "FREE" : `₱${delivery}.00`}
              </span>
            </div>
            {delivery === 0 ? (
              <p style={{ fontSize: "11px", color: "#2e7d32", background: "#e8f5e9", padding: "6px 10px", borderRadius: "8px" }}>🎉 You qualify for free delivery!</p>
            ) : (
              <p style={{ fontSize: "11px", color: "#888", background: "#f5f5f5", padding: "6px 10px", borderRadius: "8px" }}>Add ₱{(1000 - subtotal).toLocaleString()} more for free delivery</p>
            )}
          </div>

          <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>Total</span>
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#2d7a3a" }}>₱{total.toLocaleString()}.00</span>
          </div>

          {/* Payment Method */}
          <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>Payment Method</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {[{ key: "cod", label: "💵 Cash on Delivery" }, { key: "gcash", label: "📱 GCash" }].map((m) => (
              <button key={m.key} onClick={() => setPaymentMethod(m.key as "cod" | "gcash")}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer", fontFamily: "sans-serif", border: paymentMethod === m.key ? "2px solid #2d7a3a" : "1.5px solid #e0e0e0", background: paymentMethod === m.key ? "#f0faf2" : "#fff", fontSize: "12px", fontWeight: 600, color: paymentMethod === m.key ? "#2d7a3a" : "#888" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* GCash Section */}
          {paymentMethod === "gcash" && (
            <div style={{ background: "#f8f0ff", borderRadius: "14px", padding: "16px", marginBottom: "16px", border: "1px solid #e0c8ff" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#6a1b9a", marginBottom: "10px", textAlign: "center" }}>📲 Scan to Pay via GCash</p>
              <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", textAlign: "center", marginBottom: "14px", border: "1px solid #e0c8ff" }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: "0 auto", display: "block" }}>
                  <rect x="2" y="2" width="116" height="116" rx="8" fill="white" stroke="#6a1b9a" strokeWidth="3" />
                  <rect x="10" y="10" width="30" height="30" rx="3" fill="#6a1b9a" />
                  <rect x="15" y="15" width="20" height="20" rx="2" fill="white" />
                  <rect x="19" y="19" width="12" height="12" rx="1" fill="#6a1b9a" />
                  <rect x="80" y="10" width="30" height="30" rx="3" fill="#6a1b9a" />
                  <rect x="85" y="15" width="20" height="20" rx="2" fill="white" />
                  <rect x="89" y="19" width="12" height="12" rx="1" fill="#6a1b9a" />
                  <rect x="10" y="80" width="30" height="30" rx="3" fill="#6a1b9a" />
                  <rect x="15" y="85" width="20" height="20" rx="2" fill="white" />
                  <rect x="19" y="89" width="12" height="12" rx="1" fill="#6a1b9a" />
                  {[[50,10],[56,10],[62,10],[50,16],[62,16],[50,22],[54,22],[58,22],[62,22],[10,50],[16,50],[22,50],[28,50],[10,56],[22,56],[28,56],[10,62],[16,62],[28,62],[50,50],[58,50],[66,50],[74,50],[50,58],[54,58],[62,58],[70,58],[50,66],[58,66],[66,66],[80,50],[88,50],[96,50],[104,50],[80,58],[96,58],[80,66],[88,66],[96,66],[104,66],[50,80],[58,80],[66,80],[50,88],[62,88],[70,88],[54,96],[58,96],[66,96],[74,96]].map(([x,y],i) => (
                    <rect key={i} x={x} y={y} width="5" height="5" fill="#6a1b9a" />
                  ))}
                </svg>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#6a1b9a", marginTop: "8px" }}>Julieta Soft Drinks</p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>GCash: 0912 345 6789</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#2d7a3a", marginTop: "4px" }}>₱{total.toLocaleString()}.00</p>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#6a1b9a", marginBottom: "6px", display: "block" }}>
                  🔢 GCash Reference Number <span style={{ color: "#e53935" }}>*</span>
                </label>
                <input type="text" value={gcashRef} onChange={(e) => setGcashRef(e.target.value)} placeholder="e.g. 1234567890123"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: gcashRef ? "1.5px solid #6a1b9a" : "1.5px solid #e0c8ff", fontSize: "13px", outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#6a1b9a", marginBottom: "6px", display: "block" }}>
                  📸 Upload Payment Screenshot <span style={{ color: "#e53935" }}>*</span>
                </label>
                {gcashImage ? (
                  <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #6a1b9a" }}>
                    <img src={gcashImage} alt="receipt" style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
                    <button onClick={() => setGcashImage(null)} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    <div style={{ background: "#e8f5e9", padding: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#2e7d32", fontWeight: 600 }}>✅ Receipt uploaded</span>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #c084fc", borderRadius: "10px", padding: "18px", textAlign: "center", cursor: "pointer", background: "#fff" }}>
                    <div style={{ fontSize: "24px", marginBottom: "4px" }}>🖼️</div>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#6a1b9a" }}>Click to upload screenshot</p>
                    <p style={{ fontSize: "11px", color: "#bbb" }}>JPG, PNG supported</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </div>
              {(!gcashRef || !gcashImage) && (
                <p style={{ fontSize: "11px", color: "#e53935", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                  ⚠️ Please provide both the reference number and screenshot to proceed.
                </p>
              )}
            </div>
          )}

          {paymentMethod === "cod" && (
            <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", border: "1px solid #a5d6a7" }}>
              <p style={{ fontSize: "12px", color: "#2e7d32" }}>💵 Pay in cash when your order arrives. Please prepare the exact amount.</p>
            </div>
          )}

          <Link href={canCheckout ? "/checkout" : "#"} onClick={(e) => { if (!canCheckout) e.preventDefault(); }}
            style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px", borderRadius: "30px", fontSize: "15px", fontWeight: 700, background: canCheckout ? "#2d7a3a" : "#ccc", color: "#fff", cursor: canCheckout ? "pointer" : "not-allowed", boxShadow: canCheckout ? "0 6px 20px rgba(45,122,58,0.3)" : "none" }}>
            {paymentMethod === "gcash" && !canCheckout ? "Complete GCash Details First" : "Proceed to Checkout →"}
          </Link>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#bbb", marginTop: "14px" }}>🔒 Secure checkout — your info is safe</p>
        </div>
      </div>
    </div>
  );
}
