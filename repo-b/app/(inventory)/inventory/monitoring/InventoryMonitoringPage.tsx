"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type ExpiryStatus = "Fresh/Valid" | "Expiring Soon" | "Expired" | "No Expiry";

type ApiProduct = {
  id: string;
  productName: string;
  category: string;
  size: string;
  price: number;
  stock: number;
  status: string;
  createdAt: string;
  supplier: { supplierName: string } | null;
  finalPrice: number;
};

type StockBatch = {
  id: string;
  productId: string;
  remaining: number;
  expiryDate: string | null;
  deliveryItem: {
    delivery: { id: string; deliveryDate: string };
  };
  product?: { productName: string; size?: string };
};

type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  dateAcquired: string;
  totalStock: number;
  remainingStock: number;
  supplier: string;
  stockStatus: StockStatus;
  earliestExpiry: string | null;
  expiryStatus: ExpiryStatus;
  selected: boolean;
};

const stockStyle: Record<StockStatus, React.CSSProperties> = {
  "In Stock":     { background: "#e8f5e9", color: "#2e7d32" },
  "Low Stock":    { background: "#fff9c4", color: "#f57f17" },
  "Out of Stock": { background: "#ffebee", color: "#c62828" },
};

const expiryStyle: Record<ExpiryStatus, React.CSSProperties> = {
  "Fresh/Valid":   { background: "#e8f5e9", color: "#2e7d32" },
  "Expiring Soon": { background: "#fff9c4", color: "#f57f17" },
  "Expired":       { background: "#ffebee", color: "#c62828" },
  "No Expiry":     { background: "#e8f0fe", color: "#1565c0" },
};

function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "No Expiry";
  const exp = new Date(expiryDate);
  const now = new Date();
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Fresh/Valid";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No Expiry";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function PieChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 80, cx = 100, cy = 100;
  const slices = data.reduce<{ label: string; color: string; pct: number; d: string }[]>(
    (acc, d) => {
      const prev = acc.reduce((s, x) => s + x.pct / 100, 0);
      const start = prev, end = prev + d.pct / 100;
      const startAngle = start * 2 * Math.PI - Math.PI / 2;
      const endAngle   = end   * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
      const large = d.pct > 50 ? 1 : 0;
      return [...acc, { ...d, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z` }];
    }, []
  );
  return (
    <svg viewBox="0 0 200 200" width="180" height="180">
      {slices.map((s) => (
        <path key={s.label} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  SOFTDRINKS:   "#4a90d9",
  BEER:         "#7c3aed",
  ENERGY_DRINK: "#e65100",
  JUICE:        "#2d7a3a",
  WATER:        "#00acc1",
  OTHER:        "#f5c842",
};

export default function InventoryMonitoringPage() {
  const [search,          setSearch]          = useState("");
  const [selectAll,       setSelectAll]       = useState(false);
  const [items,           setItems]           = useState<Product[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [expiringBatches, setExpiringBatches] = useState<StockBatch[]>([]);
  const [expiredBatches,  setExpiredBatches]  = useState<StockBatch[]>([]);
  const [writingOff,      setWritingOff]      = useState(false);
  const [toast,           setToast]           = useState("");
  const [activeTab,       setActiveTab]       = useState<"expiring" | "expired">("expiring");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [products, expiring, expired] = await Promise.all([
        fetch("https://backend-production-740c.up.railway.app/api/products").then(r => r.json()),
        api.getExpiringBatches(30).catch((e: unknown) => {
          console.error("expiring batches fetch failed:", e);
          return [] as StockBatch[];
        }),
        api.getExpiredBatches().catch((e: unknown) => {
          console.error("expired batches fetch failed:", e);
          return [] as StockBatch[];
        }),
      ]);

      // Build earliest expiry per product from batch data
      const expiryMap: Record<string, string | null> = {};
      [...expiring, ...expired].forEach((b: StockBatch) => {
        if (!b.expiryDate) return;
        const existing = expiryMap[b.productId];
        if (!existing || new Date(b.expiryDate) < new Date(existing)) {
          expiryMap[b.productId] = b.expiryDate;
        }
      });

      setItems((products as ApiProduct[]).map((p) => {
        const earliestExpiry = expiryMap[p.id] ?? null;
        return {
          id:             p.id,
          code:           p.id,
          name:           p.productName,
          category:       p.category,
          dateAcquired:   formatDate(p.createdAt),
          totalStock:     p.stock,
          remainingStock: p.stock,
          supplier:       p.supplier?.supplierName ?? "—",
          stockStatus:    getStockStatus(p.stock),
          earliestExpiry,
          expiryStatus:   getExpiryStatus(earliestExpiry),
          selected:       false,
        };
      }));

      setExpiringBatches(expiring);
      setExpiredBatches(expired);
    } catch (e) {
      console.error("fetchAll failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleWriteOff = async () => {
    const raw = localStorage.getItem("employee") || localStorage.getItem("user") || "{}";
    const employee = JSON.parse(raw);
    const employeeId = employee?.id ?? employee?.employeeId ?? null;
    if (!employeeId) { showToast("No employee session found."); return; }
    if (!confirm(`Write off ${expiredBatches.length} expired batch(es)? This cannot be undone.`)) return;
    try {
      setWritingOff(true);
      const result = await api.writeOffExpiredBatches(employeeId);
      showToast(`✅ Wrote off ${result.written} batch(es), ${result.totalQty} units total.`);
      await fetchAll();
    } catch (e) {
      showToast("❌ Failed to write off expired batches.");
    } finally {
      setWritingOff(false);
    }
  };

  const filtered = useMemo(
    () => items.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  const toggleSelect    = (id: string) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  const toggleSelectAll = () => {
    const v = !selectAll;
    setSelectAll(v);
    setItems((prev) => prev.map((p) => ({ ...p, selected: v })));
  };

  const lowStock    = items.filter((p) => p.stockStatus === "Low Stock").length;
  const outOfStock  = items.filter((p) => p.stockStatus === "Out of Stock").length;
  const expiring    = expiringBatches.length;
  const expired     = expiredBatches.length;

  const topStocked = [...items].sort((a, b) => b.remainingStock - a.remainingStock).slice(0, 5);
  const maxStock   = topStocked[0]?.remainingStock || 1;

  const categoryMap: Record<string, number> = {};
  items.forEach((p) => { categoryMap[p.category] = (categoryMap[p.category] || 0) + 1; });
  const total        = items.length || 1;
  const categoryData = Object.entries(categoryMap).map(([label, count], i) => ({
    label,
    pct:   Math.round((count / total) * 100),
    color: CATEGORY_COLORS[label] ?? ["#4a90d9","#7c3aed","#2d7a3a","#e65100","#f5c842"][i % 5],
  }));

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 15 }}>
        Loading inventory...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 60, background: "#4caf50", color: "#fff", padding: "12px 20px", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: "14px", fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Products",     value: items.length,        icon: "📦", bg: "#e8f5e9", color: "#1a3c2e" },
          { label: "Total Cases",        value: items.reduce((s, p) => s + p.remainingStock, 0), icon: "✅", bg: "#e8f5e9", color: "#2e7d32" },
          { label: "Low / No Stock",     value: lowStock + outOfStock, icon: "⚠️", bg: "#fff9c4", color: "#f57f17" },
          { label: "Expiring Soon",      value: expiring,             icon: "⏰", bg: "#fff9c4", color: "#e65100" },
          { label: "Expired Batches",    value: expired,              icon: "🚨", bg: "#ffebee", color: "#c62828" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: "12px", color: "#888" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alerts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px", marginBottom: "24px" }}>

        {/* Low Stock Alert */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>Low / No Stock Alert</p>
            <span style={{ marginLeft: "auto", background: "#fff9c4", color: "#f57f17", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
              {lowStock + outOfStock} items
            </span>
          </div>
          {items.filter((p) => p.stockStatus !== "In Stock").length === 0 ? (
            <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "16px 0" }}>✅ All products sufficiently stocked</p>
          ) : items.filter((p) => p.stockStatus !== "In Stock").map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>🥤</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{p.name}</p>
                <div style={{ height: "4px", background: "#f0f0f0", borderRadius: "4px", marginTop: "4px" }}>
                  <div style={{ height: "100%", width: `${(p.remainingStock / (p.totalStock || 1)) * 100}%`, background: p.remainingStock === 0 ? "#ef5350" : "#ff9800", borderRadius: "4px" }} />
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", ...stockStyle[p.stockStatus] }}>
                {p.remainingStock} left
              </span>
            </div>
          ))}
        </div>

        {/* Expiry Batch Alert */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "18px" }}>⏰</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>Batch Expiry Alert</p>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              <button onClick={() => setActiveTab("expiring")}
                style={{ padding: "2px 10px", borderRadius: "20px", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: activeTab === "expiring" ? "#fff9c4" : "#f5f5f5", color: activeTab === "expiring" ? "#e65100" : "#888" }}>
                ⏰ {expiring} Expiring
              </button>
              <button onClick={() => setActiveTab("expired")}
                style={{ padding: "2px 10px", borderRadius: "20px", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: activeTab === "expired" ? "#ffebee" : "#f5f5f5", color: activeTab === "expired" ? "#c62828" : "#888" }}>
                🚨 {expired} Expired
              </button>
            </div>
          </div>

          {/* Write Off Button */}
          {activeTab === "expired" && expiredBatches.length > 0 && (
            <div style={{ background: "#ffebee", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <p style={{ fontSize: "12px", color: "#c62828", fontWeight: 600 }}>
                ⚠️ {expiredBatches.length} batch(es) need write-off
              </p>
              <button onClick={handleWriteOff} disabled={writingOff}
                style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: writingOff ? "#aaa" : "#c62828", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: writingOff ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {writingOff ? "Processing..." : "🗑 Write Off"}
              </button>
            </div>
          )}

          {/* Batch List */}
          <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
            {(activeTab === "expiring" ? expiringBatches : expiredBatches).length === 0 ? (
              <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "16px 0" }}>
                {activeTab === "expiring" ? "✅ No batches expiring in 30 days" : "✅ No expired batches"}
              </p>
            ) : (activeTab === "expiring" ? expiringBatches : expiredBatches).map((b) => {
              const daysLeft = b.expiryDate
                ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>🥤</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                      {b.product?.productName ?? b.productId}
                      {b.product?.size && <span style={{ color: "#aaa", fontWeight: 400 }}> {b.product.size}</span>}
                    </p>
                    <p style={{ fontSize: "11px", color: "#aaa" }}>
                      Expiry: {formatDate(b.expiryDate)} • {b.remaining} units remaining
                    </p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", flexShrink: 0,
                    ...(activeTab === "expired"
                      ? { background: "#ffebee", color: "#c62828" }
                      : daysLeft !== null && daysLeft <= 7
                        ? { background: "#ffebee", color: "#c62828" }
                        : { background: "#fff9c4", color: "#e65100" })
                  }}>
                    {activeTab === "expired" ? "Expired" : daysLeft !== null ? `${daysLeft}d left` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "22px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>📈 Top Stocked Products</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topStocked.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", width: "18px", textAlign: "right" }}>#{i + 1}</span>
                <p style={{ fontSize: "12px", color: "#555", width: "90px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <div style={{ flex: 1, height: "24px", background: "#f0f0f0", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(p.remainingStock / maxStock) * 100}%`, background: i === 0 ? "#1a3c2e" : i === 1 ? "#2d7a3a" : i === 2 ? "#56ab6e" : "#a5d6a7", borderRadius: "6px", transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a3c2e", width: "50px", textAlign: "right" }}>{p.remainingStock}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "22px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>🗂️ Inventory by Category</p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
            <PieChart data={categoryData} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {categoryData.map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: c.color, flexShrink: 0 }} />
                  <p style={{ fontSize: "12px", color: "#555" }}>{c.label}: <strong>{c.pct}%</strong></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            style={{ padding: "8px 14px 8px 32px", borderRadius: "20px", border: "1.5px solid #ddd", fontSize: "13px", outline: "none", width: "200px", color: "#1a1a1a" }} />
        </div>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#888", fontWeight: 500 }}>{filtered.length} products</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              <th style={{ padding: "12px 14px", width: "40px" }}>
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ cursor: "pointer", width: "15px", height: "15px" }} />
              </th>
              {["Code", "Product Name", "Category", "Date Acquired", "Stock", "Supplier", "Earliest Expiry", "Expiry Status", "Stock Status"].map((h) => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "12px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: p.selected ? "#f0faf2" : p.stockStatus === "Out of Stock" ? "#fff5f5" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px 14px" }}>
                  <input type="checkbox" checked={!!p.selected} onChange={() => toggleSelect(p.id)} style={{ cursor: "pointer", width: "15px", height: "15px" }} />
                </td>
                <td style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#1a3c2e", fontFamily: "monospace" }}>{p.code.slice(0, 10)}...</td>
                <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{p.name}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>{p.category}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#e8f0fe", color: "#1a237e", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>{p.dateAcquired}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: p.remainingStock === 0 ? "#c62828" : p.remainingStock <= 10 ? "#f57f17" : "#2e7d32", textAlign: "center" }}>
                  {p.remainingStock}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#e8e8e8", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>{p.supplier}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "12px", color: p.earliestExpiry ? (getExpiryStatus(p.earliestExpiry) === "Expired" ? "#c62828" : getExpiryStatus(p.earliestExpiry) === "Expiring Soon" ? "#e65100" : "#2e7d32") : "#aaa", fontWeight: 600 }}>
                  {formatDate(p.earliestExpiry)}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, ...expiryStyle[p.expiryStatus] }}>{p.expiryStatus}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, ...stockStyle[p.stockStatus] }}>{p.stockStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 0", borderTop: "0.5px solid #f0f0f0", marginTop: "8px" }}>
          <p style={{ fontSize: "12px", color: "#888" }}>Showing {filtered.length} of {items.length} products</p>
        </div>
      </div>
    </div>
  );
}