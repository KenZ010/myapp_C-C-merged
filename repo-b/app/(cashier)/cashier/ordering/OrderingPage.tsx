"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Product = {
  id: string;
  productName: string;
  price: number;
  category?: string;
  stock?: number;
  status?: string;
};

type CartItem = Product & { qty: number };

const EMOJI_MAP: Record<string, string> = {
  "Soft Drinks": "🥤",
  Beer: "🍺",
  "Energy Drink": "⚡",
  Water: "💧",
  Juice: "🍹",
};

const BG_MAP: Record<string, string> = {
  "Soft Drinks": "#b71c1c",
  Beer: "#f57f17",
  "Energy Drink": "#1a237e",
  Water: "#0288d1",
  Juice: "#2e7d32",
};

const getEmoji = (category?: string) => EMOJI_MAP[category || ""] || "🥤";
const getBg = (category?: string) => BG_MAP[category || ""] || "#424242";

export default function OrderingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        const active = Array.isArray(data)
          ? data.filter((p: Product) => p.status !== "INACTIVE")
          : [];
        setProducts(active);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Derive unique categories for filter tabs
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category || "Other")),
    );
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchCat = brand === "All" || (p.category || "Other") === brand;
        const matchSearch = (p.productName || "")
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [brand, search, products],
  );

  const addToCart = (product: Product) => {
    if ((product.stock ?? 0) <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
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
        {/* Search + Category Filter */}
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

          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setBrand(c)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                cursor: "pointer",
                border: brand === c ? "none" : "1px solid #ddd",
                background: brand === c ? "#1a3c2e" : "#fff",
                color: brand === c ? "#fff" : "#555",
                fontWeight: brand === c ? 600 : 400,
              }}
            >
              {c}
            </button>
          ))}

          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>
            {filtered.length} products
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            Loading products...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
            <p style={{ color: "#aaa", fontSize: "14px" }}>
              No products found.
            </p>
          </div>
        )}

        {/* Product Grid — 4 columns */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "16px",
            }}
          >
            {filtered.map((p) => {
              const inCart = cart.find((i) => i.id === p.id);
              const outOfStock = (p.stock ?? 0) <= 0;
              const emoji = getEmoji(p.category);
              const bg = getBg(p.category);

              return (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: inCart
                      ? "2px solid #1a3c2e"
                      : "0.5px solid #e8e8e8",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    cursor: outOfStock ? "not-allowed" : "pointer",
                    opacity: outOfStock ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!inCart && !outOfStock)
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "none";
                  }}
                >
                  {/* Image area */}
                  <div
                    onClick={() => addToCart(p)}
                    style={{
                      height: "140px",
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "56px",
                      position: "relative",
                    }}
                  >
                    {emoji}
                    {outOfStock && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          background: "#e53935",
                          color: "#fff",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        Out of Stock
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
                      {p.productName}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#aaa",
                        marginBottom: "10px",
                      }}
                    >
                      {p.category || "—"}
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
                        ₱{p.price.toLocaleString()}
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
                          disabled={outOfStock}
                          style={{
                            background: outOfStock ? "#ccc" : "#1a3c2e",
                            color: "#fff",
                            border: "none",
                            borderRadius: "20px",
                            padding: "7px 14px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: outOfStock ? "not-allowed" : "pointer",
                          }}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                    {/* Stock indicator */}
                    {!outOfStock && (p.stock ?? 0) <= 10 && (
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#f57c00",
                          marginTop: "6px",
                        }}
                      >
                        ⚠️ Only {p.stock} left
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #e8e8e8",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {cart.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                maxWidth: "100%",
              }}
            >
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
                  <span style={{ fontSize: "14px" }}>
                    {getEmoji(item.category)}
                  </span>
                  <span
                    style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}
                  >
                    {item.productName} x{item.qty}
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
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
