"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  emoji: string;
  bg: string;
  badge?: string;
};

type CartItem = Product & { qty: number };

const products: Product[] = [
  {
    id: 1,
    name: "Coca Cola",
    brand: "Coca Cola",
    price: 80,
    emoji: "🥤",
    bg: "#b71c1c",
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "Diet Coke",
    brand: "Coca Cola",
    price: 80,
    emoji: "🥤",
    bg: "#424242",
  },
  {
    id: 3,
    name: "Coke Zero",
    brand: "Coca Cola",
    price: 80,
    emoji: "🥤",
    bg: "#212121",
  },
  {
    id: 4,
    name: "Sprite",
    brand: "Coca Cola",
    price: 80,
    emoji: "🍋",
    bg: "#33691e",
  },
  {
    id: 5,
    name: "Royal",
    brand: "Coca Cola",
    price: 75,
    emoji: "🍊",
    bg: "#e65100",
  },
  {
    id: 6,
    name: "Pepsi",
    brand: "Pepsi",
    price: 80,
    emoji: "🥤",
    bg: "#1a237e",
    badge: "Popular",
  },
  {
    id: 7,
    name: "Mountain Dew",
    brand: "Pepsi",
    price: 80,
    emoji: "💚",
    bg: "#33691e",
  },
  { id: 8, name: "7UP", brand: "Pepsi", price: 75, emoji: "🍋", bg: "#558b2f" },
  {
    id: 9,
    name: "Mirinda",
    brand: "Pepsi",
    price: 75,
    emoji: "🍊",
    bg: "#e65100",
  },
  {
    id: 10,
    name: "Fanta Orange",
    brand: "Fanta",
    price: 75,
    emoji: "🍊",
    bg: "#f57f17",
    badge: "New",
  },
  {
    id: 11,
    name: "Fanta Grape",
    brand: "Fanta",
    price: 75,
    emoji: "🍇",
    bg: "#4a148c",
  },
  {
    id: 12,
    name: "Energy Blast",
    brand: "Others",
    price: 95,
    emoji: "⚡",
    bg: "#1a237e",
    badge: "Hot",
  },
];

const brands = ["All", "Coca Cola", "Pepsi", "Fanta", "Others"];

export default function OrderingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchBrand = brand === "All" || p.brand === brand;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchBrand && matchSearch;
      }),
    [brand, search],
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Navigate to payment page
  const handleCheckout = () => {
    if (cart.length > 0) router.push("/cashier/payment");
  };

  const handleClear = () => {
    setCart([]);
    setShowClearConfirm(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        overflow: "hidden",
      }}
    >
      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 100px" }}>
        {/* Search + Brand Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px",
                color: "#aaa",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "9px 16px 9px 34px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                fontSize: "13px",
                outline: "none",
                background: "#fff",
                width: "220px",
              }}
            />
          </div>
          <div
            style={{ width: "1px", height: "28px", background: "#e0e0e0" }}
          />
          {brands.map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                cursor: "pointer",
                border: brand === b ? "none" : "1px solid #ddd",
                background: brand === b ? "#1a3c2e" : "#fff",
                color: brand === b ? "#fff" : "#555",
                fontWeight: brand === b ? 600 : 400,
              }}
            >
              {b}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>
            {filtered.length} products
          </span>
        </div>

        {/* Product Grid — 4 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
          }}
        >
          {filtered.map((p) => {
            const inCart = cart.find((i) => i.id === p.id);
            return (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: inCart ? "2px solid #1a3c2e" : "0.5px solid #e8e8e8",
                  overflow: "hidden",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!inCart)
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "0 6px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                {/* Image */}
                <div
                  onClick={() => addToCart(p)}
                  style={{
                    height: "140px",
                    background: p.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "56px",
                    position: "relative",
                  }}
                >
                  {p.emoji}
                  {p.badge && (
                    <span
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        background: "#f5c842",
                        color: "#1a3c2e",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}
                    >
                      {p.badge}
                    </span>
                  )}
                  {inCart && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "#1a3c2e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {inCart.qty}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "12px 14px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "2px",
                    }}
                  >
                    {p.name}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      marginBottom: "10px",
                    }}
                  >
                    {p.brand}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#1a3c2e",
                      }}
                    >
                      ₱{p.price}.00
                    </p>
                    {inCart ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <button
                          onClick={() => updateQty(p.id, -1)}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            border: "1.5px solid #e0e0e0",
                            background: "#fff",
                            fontSize: "16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#1a3c2e",
                            fontWeight: 700,
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            minWidth: "20px",
                            textAlign: "center",
                          }}
                        >
                          {inCart.qty}
                        </span>
                        <button
                          onClick={() => updateQty(p.id, 1)}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            border: "none",
                            background: "#1a3c2e",
                            fontSize: "16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        style={{
                          background: "#1a3c2e",
                          color: "#fff",
                          border: "none",
                          borderRadius: "20px",
                          padding: "7px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Fixed Bottom Bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "220px",
          right: 0,
          background: "#fff",
          borderTop: "1px solid #e8e8e8",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Cart Summary */}
          {cart.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              {cart.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f5f5f5",
                    padding: "5px 12px",
                    borderRadius: "20px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.emoji}</span>
                  <span
                    style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}
                  >
                    {item.name} x{item.qty}
                  </span>
                </div>
              ))}
              {cart.length > 4 && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    alignSelf: "center",
                  }}
                >
                  +{cart.length - 4} more
                </span>
              )}
            </div>
          )}
          {cart.length === 0 && (
            <p style={{ fontSize: "13px", color: "#aaa" }}>
              No items in cart yet
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "12px", color: "#aaa" }}>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c2e" }}>
              Total: ₱{total.toLocaleString()}.00
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={cart.length === 0}
            style={{
              padding: "11px 24px",
              borderRadius: "20px",
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              color: cart.length === 0 ? "#ccc" : "#e53935",
              fontSize: "13px",
              fontWeight: 600,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Clear Cart
          </button>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{
              padding: "11px 28px",
              borderRadius: "20px",
              border: "none",
              background: cart.length === 0 ? "#ccc" : "#1a3c2e",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              boxShadow:
                cart.length > 0 ? "0 4px 14px rgba(26,60,46,0.3)" : "none",
            }}
          >
            Checkout & Pay →
          </button>
        </div>
      </div>

      {/* ── Clear Confirm Modal ── */}
      {showClearConfirm && (
        <>
          <div
            onClick={() => setShowClearConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 50,
              background: "#fff",
              borderRadius: "16px",
              padding: "28px",
              width: "340px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Clear Cart?
            </p>
            <p
              style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}
            >
              All {itemCount} items will be removed.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "20px",
                  border: "1.5px solid #e0e0e0",
                  background: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "20px",
                  border: "none",
                  background: "#e53935",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
