"use client";
import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";

type Product = {
  id: string;
  productName: string;
  price: number;
  finalPrice?: number;
  category?: string;
  size?: string;
  stock?: number;
  status?: string;
  image?: string;
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

const getEmoji = (category?: string) =>
  EMOJI_MAP[category?.toUpperCase() || ""] || "🥤";
const getBg = (category?: string) =>
  BG_MAP[category?.toUpperCase() || ""] || "#424242";

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: "0.5px solid #e8e8e8",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "170px",
          background:
            "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }}
      />
      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            height: "14px",
            borderRadius: "6px",
            background:
              "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
            width: "70%",
          }}
        />
        <div
          style={{
            height: "11px",
            borderRadius: "6px",
            background:
              "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
            width: "45%",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              height: "22px",
              borderRadius: "6px",
              background:
                "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
              width: "40%",
            }}
          />
          <div
            style={{
              height: "34px",
              borderRadius: "20px",
              background:
                "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
              width: "36%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [added, setAdded] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const getCustomerId = () => {
    if (typeof window === "undefined") return "";
    return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.getProducts();
        const active = Array.isArray(data)
          ? data.filter((p: Product) => p.status === "ACTIVE")
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

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category || "OTHER")),
    );
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchCat =
          activeCategory === "All" ||
          (p.category || "OTHER") === activeCategory;
        const matchSearch = p.productName
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [activeCategory, search, products],
  );

  const handleAddToCart = async (p: Product) => {
    if ((p.stock ?? 0) <= 0) return;

    const customerId = getCustomerId();
    if (!customerId) {
      alert("Please log in to add items to cart.");
      return;
    }

    try {
      setAdding(p.id);
      const result = await api.addCartItem(customerId, p.id, 1);

      if (result?.message?.toLowerCase().includes("insufficient")) {
        alert(result.message);
        return;
      }

      setAdded(p.id);
      setTimeout(() => setAdded(null), 1000);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ padding: "24px 28px" }}>
        {/* ── Filter Bar ── */}
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
                border: "0.5px solid #ddd",
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

          {/* Show skeleton pills while loading, real categories after */}
          {loading ? (
            <>
              {[80, 100, 70, 90].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: "34px",
                    width: `${w}px`,
                    borderRadius: "20px",
                    background:
                      "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s infinite",
                  }}
                />
              ))}
            </>
          ) : (
            categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: activeCategory === c ? 600 : 400,
                  border:
                    activeCategory === c
                      ? "1.5px solid #2d7a3a"
                      : "1px solid #ddd",
                  background: activeCategory === c ? "#2d7a3a" : "#fff",
                  color: activeCategory === c ? "#fff" : "#555",
                  transition: "all 0.2s",
                }}
              >
                {c}
              </button>
            ))
          )}

          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color: "#aaa",
              whiteSpace: "nowrap",
            }}
          >
            {loading
              ? ""
              : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* ── Skeleton Grid ── */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "18px",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              No products found
            </p>
            <p style={{ fontSize: "13px", color: "#aaa" }}>
              Try a different search or category
            </p>
          </div>
        )}

        {/* ── Products Grid ── */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "18px",
            }}
          >
            {filtered.map((p) => {
              const outOfStock = (p.stock ?? 0) <= 0;
              const isAdded = added === p.id;
              const isAdding = adding === p.id;
              const emoji = getEmoji(p.category);
              const bg = getBg(p.category);
              const hasPromo = p.finalPrice != null && p.finalPrice < p.price;

              return (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: "0.5px solid #e8e8e8",
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    opacity: outOfStock ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(-3px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "0 8px 24px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "none";
                  }}
                >
                  {/* Image */}
                  <div
                    style={{
                      width: "100%",
                      height: "170px",
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "64px" }}>{emoji}</span>

                    {outOfStock && (
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: "#e53935",
                          color: "#fff",
                        }}
                      >
                        Out of Stock
                      </span>
                    )}
                    {!outOfStock && (p.stock ?? 0) <= 10 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: "#f5c842",
                          color: "#7a4f00",
                        }}
                      >
                        Low Stock
                      </span>
                    )}
                    {hasPromo && !outOfStock && (
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: 700,
                          background: "#e53935",
                          color: "#fff",
                        }}
                      >
                        PROMO
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: "14px 16px 16px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        marginBottom: "2px",
                      }}
                    >
                      {p.productName}
                    </p>
                    <p
                      style={{
                        fontSize: "11.5px",
                        color: "#aaa",
                        marginBottom: "12px",
                      }}
                    >
                      {p.size ? `Size: ${p.size}` : p.category || "—"}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        {hasPromo ? (
                          <>
                            <p
                              style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "#2d7a3a",
                                margin: 0,
                              }}
                            >
                              ₱{p.finalPrice!.toLocaleString()}
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#bbb",
                                textDecoration: "line-through",
                                margin: 0,
                              }}
                            >
                              ₱{p.price.toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p
                            style={{
                              fontSize: "20px",
                              fontWeight: 700,
                              color: "#2d7a3a",
                              margin: 0,
                            }}
                          >
                            ₱{p.price.toLocaleString()}
                          </p>
                        )}
                        <p
                          style={{
                            fontSize: "10px",
                            color: "#bbb",
                            marginTop: "2px",
                          }}
                        >
                          {outOfStock ? "unavailable" : `${p.stock} in stock`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={outOfStock || isAdding}
                        style={{
                          background: outOfStock
                            ? "#ccc"
                            : isAdded
                              ? "#2d7a3a"
                              : isAdding
                                ? "#9c6fe4"
                                : "#7c3aed",
                          color: "#fff",
                          border: "none",
                          borderRadius: "20px",
                          padding: "9px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor:
                            outOfStock || isAdding ? "not-allowed" : "pointer",
                          transition: "background 0.3s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isAdding
                          ? "Adding..."
                          : isAdded
                            ? "✓ Added!"
                            : outOfStock
                              ? "Out of Stock"
                              : "+ Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
