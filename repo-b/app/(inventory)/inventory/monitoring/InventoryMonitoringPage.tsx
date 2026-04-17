"use client";
import { useState, useMemo } from "react";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type ExpiryStatus =
  | "Fresh/Valid"
  | "Expiring Soon"
  | "Expired"
  | "No Expiry"
  | "Unknown";

type Product = {
  id: number;
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

const products: Product[] = (
  [
    {
      id: 1,
      code: "COLA22",
      name: "Coca Cola",
      category: "Cola",
      dateAcquired: "08 Nov 2025",
      totalStock: 30,
      remainingStock: 10,
      unitsSold: 280,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "07 Apr 2030",
      expiryStatus: "Fresh/Valid" as ExpiryStatus,
      stockStatus: "Low Stock" as StockStatus,
    },
    {
      id: 2,
      code: "RC22",
      name: "RC",
      category: "Cola",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 0,
      unitsSold: 95,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "Unknown",
      expiryStatus: "Unknown" as ExpiryStatus,
      stockStatus: "Out of Stock" as StockStatus,
    },
    {
      id: 3,
      code: "PEP12",
      name: "Pepsi",
      category: "Cola",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 15,
      unitsSold: 240,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "10 Apr 2030",
      expiryStatus: "Fresh/Valid" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 4,
      code: "GATO22",
      name: "Gatorade",
      category: "Sports",
      dateAcquired: "06 Nov 2025",
      totalStock: 15,
      remainingStock: 15,
      unitsSold: 110,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "07 Apr 2030",
      expiryStatus: "Fresh/Valid" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 5,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 210,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "No Expiry",
      expiryStatus: "No Expiry" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 6,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 210,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "Expired",
      expiryStatus: "Expired" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 7,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 210,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "Expired",
      expiryStatus: "Expired" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 8,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 180,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "No Expiry",
      expiryStatus: "No Expiry" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 9,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 160,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "Expiring Soon",
      expiryStatus: "Expiring Soon" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
    {
      id: 10,
      code: "COB25",
      name: "Cobra",
      category: "Energy",
      dateAcquired: "06 Nov 2025",
      totalStock: 30,
      remainingStock: 27,
      unitsSold: 120,
      lastCheckBy: "Rjay Salinas",
      expiryDate: "Unknown",
      expiryStatus: "Unknown" as ExpiryStatus,
      stockStatus: "In Stock" as StockStatus,
    },
  ] as Product[]
).map((p) => ({ ...p, selected: false }));

const topSelling = [...products]
  .sort((a, b) => b.unitsSold - a.unitsSold)
  .slice(0, 5);
const maxSold = topSelling[0]?.unitsSold || 1;

const categoryData = [
  { label: "Soft Drinks", pct: 47, color: "#4a90d9" },
  { label: "Beer", pct: 27, color: "#7c3aed" },
  { label: "Fitness", pct: 13, color: "#2d7a3a" },
  { label: "Energy Drink", pct: 7, color: "#e65100" },
  { label: "Home & Kitchen", pct: 7, color: "#f5c842" },
];

// Simple SVG Pie Chart
function PieChart() {
  const r = 80;
  const cx = 100;
  const cy = 100;
  const slices = categoryData.reduce<
    { label: string; color: string; pct: number; d: string }[]
  >((acc, d) => {
    const prev = acc.reduce((s, x) => s + x.pct / 100, 0);
    const start = prev;
    const end = prev + d.pct / 100;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = d.pct > 50 ? 1 : 0;
    return [
      ...acc,
      {
        ...d,
        d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`,
      },
    ];
  }, []);
  return (
    <svg viewBox="0 0 200 200" width="180" height="180">
      {slices.map((s) => (
        <path
          key={s.label}
          d={s.d}
          fill={s.color}
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export default function InventoryMonitoringPage() {
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [items, setItems] = useState(products);

  const filtered = useMemo(
    () =>
      items.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  const toggleSelect = (id: number) =>
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)),
    );
  const toggleSelectAll = () => {
    const v = !selectAll;
    setSelectAll(v);
    setItems((prev) => prev.map((p) => ({ ...p, selected: v })));
  };

  const inStock = products.filter((p) => p.stockStatus === "In Stock").length;
  const lowStock = products.filter((p) => p.stockStatus === "Low Stock").length;
  const outOfStock = products.filter(
    (p) => p.stockStatus === "Out of Stock",
  ).length;
  const expiring = products.filter(
    (p) => p.expiryStatus === "Expiring Soon" || p.expiryStatus === "Expired",
  ).length;

  return (
    <div style={{ padding: "16px" }}>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total Products",
            value: products.length,
            icon: "📦",
            bg: "#e8f5e9",
            color: "#1a3c2e",
          },
          {
            label: "In Stock",
            value: inStock,
            icon: "✅",
            bg: "#e8f5e9",
            color: "#2e7d32",
          },
          {
            label: "Low / No Stock",
            value: lowStock + outOfStock,
            icon: "⚠️",
            bg: "#fff9c4",
            color: "#f57f17",
          },
          {
            label: "Expiring / Expired",
            value: expiring,
            icon: "⏰",
            bg: "#ffebee",
            color: "#c62828",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: "26px", fontWeight: 800, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: "12px", color: "#888" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* Low Stock Alert */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>
              Low / No Stock Alert
            </p>
            <span
              style={{
                marginLeft: "auto",
                background: "#fff9c4",
                color: "#f57f17",
                padding: "2px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {lowStock + outOfStock} items
            </span>
          </div>
          {products
            .filter((p) => p.stockStatus !== "In Stock")
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 0",
                  borderBottom: "0.5px solid #f5f5f5",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  🥤
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1a1a1a",
                    }}
                  >
                    {p.name} ({p.code})
                  </p>
                  <div
                    style={{
                      height: "4px",
                      background: "#f0f0f0",
                      borderRadius: "4px",
                      marginTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(p.remainingStock / p.totalStock) * 100}%`,
                        background:
                          p.remainingStock === 0 ? "#ef5350" : "#ff9800",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    ...stockStyle[p.stockStatus],
                  }}
                >
                  {p.remainingStock}/{p.totalStock}
                </span>
              </div>
            ))}
        </div>

        {/* Expiry Alert */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <span style={{ fontSize: "18px" }}>⏰</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>
              Expiry Alert
            </p>
            <span
              style={{
                marginLeft: "auto",
                background: "#ffebee",
                color: "#c62828",
                padding: "2px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {expiring} items
            </span>
          </div>
          {products
            .filter(
              (p) =>
                p.expiryStatus === "Expiring Soon" ||
                p.expiryStatus === "Expired",
            )
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 0",
                  borderBottom: "0.5px solid #f5f5f5",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  🥤
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1a1a1a",
                    }}
                  >
                    {p.name} ({p.code})
                  </p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>
                    Expiry: {p.expiryDate}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    ...expiryStyle[p.expiryStatus],
                  }}
                >
                  {p.expiryStatus}
                </span>
              </div>
            ))}
          {expiring === 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "#aaa",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              ✅ No expiry issues
            </p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Top Selling Bar Chart */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "22px",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "20px",
            }}
          >
            📈 Top Selling Products Cases
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {topSelling.map((p, i) => (
              <div
                key={p.id}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#aaa",
                    width: "18px",
                    textAlign: "right",
                  }}
                >
                  #{i + 1}
                </span>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    width: "90px",
                    flexShrink: 0,
                  }}
                >
                  {p.name}
                </p>
                <div
                  style={{
                    flex: 1,
                    height: "24px",
                    background: "#f0f0f0",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(p.unitsSold / maxSold) * 100}%`,
                      background:
                        i === 0
                          ? "#1a3c2e"
                          : i === 1
                            ? "#2d7a3a"
                            : i === 2
                              ? "#56ab6e"
                              : "#a5d6a7",
                      borderRadius: "6px",
                      transition: "width 0.5s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1a3c2e",
                    width: "50px",
                    textAlign: "right",
                  }}
                >
                  {p.unitsSold}
                </span>
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "#aaa",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                background: "#2d7a3a",
                borderRadius: "3px",
              }}
            />{" "}
            Units Sold
          </p>
        </div>

        {/* Inventory by Category Pie Chart */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "22px",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "16px",
            }}
          >
            🗂️ Inventory by Category
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <PieChart />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {categoryData.map((c) => (
                <div
                  key={c.label}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "3px",
                      background: c.color,
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ fontSize: "12px", color: "#555" }}>
                    {c.label}: <strong>{c.pct}%</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          padding: "14px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              padding: "8px 14px 8px 32px",
              borderRadius: "20px",
              border: "1.5px solid #ddd",
              fontSize: "13px",
              outline: "none",
              width: "200px",
              color: "#1a1a1a",
            }}
          />
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#888",
            fontWeight: 500,
          }}
        >
          {filtered.length} products
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          padding: "14px 20px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          overflowX: "auto",
          width: "100%",
        }}
      >
        <table style={{ width: "900%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              <th style={{ padding: "12px 14px", width: "40px" }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer", width: "15px", height: "15px" }}
                />
              </th>
              {[
                "Code",
                "Product Name",
                "Date Acquired",
                "Total Stock",
                "Remaining Stock",
                "Units Sold",
                "Last Check By",
                "Expiry Status",
                "Stock Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: "12px",
                    color: "#fff",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h} ↕
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: "0.5px solid #f0f0f0",
                  background: p.selected
                    ? "#f0faf2"
                    : p.stockStatus === "Out of Stock"
                      ? "#fff5f5"
                      : idx % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                }}
              >
                <td style={{ padding: "12px 14px" }}>
                  <input
                    type="checkbox"
                    checked={!!p.selected}
                    onChange={() => toggleSelect(p.id)}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1a3c2e",
                  }}
                >
                  {p.code}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1a1a1a",
                  }}
                >
                  {p.name}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      background: "#e8f0fe",
                      color: "#1a237e",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                    }}
                  >
                    {p.dateAcquired}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    textAlign: "center",
                  }}
                >
                  {p.totalStock}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color:
                        p.remainingStock === 0
                          ? "#c62828"
                          : p.remainingStock <= 10
                            ? "#f57f17"
                            : "#2e7d32",
                    }}
                  >
                    {p.remainingStock}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1a3c2e",
                    }}
                  >
                    {p.unitsSold}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      background: "#e8e8e8",
                      color: "#555",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                    }}
                  >
                    {p.lastCheckBy}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      ...expiryStyle[p.expiryStatus],
                    }}
                  >
                    {p.expiryStatus}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      ...stockStyle[p.stockStatus],
                    }}
                  >
                    {p.stockStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
          <p style={{ fontSize: "12px", color: "#888" }}>
            Showing {filtered.length} of {products.length} products
          </p>
        </div>
      </div>
    </div>
  );
}
