"use client";
import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

type Product = {
  id: string;
  productName: string;
  price: number;
  stock: number;
  supplierId?: string;
  status?: string;
  supplier?: { supplierName: string };
};

const brands = ["All"];
const sortOptions = [
  "Default",
  "Stock: High to Low",
  "Stock: Low to High",
  "Price: Low to High",
  "Price: High to Low",
];

const MAX_STOCK = 150; // fallback display max if not in schema

const getStatus = (stock: number): StockStatus => {
  if (stock === 0) return "Out of Stock";
  if (stock <= 20) return "Low Stock";
  return "In Stock";
};

const statusBadgeStyle = (status: StockStatus): React.CSSProperties => {
  if (status === "In Stock") return { background: "#e8f5e9", color: "#2e7d32" };
  if (status === "Low Stock") return { background: "#fff3e0", color: "#e65100" };
  return { background: "#ffebee", color: "#c62828" };
};

const stockBarColor = (status: StockStatus): string => {
  if (status === "In Stock") return "#4caf50";
  if (status === "Low Stock") return "#ff9800";
  return "#f44336";
};

// Deterministic color from product name
const getBgColor = (name: string): string => {
  const colors = [
    "#b71c1c", "#1a237e", "#e65100", "#33691e",
    "#f57f17", "#558b2f", "#4a148c", "#006064",
    "#bf360c", "#1b5e20",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("cola") || n.includes("pepsi")) return "🥤";
  if (n.includes("sprite") || n.includes("7up") || n.includes("mountain")) return "💚";
  if (n.includes("fanta") || n.includes("orange") || n.includes("royal")) return "🍊";
  if (n.includes("water")) return "💧";
  if (n.includes("juice")) return "🧃";
  return "🥤";
};

export default function InventoryMaintenancePage() {
  const [search, setSearch]     = useState("");
  const [brand, setBrand]       = useState("All");
  const [sortBy, setSortBy]     = useState("Default");
  const [selected, setSelected] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Derive unique supplier names for brand filter tabs
  const supplierNames = useMemo(() => {
    const names = products
      .map((p) => p.supplier?.supplierName)
      .filter((n): n is string => Boolean(n));
    return ["All", ...Array.from(new Set(names))];
  }, [products]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProducts();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to load products. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (p.status === "INACTIVE") return false;
      const supplierName = p.supplier?.supplierName || "";
      const matchBrand   = brand === "All" || supplierName === brand;
      const matchSearch  = `${p.productName} ${supplierName}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchBrand && matchSearch;
    });
    if (sortBy === "Stock: High to Low") list = [...list].sort((a, b) => b.stock - a.stock);
    if (sortBy === "Stock: Low to High") list = [...list].sort((a, b) => a.stock - b.stock);
    if (sortBy === "Price: Low to High") list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === "Price: High to Low") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [search, brand, sortBy, products]);

  const activeProducts = products.filter((p) => p.status !== "INACTIVE");
  const inStock    = activeProducts.filter((p) => getStatus(p.stock) === "In Stock").length;
  const lowStock   = activeProducts.filter((p) => getStatus(p.stock) === "Low Stock").length;
  const outOfStock = activeProducts.filter((p) => getStatus(p.stock) === "Out of Stock").length;

  return (
    <div style={{ padding: "28px" }}>
      {/* ── Header Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a3c2e, #2d7a3a)",
          borderRadius: "16px",
          padding: "24px 32px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>
            Product Inventory
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            View and monitor stock levels across all brands
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "In Stock",     value: inStock,    bg: "rgba(76,175,80,0.2)",  color: "#a5d6a7" },
            { label: "Low Stock",    value: lowStock,   bg: "rgba(255,152,0,0.2)",  color: "#ffcc80" },
            { label: "Out of Stock", value: outOfStock, bg: "rgba(244,67,54,0.2)",  color: "#ef9a9a" },
          ].map((s) => (
            <div key={s.label}
              style={{ background: s.bg, borderRadius: "12px", padding: "12px 18px", textAlign: "center" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 16px 9px 34px", borderRadius: "20px",
              border: "1.5px solid #ccc", fontSize: "13px", outline: "none",
              background: "#fff", width: "220px", color: "#1a1a1a",
            }}
          />
        </div>

        <div style={{ width: "1px", height: "28px", background: "#e0e0e0" }} />

        {/* Supplier Tabs */}
        {supplierNames.map((b) => (
          <button key={b} onClick={() => setBrand(b)}
            style={{
              padding: "8px 18px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
              fontWeight: brand === b ? 600 : 400,
              border: brand === b ? "1.5px solid #1a3c2e" : "1.5px solid #ccc",
              background: brand === b ? "#1a3c2e" : "#fff",
              color: brand === b ? "#fff" : "#1a1a1a",
            }}>
            {b}
          </button>
        ))}

        <div style={{ marginLeft: "auto" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 16px", borderRadius: "20px", border: "1.5px solid #ccc",
              fontSize: "13px", outline: "none", background: "#fff",
              cursor: "pointer", color: "#1a1a1a", fontWeight: 500,
            }}>
            {sortOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <span style={{ fontSize: "12px", color: "#1a1a1a", fontWeight: 500 }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Loading / Error States ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</p>
          <p style={{ fontWeight: 600, color: "#555" }}>Loading products...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</p>
          <p style={{ fontWeight: 600, color: "#c62828" }}>{error}</p>
        </div>
      )}

      {/* ── Product Grid ── */}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {filtered.map((p) => {
            const status = getStatus(p.stock);
            const pct    = Math.min((p.stock / MAX_STOCK) * 100, 100);
            const bg     = getBgColor(p.productName);
            const emoji  = getEmoji(p.productName);
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{
                  background: "#fff", borderRadius: "14px",
                  border: "0.5px solid #e8e8e8", overflow: "hidden",
                  cursor: "pointer", opacity: status === "Out of Stock" ? 0.75 : 1,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}>
                {/* Image Area */}
                <div style={{
                  height: "130px", background: bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "52px", position: "relative",
                }}>
                  {emoji}
                  {status === "Out of Stock" && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        color: "#fff", fontWeight: 700, fontSize: "13px",
                        background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: "20px",
                      }}>OUT OF STOCK</span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "1px" }}>
                    {p.productName}
                  </p>
                  <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px" }}>
                    {p.supplier?.supplierName || "—"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a3c2e" }}>₱{p.price}</p>
                    <span style={{
                      padding: "2px 8px", borderRadius: "20px",
                      fontSize: "10px", fontWeight: 600, ...statusBadgeStyle(status),
                    }}>
                      {status === "In Stock" ? "● In Stock" : status === "Low Stock" ? "⚠ Low Stock" : "✕ Out of Stock"}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "#f0f0f0", borderRadius: "4px", marginBottom: "4px" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: stockBarColor(status), borderRadius: "4px", transition: "width 0.3s",
                    }} />
                  </div>
                  <p style={{ fontSize: "10px", color: "#aaa" }}>
                    Stock: <span style={{ fontWeight: 600, color: stockBarColor(status) }}>{p.stock} units</span>
                  </p>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: "#aaa" }}>
              <p style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</p>
              <p style={{ fontWeight: 600, color: "#555" }}>No products found</p>
              <p style={{ fontSize: "13px" }}>Try a different search or filter</p>
            </div>
          )}
        </div>
      )}

      {/* ── Product Detail Modal ── */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", zIndex: 50,
            width: "400px", background: "#fff", borderRadius: "20px",
            overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              height: "160px", background: getBgColor(selected.productName),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "72px", position: "relative",
            }}>
              {getEmoji(selected.productName)}
              <button onClick={() => setSelected(null)}
                style={{
                  position: "absolute", top: "12px", right: "12px",
                  background: "rgba(0,0,0,0.3)", border: "none", borderRadius: "50%",
                  width: "32px", height: "32px", color: "#fff", fontSize: "14px",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>
                    {selected.productName}
                  </h2>
                  <p style={{ fontSize: "13px", color: "#aaa" }}>
                    Supplier: {selected.supplier?.supplierName || "—"}
                  </p>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600,
                  ...statusBadgeStyle(getStatus(selected.stock)),
                }}>
                  {getStatus(selected.stock)}
                </span>
              </div>

              {[
                ["💰 Price",       `₱${selected.price} per unit`],
                ["📦 Stock Level", `${selected.stock} units`],
                ["📊 Status",      getStatus(selected.stock)],
                ["🏷️ Product ID",  selected.id],
              ].map(([label, value]) => (
                <div key={String(label)} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "0.5px solid #f5f5f5",
                }}>
                  <span style={{ fontSize: "13px", color: "#888" }}>{label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{value}</span>
                </div>
              ))}

              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Stock Level</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: stockBarColor(getStatus(selected.stock)) }}>
                    {Math.round((selected.stock / MAX_STOCK) * 100)}%
                  </span>
                </div>
                <div style={{ height: "8px", background: "#f0f0f0", borderRadius: "8px" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((selected.stock / MAX_STOCK) * 100, 100)}%`,
                    background: stockBarColor(getStatus(selected.stock)),
                    borderRadius: "8px",
                  }} />
                </div>
              </div>

              <button onClick={() => setSelected(null)}
                style={{
                  width: "100%", marginTop: "20px", padding: "12px",
                  borderRadius: "20px", border: "none", background: "#1a3c2e",
                  color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
