"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types matching Prisma schema ──────────────────────────────────────────────
type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
type CategoryType  = "SOFTDRINKS" | "ENERGY_DRINK" | "BEER" | "JUICE" | "WATER" | "OTHER";

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
};

const PIECES_PER_CASE_DEFAULT = 24;

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

function fmtPrice(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
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
      const employeeId = localStorage.getItem("employeeId") ?? "";

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

  if (loading) return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "24px" }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: "80px", borderRadius: "16px", background: "#e0e0e0", animation: "pulse 1.5s infinite" }} />)}
      </div>
      <div style={{ height: "400px", borderRadius: "16px", background: "#e0e0e0", animation: "pulse 1.5s infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f7f8fa", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
      <p style={{ color: "#c62828", fontWeight: 700 }}>⚠️ {error}</p>
      <button onClick={fetchProducts} style={{ padding: "10px 24px", borderRadius: "20px", border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Retry</button>
    </div>
  );

  return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Products", value: counts.total,  icon: "📦", bg: "#f0faf2", color: "#1a3c2e" },
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f5f5f5", borderRadius: "20px", padding: "5px 10px" }}>
          <span style={{ fontSize: "12px" }}>🏷</span>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)}
            style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: "#444", cursor: "pointer" }}>
            <option value="All">Category: All</option>
            {(Object.keys(categoryLabels) as CategoryType[]).map(c => (
              <option key={c} value={c}>{categoryLabels[c]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f5f5f5", borderRadius: "20px", padding: "5px 10px" }}>
          <span style={{ fontSize: "12px" }}>📊</span>
          <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as any)}
            style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: "#444", cursor: "pointer" }}>
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
              <tr style={{ background: "#6366f1" }}>
                {["Product", "Category", "Barcode", "Supplier", "Price / pc", "Stock (cases)", "Stock (pcs)", "Reserved", "Expiry Date", "Status", "Action"].map((h) => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.4px", textTransform: "uppercase" }}>
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
                      <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                        {categoryLabels[p.category] ?? p.category}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace" }}>
                        {p.barcode ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#e8f0fe", color: "#1a237e", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                        {p.supplierName}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: "#1a3c2e" }}>
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
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "20px", border: "none", background: "#6366f1", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
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

      {/* ── Detail + Adjust Modal ── */}
      {detailProd && (
        <>
          <div onClick={() => setDetailProd(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "24px", width: "min(96vw, 580px)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 100px rgba(0,0,0,0.25)" }}>

            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #6366f1, #3c3eb1 100%)", borderRadius: "24px 24px 0 0", padding: "24px 28px" }}>
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
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                    {detailProd.size && `${detailProd.size} · `}{categoryLabels[detailProd.category]} · {detailProd.supplierName}
                  </p>
                </div>
                <button onClick={() => setDetailProd(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Current Stock</p>
                    <p style={{ fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{detailProd.stock}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
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
                  <div key={label} style={{ background: "#f9f9f9", borderRadius: "12px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "10px", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontWeight: 700 }}>{label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Adjustment Panel */}
              <div style={{ background: "#f0faf2", borderRadius: "16px", border: "1.5px solid #a5d6a7", padding: "20px", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#1a3c2e", marginBottom: "4px" }}>📦 Adjust Stock</p>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>Positive = add stock · Negative = deduct stock</p>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Reason</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["Received", "Sold", "Damaged", "Return", "Audit Correction"].map((r) => (
                      <button key={r} onClick={() => setAdjReason(r)}
                        style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjReason === r ? "none" : "1.5px solid #ddd", background: adjReason === r ? "#1a3c2e" : "#fff", color: adjReason === r ? "#fff" : "#555", cursor: "pointer", transition: "all 0.15s" }}>
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
                        style={{ padding: "6px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjUnit === u ? "none" : "1.5px solid #ddd", background: adjUnit === u ? "#6366f1" : "#fff", color: adjUnit === u ? "#fff" : "#555", cursor: "pointer" }}>
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
                      style={{ width: "90px", textAlign: "center", padding: "8px", borderRadius: "10px", border: "1.5px solid #1a3c2e", fontSize: "18px", fontWeight: 800, outline: "none", color: adjQty < 0 ? "#c62828" : adjQty > 0 ? "#2e7d32" : "#1a1a1a" }}
                    />
                    <button onClick={() => setAdjQty(v => v + 1)}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "#1a3c2e", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>+</button>
                    <div style={{ fontSize: "13px", color: "#888" }}>
                      → New stock: <strong style={{ color: "#1a3c2e", fontSize: "15px" }}>{Math.round(previewCases)}</strong> cases
                      <span style={{ fontSize: "11px", color: "#aaa" }}> ({previewPieces} pcs)</span>
                    </div>
                  </div>
                  {adjUnit === "cases" && adjQty !== 0 && (
                    <p style={{ fontSize: "11px", color: "#6366f1", marginTop: "6px" }}>
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
                  style={{ width: "100%", padding: "13px", borderRadius: "14px", border: "none", background: adjQty === 0 || adjLoading ? "#e0e0e0" : "#1a3c2e", color: adjQty === 0 || adjLoading ? "#bbb" : "#fff", fontSize: "14px", fontWeight: 700, cursor: adjQty === 0 || adjLoading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
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