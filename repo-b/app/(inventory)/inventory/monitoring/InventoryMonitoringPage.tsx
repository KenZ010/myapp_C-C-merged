"use client";
import { useState, useMemo, useEffect } from "react";

const API_URL = "https://backend-production-740c.up.railway.app/api";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type ExpiryStatus =
  | "Fresh/Valid"
  | "Expiring Soon"
  | "Expired"
  | "No Expiry"
  | "Unknown";

type ApiProduct = {
  id: string;
  productName: string;
  category: string;
  size: string;
  price: number;
  stock: number;
  expiryDate: string | null;
  status: string;
  createdAt: string;
  supplier: { supplierName: string } | null;
  finalPrice: number;
};

type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  dateAcquired: string;
  totalStock: number;
  remainingStock: number;
  unitsSold: number;
  lastCheckBy: string;
  expiryDate: string;
  expiryStatus: ExpiryStatus;
  stockStatus: StockStatus;
  selected: boolean;
};

const stockStyle: Record<StockStatus, React.CSSProperties> = {
  "In Stock": { background: "#e8f5e9", color: "#2e7d32" },
  "Low Stock": { background: "#fff9c4", color: "#f57f17" },
  "Out of Stock": { background: "#ffebee", color: "#c62828" },
};

const expiryStyle: Record<ExpiryStatus, React.CSSProperties> = {
  "Fresh/Valid": { background: "#e8f5e9", color: "#2e7d32" },
  "Expiring Soon": { background: "#fff9c4", color: "#f57f17" },
  Expired: { background: "#ffebee", color: "#c62828" },
  "No Expiry": { background: "#e8f0fe", color: "#1565c0" },
  Unknown: { background: "#f5f5f5", color: "#757575" },
};

function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "No Expiry";
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return "Unknown";
  const now = new Date();
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Fresh/Valid";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapApiProduct(p: ApiProduct): Product {
  const expiryStatus = getExpiryStatus(p.expiryDate);
  const stockStatus = getStockStatus(p.stock);
  return {
    id: p.id,
    code: p.id,
    name: p.productName,
    category: p.category,
    dateAcquired: formatDate(p.createdAt),
    totalStock: p.stock,
    remainingStock: p.stock,
    unitsSold: 0,
    lastCheckBy: p.supplier?.supplierName ?? "—",
    expiryDate: p.expiryDate
      ? new Date(p.expiryDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "No Expiry",
    expiryStatus,
    stockStatus,
    selected: false,
  };
}

function PieChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 80, cx = 100, cy = 100;
  const slices = data.reduce<{ label: string; color: string; pct: number; d: string }[]>(
    (acc, d) => {
      const prev = acc.reduce((s, x) => s + x.pct / 100, 0);
      const start = prev, end = prev + d.pct / 100;
      const startAngle = start * 2 * Math.PI - Math.PI / 2;
      const endAngle = end * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
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
  SOFTDRINKS: "#4a90d9",
  BEER: "#7c3aed",
  ENERGY: "#e65100",
  SPORTS: "#2d7a3a",
  OTHER: "#f5c842",
};

export default function InventoryMonitoringPage() {
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((r) => r.json())
      .then((data: ApiProduct[]) => {
        setItems(data.map(mapApiProduct));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const toggleSelect = (id: string) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));

  const toggleSelectAll = () => {
    const v = !selectAll;
    setSelectAll(v);
    setItems((prev) => prev.map((p) => ({ ...p, selected: v })));
  };

  const inStock = items.reduce((sum, p) => sum + p.remainingStock, 0);
  const lowStock = items.filter((p) => p.stockStatus === "Low Stock").length;
  const outOfStock = items.filter((p) => p.stockStatus === "Out of Stock").length;
  const expiring = items.filter(
    (p) => p.expiryStatus === "Expiring Soon" || p.expiryStatus === "Expired"
  ).length;

  const topSelling = [...items].sort((a, b) => b.remainingStock - a.remainingStock).slice(0, 5);
  const maxStock = topSelling[0]?.remainingStock || 1;

  // Build category pie data from real products
  const categoryMap: Record<string, number> = {};
  items.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  });
  const total = items.length || 1;
  const categoryData = Object.entries(categoryMap).map(([label, count], i) => ({
    label,
    pct: Math.round((count / total) * 100),
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
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Products", value: items.length, icon: "📦", bg: "#e8f5e9", color: "#1a3c2e" },
          { label: "Total Cases", value: inStock, icon: "✅", bg: "#e8f5e9", color: "#2e7d32" },
          { label: "Low / No Stock", value: lowStock + outOfStock, icon: "⚠️", bg: "#fff9c4", color: "#f57f17" },
          { label: "Expiring / Expired", value: expiring, icon: "⏰", bg: "#ffebee", color: "#c62828" },
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

      {/* Alerts Row */}
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
          {items.filter((p) => p.stockStatus !== "In Stock").length === 0 && (
            <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "16px 0" }}>✅ All products sufficiently stocked</p>
          )}
          {items.filter((p) => p.stockStatus !== "In Stock").map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>🥤</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{p.name} ({p.code})</p>
                <div style={{ height: "4px", background: "#f0f0f0", borderRadius: "4px", marginTop: "4px" }}>
                  <div style={{ height: "100%", width: `${(p.remainingStock / (p.totalStock || 1)) * 100}%`, background: p.remainingStock === 0 ? "#ef5350" : "#ff9800", borderRadius: "4px" }} />
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", ...stockStyle[p.stockStatus] }}>
                {p.remainingStock}/{p.totalStock}
              </span>
            </div>
          ))}
        </div>

        {/* Expiry Alert */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "18px" }}>⏰</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>Expiry Alert</p>
            <span style={{ marginLeft: "auto", background: "#ffebee", color: "#c62828", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
              {expiring} items
            </span>
          </div>
          {items.filter((p) => p.expiryStatus === "Expiring Soon" || p.expiryStatus === "Expired").map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>🥤</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{p.name} ({p.code})</p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>Expiry: {p.expiryDate}</p>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", ...expiryStyle[p.expiryStatus] }}>
                {p.expiryStatus}
              </span>
            </div>
          ))}
          {expiring === 0 && (
            <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "16px 0" }}>✅ No expiry issues</p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        {/* Top Stock Bar Chart */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "22px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>📈 Top Stocked Products</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topSelling.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", width: "18px", textAlign: "right" }}>#{i + 1}</span>
                <p style={{ fontSize: "12px", color: "#555", width: "90px", flexShrink: 0 }}>{p.name}</p>
                <div style={{ flex: 1, height: "24px", background: "#f0f0f0", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(p.remainingStock / maxStock) * 100}%`, background: i === 0 ? "#1a3c2e" : i === 1 ? "#2d7a3a" : i === 2 ? "#56ab6e" : "#a5d6a7", borderRadius: "6px", transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a3c2e", width: "50px", textAlign: "right" }}>{p.remainingStock}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#aaa", marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#2d7a3a", borderRadius: "3px" }} /> Units in Stock
          </p>
        </div>

        {/* Inventory by Category Pie Chart */}
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

      {/* Search bar */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ padding: "8px 14px 8px 32px", borderRadius: "20px", border: "1.5px solid #ddd", fontSize: "13px", outline: "none", width: "200px", color: "#1a1a1a" }}
          />
        </div>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#888", fontWeight: 500 }}>{filtered.length} products</span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", overflowX: "auto", width: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              <th style={{ padding: "12px 14px", width: "40px" }}>
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ cursor: "pointer", width: "15px", height: "15px" }} />
              </th>
              {["Code", "Product Name", "Category", "Date Acquired", "Stock", "Supplier", "Expiry Status", "Stock Status"].map((h) => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "12px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {h} ↕
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: p.selected ? "#f0faf2" : p.stockStatus === "Out of Stock" ? "#fff5f5" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px 14px" }}>
                  <input type="checkbox" checked={!!p.selected} onChange={() => toggleSelect(p.id)} style={{ cursor: "pointer", width: "15px", height: "15px" }} />
                </td>
                <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#1a3c2e" }}>{p.code}</td>
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
                  <span style={{ background: "#e8e8e8", color: "#555", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>{p.lastCheckBy}</span>
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
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
          <p style={{ fontSize: "12px", color: "#888" }}>Showing {filtered.length} of {items.length} products</p>
        </div>
      </div>
    </div>
  );
}
