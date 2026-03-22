"use client";
import { useState, useMemo } from "react";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type FlagStatus = "None" | "Defective" | "Expired";

type Product = {
  id: number;
  code: string;
  name: string;
  category: string;
  dateAcquired: string;
  totalStock: number;
  remainingStock: number;
  lastCheckBy: string;
  expiryDate: string;
  stockStatus: StockStatus;
  flag: FlagStatus;
  selected: boolean;
};

const initialProducts: Product[] = [
  {
    id: 1,
    code: "COLA22",
    name: "Coca Cola",
    category: "Cola",
    dateAcquired: "08 Nov 2025",
    totalStock: 30,
    remainingStock: 10,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "07 Apr 2030",
    stockStatus: "Low Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 2,
    code: "RC22",
    name: "RC",
    category: "Cola",
    dateAcquired: "06 Nov 2025",
    totalStock: 30,
    remainingStock: 0,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "09 Apr 2031",
    stockStatus: "Out of Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 3,
    code: "PEP12",
    name: "Pepsi",
    category: "Cola",
    dateAcquired: "06 Nov 2025",
    totalStock: 30,
    remainingStock: 15,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "10 Apr 2030",
    stockStatus: "In Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 4,
    code: "GATO22",
    name: "Gatorade",
    category: "Sports",
    dateAcquired: "06 Nov 2025",
    totalStock: 15,
    remainingStock: 15,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "07 Apr 2030",
    stockStatus: "In Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 5,
    code: "COB25",
    name: "Cobra",
    category: "Energy",
    dateAcquired: "06 Nov 2025",
    totalStock: 30,
    remainingStock: 27,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "04 Apr 2030",
    stockStatus: "In Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 6,
    code: "COB25",
    name: "Cobra",
    category: "Energy",
    dateAcquired: "06 Nov 2025",
    totalStock: 30,
    remainingStock: 27,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "04 Apr 2030",
    stockStatus: "In Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 7,
    code: "COB25",
    name: "Cobra",
    category: "Energy",
    dateAcquired: "06 Nov 2025",
    totalStock: 30,
    remainingStock: 27,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "04 Apr 2030",
    stockStatus: "In Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 8,
    code: "SPR15",
    name: "Sprite",
    category: "Soda",
    dateAcquired: "05 Nov 2025",
    totalStock: 24,
    remainingStock: 8,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "01 Jan 2030",
    stockStatus: "Low Stock",
    flag: "None",
    selected: false,
  },
  {
    id: 9,
    code: "MTD10",
    name: "Mtn Dew",
    category: "Soda",
    dateAcquired: "05 Nov 2025",
    totalStock: 24,
    remainingStock: 0,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "15 Mar 2026",
    stockStatus: "Out of Stock",
    flag: "Expired",
    selected: false,
  },
  {
    id: 10,
    code: "RYL08",
    name: "Royal",
    category: "Soda",
    dateAcquired: "04 Nov 2025",
    totalStock: 20,
    remainingStock: 3,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "20 Dec 2025",
    stockStatus: "Low Stock",
    flag: "Defective",
    selected: false,
  },
];

const statusStyle: Record<StockStatus, React.CSSProperties> = {
  "In Stock": { background: "#e8f5e9", color: "#2e7d32" },
  "Low Stock": { background: "#fff9c4", color: "#f57f17" },
  "Out of Stock": { background: "#ffebee", color: "#c62828" },
};

const flagStyle: Record<FlagStatus, React.CSSProperties> = {
  None: { background: "transparent", color: "transparent" },
  Defective: { background: "#fff3e0", color: "#e65100" },
  Expired: { background: "#ffebee", color: "#c62828" },
};

const categories = ["All", "Cola", "Soda", "Sports", "Energy"];
const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];

export default function InventoryAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategory] = useState("All");
  const [statusFilter, setStatus] = useState("All");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagTarget, setFlagTarget] = useState<number | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase());
        const matchCategory =
          categoryFilter === "All" || p.category === categoryFilter;
        const matchStatus =
          statusFilter === "All" || p.stockStatus === statusFilter;
        return matchSearch && matchCategory && matchStatus;
      }),
    [products, search, categoryFilter, statusFilter],
  );

  const toggleSelect = (id: number) =>
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)),
    );

  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setProducts((prev) => prev.map((p) => ({ ...p, selected: newVal })));
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditData({ remainingStock: p.remainingStock, totalStock: p.totalStock });
  };

  const saveEdit = () => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== editingId) return p;
        const rem = Number(editData.remainingStock ?? p.remainingStock);
        const tot = Number(editData.totalStock ?? p.totalStock);
        const stockStatus: StockStatus =
          rem === 0 ? "Out of Stock" : rem <= 10 ? "Low Stock" : "In Stock";
        return { ...p, remainingStock: rem, totalStock: tot, stockStatus };
      }),
    );
    setEditingId(null);
  };

  const openFlagModal = (id: number) => {
    setFlagTarget(id);
    setShowFlagModal(true);
  };

  const applyFlag = (flag: FlagStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === flagTarget ? { ...p, flag } : p)),
    );
    setShowFlagModal(false);
  };

  const deleteSelected = () =>
    setProducts((prev) => prev.filter((p) => !p.selected));

  const selectedCount = products.filter((p) => p.selected).length;

  return (
    <div style={{ padding: "28px" }}>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
            value: products.filter((p) => p.stockStatus === "In Stock").length,
            icon: "✅",
            bg: "#e8f5e9",
            color: "#2e7d32",
          },
          {
            label: "Low Stock",
            value: products.filter((p) => p.stockStatus === "Low Stock").length,
            icon: "⚠️",
            bg: "#fff9c4",
            color: "#f57f17",
          },
          {
            label: "Out of Stock",
            value: products.filter((p) => p.stockStatus === "Out of Stock")
              .length,
            icon: "❌",
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
                width: "44px",
                height: "44px",
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
              <p style={{ fontSize: "24px", fontWeight: 800, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: "12px", color: "#888" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          padding: "16px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or product..."
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

        {/* Category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#f5f5f5",
            borderRadius: "20px",
            padding: "4px 8px",
          }}
        >
          <span style={{ fontSize: "12px" }}>👤</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "13px",
              outline: "none",
              color: "#1a1a1a",
              cursor: "pointer",
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#f5f5f5",
            borderRadius: "20px",
            padding: "4px 8px",
          }}
        >
          <span style={{ fontSize: "12px" }}>📊</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "13px",
              outline: "none",
              color: "#1a1a1a",
              cursor: "pointer",
            }}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "20px",
              border: "1.5px solid #1a3c2e",
              background: "#fff",
              color: "#1a3c2e",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⬇ Export
          </button>
          {selectedCount > 0 && (
            <button
              onClick={deleteSelected}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                background: "#ffebee",
                color: "#c62828",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑 Delete ({selectedCount})
            </button>
          )}
          {editingId && (
            <button
              onClick={saveEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                background: "#1a3c2e",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              💾 Save Edit
            </button>
          )}
          {!editingId && selectedCount === 1 && (
            <button
              onClick={() => {
                const p = products.find((x) => x.selected);
                if (p) startEdit(p);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                background: "#1a3c2e",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                "Category",
                "Date Acquired",
                "Total Stock",
                "Remaining Stock",
                "Last Check By",
                "Expiry Date",
                "Flag",
                "Stock Status",
                "Action",
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
                  {h}{" "}
                  {[
                    "Code",
                    "Product Name",
                    "Date Acquired",
                    "Total Stock",
                    "Remaining Stock",
                    "Expiry Date",
                  ].includes(h)
                    ? "↕"
                    : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const isEditing = editingId === p.id;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "0.5px solid #f0f0f0",
                    background: p.selected
                      ? "#f0faf2"
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
                      style={{
                        cursor: "pointer",
                        width: "15px",
                        height: "15px",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a3c2e",
                    }}
                  >
                    {p.code}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#1a1a1a",
                      fontWeight: 500,
                    }}
                  >
                    {p.name}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {p.category}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        background: "#e8f0fe",
                        color: "#1a237e",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {p.dateAcquired}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.totalStock}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            totalStock: Number(e.target.value),
                          })
                        }
                        style={{
                          width: "60px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1.5px solid #1a3c2e",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#1a1a1a",
                          fontWeight: 500,
                        }}
                      >
                        {p.totalStock}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.remainingStock}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            remainingStock: Number(e.target.value),
                          })
                        }
                        style={{
                          width: "60px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1.5px solid #1a3c2e",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    ) : (
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
                    )}
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
                        background: "#e8f0fe",
                        color: "#1a237e",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                      }}
                    >
                      {p.expiryDate}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {p.flag !== "None" ? (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          ...flagStyle[p.flag],
                        }}
                      >
                        {p.flag === "Defective" ? "⚠️" : "☠️"} {p.flag}
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        ...statusStyle[p.stockStatus],
                      }}
                    >
                      {p.stockStatus}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => startEdit(p)}
                        title="Edit stock"
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#e8f5e9",
                          color: "#1a3c2e",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => openFlagModal(p.id)}
                        title="Flag product"
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#fff3e0",
                          color: "#e65100",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        🚩
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "0.5px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: "#888" }}>
            Showing {filtered.length} of {products.length} products
          </p>
          {selectedCount > 0 && (
            <p style={{ fontSize: "12px", color: "#1a3c2e", fontWeight: 600 }}>
              {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      </div>

      {/* ── Flag Modal ── */}
      {showFlagModal && (
        <>
          <div
            onClick={() => setShowFlagModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 50,
              background: "#fff",
              borderRadius: "20px",
              padding: "28px",
              width: "380px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <p
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "6px",
              }}
            >
              🚩 Flag Product
            </p>
            <p
              style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}
            >
              Select a flag to mark this products condition.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {(
                [
                  {
                    flag: "Defective",
                    icon: "⚠️",
                    desc: "Product is damaged or defective",
                    bg: "#fff3e0",
                    color: "#e65100",
                    border: "#ffcc80",
                  },
                  {
                    flag: "Expired",
                    icon: "☠️",
                    desc: "Product has passed its expiry date",
                    bg: "#ffebee",
                    color: "#c62828",
                    border: "#ef9a9a",
                  },
                  {
                    flag: "None",
                    icon: "✅",
                    desc: "Remove flag — product is in good condition",
                    bg: "#e8f5e9",
                    color: "#2e7d32",
                    border: "#a5d6a7",
                  },
                ] as {
                  flag: FlagStatus;
                  icon: string;
                  desc: string;
                  bg: string;
                  color: string;
                  border: string;
                }[]
              ).map((f) => (
                <button
                  key={f.flag}
                  onClick={() => applyFlag(f.flag)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: `1.5px solid ${f.border}`,
                    background: f.bg,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{f.icon}</span>
                  <div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: f.color,
                      }}
                    >
                      {f.flag === "None" ? "Clear Flag" : f.flag}
                    </p>
                    <p style={{ fontSize: "12px", color: "#888" }}>{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFlagModal(false)}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: "20px",
                border: "1.5px solid #e0e0e0",
                background: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                color: "#555",
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
