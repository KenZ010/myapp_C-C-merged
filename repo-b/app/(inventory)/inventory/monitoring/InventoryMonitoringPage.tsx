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
  name: string;
  category: string;
  totalStock: number;
  remainingStock: number;
  stockStatus: StockStatus;
  earliestExpiry: string | null;
  expiryStatus: ExpiryStatus;
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
  const r = 60, cx = 75, cy = 75;
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
    <svg viewBox="0 0 150 150" width="130" height="130">
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
          name:           p.productName,
          category:       p.category,
          totalStock:     p.stock,
          remainingStock: p.stock,
          stockStatus:    getStockStatus(p.stock),
          earliestExpiry,
          expiryStatus:   getExpiryStatus(earliestExpiry),
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
    } catch (_e) {
      showToast("❌ Failed to write off expired batches.");
    } finally {
      setWritingOff(false);
    }
  };

  const filtered = useMemo(
    () => items.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

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
    <div style={{ padding: "12px" }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 60, background: "#4caf50", color: "#fff", padding: "10px 16px", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: "13px", fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Total Products",  value: items.length,        color: "#2e7d32" },
          { label: "Total Cases",     value: items.reduce((s, p) => s + p.remainingStock, 0), color: "#2e7d32" },
          { label: "Low / No Stock",  value: lowStock + outOfStock, color: "#f57f17" },
          { label: "Expiring Soon",   value: expiring,             color: "#e65100" },
          { label: "Expired Batches", value: expired,              color: "#c62828" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", padding: "12px 14px" }}>
            <p style={{ fontSize: "18px", fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Alerts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px", marginBottom: "14px" }}>

        {/* Low / No Stock Alert */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px" }}>⚠️</span>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", margin: 0, flex: 1 }}>Low / No Stock</p>
            <span style={{ background: "#fff9c4", color: "#f57f17", padding: "1px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700 }}>{lowStock + outOfStock}</span>
          </div>
          {(() => {
            const alertItems = items.filter((p) => p.stockStatus !== "In Stock").slice(0, 6);
            return alertItems.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", padding: "8px 0", margin: 0 }}>✅ All products sufficiently stocked</p>
            ) : alertItems.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", fontWeight: 500, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px", flexShrink: 0, ...stockStyle[p.stockStatus] }}>
                  {p.remainingStock} left
                </span>
              </div>
            ));
          })()}
        </div>

        {/* Batch Expiry Alert */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px" }}>⏰</span>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", margin: 0, flex: 1 }}>Batch Expiry</p>
            {expired > 0 && (
              <button onClick={handleWriteOff} disabled={writingOff}
                style={{ padding: "3px 10px", borderRadius: "6px", border: "none", background: writingOff ? "#aaa" : "#c62828", color: "#fff", fontSize: "10px", fontWeight: 600, cursor: writingOff ? "not-allowed" : "pointer" }}>
                {writingOff ? "..." : `Write Off (${expired})`}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            <button onClick={() => setActiveTab("expiring")}
              style={{ padding: "2px 8px", borderRadius: "10px", border: "none", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: activeTab === "expiring" ? "#fff9c4" : "#f5f5f5", color: activeTab === "expiring" ? "#e65100" : "#888" }}>
              Expiring ({expiring})
            </button>
            <button onClick={() => setActiveTab("expired")}
              style={{ padding: "2px 8px", borderRadius: "10px", border: "none", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: activeTab === "expired" ? "#ffebee" : "#f5f5f5", color: activeTab === "expired" ? "#c62828" : "#888" }}>
              Expired ({expired})
            </button>
          </div>
          {(() => {
            const batchList = activeTab === "expiring" ? expiringBatches : expiredBatches;
            return batchList.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", padding: "8px 0", margin: 0 }}>
                {activeTab === "expiring" ? "✅ No batches expiring in 30 days" : "✅ No expired batches"}
              </p>
            ) : (
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {batchList.map((b) => {
                const daysLeft = b.expiryDate
                  ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                    <p style={{ flex: 1, fontSize: "11px", color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.product?.productName ?? b.productId}
                    </p>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px", flexShrink: 0,
                      ...(activeTab === "expired"
                        ? { background: "#ffebee", color: "#c62828" }
                        : daysLeft !== null && daysLeft <= 7
                          ? { background: "#ffebee", color: "#c62828" }
                          : { background: "#fff9c4", color: "#e65100" })
                    }}>
                      {activeTab === "expired" ? "Expired" : daysLeft !== null ? `${daysLeft}d` : "—"}
                    </span>
                  </div>
                );
              })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>📈 Top Stocked Products</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topStocked.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#aaa", width: "14px", textAlign: "right" }}>#{i + 1}</span>
                <p style={{ fontSize: "11px", color: "#555", width: "80px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <div style={{ flex: 1, height: "16px", background: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(p.remainingStock / maxStock) * 100}%`, background: i === 0 ? "#1a3c2e" : i === 1 ? "#2d7a3a" : i === 2 ? "#56ab6e" : "#a5d6a7", borderRadius: "4px" }} />
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1a3c2e", width: "40px", textAlign: "right" }}>{p.remainingStock}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>🗂️ Inventory by Category</p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <PieChart data={categoryData} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {categoryData.map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: c.color, flexShrink: 0 }} />
                  <p style={{ fontSize: "11px", color: "#555" }}>{c.label}: <strong>{c.pct}%</strong></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "240px" }}>
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px" }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            style={{ width: "100%", padding: "6px 10px 6px 28px", borderRadius: "8px", border: "1.5px solid #ddd", fontSize: "12px", outline: "none", color: "#1a1a1a" }} />
        </div>
        <span style={{ fontSize: "11px", color: "#888", fontWeight: 500, marginLeft: "auto" }}>{filtered.length} products</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: "10px", border: "0.5px solid #e8e8e8", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              {["Product Name", "Category", "Stock", "Earliest Expiry", "Expiry Status", "Stock Status"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: p.stockStatus === "Out of Stock" ? "#fff5f5" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 500, color: "#1a1a1a" }}>{p.name}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>{p.category}</span>
                </td>
                <td style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 700, color: p.remainingStock === 0 ? "#c62828" : p.remainingStock <= 10 ? "#f57f17" : "#2e7d32" }}>
                  {p.remainingStock}
                </td>
                <td style={{ padding: "8px 12px", fontSize: "11px", color: p.earliestExpiry ? (getExpiryStatus(p.earliestExpiry) === "Expired" ? "#c62828" : getExpiryStatus(p.earliestExpiry) === "Expiring Soon" ? "#e65100" : "#2e7d32") : "#aaa", fontWeight: 600 }}>
                  {formatDate(p.earliestExpiry)}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, ...expiryStyle[p.expiryStatus] }}>{p.expiryStatus}</span>
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, ...stockStyle[p.stockStatus] }}>{p.stockStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
