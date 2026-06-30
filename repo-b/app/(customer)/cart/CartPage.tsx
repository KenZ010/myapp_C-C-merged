"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
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

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤",
  ENERGY_DRINK: "⚡",
  BEER: "🍺",
  JUICE: "🍹",
  WATER: "💧",
  OTHER: "🛒",
};
const BG_MAP: Record<string, string> = {
  SOFTDRINKS: "#b71c1c",
  ENERGY_DRINK: "#1a237e",
  BEER: "#f57f17",
  JUICE: "#2e7d32",
  WATER: "#0288d1",
  OTHER: "#424242",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";
const getBg = (cat?: string) => BG_MAP[cat?.toUpperCase() || ""] || "#424242";

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: CartItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(3px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "28px 24px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗑️</div>
        <h3
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "8px",
          }}
        >
          Remove Item?
        </h3>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>
          Are you sure you want to remove
        </p>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#2d7a3a",
            marginBottom: "24px",
          }}
        >
          {item.product.productName}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "30px",
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              color: "#888",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "30px",
              border: "none",
              background: "#e53935",
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(229,57,53,0.35)",
            }}
          >
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [gcashRef, setGcashRef] = useState("");
  const [gcashImage, setGcashImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);
  const [cashInput, setCashInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCustomerId = () => {
    if (typeof window === "undefined") return "";
    return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
  };

  const fetchCart = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setLoading(false);
      return;
    }
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
    fetchCart();
  }, [fetchCart]);

const handleUpdateQty = async (item: CartItem, delta: number) => {
  const customerId = getCustomerId();
  const newQty = item.quantity + delta;
  const stock = item.product.stock ?? Infinity;

  if (delta > 0 && newQty > stock) {
    setStockWarning(item.id);
    setTimeout(() => setStockWarning(null), 2500);
    return;
  }

  // Instead of removing immediately when qty would hit 0, ask for confirmation
  if (newQty <= 0) {
    setDeleteTarget(item);
    return;
  }

  setItems((prev) =>
    prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
  );

  try {
    await api.updateCartItem(customerId, item.id, newQty);
  } catch (err) {
    console.error("Failed to update cart:", err);
    await fetchCart();
  }
};

  // ── Show modal instead of removing directly ────────────────────────────────
  const promptRemove = (item: CartItem) => {
    setDeleteTarget(item);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    const customerId = getCustomerId();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.removeCartItem(customerId, item.id);
    } catch (err) {
      console.error("Failed to remove item:", err);
      await fetchCart();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setGcashImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getEffectivePrice = (item: CartItem) =>
    item.product.finalPrice != null &&
    item.product.finalPrice < item.product.price
      ? item.product.finalPrice
      : item.product.price;

  const subtotal = items.reduce(
    (sum, i) => sum + getEffectivePrice(i) * i.quantity,
    0
  );

  const totalDiscount = items.reduce((sum, i) => {
    const fp = i.product.finalPrice;
    if (fp != null && fp < i.product.price) {
      return sum + (i.product.price - fp) * i.quantity;
    }
    return sum;
  }, 0);

  const total = subtotal;

  // ── Cash change logic ──────────────────────────────────────────────────────
  const cashAmount = parseFloat(cashInput.replace(/,/g, "")) || 0;
  const change = cashAmount - total;
  const isExactOrOver = cashAmount >= total;

  const hasStockIssue = items.some(
    (i) => i.quantity > (i.product.stock ?? Infinity)
  );

  const canCheckout =
    items.length > 0 &&
    !hasStockIssue &&
    (paymentMethod === "cod" ||
      (paymentMethod === "gcash" &&
        gcashRef.trim() !== "" &&
        gcashImage !== null));

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
        <p style={{ color: "#aaa", fontSize: "14px" }}>Loading cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #f0faf2, #e8f5e9)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>🛒</div>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "10px",
          }}
        >
          Your cart is empty
        </h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px" }}>
          Add some products to get started!
        </p>
        <Link
          href="/products"
          style={{
            background: "#2d7a3a",
            color: "#fff",
            textDecoration: "none",
            padding: "13px 40px",
            borderRadius: "30px",
            fontSize: "15px",
            fontWeight: 600,
            boxShadow: "0 6px 20px rgba(45,122,58,0.3)",
          }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={confirmRemove}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div
        style={{
          padding: isMobile ? "16px" : "28px",
          background: "#f5f5f5",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
          🛒 {items.length} item{items.length !== 1 ? "s" : ""} in your cart
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 400px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Cart Items ── */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {items.map((item) => {
              const emoji = getEmoji(item.product.category);
              const bg = getBg(item.product.category);
              const effectivePrice = getEffectivePrice(item);
              const hasDiscount =
                item.product.finalPrice != null &&
                item.product.finalPrice < item.product.price;

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: "0.5px solid #e8e8e8",
                    padding: "18px 22px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: "18px",
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? "60px" : "80px",
                      height: isMobile ? "60px" : "80px",
                      borderRadius: "14px",
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "36px",
                      flexShrink: 0,
                    }}
                  >
                    {emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        marginBottom: "3px",
                      }}
                    >
                      {item.product.productName}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginBottom: "10px",
                      }}
                    >
                      {item.product.size
                        ? `Size: ${item.product.size}`
                        : item.product.category || ""}
                    </p>

                    {hasDiscount ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#bbb",
                            textDecoration: "line-through",
                            margin: 0,
                          }}
                        >
                          ₱
                          {(item.product.price * item.quantity).toLocaleString()}
                          .00
                        </p>
                        <p
                          style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#2d7a3a",
                            margin: 0,
                          }}
                        >
                          ₱{(effectivePrice * item.quantity).toLocaleString()}
                          .00
                        </p>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#fff",
                            background: "#e53935",
                            borderRadius: "6px",
                            padding: "2px 6px",
                          }}
                        >
                          PROMO
                        </span>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#2d7a3a",
                          margin: 0,
                        }}
                      >
                        ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1.5px solid #e8e8e8",
                          borderRadius: "30px",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => handleUpdateQty(item, -1)}
                          style={{
                            width: "36px",
                            height: "36px",
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor: "pointer",
                            color: "#2d7a3a",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: "32px",
                            textAlign: "center",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item, 1)}
                          disabled={
                            item.quantity >= (item.product.stock ?? Infinity)
                          }
                          style={{
                            width: "36px",
                            height: "36px",
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor:
                              item.quantity >= (item.product.stock ?? Infinity)
                                ? "not-allowed"
                                : "pointer",
                            color:
                              item.quantity >= (item.product.stock ?? Infinity)
                                ? "#ccc"
                                : "#2d7a3a",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>
                      {stockWarning === item.id && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#e53935",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ⚠️ Max stock reached
                        </span>
                      )}
                    </div>

                    {/* ── Remove button now triggers modal ── */}
                    <button
                      onClick={() => promptRemove(item)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#ffebee",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
            <Link
              href="/products"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#2d7a3a",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                padding: "4px 0",
              }}
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              border: "0.5px solid #e8e8e8",
              padding: "24px",
              position: isMobile ? "relative" : "sticky",
              top: isMobile ? "auto" : "20px",
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

            {/* Itemized list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {items.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const hasDiscount =
                  item.product.finalPrice != null &&
                  item.product.finalPrice < item.product.price;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {item.product.productName} × {item.quantity}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      {hasDiscount && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#bbb",
                            textDecoration: "line-through",
                          }}
                        >
                          ₱
                          {(item.product.price * item.quantity).toLocaleString()}
                          .00
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#2d7a3a",
                        }}
                      >
                        ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                height: "1px",
                background: "#f0f0f0",
                margin: "14px 0",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
                ₱{subtotal.toLocaleString()}.00
              </span>
            </div>

            {totalDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#e53935" }}>
                  🏷️ Promo Discount
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#e53935",
                  }}
                >
                  −₱{totalDiscount.toLocaleString()}.00
                </span>
              </div>
            )}

            <div
              style={{
                height: "1px",
                background: "#f0f0f0",
                margin: "14px 0",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span
                style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}
              >
                Total
              </span>
              <span
                style={{ fontSize: "22px", fontWeight: 700, color: "#2d7a3a" }}
              >
                ₱{total.toLocaleString()}.00
              </span>
            </div>

            {/* Payment Method */}
            <p
              style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}
            >
              Payment Method
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[
                { key: "cod", label: "💵 Cash on Delivery" },
                { key: "gcash", label: "📱 GCash" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key as "cod" | "gcash")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    border:
                      paymentMethod === m.key
                        ? "2px solid #2d7a3a"
                        : "1.5px solid #e0e0e0",
                    background: paymentMethod === m.key ? "#f0faf2" : "#fff",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: paymentMethod === m.key ? "#2d7a3a" : "#888",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── GCash Section ── */}
            {paymentMethod === "gcash" && (
              <div
                style={{
                  background: "#f8f0ff",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "16px",
                  border: "1px solid #e0c8ff",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#6a1b9a",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  📲 Scan to Pay via GCash
                </p>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                    marginBottom: "14px",
                    border: "1px solid #e0c8ff",
                  }}
                >
                  <svg
                    width="120"
                    height="120"
                    viewBox="0 0 120 120"
                    style={{ margin: "0 auto", display: "block" }}
                  >
                    <rect
                      x="2"
                      y="2"
                      width="116"
                      height="116"
                      rx="8"
                      fill="white"
                      stroke="#6a1b9a"
                      strokeWidth="3"
                    />
                    <rect
                      x="10"
                      y="10"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="15"
                      y="15"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="19"
                      y="19"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="80"
                      y="10"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="85"
                      y="15"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="89"
                      y="19"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="10"
                      y="80"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="15"
                      y="85"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="19"
                      y="89"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    {[
                      [50, 10],[56, 10],[62, 10],[50, 16],[62, 16],[50, 22],
                      [54, 22],[58, 22],[62, 22],[10, 50],[16, 50],[22, 50],
                      [28, 50],[10, 56],[22, 56],[28, 56],[10, 62],[16, 62],
                      [28, 62],[50, 50],[58, 50],[66, 50],[74, 50],[50, 58],
                      [54, 58],[62, 58],[70, 58],[50, 66],[58, 66],[66, 66],
                      [80, 50],[88, 50],[96, 50],[104, 50],[80, 58],[96, 58],
                      [80, 66],[88, 66],[96, 66],[104, 66],[50, 80],[58, 80],
                      [66, 80],[50, 88],[62, 88],[70, 88],[54, 96],[58, 96],
                      [66, 96],[74, 96],
                    ].map(([x, y], i) => (
                      <rect key={i} x={x} y={y} width="5" height="5" fill="#6a1b9a" />
                    ))}
                  </svg>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#6a1b9a",
                      marginTop: "8px",
                    }}
                  >
                    Julieta Soft Drinks
                  </p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>
                    GCash: 0912 345 6789
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#2d7a3a",
                      marginTop: "4px",
                    }}
                  >
                    ₱{total.toLocaleString()}.00
                  </p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6a1b9a",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    🔢 GCash Reference Number{" "}
                    <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                    placeholder="e.g. 1234567890123"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: gcashRef
                        ? "1.5px solid #6a1b9a"
                        : "1.5px solid #e0c8ff",
                      fontSize: "13px",
                      outline: "none",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6a1b9a",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    📸 Upload Payment Screenshot{" "}
                    <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  {gcashImage ? (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid #6a1b9a",
                      }}
                    >
                      <img
                        src={gcashImage}
                        alt="receipt"
                        style={{
                          width: "100%",
                          height: "120px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <button
                        onClick={() => setGcashImage(null)}
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                      <div
                        style={{
                          background: "#e8f5e9",
                          padding: "6px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        >
                          ✅ Receipt uploaded
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: "2px dashed #c084fc",
                        borderRadius: "10px",
                        padding: "18px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                        🖼️
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#6a1b9a",
                        }}
                      >
                        Click to upload screenshot
                      </p>
                      <p style={{ fontSize: "11px", color: "#bbb" }}>
                        JPG, PNG supported
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </div>
                {(!gcashRef || !gcashImage) && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#e53935",
                      marginTop: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ⚠️ Please provide both the reference number and screenshot to
                    proceed.
                  </p>
                )}
              </div>
            )}

            {/* ── COD Section with Cash Change Calculator ── */}
            {paymentMethod === "cod" && (
              <div
                style={{
                  background: "#f0faf2",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "16px",
                  border: "1px solid #a5d6a7",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#2e7d32",
                    marginBottom: "14px",
                  }}
                >
                  💵 Pay in cash when your order arrives. Please prepare the
                  exact amount.
                </p>

                {/* Cash Change Calculator */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "14px",
                    border: "1px solid #c8e6c9",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1b5e20",
                      marginBottom: "10px",
                    }}
                  >
                    🧮 Change Calculator
                  </p>

                  {/* Amount due row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#888" }}>
                      Amount Due
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      ₱{total.toLocaleString()}.00
                    </span>
                  </div>

                  {/* Cash input */}
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#2e7d32",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Customer Cash (₱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder={`e.g. ${total + 50}`}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: cashInput
                        ? isExactOrOver
                          ? "1.5px solid #2d7a3a"
                          : "1.5px solid #e53935"
                        : "1.5px solid #c8e6c9",
                      fontSize: "14px",
                      fontWeight: 600,
                      outline: "none",
                      background: "#fff",
                      boxSizing: "border-box",
                      color: "#1a1a1a",
                    }}
                  />

                  {/* Change display */}
                  {cashInput !== "" && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: isExactOrOver ? "#e8f5e9" : "#ffebee",
                        border: `1.5px solid ${isExactOrOver ? "#a5d6a7" : "#ef9a9a"}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: isExactOrOver ? "#2e7d32" : "#c62828",
                        }}
                      >
                        {isExactOrOver ? "💰 Change" : "⚠️ Insufficient"}
                      </span>
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: isExactOrOver ? "#2d7a3a" : "#e53935",
                        }}
                      >
                        {isExactOrOver
                          ? `₱${change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `−₱${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}

                  {/* Quick-fill buttons */}
                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      total,
                      Math.ceil(total / 50) * 50,
                      Math.ceil(total / 100) * 100,
                      Math.ceil(total / 500) * 500,
                    ]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .slice(0, 4)
                      .map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCashInput(String(amt))}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "20px",
                            border: "1.5px solid #a5d6a7",
                            background:
                              cashInput === String(amt) ? "#2d7a3a" : "#fff",
                            color:
                              cashInput === String(amt) ? "#fff" : "#2e7d32",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ₱{amt.toLocaleString()}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <Link
              href={canCheckout ? "/checkout" : "#"}
              onClick={(e) => {
                if (!canCheckout) e.preventDefault();
              }}
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "14px",
                borderRadius: "30px",
                fontSize: "15px",
                fontWeight: 700,
                background: canCheckout ? "#2d7a3a" : "#ccc",
                color: "#fff",
                cursor: canCheckout ? "pointer" : "not-allowed",
                boxShadow: canCheckout
                  ? "0 6px 20px rgba(45,122,58,0.3)"
                  : "none",
              }}
            >
              {hasStockIssue
                ? "⚠️ Reduce quantity to match stock"
                : paymentMethod === "gcash" && !canCheckout
                ? "Complete GCash Details First"
                : "Proceed to Checkout →"}
            </Link>

            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "#bbb",
                marginTop: "14px",
              }}
            >
              🔒 Secure checkout — your info is safe
            </p>
          </div>
        </div>
      </div>
    </>
  );
}