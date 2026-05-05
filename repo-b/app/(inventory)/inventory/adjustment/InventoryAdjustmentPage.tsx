"use client";
import { useState, useMemo } from "react";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type FlagStatus = "None" | "Defective" | "Expired";

type Product = {
  id: number;
  code: string;
  name: string;
  size: string;
  category: string;
  supplier: string;
  dateAcquired: string;
  totalCase: number;
  remainingCase: number;
  lastCheckBy: string;
  expiryDate: string;
  stockStatus: StockStatus;
  flag: FlagStatus;
  selected: boolean;
  pricePerCase: number;
};

const deriveStatus = (remaining: number, total: number): StockStatus => {
  if (remaining === 0) return "Out of Stock";
  if (remaining / total <= 0.35) return "Low Stock";
  return "In Stock";
};

const initialProducts: Product[] = [
  { id: 1, code: "COLA22", name: "Coca Cola", size: "1.5L", category: "Cola", supplier: "CCBPI", dateAcquired: "08 Nov 2025", totalCase: 30, remainingCase: 10, lastCheckBy: "Rjay Salinas", expiryDate: "07 Apr 2030", stockStatus: "Low Stock", flag: "None", selected: false, pricePerCase: 480 },
  { id: 2, code: "RC22", name: "RC Cola", size: "1L", category: "Cola", supplier: "RC Bottlers", dateAcquired: "06 Nov 2025", totalCase: 30, remainingCase: 0, lastCheckBy: "Rjay Salinas", expiryDate: "09 Apr 2031", stockStatus: "Out of Stock", flag: "None", selected: false, pricePerCase: 360 },
  { id: 3, code: "PEP12", name: "Pepsi", size: "1.5L", category: "Cola", supplier: "PCPPI", dateAcquired: "06 Nov 2025", totalCase: 30, remainingCase: 15, lastCheckBy: "Admin", expiryDate: "10 Apr 2030", stockStatus: "In Stock", flag: "None", selected: false, pricePerCase: 460 },
  { id: 4, code: "GATO22", name: "Gatorade", size: "500mL", category: "Sports", supplier: "PCPPI", dateAcquired: "06 Nov 2025", totalCase: 15, remainingCase: 15, lastCheckBy: "Admin", expiryDate: "07 Apr 2030", stockStatus: "In Stock", flag: "None", selected: false, pricePerCase: 720 },
  { id: 5, code: "COB25", name: "Cobra", size: "240mL", category: "Energy", supplier: "Asia Brewery", dateAcquired: "06 Nov 2025", totalCase: 30, remainingCase: 27, lastCheckBy: "Rjay Salinas", expiryDate: "04 Apr 2030", stockStatus: "In Stock", flag: "None", selected: false, pricePerCase: 540 },
  { id: 6, code: "SPR15", name: "Sprite", size: "1.5L", category: "Soda", supplier: "CCBPI", dateAcquired: "05 Nov 2025", totalCase: 24, remainingCase: 8, lastCheckBy: "Admin", expiryDate: "01 Jan 2030", stockStatus: "Low Stock", flag: "None", selected: false, pricePerCase: 460 },
  { id: 7, code: "MTD10", name: "Mtn Dew", size: "1.5L", category: "Soda", supplier: "PCPPI", dateAcquired: "05 Nov 2025", totalCase: 24, remainingCase: 0, lastCheckBy: "Rjay Salinas", expiryDate: "15 Mar 2026", stockStatus: "Out of Stock", flag: "Expired", selected: false, pricePerCase: 460 },
  { id: 8, code: "RYL08", name: "Royal", size: "1L", category: "Soda", supplier: "CCBPI", dateAcquired: "04 Nov 2025", totalCase: 20, remainingCase: 3, lastCheckBy: "Admin", expiryDate: "20 Dec 2025", stockStatus: "Low Stock", flag: "Defective", selected: false, pricePerCase: 400 },
  { id: 9, code: "POW09", name: "Powerade", size: "500mL", category: "Sports", supplier: "CCBPI", dateAcquired: "03 Nov 2025", totalCase: 20, remainingCase: 18, lastCheckBy: "Admin", expiryDate: "10 Jun 2030", stockStatus: "In Stock", flag: "None", selected: false, pricePerCase: 680 },
  { id: 10, code: "RED11", name: "Red Bull", size: "250mL", category: "Energy", supplier: "Red Bull GmbH", dateAcquired: "02 Nov 2025", totalCase: 12, remainingCase: 4, lastCheckBy: "Rjay Salinas", expiryDate: "01 Sep 2027", stockStatus: "Low Stock", flag: "None", selected: false, pricePerCase: 1440 },
];

const statusStyle: Record<StockStatus, { bg: string; color: string; dot: string }> = {
  "In Stock":     { bg: "#e8f5e9", color: "#2e7d32", dot: "#4caf50" },
  "Low Stock":    { bg: "#fff8e1", color: "#e65100", dot: "#ff9800" },
  "Out of Stock": { bg: "#ffebee", color: "#c62828", dot: "#f44336" },
};

const flagConfig: Record<FlagStatus, { bg: string; color: string; border: string; icon: string; label: string }> = {
  None:      { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", icon: "✅", label: "Clear Flag" },
  Defective: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80", icon: "⚠️", label: "Defective" },
  Expired:   { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", icon: "☠️", label: "Expired" },
};

const categories = ["All", "Cola", "Soda", "Sports", "Energy"];
const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];
const checkers = ["All", "Admin", "Rjay Salinas"];

export default function InventoryAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategory] = useState("All");
  const [statusFilter, setStatus] = useState("All");
  const [checkerFilter, setChecker] = useState("All");

  // Detail / Adjust modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [adjustCase, setAdjustCase] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustReason, setAdjustReason] = useState("Received");
  const [showFlagInDetail, setShowFlagInDetail] = useState(false);

  const filtered = useMemo(() =>
    products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
      const matchCat    = categoryFilter === "All" || p.category === categoryFilter;
      const matchStatus = statusFilter === "All" || p.stockStatus === statusFilter;
      const matchCheck  = checkerFilter === "All" || p.lastCheckBy === checkerFilter;
      return matchSearch && matchCat && matchStatus && matchCheck;
    }),
    [products, search, categoryFilter, statusFilter, checkerFilter]
  );

  const openDetail = (p: Product) => {
    setDetailProduct({ ...p });
    setAdjustCase(0);
    setAdjustNote("");
    setAdjustReason("Received");
    setShowFlagInDetail(false);
  };

  const applyAdjustment = () => {
    if (!detailProduct) return;
    const newRemaining = Math.max(0, Math.min(detailProduct.totalCase, detailProduct.remainingCase + adjustCase));
    const updated: Product = {
      ...detailProduct,
      remainingCase: newRemaining,
      stockStatus: deriveStatus(newRemaining, detailProduct.totalCase),
    };
    setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setDetailProduct(updated);
    setAdjustCase(0);
    setAdjustNote("");
  };

  const applyFlag = (flag: FlagStatus) => {
    if (!detailProduct) return;
    const updated = { ...detailProduct, flag };
    setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setDetailProduct(updated);
    setShowFlagInDetail(false);
  };

  const stockCounts = {
    total: products.length,
    inStock: products.filter((p) => p.stockStatus === "In Stock").length,
    low: products.filter((p) => p.stockStatus === "Low Stock").length,
    out: products.filter((p) => p.stockStatus === "Out of Stock").length,
  };

  return (
    <div style={{ padding: "28px", fontFamily: "'Segoe UI', sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Products", value: stockCounts.total,   icon: "📦", bg: "#f0faf2", color: "#1a3c2e",  accent: "#1a3c2e" },
          { label: "In Stock",       value: stockCounts.inStock, icon: "✅", bg: "#e8f5e9", color: "#2e7d32",  accent: "#4caf50" },
          { label: "Low Stock",      value: stockCounts.low,     icon: "⚠️", bg: "#fff8e1", color: "#e65100",  accent: "#ff9800" },
          { label: "Out of Stock",   value: stockCounts.out,     icon: "❌", bg: "#ffebee", color: "#c62828",  accent: "#f44336" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
              {s.icon}
            </div>
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
            placeholder="Search code or product..."
            style={{ padding: "8px 14px 8px 34px", borderRadius: "20px", border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none", width: "210px", color: "#1a1a1a", background: "#fafafa" }}
          />
        </div>

        {[
          { label: "Category", value: categoryFilter, set: setCategory, options: categories, icon: "🏷" },
          { label: "Status",   value: statusFilter,   set: setStatus,   options: statuses,   icon: "📊" },
          { label: "Checker",  value: checkerFilter,  set: setChecker,  options: checkers,   icon: "👤" },
        ].map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f5f5f5", borderRadius: "20px", padding: "5px 10px" }}>
            <span style={{ fontSize: "12px" }}>{f.icon}</span>
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "13px", outline: "none", color: "#444", cursor: "pointer" }}
            >
              {f.options.map((o) => <option key={o} value={o}>{f.label}: {o}</option>)}
            </select>
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "20px", border: "1.5px solid #1a3c2e", background: "#fff", color: "#1a3c2e", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            📤 Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
            <thead>
              <tr style={{ background: "#1a3c2e" }}>
                {["Code", "Product Name / Size", "Category", "Supplier", "Date Acquired", "Total Case", "Remaining Case", "Last Check By", "Stock Status", "Action"].map((h) => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "60px", textAlign: "center", color: "#bbb" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
                    <p style={{ fontSize: "14px" }}>No products found</p>
                  </td>
                </tr>
              ) : filtered.map((p, idx) => {
                const st = statusStyle[p.stockStatus];
                const pct = Math.round((p.remainingCase / Math.max(p.totalCase, 1)) * 100);
                return (
                  <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                  >
                    {/* Code */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#1a3c2e", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.5px" }}>
                        {p.code}
                      </span>
                    </td>
                    {/* Name / Size */}
                    <td style={{ padding: "13px 16px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{p.name}</p>
                      <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{p.size}</p>
                    </td>
                    {/* Category */}
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#555" }}>{p.category}</td>
                    {/* Supplier */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#e8f0fe", color: "#1a237e", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                        {p.supplier}
                      </span>
                    </td>
                    {/* Date Acquired */}
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "#888" }}>{p.dateAcquired}</td>
                    {/* Total Case */}
                    <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 600, color: "#333" }}>{p.totalCase}</td>
                    {/* Remaining Case */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 800, color: st.color }}>{p.remainingCase}</p>
                          <div style={{ width: "60px", height: "4px", borderRadius: "10px", background: "#f0f0f0", marginTop: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: st.dot, borderRadius: "10px", transition: "width 0.3s" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: "11px", color: "#bbb" }}>{pct}%</span>
                      </div>
                    </td>
                    {/* Last Check By */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "11px" }}>
                        {p.lastCheckBy}
                      </span>
                    </td>
                    {/* Stock Status */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: st.bg, color: st.color }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: st.dot, flexShrink: 0 }} />
                        {p.stockStatus}
                      </span>
                    </td>
                    {/* Action */}
                    <td style={{ padding: "13px 16px" }}>
                      <button
                        onClick={() => openDetail(p)}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "20px", border: "none", background: "#1a3c2e", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(26,60,46,0.2)" }}
                      >
                        📋 View & Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            Showing <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong> of <strong style={{ color: "#1a1a1a" }}>{products.length}</strong> products
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DETAIL + ADJUST MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {detailProduct && (
        <>
          <div onClick={() => setDetailProduct(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 50, background: "#fff", borderRadius: "24px",
            width: "min(96vw, 580px)", maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 32px 100px rgba(0,0,0,0.25)",
          }}>

            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1a3c2e 0%, #2e7d32 100%)", borderRadius: "24px 24px 0 0", padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.5px" }}>
                      {detailProduct.code}
                    </span>
                    {detailProduct.flag !== "None" && (
                      <span style={{ background: flagConfig[detailProduct.flag].bg, color: flagConfig[detailProduct.flag].color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                        {flagConfig[detailProduct.flag].icon} {detailProduct.flag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>{detailProduct.name}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{detailProduct.size} · {detailProduct.category} · {detailProduct.supplier}</p>
                </div>
                <button onClick={() => setDetailProduct(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ✕
                </button>
              </div>

              {/* Stock visual */}
              <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Remaining Cases</p>
                    <p style={{ fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{detailProduct.remainingCase}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>of {detailProduct.totalCase} total</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: statusStyle[detailProduct.stockStatus].bg, color: statusStyle[detailProduct.stockStatus].color }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusStyle[detailProduct.stockStatus].dot }} />
                      {detailProduct.stockStatus}
                    </span>
                  </div>
                </div>
                <div style={{ height: "8px", borderRadius: "20px", background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((detailProduct.remainingCase / Math.max(detailProduct.totalCase, 1)) * 100)}%`,
                    background: detailProduct.stockStatus === "Out of Stock" ? "#f44336" : detailProduct.stockStatus === "Low Stock" ? "#ff9800" : "#69f0ae",
                    borderRadius: "20px",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>

              {/* Product Details Grid */}
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Product Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
                {[
                  ["Category",      detailProduct.category],
                  ["Supplier",      detailProduct.supplier],
                  ["Date Acquired", detailProduct.dateAcquired],
                  ["Expiry Date",   detailProduct.expiryDate],
                  ["Last Check By", detailProduct.lastCheckBy],
                  ["Price / Case",  `₱${detailProduct.pricePerCase.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "#f9f9f9", borderRadius: "12px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "10px", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontWeight: 700 }}>{label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Case Adjustment ── */}
              <div style={{ background: "#f0faf2", borderRadius: "16px", border: "1.5px solid #a5d6a7", padding: "20px", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#1a3c2e", marginBottom: "4px" }}>📦 Adjust Cases</p>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>Enter a positive number to add cases, or negative to deduct.</p>

                {/* Reason */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Reason</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["Received", "Sold", "Damaged", "Return", "Audit Correction"].map((r) => (
                      <button key={r} onClick={() => setAdjustReason(r)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: adjustReason === r ? "none" : "1.5px solid #ddd", background: adjustReason === r ? "#1a3c2e" : "#fff", color: adjustReason === r ? "#fff" : "#555", cursor: "pointer", transition: "all 0.15s" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qty input */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Case Quantity</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => setAdjustCase((v) => v - 1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#c62828", flexShrink: 0 }}>−</button>
                    <input
                      type="number"
                      value={adjustCase}
                      onChange={(e) => setAdjustCase(Number(e.target.value))}
                      style={{ width: "90px", textAlign: "center", padding: "8px", borderRadius: "10px", border: "1.5px solid #1a3c2e", fontSize: "18px", fontWeight: 800, outline: "none", color: adjustCase < 0 ? "#c62828" : adjustCase > 0 ? "#2e7d32" : "#1a1a1a" }}
                    />
                    <button onClick={() => setAdjustCase((v) => v + 1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "#1a3c2e", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>+</button>
                    <div style={{ fontSize: "13px", color: "#888" }}>
                      → New total: <strong style={{ color: "#1a3c2e", fontSize: "15px" }}>
                        {Math.max(0, Math.min(detailProduct.totalCase, detailProduct.remainingCase + adjustCase))}
                      </strong> cases
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Note (Optional)</label>
                  <input
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="e.g. Received from supplier delivery DR-0012..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e0e0e0", fontSize: "13px", outline: "none", color: "#1a1a1a", background: "#fff", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  onClick={applyAdjustment}
                  disabled={adjustCase === 0}
                  style={{ width: "100%", padding: "13px", borderRadius: "14px", border: "none", background: adjustCase === 0 ? "#e0e0e0" : "#1a3c2e", color: adjustCase === 0 ? "#bbb" : "#fff", fontSize: "14px", fontWeight: 700, cursor: adjustCase === 0 ? "not-allowed" : "pointer", boxShadow: adjustCase !== 0 ? "0 4px 14px rgba(26,60,46,0.3)" : "none", transition: "all 0.2s" }}
                >
                  {adjustCase > 0 ? `✅ Add ${adjustCase} Case${Math.abs(adjustCase) > 1 ? "s" : ""}` : adjustCase < 0 ? `➖ Deduct ${Math.abs(adjustCase)} Case${Math.abs(adjustCase) > 1 ? "s" : ""}` : "Enter an adjustment"}
                </button>
              </div>

              {/* ── Flag Section ── */}
              <div style={{ marginBottom: "16px" }}>
                <button
                  onClick={() => setShowFlagInDetail(!showFlagInDetail)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>🚩 Flag Product {detailProduct.flag !== "None" ? `(Currently: ${detailProduct.flag})` : ""}</span>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>{showFlagInDetail ? "▲" : "▼"}</span>
                </button>

                {showFlagInDetail && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                    {(["Defective", "Expired", "None"] as FlagStatus[]).map((f) => {
                      const fc = flagConfig[f];
                      const isActive = detailProduct.flag === f;
                      return (
                        <button key={f} onClick={() => applyFlag(f)} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 16px", borderRadius: "12px", border: `1.5px solid ${isActive ? fc.color : fc.border}`, background: isActive ? fc.bg : "#fff", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" }}>
                          <span style={{ fontSize: "22px" }}>{fc.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: fc.color }}>{fc.label}</p>
                          </div>
                          {isActive && <span style={{ fontSize: "12px", fontWeight: 700, color: fc.color }}>✓ Active</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close */}
              <button onClick={() => setDetailProduct(null)} style={{ width: "100%", padding: "12px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}