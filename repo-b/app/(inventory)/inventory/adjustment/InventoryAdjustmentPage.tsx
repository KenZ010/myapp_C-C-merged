"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Theme (matches the green layout) ──
const GREEN       = "#2e7d3e";
const GREEN_DARK  = "#1f5f2d";
const GREEN_LIGHT = "#e8f5ea";

// ── Types matching Prisma schema ──────────────────────────────────────────────
type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
type CategoryType  = "SOFTDRINKS" | "ENERGY_DRINK" | "BEER" | "JUICE" | "WATER" | "OTHER";
type TabKey        = "adjustment" | "expiration";
type ExpiryStatus  = "Expired" | "Expiring Soon" | "Good" | "No Date";

type Product = {
  id:            string;
  productName:   string;
  category:      CategoryType;
  size:          string | null;
  barcode:       string | null;
  price:         number;
  stock:         number;
  piecesPerCase: number;
  reservedStock: number;
  expiryDate:    string | null;
  image:         string | null;
  status:        ProductStatus;
  supplierId:    string;
  supplierName:  string;
  createdAt:     string;
  updatedAt:     string;
};

const PIECES_PER_CASE_DEFAULT = 24;
const EXPIRING_SOON_DAYS      = 30; // products expiring within this many days are flagged

function getPiecesPerCase(p: Product): number {
  return p.piecesPerCase || PIECES_PER_CASE_DEFAULT;
}

function totalPieces(p: Product): number {
  return p.stock * getPiecesPerCase(p);
}

function deriveStockStatus(stock: number): "In Stock" | "Low Stock" | "Out of Stock" {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function fmtDate(str: string | null): string {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(str: string | null): { date: string; time: string } {
  if (!str) return { date: "—", time: "" };
  const d = new Date(str);
  if (isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }),
  };
}

function fmtPrice(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// ── Expiration helpers ────────────────────────────────────────────────────────
// Days from today until the expiry date (negative = already expired). Null if no date.
function daysUntilExpiry(str: string | null): number | null {
  if (!str) return null;
  const e = new Date(str);
  if (isNaN(e.getTime())) return null;
  const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  const now  = new Date();
  const tDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((eDay - tDay) / 86_400_000);
}

function getExpiryStatus(str: string | null): ExpiryStatus {
  const days = daysUntilExpiry(str);
  if (days === null) return "No Date";
  if (days < 0) return "Expired";
  if (days <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Good";
}

const expiryStyle: Record<ExpiryStatus, { bg: string; color: string; dot: string }> = {
  "Expired":       { bg: "#ffebee", color: "#c62828", dot: "#f44336" },
  "Expiring Soon": { bg: "#fff8e1", color: "#e65100", dot: "#ff9800" },
  "Good":          { bg: "#e8f5e9", color: "#2e7d32", dot: "#4caf50" },
  "No Date":       { bg: "#f5f5f5", color: "#888",    dot: "#bdbdbd" },
};

function daysLabel(days: number | null): string {
  if (days === null) return "—";
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Today";
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// "2026-12-31T00:00:00.000Z" -> "2026-12-31" (value for <input type="date">)
function toDateInput(str: string | null): string {
  if (!str) return "";
  return str.slice(0, 10);
}

// Today + N months, formatted for <input type="date">
function dateInMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const statusStyle = {
  "In Stock":     { bg: "#e8f5e9", color: "#2e7d32", dot: "#4caf50" },
  "Low Stock":    { bg: "#fff8e1", color: "#e65100", dot: "#ff9800" },
  "Out of Stock": { bg: "#ffebee", color: "#c62828", dot: "#f44336" },
};

const categoryLabels: Record<CategoryType, string> = {
  SOFTDRINKS:   "Softdrinks",
  ENERGY_DRINK: "Energy Drink",
  BEER:         "Beer",
  JUICE:        "Juice",
  WATER:        "Water",
  OTHER:        "Other",
};

const productStatusStyle: Record<ProductStatus, { bg: string; color: string }> = {
  ACTIVE:       { bg: "#e8f5e9", color: "#2e7d32" },
  INACTIVE:     { bg: "#f5f5f5", color: "#888"    },
  OUT_OF_STOCK: { bg: "#ffebee", color: "#c62828" },
};

export default function InventoryAdjustmentPage() {
  const [tab,        setTab]        = useState<TabKey>("adjustment");
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState<"All" | CategoryType>("All");
  const [statFilter, setStatFilter] = useState<"All" | ProductStatus>("All");
  const [detailProd, setDetailProd] = useState<Product | null>(null);

  const [adjQty,     setAdjQty]     = useState(0);
  const [adjUnit,    setAdjUnit]    = useState<"cases" | "pieces">("cases");
  const [adjReason,  setAdjReason]  = useState("Received");
  const [adjNote,    setAdjNote]    = useState("");
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError,   setAdjError]   = useState<string | null>(null);
  const [adjSuccess, setAdjSuccess] = useState(false);

  // ── Expiration tab state ──
  const [expSearch,  setExpSearch]  = useState("");
  const [expFilter,  setExpFilter]  = useState<"All" | ExpiryStatus>("All");
  const [expProd,    setExpProd]    = useState<Product | null>(null);
  const [expDate,    setExpDate]    = useState("");
  const [expLoading, setExpLoading] = useState(false);
  const [expError,   setExpError]   = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, suppliersData] = await Promise.all([
        api.getProducts(),
        api.getSuppliers(),
      ]);
      const supplierMap = (suppliersData || []).reduce((acc: Record<string, string>, s: any) => {
        acc[s.id] = s.supplierName;
        return acc;
      }, {});
      setProducts((productsData || []).map((p: any): Product => ({
        id:            String(p.id),
        productName:   String(p.productName),
        category:      (p.category ?? "OTHER") as CategoryType,
        size:          p.size ?? null,
        barcode:       p.barcode ?? null,
        price:         Number(p.price ?? 0),
        stock:         Number(p.stock ?? 0),
        piecesPerCase: Number(p.piecesPerCase ?? PIECES_PER_CASE_DEFAULT),
        reservedStock: Number(p.reservedStock ?? 0),
        expiryDate:    p.expiryDate ?? null,
        image:         p.image ?? null,
        status:        (p.status ?? "ACTIVE") as ProductStatus,
        supplierId:    String(p.supplierId ?? ""),
        supplierName:  supplierMap[p.supplierId] || p.supplier?.supplierName || "—",
        createdAt:     String(p.createdAt ?? ""),
        updatedAt:     String(p.updatedAt ?? p.createdAt ?? ""),
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = useMemo(() =>
    products
      .filter((p) => {
        const q = search.toLowerCase();
        const matchSearch = !q || p.productName.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchCat    = catFilter  === "All" || p.category === catFilter;
        const matchStat   = statFilter === "All" || p.status   === statFilter;
        return matchSearch && matchCat && matchStat;
      })
      .sort((a, b) => b.stock - a.stock),
  [products, search, catFilter, statFilter]);

  const counts = useMemo(() => ({
    total:  products.length,
    active: products.filter(p => p.status === "ACTIVE").length,
    low:    products.filter(p => deriveStockStatus(p.stock) === "Low Stock").length,
    out:    products.filter(p => p.stock === 0).length,
  }), [products]);

  // ── Expiration derived data ──
  const expCounts = useMemo(() => ({
    expired:  products.filter(p => getExpiryStatus(p.expiryDate) === "Expired").length,
    soon:     products.filter(p => getExpiryStatus(p.expiryDate) === "Expiring Soon").length,
    good:     products.filter(p => getExpiryStatus(p.expiryDate) === "Good").length,
    noDate:   products.filter(p => getExpiryStatus(p.expiryDate) === "No Date").length,
  }), [products]);

  const expFiltered = useMemo(() => {
    const priority: Record<ExpiryStatus, number> = { "Expired": 0, "Expiring Soon": 1, "Good": 2, "No Date": 3 };
    return products
      .filter((p) => {
        const q = expSearch.toLowerCase();
        const matchSearch = !q || p.productName.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
        const matchStat   = expFilter === "All" || getExpiryStatus(p.expiryDate) === expFilter;
        return matchSearch && matchStat;
      })
      .sort((a, b) => {
        const pa = priority[getExpiryStatus(a.expiryDate)];
        const pb = priority[getExpiryStatus(b.expiryDate)];
        if (pa !== pb) return pa - pb;
        const da = daysUntilExpiry(a.expiryDate) ?? Infinity;
        const db = daysUntilExpiry(b.expiryDate) ?? Infinity;
        return da - db;
      });
  }, [products, expSearch, expFilter]);

  const openDetail = (p: Product) => {
    setDetailProd({ ...p });
    setAdjQty(0);
    setAdjUnit("cases");
    setAdjReason("Received");
    setAdjNote("");
    setAdjError(null);
    setAdjSuccess(false);
  };

  const caseDelta = detailProd
    ? adjUnit === "cases" ? adjQty : adjQty / getPiecesPerCase(detailProd)
    : 0;

  const previewCases  = detailProd ? Math.max(0, detailProd.stock + caseDelta) : 0;
  const previewPieces = detailProd ? Math.round(previewCases * getPiecesPerCase(detailProd)) : 0;

  const adjPiecesAbs = detailProd
    ? adjUnit === "cases"
      ? Math.abs(adjQty) * getPiecesPerCase(detailProd)
      : Math.abs(adjQty)
    : 0;

  const applyAdjustment = async () => {
    if (!detailProd || adjQty === 0) return;
    setAdjLoading(true);
    setAdjError(null);
    setAdjSuccess(false);
    try {
      const employeeId = JSON.parse(localStorage.getItem("user") || "null")?.id ?? "";

      const quantityInCases = adjUnit === "cases"
        ? adjQty
        : adjQty / getPiecesPerCase(detailProd);

      await api.adjustStock({
        productId:  detailProd.id,
        quantity:   quantityInCases,
        reason:     `${adjReason}${adjNote ? `: ${adjNote}` : ""}`,
        employeeId,
      });

      setAdjQty(0);
      setAdjNote("");
      setAdjSuccess(true);
      await fetchProducts(); // ← re-fetch from server so table reflects DB truth
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setAdjLoading(false);
    }
  };

  // ── Expiration actions ──
  const openExpiry = (p: Product) => {
    setExpProd(p);
    setExpDate(toDateInput(p.expiryDate));
    setExpError(null);
  };

  const closeExpiry = () => {
    setExpProd(null);
    setExpDate("");
    setExpError(null);
  };

  const saveExpiry = async (clear = false) => {
    if (!expProd) return;
    if (!clear && !expDate) { setExpError("Please choose an expiration date."); return; }

    setExpLoading(true);
    setExpError(null);
    try {
      const newExpiry = clear ? null : new Date(`${expDate}T00:00:00.000Z`).toISOString();

      // ⚠️ Adjust this call to match your api helper / backend route for updating a product.
      await api.updateProduct(expProd.id, { expiryDate: newExpiry });

      // Update the list right away (no full reload, so the page doesn't flash)
      setProducts((prev) => prev.map((p) => (p.id === expProd.id ? { ...p, expiryDate: newExpiry, updatedAt: new Date().toISOString() } : p)));
      closeExpiry();
    } catch (e) {
      setExpError(e instanceof Error ? e.message : "Failed to save expiration date");
    } finally {
      setExpLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f3f6f3", minHeight: "100vh" }}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "24px" }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: "80px", borderRadius: "16px", background: "#e0e6e1", animation: "pulse 1.5s infinite" }} />)}
      </div>
      <div style={{ height: "400px", borderRadius: "16px", background: "#e0e6e1", animation: "pulse 1.5s infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f3f6f3", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
      <p style={{ color: "#c62828", fontWeight: 700 }}>⚠️ {error}</p>
      <button onClick={fetchProducts} style={{ padding: "10px 24px", borderRadius: "20px", border: "none", background: GREEN, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Retry</button>
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "adjustment", label: "Inventory Adjustment", icon: "📦" },
    { key: "expiration", label: "Expiration",           icon: "📅", badge: expCounts.expired + expCounts.soon },
  ];

  return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f3f6f3", minHeight: "100vh" }}>

      {/* ── Tabs ── */}
      <div style={{ display: "inline-flex", gap: "6px", background: "#fff", border: "0.5px solid #e8e8e8", borderRadius: "999px", padding: "5px", marginBottom: "22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 20px", borderRadius: "999px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: active ? 700 : 500,
                background: active ? GREEN : "transparent",
                color: active ? "#fff" : "#555",
                boxShadow: active ? "0 4px 12px rgba(46,125,62,0.28)" : "none",
                transition: "all 0.15s",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span style={{ background: active ? "#facc15" : "#e53935", color: active ? GREEN_DARK : "#fff", fontSize: "10px", fontWeight: 800, borderRadius: "999px", padding: "1px 7px" }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════ TAB: INVENTORY ADJUSTMENT ════════════════ */}
      {tab === "adjustment" && (
        <>
          {/* ── Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Total Products", value: counts.total,  icon: "📦", bg: GREEN_LIGHT, color: GREEN_DARK },
              { label: "Active",         value: counts.active, icon: "✅", bg: "#e8f5e9", color: "#2e7d32" },
              { label: "Low Stock",      value: counts.low,    icon: "⚠️", bg: "#fff8e1", color: "#e65100" },
              { label: "Out of Stock",   value: counts.out,    icon: "❌", bg: "#ffebee", color: "#c62828" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize: "26px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, barcode, ID..."
                style={{ padding: "8px 14px 8px 34px", borderRadius: "20px", border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none", width: "220px", color: "#1a1a1a", background: "#fafafa" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: GREEN_LIGHT, borderRadius: "20px", padding: "5px 10px" }}>
              <span style={{ fontSize: "12px" }}>🏷</span>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)}
                style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: GREEN_DARK, cursor: "pointer" }}>
                <option value="All">Category: All</option>
                {(Object.keys(categoryLabels) as CategoryType[]).map(c => (
                  <option key={c} value={c}>{categoryLabels[c]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: GREEN_LIGHT, borderRadius: "20px", padding: "5px 10px" }}>
              <span style={{ fontSize: "12px" }}>📊</span>
              <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as any)}
                style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: GREEN_DARK, cursor: "pointer" }}>
                <option value="All">Status: All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>
              {filtered.length} of {products.length} products
            </span>
          </div>

          {/* ── Table ── */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ background: GREEN }}>
                    {["Product", "Category", "Barcode", "Supplier", "Price / pc", "Stock (cases)", "Stock (pcs)", "Reserved", "Expiry Date", "Status", "Action"].map((h) => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: "60px", textAlign: "center", color: "#bbb" }}>
                        <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
                        <p style={{ fontSize: "14px" }}>No products found</p>
                      </td>
                    </tr>
                  ) : filtered.map((p, idx) => {
                    const stockStatus = deriveStockStatus(p.stock);
                    const st          = statusStyle[stockStatus];
                    const pcs = totalPieces(p);
                    const pct = p.stock > 0 ? Math.min(100, Math.round((p.stock / Math.max(p.stock, 10)) * 100)) : 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                      >
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {p.image ? (
                              <img src={p.image} alt="" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>📦</div>
                            )}
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{p.productName}</p>
                              {p.size && <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{p.size}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ background: GREEN_LIGHT, color: GREEN_DARK, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                            {categoryLabels[p.category] ?? p.category}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace" }}>
                            {p.barcode ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ background: "#e3f0fd", color: "#1565c0", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                            {p.supplierName}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: GREEN_DARK }}>
                          {fmtPrice(p.price)}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <div>
                            <p style={{ fontSize: "15px", fontWeight: 800, color: st.color }}>{p.stock}</p>
                            <div style={{ width: "60px", height: "4px", borderRadius: "10px", background: "#f0f0f0", marginTop: "4px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: st.dot, borderRadius: "10px" }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "#555" }}>{pcs} pcs</td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: p.reservedStock > 0 ? "#e65100" : "#aaa", fontWeight: p.reservedStock > 0 ? 700 : 400 }}>
                          {p.reservedStock}
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "12px", color: "#888" }}>{fmtDate(p.expiryDate)}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: productStatusStyle[p.status].bg, color: productStatusStyle[p.status].color }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <button onClick={() => openDetail(p)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "20px", border: "none", background: GREEN, color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 3px 8px rgba(46,125,62,0.25)" }}>
                            📋 Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
              <p style={{ fontSize: "12px", color: "#aaa" }}>
                Showing <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong> of <strong style={{ color: "#1a1a1a" }}>{products.length}</strong> products
              </p>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ TAB: EXPIRATION ════════════════ */}
      {tab === "expiration" && (
        <>
          {/* ── Summary Cards (click to filter) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {([
              { label: "Expired",         value: expCounts.expired, icon: "⛔", status: "Expired"       as ExpiryStatus, bg: "#ffebee", color: "#c62828" },
              { label: "Expiring Soon",   value: expCounts.soon,    icon: "⏳", status: "Expiring Soon" as ExpiryStatus, bg: "#fff8e1", color: "#e65100" },
              { label: "Good",            value: expCounts.good,    icon: "✅", status: "Good"          as ExpiryStatus, bg: "#e8f5e9", color: "#2e7d32" },
              { label: "No Date Set",     value: expCounts.noDate,  icon: "❔", status: "No Date"       as ExpiryStatus, bg: "#f5f5f5", color: "#666" },
            ]).map((s) => {
              const active = expFilter === s.status;
              return (
                <button
                  key={s.label}
                  onClick={() => setExpFilter(active ? "All" : s.status)}
                  style={{ textAlign: "left", background: "#fff", borderRadius: "16px", border: active ? `2px solid ${GREEN}` : "0.5px solid #e8e8e8", padding: active ? "17px 19px" : "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: active ? "0 4px 14px rgba(46,125,62,0.18)" : "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer" }}
                >
                  <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize: "26px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>{s.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Filter Bar ── */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
              <input
                value={expSearch}
                onChange={(e) => setExpSearch(e.target.value)}
                placeholder="Search name or barcode..."
                style={{ padding: "8px 14px 8px 34px", borderRadius: "20px", border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none", width: "220px", color: "#1a1a1a", background: "#fafafa" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: GREEN_LIGHT, borderRadius: "20px", padding: "5px 10px" }}>
              <span style={{ fontSize: "12px" }}>📅</span>
              <select value={expFilter} onChange={(e) => setExpFilter(e.target.value as any)}
                style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: GREEN_DARK, cursor: "pointer" }}>
                <option value="All">Expiry: All</option>
                <option value="Expired">Expired</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Good">Good</option>
                <option value="No Date">No Date Set</option>
              </select>
            </div>
            <span style={{ fontSize: "11px", color: "#aaa" }}>
              “Expiring Soon” = within {EXPIRING_SOON_DAYS} days
            </span>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>
              {expFiltered.length} of {products.length} products
            </span>
          </div>

          {/* ── Expiration Table ── */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: GREEN }}>
                    {["Date & Time", "Product", "Category", "Unit Type", "Total Bottles", "Expiration Date", "Action"].map((h) => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "60px", textAlign: "center", color: "#bbb" }}>
                        <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
                        <p style={{ fontSize: "14px" }}>No products found</p>
                      </td>
                    </tr>
                  ) : expFiltered.map((p, idx) => {
                    const es   = getExpiryStatus(p.expiryDate);
                    const est  = expiryStyle[es];
                    const days = daysUntilExpiry(p.expiryDate);
                    const hasDate = !!p.expiryDate;
                    const dt = fmtDateTime(p.updatedAt || p.createdAt);
                    return (
                      <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                      >
                        {/* Date & Time */}
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#1a1a1a" }}>{dt.date}</p>
                          <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{dt.time}</p>
                        </td>

                        {/* Product */}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {p.image ? (
                              <img src={p.image} alt="" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>📦</div>
                            )}
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{p.productName}</p>
                              {p.size && <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{p.size}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ background: GREEN_LIGHT, color: GREEN_DARK, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                            {categoryLabels[p.category] ?? p.category}
                          </span>
                        </td>

                        {/* Unit Type */}
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Case · {getPiecesPerCase(p)} pcs
                          </span>
                        </td>

                        {/* Total Bottles */}
                        <td style={{ padding: "13px 16px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 800, color: "#1a1a1a" }}>{totalPieces(p).toLocaleString()}</p>
                          <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{p.stock} case{p.stock !== 1 ? "s" : ""}</p>
                        </td>

                        {/* Expiration Date */}
                        <td style={{ padding: "13px 16px" }}>
                          <p style={{ fontSize: "13px", fontWeight: hasDate ? 700 : 400, color: hasDate ? "#1a1a1a" : "#bbb" }}>
                            {fmtDate(p.expiryDate)}
                          </p>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "4px", padding: "2px 9px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 700, background: est.bg, color: est.color }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: est.dot }} />
                            {es}{hasDate ? ` · ${daysLabel(days)}` : ""}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: "13px 16px" }}>
                          <button onClick={() => openExpiry(p)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: hasDate ? `1.5px solid ${GREEN}` : "none", background: hasDate ? "#fff" : GREEN, color: hasDate ? GREEN : "#fff", boxShadow: hasDate ? "none" : "0 3px 8px rgba(46,125,62,0.25)" }}>
                            {hasDate ? "✏️ Adjust" : "➕ Add Date"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
              <p style={{ fontSize: "12px", color: "#aaa" }}>
                Showing <strong style={{ color: "#1a1a1a" }}>{expFiltered.length}</strong> of <strong style={{ color: "#1a1a1a" }}>{products.length}</strong> products
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Expiration Modal ── */}
      {expProd && (
        <>
          <div onClick={closeExpiry} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "24px", width: "min(94vw, 440px)", overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.25)" }}>

            <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontWeight: 700 }}>
                  {expProd.expiryDate ? "Edit Expiration" : "Add Expiration"}
                </p>
                <p style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>{expProd.productName}</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
                  {expProd.size && `${expProd.size} · `}{categoryLabels[expProd.category]} · {expProd.stock} cases in stock
                </p>
              </div>
              <button onClick={closeExpiry} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ padding: "24px 26px" }}>
              {expProd.expiryDate && (
                <div style={{ background: "#f6faf6", borderRadius: "12px", padding: "12px 14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "10px", color: "#9aa5a0", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "3px" }}>Current Expiry</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>{fmtDate(expProd.expiryDate)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: expiryStyle[getExpiryStatus(expProd.expiryDate)].bg, color: expiryStyle[getExpiryStatus(expProd.expiryDate)].color }}>
                    {getExpiryStatus(expProd.expiryDate)}
                  </span>
                </div>
              )}

              <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                Expiration Date
              </label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: `1.5px solid ${GREEN}`, fontSize: "15px", fontWeight: 600, outline: "none", color: "#1a1a1a", background: "#fff", boxSizing: "border-box", marginBottom: "12px" }}
              />

              <p style={{ fontSize: "11px", color: "#9aa5a0", marginBottom: "6px", fontWeight: 600 }}>Quick set (from today)</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                {[
                  { label: "+3 months", months: 3 },
                  { label: "+6 months", months: 6 },
                  { label: "+1 year",   months: 12 },
                  { label: "+2 years",  months: 24 },
                ].map((q) => (
                  <button key={q.label} onClick={() => setExpDate(dateInMonths(q.months))}
                    style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1.5px solid ${GREEN_LIGHT}`, background: GREEN_LIGHT, color: GREEN_DARK, cursor: "pointer" }}>
                    {q.label}
                  </button>
                ))}
              </div>

              {expDate && (
                <p style={{ fontSize: "12px", marginTop: "10px", color: expiryStyle[getExpiryStatus(expDate)].color, fontWeight: 600 }}>
                  {getExpiryStatus(expDate) === "Expired"
                    ? "⚠️ This date is in the past — the product will be marked Expired."
                    : getExpiryStatus(expDate) === "Expiring Soon"
                    ? `⏳ Expires in ${daysUntilExpiry(expDate)} day(s) — will be flagged as Expiring Soon.`
                    : `✅ Expires in ${daysUntilExpiry(expDate)} days.`}
                </p>
              )}

              {expError && (
                <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "10px", padding: "10px 14px", marginTop: "14px", fontSize: "13px", color: "#c62828" }}>
                  ⚠️ {expError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={closeExpiry} disabled={expLoading}
                  style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={() => saveExpiry(false)} disabled={expLoading || !expDate}
                  style={{ flex: 1.4, padding: "12px", borderRadius: "14px", border: "none", background: expLoading || !expDate ? "#e0e0e0" : GREEN, color: expLoading || !expDate ? "#bbb" : "#fff", fontSize: "14px", fontWeight: 700, cursor: expLoading || !expDate ? "not-allowed" : "pointer", boxShadow: expLoading || !expDate ? "none" : "0 6px 16px rgba(46,125,62,0.3)" }}>
                  {expLoading ? "Saving…" : expProd.expiryDate ? "Save Changes" : "Save Expiration"}
                </button>
              </div>

              {expProd.expiryDate && (
                <button onClick={() => saveExpiry(true)} disabled={expLoading}
                  style={{ width: "100%", marginTop: "10px", padding: "10px", borderRadius: "14px", border: "none", background: "#fff1f2", color: "#e11d48", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
                  Remove expiration date
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Detail + Adjust Modal ── */}
      {detailProd && (
        <>
          <div onClick={() => setDetailProd(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "24px", width: "min(96vw, 580px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 100px rgba(0,0,0,0.25)" }}>

            {/* Modal Header */}
            <div style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, borderRadius: "24px 24px 0 0", padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    {detailProd.barcode && (
                      <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace", fontWeight: 700 }}>
                        {detailProd.barcode}
                      </span>
                    )}
                    <span style={{ background: productStatusStyle[detailProd.status].bg, color: productStatusStyle[detailProd.status].color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                      {detailProd.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>{detailProd.productName}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                    {detailProd.size && `${detailProd.size} · `}{categoryLabels[detailProd.category]} · {detailProd.supplierName}
                  </p>
                </div>
                <button onClick={() => setDetailProd(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Current Stock</p>
                    <p style={{ fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{detailProd.stock}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>
                      cases · {totalPieces(detailProd)} total pcs · {detailProd.piecesPerCase} pcs/case
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {(() => {
                      const ss = deriveStockStatus(detailProd.stock);
                      const st = statusStyle[ss];
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: st.bg, color: st.color }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: st.dot }} />
                          {ss}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Product Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
                {[
                  ["Category",       categoryLabels[detailProd.category]],
                  ["Supplier",       detailProd.supplierName],
                  ["Price / piece",  fmtPrice(detailProd.price)],
                  ["Price / case",   fmtPrice(detailProd.price * detailProd.piecesPerCase)],
                  ["Expiry Date",    fmtDate(detailProd.expiryDate)],
                  ["Reserved Stock", `${detailProd.reservedStock} pcs`],
                  ["Pieces / Case",  String(detailProd.piecesPerCase)],
                  ["Total Pieces",   `${totalPieces(detailProd)} pcs`],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "#f6faf6", borderRadius: "12px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "10px", color: "#9aa5a0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontWeight: 700 }}>{label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Adjustment Panel */}
              <div style={{ background: GREEN_LIGHT, borderRadius: "16px", border: "1.5px solid #a5d6a7", padding: "20px", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 800, color: GREEN_DARK, marginBottom: "4px" }}>📦 Adjust Stock</p>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>Positive = add stock · Negative = deduct stock</p>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Reason</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["Received", "Expired", "Damaged", "Audit Correction"].map((r) => (
                      <button key={r} onClick={() => setAdjReason(r)}
                        style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjReason === r ? "none" : "1.5px solid #ddd", background: adjReason === r ? GREEN : "#fff", color: adjReason === r ? "#fff" : "#555", cursor: "pointer", transition: "all 0.15s" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Unit</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {(["cases", "pieces"] as const).map((u) => (
                      <button key={u} onClick={() => { setAdjUnit(u); setAdjQty(0); }}
                        style={{ padding: "6px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjUnit === u ? "none" : "1.5px solid #ddd", background: adjUnit === u ? GREEN : "#fff", color: adjUnit === u ? "#fff" : "#555", cursor: "pointer" }}>
                        {u === "cases" ? `Cases (×${detailProd.piecesPerCase} pcs)` : "Pieces"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                    Quantity ({adjUnit})
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => setAdjQty(v => v - 1)}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#c62828", flexShrink: 0 }}>−</button>
                    <input
                      type="number"
                      value={adjQty}
                      onChange={(e) => setAdjQty(Number(e.target.value))}
                      style={{ width: "90px", textAlign: "center", padding: "8px", borderRadius: "10px", border: `1.5px solid ${GREEN}`, fontSize: "18px", fontWeight: 800, outline: "none", color: adjQty < 0 ? "#c62828" : adjQty > 0 ? "#2e7d32" : "#1a1a1a" }}
                    />
                    <button onClick={() => setAdjQty(v => v + 1)}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: GREEN, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>+</button>
                    <div style={{ fontSize: "13px", color: "#888" }}>
                      → New stock: <strong style={{ color: GREEN_DARK, fontSize: "15px" }}>{Math.round(previewCases)}</strong> cases
                      <span style={{ fontSize: "11px", color: "#aaa" }}> ({previewPieces} pcs)</span>
                    </div>
                  </div>
                  {adjUnit === "cases" && adjQty !== 0 && (
                    <p style={{ fontSize: "11px", color: GREEN, marginTop: "6px" }}>
                      = {Math.abs(adjQty)} cases × {detailProd.piecesPerCase} pcs = <strong>{Math.abs(adjQty) * detailProd.piecesPerCase} pieces</strong>
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Note (Optional)</label>
                  <input
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder="e.g. Received from supplier delivery DR-0012..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none", color: "#1a1a1a", background: "#fff", boxSizing: "border-box" }}
                  />
                </div>

                {adjError && (
                  <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#c62828" }}>
                    ⚠️ {adjError}
                  </div>
                )}
                {adjSuccess && (
                  <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#2e7d32" }}>
                    ✅ Stock adjusted successfully!
                  </div>
                )}

                <button
                  onClick={applyAdjustment}
                  disabled={adjQty === 0 || adjLoading}
                  style={{ width: "100%", padding: "13px", borderRadius: "14px", border: "none", background: adjQty === 0 || adjLoading ? "#e0e0e0" : GREEN, color: adjQty === 0 || adjLoading ? "#bbb" : "#fff", fontSize: "14px", fontWeight: 700, cursor: adjQty === 0 || adjLoading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: adjQty === 0 || adjLoading ? "none" : "0 6px 16px rgba(46,125,62,0.3)" }}
                >
                  {adjLoading ? "Saving…" : adjQty > 0
                    ? `✅ Add ${adjQty} ${adjUnit} (${adjPiecesAbs} pcs)`
                    : adjQty < 0
                    ? `➖ Deduct ${Math.abs(adjQty)} ${adjUnit} (${adjPiecesAbs} pcs)`
                    : "Enter an adjustment"}
                </button>
              </div>

              <button onClick={() => setDetailProd(null)}
                style={{ width: "100%", padding: "12px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}