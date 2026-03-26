"use client";
import { useState, useMemo } from "react";
import { useCart } from "@/context/CartContext";

const categories = ["All", "Cola", "Soda", "Juice", "Energy"];

const products = [
  {
    id: 1,
    name: "Cola Regular",
    desc: "1 case (24 bottles, 350ml each)",
    price: 480,
    category: "cola",
    badge: "",
    badgeType: "",
    emoji: "🥤",
    bg: "#3d1a00",
  },
  {
    id: 2,
    name: "Cola Zero",
    desc: "1 case (24 bottles, 350ml each)",
    price: 480,
    category: "cola",
    badge: "NEW",
    badgeType: "new",
    emoji: "🥤",
    bg: "#b71c1c",
  },
  {
    id: 3,
    name: "Orange Soda",
    desc: "1 case (24 bottles, 350ml each)",
    price: 450,
    category: "soda",
    badge: "10% off",
    badgeType: "sale",
    emoji: "🍊",
    bg: "#e65100",
  },
  {
    id: 4,
    name: "Lemon Lime",
    desc: "1 case (24 bottles, 350ml each)",
    price: 450,
    category: "soda",
    badge: "",
    badgeType: "",
    emoji: "🍋",
    bg: "#558b2f",
  },
  {
    id: 5,
    name: "Root Beer",
    desc: "1 case (24 bottles, 350ml each)",
    price: 460,
    category: "soda",
    badge: "HOT",
    badgeType: "hot",
    emoji: "🍺",
    bg: "#4e342e",
  },
  {
    id: 6,
    name: "Grape Soda",
    desc: "1 case (24 bottles, 350ml each)",
    price: 460,
    category: "soda",
    badge: "NEW",
    badgeType: "new",
    emoji: "🍇",
    bg: "#4a148c",
  },
  {
    id: 7,
    name: "Mango Juice",
    desc: "1 case (24 bottles, 350ml each)",
    price: 520,
    category: "juice",
    badge: "",
    badgeType: "",
    emoji: "🥭",
    bg: "#f57f17",
  },
  {
    id: 8,
    name: "Energy Blast",
    desc: "1 case (24 bottles, 250ml each)",
    price: 600,
    category: "energy",
    badge: "HOT",
    badgeType: "hot",
    emoji: "⚡",
    bg: "#1a237e",
  },
];

const badgeStyle = (type: string): React.CSSProperties => {
  if (type === "new") return { background: "#2d7a3a", color: "#fff" };
  if (type === "sale") return { background: "#f5c842", color: "#7a4f00" };
  if (type === "hot") return { background: "#e53935", color: "#fff" };
  return {};
};

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const { addToCart } = useCart();

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchCat =
          activeCategory === "All" ||
          p.category === activeCategory.toLowerCase();
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [activeCategory, search],
  );

  const handleAddToCart = (p: (typeof products)[0]) => {
    addToCart({
      id: p.id,
      name: p.name,
      desc: p.desc,
      price: p.price,
      emoji: p.emoji,
      bg: p.bg,
    });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1000);
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* ── Filter Bar: Search + Categories in one row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
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

        {/* Divider */}
        <div style={{ width: "1px", height: "28px", background: "#e0e0e0" }} />

        {/* Category Tabs */}
        {categories.map((c) => (
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
                activeCategory === c ? "1.5px solid #2d7a3a" : "1px solid #ddd",
              background: activeCategory === c ? "#2d7a3a" : "#fff",
              color: activeCategory === c ? "#fff" : "#555",
              transition: "all 0.2s",
            }}
          >
            {c}
          </button>
        ))}

        {/* Result count — pushed to right */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#aaa",
            whiteSpace: "nowrap",
          }}
        >
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Products Grid ── */}
      {filtered.length === 0 ? (
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
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "18px",
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "0.5px solid #e8e8e8",
                overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
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
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: "100%",
                  height: "170px",
                  background: p.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <span style={{ fontSize: "64px" }}>{p.emoji}</span>
                {p.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "10px",
                      fontWeight: 600,
                      ...badgeStyle(p.badgeType),
                    }}
                  >
                    {p.badge}
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
                  {p.name}
                </p>
                <p
                  style={{
                    fontSize: "11.5px",
                    color: "#aaa",
                    marginBottom: "12px",
                  }}
                >
                  {p.desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#2d7a3a",
                      }}
                    >
                      ₱{p.price}.00
                    </p>
                    <p style={{ fontSize: "10px", color: "#bbb" }}>per case</p>
                  </div>
                  <button
                    onClick={() => handleAddToCart(p)}
                    style={{
                      background: added === p.id ? "#2d7a3a" : "#7c3aed",
                      color: "#fff",
                      border: "none",
                      borderRadius: "20px",
                      padding: "9px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.3s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {added === p.id ? "✓ Added!" : "+ Add to Cart"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
