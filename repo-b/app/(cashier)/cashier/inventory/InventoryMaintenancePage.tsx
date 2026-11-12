"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Theme (same as the Pending & Transaction pages) ───────────────────────────
const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

type Product = {
  id: string;
  productName: string;
  price: number;
  size?: string | null;
  stock: number;
  supplierId?: string;
  status?: string;
  image?: string | null; // ← product photo (same field used on the customer Products page)
  supplier?: { supplierName: string };
};

const sortOptions = [
  "Default",
  "Stock: High to Low",
  "Stock: Low to High",
  "Price: Low to High",
  "Price: High to Low",
];

const MAX_STOCK = 150; // fallback display max if not in schema

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const sp = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  inventory: (<svg width="20" height="20" viewBox="0 0 24 24" {...sp} strokeWidth={1.8}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  layers: (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  checkCircle: (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  alert: (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  xCircle: (<svg width="18" height="18" viewBox="0 0 24 24" {...sp}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  search: (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  refresh: (<svg width="15" height="15" viewBox="0 0 24 24" {...sp}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  x: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  tag: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
  peso: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  box: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  chart: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  truck: (<svg width="14" height="14" viewBox="0 0 24 24" {...sp}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  dot: (<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>),
  emptyState: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Peso amount with 2 decimals, e.g. 12493.6 -> "12,493.60" */
const peso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getStatus = (stock: number): StockStatus => {
  if (stock === 0) return "Out of Stock";
  if (stock <= 20) return "Low Stock";
  return "In Stock";
};

const statusStyle: Record<StockStatus, { bg: string; color: string; border: string; bar: string }> = {
  "In Stock":     { bg: GREEN_LIGHT, color: GREEN_DARK, border: "#b7dcbd", bar: GREEN_MID },
  "Low Stock":    { bg: "#fffbeb",   color: "#b45309",  border: "#fde68a", bar: "#f59e0b" },
  "Out of Stock": { bg: "#fef2f2",   color: "#b91c1c",  border: "#fecaca", bar: "#ef4444" },
};

const statusIcon = (s: StockStatus) =>
  s === "In Stock" ? Icon.dot : s === "Low Stock" ? Icon.alert : Icon.x;

// Soft, green-friendly placeholder tones (used only when a product has no photo)
const getBgColor = (name: string): string => {
  const colors = [
    "#e3f3e6", "#e0f2f1", "#eaf4dc", "#fdf1dc",
    "#e6eefb", "#f6e9e4", "#ecf1e0", "#e4f1ea",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("cola") || n.includes("pepsi")) return "🥤";
  if (n.includes("sprite") || n.includes("7up") || n.includes("mountain"))
    return "💚";
  if (n.includes("fanta") || n.includes("orange") || n.includes("royal"))
    return "🍊";
  if (n.includes("water")) return "💧";
  if (n.includes("juice")) return "🧃";
  return "🥤";
};

// ── Product image (shows the real photo, falls back to the emoji) ─────────────
function ProductImage({
  image,
  emoji,
  alt,
}: {
  image?: string | null;
  emoji: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={alt}
        onError={() => setFailed(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return <>{emoji}</>;
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#eef5ef 25%,#dfeae2 50%,#eef5ef 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

function SkeletonStatCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "20px 22px" }}>
      <div style={{ ...shimmerBg, height: "11px", width: "80px", borderRadius: "6px", marginBottom: "12px" }} />
      <div style={{ ...shimmerBg, height: "28px", width: "60px", borderRadius: "6px" }} />
    </div>
  );
}

function SkeletonProductCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" }}>
      <div style={{ ...shimmerBg, height: "140px" }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ ...shimmerBg, height: "13px", width: "70%", borderRadius: "6px" }} />
        <div style={{ ...shimmerBg, height: "11px", width: "45%", borderRadius: "6px" }} />
        <div style={{ ...shimmerBg, height: "6px", width: "100%", borderRadius: "6px" }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InventoryMaintenancePage() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("All");
  const [sortBy, setSortBy] = useState("Default");
  const [selected, setSelected] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive unique supplier names for brand filter tabs
  const supplierNames = useMemo(() => {
    const names = products
      .map((p) => p.supplier?.supplierName)
      .filter((n): n is string => Boolean(n));
    return ["All", ...Array.from(new Set(names))];
  }, [products]);

  const fetchProducts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (p.status === "INACTIVE") return false;
      const supplierName = p.supplier?.supplierName || "";
      const matchBrand = brand === "All" || supplierName === brand;
      const matchSearch = `${p.productName} ${supplierName}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchBrand && matchSearch;
    });

    if (sortBy === "Stock: High to Low")
      list = [...list].sort((a, b) => b.stock - a.stock);
    if (sortBy === "Stock: Low to High")
      list = [...list].sort((a, b) => a.stock - b.stock);
    if (sortBy === "Price: Low to High")
      list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === "Price: High to Low")
      list = [...list].sort((a, b) => b.price - a.price);

    // ── Pin In Stock → Low Stock → Out of Stock ──
    if (sortBy === "Default") {
      const priority = { "In Stock": 0, "Low Stock": 1, "Out of Stock": 2 };
      list = [...list].sort(
        (a, b) => priority[getStatus(a.stock)] - priority[getStatus(b.stock)]
      );
    }

    return list;
  }, [search, brand, sortBy, products]);

  const activeProducts = products.filter((p) => p.status !== "INACTIVE");
  const inStock = activeProducts.filter((p) => getStatus(p.stock) === "In Stock").length;
  const lowStock = activeProducts.filter((p) => getStatus(p.stock) === "Low Stock").length;
  const outOfStock = activeProducts.filter((p) => getStatus(p.stock) === "Out of Stock").length;

  const statCards = [
    { label: "All Products", count: activeProducts.length, icon: Icon.layers,      accent: GREEN,     light: GREEN_LIGHT, highlight: true  },
    { label: "In Stock",     count: inStock,               icon: Icon.checkCircle, accent: GREEN_MID, light: GREEN_LIGHT, highlight: false },
    { label: "Low Stock",    count: lowStock,              icon: Icon.alert,       accent: "#d97706", light: "#fffbeb",   highlight: false },
    { label: "Out of Stock", count: outOfStock,            icon: Icon.xCircle,     accent: "#dc2626", light: "#fef2f2",   highlight: false },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .btn-outline:hover { background: ${GREEN_TINT} !important; border-color: ${GREEN} !important; }
        .btn-green:hover { background: ${GREEN_DARK} !important; }
        .tab-btn:hover { color: ${GREEN_DARK} !important; }
        .green-input:focus { border-color: ${GREEN} !important; box-shadow: 0 0 0 3px rgba(46,125,62,0.14); outline: none; }
        .product-card { transition: transform 0.15s, box-shadow 0.18s, border-color 0.18s; }
        .product-card:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(31,95,45,0.14); border-color: #b7dcbd !important; }
        .inv-page button:focus-visible, .product-card:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
      `}</style>

      <div className="inv-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", flexShrink: 0 }}>
              {Icon.inventory}
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.02em" }}>Product Inventory</h1>
              <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>View and monitor stock levels across all brands</p>
            </div>
          </div>
          <button onClick={fetchProducts} className="btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, transition: "all 0.15s" }}>
            <span style={{ display: "flex" }}>{Icon.refresh}</span> Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((s) => (
                <div key={s.label}
                  style={{
                    position: "relative", overflow: "hidden", borderRadius: "14px", padding: "20px 22px",
                    background: s.highlight ? `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` : "#fff",
                    border: s.highlight ? "none" : `1px solid ${GREEN_BORDER}`,
                    boxShadow: s.highlight ? "0 6px 18px rgba(46,125,62,0.25)" : "none",
                  }}>
                  {!s.highlight && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: s.accent }} />}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: s.highlight ? "rgba(255,255,255,0.8)" : MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.highlight ? "rgba(255,255,255,0.18)" : s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.highlight ? "#fff" : s.accent }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: s.highlight ? "#fff" : INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {s.count}
                  </p>
                </div>
              ))}
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: FAINT, display: "flex" }}>{Icon.search}</span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="green-input"
              style={{ padding: "10px 14px 10px 38px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", background: "#fff", width: "240px", color: INK, boxSizing: "border-box", transition: "all 0.15s" }}
            />
          </div>

          {/* Supplier Tabs */}
          <div style={{ display: "flex", gap: "2px", background: GREEN_LIGHT, borderRadius: "12px", padding: "4px", flexWrap: "wrap", maxWidth: "100%" }}>
            {supplierNames.map((b) => {
              const isActive = brand === b;
              return (
                <button key={b} onClick={() => setBrand(b)} className={isActive ? undefined : "tab-btn"}
                  style={{ padding: "7px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", background: isActive ? GREEN : "transparent", color: isActive ? "#fff" : MUTED, boxShadow: isActive ? "0 2px 8px rgba(46,125,62,0.3)" : "none", transition: "all 0.15s" }}>
                  {b}
                </button>
              );
            })}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: MUTED, fontWeight: 500 }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="green-input"
              style={{ padding: "9px 14px", borderRadius: "10px", border: `1px solid ${GREEN_BORDER}`, fontSize: "13px", background: "#fff", cursor: "pointer", color: GREEN_DARK, fontWeight: 600, transition: "all 0.15s" }}
            >
              {sortOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Error ── */}
        {error && !loading && (
          <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "13px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c" }}>
              {Icon.alert}
              <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
            <button onClick={fetchProducts} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonProductCard key={i} />)}
          </div>
        )}

        {/* ── Product Grid ── */}
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            {filtered.map((p) => {
              const status = getStatus(p.stock);
              const st = statusStyle[status];
              const pct = Math.min((p.stock / MAX_STOCK) * 100, 100);
              const bg = getBgColor(p.productName);
              const emoji = getEmoji(p.productName);
              return (
                <div
                  key={p.id}
                  className="product-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(p)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p); } }}
                  style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden", cursor: "pointer" }}
                >
                  {/* Image Area */}
                  <div style={{ height: "140px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "52px", position: "relative", overflow: "hidden" }}>
                    <ProductImage image={p.image} emoji={emoji} alt={p.productName} />
                    {status === "Out of Stock" && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(20,48,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "11px", letterSpacing: "0.06em", background: "rgba(185,28,28,0.9)", padding: "5px 12px", borderRadius: "20px" }}>
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "14px 16px 16px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: INK, margin: "0 0 2px", lineHeight: 1.3 }}>
                      {p.productName}
                      {p.size && <span style={{ fontSize: "11.5px", fontWeight: 500, color: FAINT }}> · {p.size}</span>}
                    </p>
                    <p style={{ fontSize: "11.5px", color: FAINT, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ display: "flex" }}>{Icon.truck}</span>{p.supplier?.supplierName || "—"}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: GREEN, margin: 0, letterSpacing: "-0.02em" }}>₱{peso(p.price)}</p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: "nowrap" }}>
                        <span style={{ display: "flex", transform: status === "In Stock" ? "scale(0.8)" : "scale(0.7)" }}>{statusIcon(status)}</span>
                        {status}
                      </span>
                    </div>

                    <div style={{ height: "6px", background: GREEN_LIGHT, borderRadius: "6px", marginBottom: "6px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: st.bar, borderRadius: "6px", transition: "width 0.3s" }} />
                    </div>
                    <p style={{ fontSize: "11px", color: MUTED, margin: 0 }}>
                      Stock: <span style={{ fontWeight: 700, color: st.color }}>{p.stock} case</span>
                    </p>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: "14px", padding: "64px 24px", textAlign: "center", border: `1px dashed ${GREEN_BORDER}` }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {Icon.emptyState}
                  </div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>No products found</p>
                  <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>Try a different search or filter</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Product Detail Modal ── */}
        {selected && (() => {
          const status = getStatus(selected.stock);
          const st = statusStyle[status];
          const pct = Math.min((selected.stock / MAX_STOCK) * 100, 100);
          const rows: { icon: React.ReactNode; label: string; value: string }[] = [
            { icon: Icon.peso, label: "Price",       value: `₱${peso(selected.price)} per unit` },
            { icon: Icon.tag,  label: "Size",        value: selected.size || "—" },
            { icon: Icon.box,  label: "Stock level", value: `${selected.stock} case` },
            { icon: Icon.chart,label: "Status",      value: status },
            { icon: Icon.tag,  label: "Product ID",  value: selected.id },
          ];
          return (
            <>
              <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.55)", zIndex: 40 }} />
              <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, width: "420px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: "18px", overflowX: "hidden", boxShadow: "0 20px 60px rgba(10,30,15,0.28)", border: `1px solid ${GREEN_BORDER}` }}>
                <div style={{ height: "170px", background: getBgColor(selected.productName), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", position: "relative", overflow: "hidden" }}>
                  <ProductImage key={selected.id} image={selected.image} emoji={getEmoji(selected.productName)} alt={selected.productName} />
                  <button onClick={() => setSelected(null)} aria-label="Close"
                    style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(20,48,27,0.55)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {Icon.x}
                  </button>
                </div>

                <div style={{ padding: "22px 24px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: "19px", fontWeight: 700, color: INK, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                        {selected.productName}
                        {selected.size && <span style={{ fontSize: "13px", fontWeight: 500, color: FAINT }}> · {selected.size}</span>}
                      </h2>
                      <p style={{ fontSize: "13px", color: MUTED, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "flex", color: FAINT }}>{Icon.truck}</span>
                        {selected.supplier?.supplierName || "—"}
                      </p>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {status}
                    </span>
                  </div>

                  <div style={{ background: GREEN_TINT, borderRadius: "12px", border: `1px solid ${GREEN_BORDER}`, padding: "4px 16px" }}>
                    {rows.map((r, i) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: i < rows.length - 1 ? `1px solid ${GREEN_BORDER}` : "none" }}>
                        <span style={{ fontSize: "13px", color: MUTED, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ display: "flex", color: GREEN }}>{r.icon}</span>{r.label}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: INK, textAlign: "right", wordBreak: "break-all" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                      <span style={{ fontSize: "12px", color: MUTED, fontWeight: 600 }}>Stock level</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: st.color }}>{Math.round((selected.stock / MAX_STOCK) * 100)}%</span>
                    </div>
                    <div style={{ height: "8px", background: GREEN_LIGHT, borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: st.bar, borderRadius: "8px" }} />
                    </div>
                  </div>

                  <button onClick={() => setSelected(null)} className="btn-green"
                    style={{ width: "100%", marginTop: "20px", padding: "12px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                    Close
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}