"use client";
import { useState, useMemo } from "react";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
type DeliveryStatus = "Pending" | "Verified" | "Discrepancy";

type RestockItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  supplier: string;
  dateAcquired: string;
  purchaseOrderQty: number;
  receivedQty: number;
  totalStock: number;
  remainingStock: number;
  lastCheckBy: string;
  expiryDate: string;
  stockStatus: StockStatus;
  deliveryStatus: DeliveryStatus;
  selected: boolean;
};

const stockStyle: Record<StockStatus, React.CSSProperties> = {
  "In Stock": { background: "#e8f5e9", color: "#2e7d32" },
  "Low Stock": { background: "#fff9c4", color: "#f57f17" },
  "Out of Stock": { background: "#ffebee", color: "#c62828" },
};

const deliveryStyle: Record<DeliveryStatus, React.CSSProperties> = {
  Pending: { background: "#e3f2fd", color: "#1565c0" },
  Verified: { background: "#e8f5e9", color: "#2e7d32" },
  Discrepancy: { background: "#ffebee", color: "#c62828" },
};

const initialItems: RestockItem[] = [
  {
    id: 1,
    code: "COLA22",
    name: "Coca Cola",
    category: "Cola",
    supplier: "Cola Dist. Inc.",
    dateAcquired: "08 Nov 2025",
    purchaseOrderQty: 30,
    receivedQty: 30,
    totalStock: 30,
    remainingStock: 10,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "07 Apr 2030",
    stockStatus: "Low Stock",
    deliveryStatus: "Verified",
    selected: false,
  },
  {
    id: 2,
    code: "RC22",
    name: "RC",
    category: "Cola",
    supplier: "RC Beverages",
    dateAcquired: "06 Nov 2025",
    purchaseOrderQty: 30,
    receivedQty: 28,
    totalStock: 30,
    remainingStock: 0,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "09 Apr 2031",
    stockStatus: "Out of Stock",
    deliveryStatus: "Discrepancy",
    selected: false,
  },
  {
    id: 3,
    code: "PEP12",
    name: "Pepsi",
    category: "Cola",
    supplier: "Pepsi Co.",
    dateAcquired: "06 Nov 2025",
    purchaseOrderQty: 30,
    receivedQty: 30,
    totalStock: 30,
    remainingStock: 15,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "10 Apr 2030",
    stockStatus: "In Stock",
    deliveryStatus: "Verified",
    selected: false,
  },
  {
    id: 4,
    code: "GATO22",
    name: "Gatorade",
    category: "Sports",
    supplier: "PepsiCo Sports",
    dateAcquired: "06 Nov 2025",
    purchaseOrderQty: 15,
    receivedQty: 15,
    totalStock: 15,
    remainingStock: 15,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "07 Apr 2030",
    stockStatus: "In Stock",
    deliveryStatus: "Verified",
    selected: false,
  },
  {
    id: 5,
    code: "COB25",
    name: "Cobra",
    category: "Energy",
    supplier: "Asia Brewery",
    dateAcquired: "06 Nov 2025",
    purchaseOrderQty: 30,
    receivedQty: 30,
    totalStock: 30,
    remainingStock: 27,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "04 Apr 2030",
    stockStatus: "In Stock",
    deliveryStatus: "Verified",
    selected: false,
  },
  {
    id: 6,
    code: "SPR15",
    name: "Sprite",
    category: "Soda",
    supplier: "Cola Dist. Inc.",
    dateAcquired: "05 Nov 2025",
    purchaseOrderQty: 24,
    receivedQty: 20,
    totalStock: 24,
    remainingStock: 8,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "01 Jan 2030",
    stockStatus: "Low Stock",
    deliveryStatus: "Discrepancy",
    selected: false,
  },
  {
    id: 7,
    code: "MTD10",
    name: "Mountain Dew",
    category: "Soda",
    supplier: "Pepsi Co.",
    dateAcquired: "05 Nov 2025",
    purchaseOrderQty: 24,
    receivedQty: 24,
    totalStock: 24,
    remainingStock: 0,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "15 Mar 2026",
    stockStatus: "Out of Stock",
    deliveryStatus: "Pending",
    selected: false,
  },
  {
    id: 8,
    code: "RYL08",
    name: "Royal",
    category: "Soda",
    supplier: "Cola Dist. Inc.",
    dateAcquired: "04 Nov 2025",
    purchaseOrderQty: 20,
    receivedQty: 20,
    totalStock: 20,
    remainingStock: 3,
    lastCheckBy: "Rjay Salinas",
    expiryDate: "20 Dec 2025",
    stockStatus: "Low Stock",
    deliveryStatus: "Verified",
    selected: false,
  },
];

const categories = ["All", "Cola", "Soda", "Sports", "Energy"];
const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];

export default function RestockingPage() {
  const [items, setItems] = useState<RestockItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<RestockItem>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyItem, setVerifyItem] = useState<RestockItem | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "Cola",
    supplier: "",
    purchaseOrderQty: "",
    receivedQty: "",
    expiryDate: "",
  });

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase()) ||
          p.supplier.toLowerCase().includes(search.toLowerCase());
        const matchCategory = category === "All" || p.category === category;
        const matchStatus = status === "All" || p.stockStatus === status;
        return matchSearch && matchCategory && matchStatus;
      }),
    [items, search, category, status],
  );

  const selectedCount = items.filter((i) => i.selected).length;
  const inStock = items.filter((i) => i.stockStatus === "In Stock").length;
  const lowStock = items.filter((i) => i.stockStatus === "Low Stock").length;
  const discrepancies = items.filter(
    (i) => i.deliveryStatus === "Discrepancy",
  ).length;

  const toggleSelect = (id: number) =>
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)),
    );

  const toggleSelectAll = () => {
    const val = !selectAll;
    setSelectAll(val);
    setItems((prev) => prev.map((p) => ({ ...p, selected: val })));
  };

  const deleteSelected = () => {
    setItems((prev) => prev.filter((p) => !p.selected));
    setSelectAll(false);
  };

  const startEdit = (p: RestockItem) => {
    setEditingId(p.id);
    setEditData({
      receivedQty: p.receivedQty,
      totalStock: p.totalStock,
      remainingStock: p.remainingStock,
    });
  };

  const saveEdit = () => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== editingId) return p;
        const rem = Number(editData.remainingStock ?? p.remainingStock);
        const tot = Number(editData.totalStock ?? p.totalStock);
        const rec = Number(editData.receivedQty ?? p.receivedQty);
        const stockStatus: StockStatus =
          rem === 0 ? "Out of Stock" : rem <= 10 ? "Low Stock" : "In Stock";
        const deliveryStatus: DeliveryStatus =
          rec < p.purchaseOrderQty ? "Discrepancy" : "Verified";
        return {
          ...p,
          remainingStock: rem,
          totalStock: tot,
          receivedQty: rec,
          stockStatus,
          deliveryStatus,
        };
      }),
    );
    setEditingId(null);
  };

  const handleVerify = (item: RestockItem) => {
    setVerifyItem(item);
    setShowVerifyModal(true);
  };

  const confirmVerify = () => {
    if (!verifyItem) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === verifyItem.id ? { ...p, deliveryStatus: "Verified" } : p,
      ),
    );
    setShowVerifyModal(false);
  };

  const handleAddItem = () => {
    if (!form.code || !form.name || !form.supplier || !form.purchaseOrderQty)
      return;
    const rec = Number(form.receivedQty) || Number(form.purchaseOrderQty);
    const tot = Number(form.purchaseOrderQty);
    const stockStatus: StockStatus =
      rec === 0 ? "Out of Stock" : rec <= 10 ? "Low Stock" : "In Stock";
    const deliveryStatus: DeliveryStatus =
      rec < tot ? "Discrepancy" : "Pending";
    const newItem: RestockItem = {
      id: Date.now(),
      code: form.code,
      name: form.name,
      category: form.category,
      supplier: form.supplier,
      dateAcquired: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      purchaseOrderQty: tot,
      receivedQty: rec,
      totalStock: tot,
      remainingStock: rec,
      lastCheckBy: "James Renoblas",
      expiryDate: form.expiryDate || "-",
      stockStatus,
      deliveryStatus,
      selected: false,
    };
    setItems((prev) => [newItem, ...prev]);
    setForm({
      code: "",
      name: "",
      category: "Cola",
      supplier: "",
      purchaseOrderQty: "",
      receivedQty: "",
      expiryDate: "",
    });
    setShowAddModal(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1.5px solid #e0e0e0",
    fontSize: "13px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    color: "#1a1a1a",
    fontFamily: "sans-serif",
  };

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
            value: items.length,
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
            label: "Low Stock",
            value: lowStock,
            icon: "⚠️",
            bg: "#fff9c4",
            color: "#f57f17",
          },
          {
            label: "Discrepancies",
            value: discrepancies,
            icon: "🚨",
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

      {/* Filter Bar */}
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
            placeholder="Search code, product or supplier..."
            style={{
              ...inputStyle,
              paddingLeft: "34px",
              borderRadius: "20px",
              width: "220px",
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
            padding: "4px 12px",
          }}
        >
          <span style={{ fontSize: "12px" }}>👤</span>
          <select
            value={category}
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
            padding: "4px 12px",
          }}
        >
          <span style={{ fontSize: "12px" }}>📊</span>
          <select
            value={status}
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
          {editingId ? (
            <button
              onClick={saveEdit}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                background: "#2d7a3a",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              💾 Save
            </button>
          ) : selectedCount === 1 ? (
            <button
              onClick={() => {
                const p = items.find((x) => x.selected);
                if (p) startEdit(p);
              }}
              style={{
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
          ) : null}
          <button
            onClick={() => setShowAddModal(true)}
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
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(26,60,46,0.3)",
            }}
          >
            + Add Item
          </button>
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
                "Supplier",
                "Date Acquired",
                "PO Qty",
                "Received Qty",
                "Remaining",
                "Last Check By",
                "Expiry Date",
                "Delivery Status",
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
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const isEditing = editingId === p.id;
              const hasDiscrepancy = p.receivedQty < p.purchaseOrderQty;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "0.5px solid #f0f0f0",
                    background: p.selected
                      ? "#f0faf2"
                      : hasDiscrepancy
                        ? "#fff8f0"
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
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {p.category}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "12px",
                      color: "#555",
                    }}
                  >
                    {p.supplier}
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
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                      textAlign: "center",
                    }}
                  >
                    {p.purchaseOrderQty}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.receivedQty}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            receivedQty: Number(e.target.value),
                          })
                        }
                        style={{
                          width: "60px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1.5px solid #1a3c2e",
                          fontSize: "13px",
                          outline: "none",
                          textAlign: "center",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: hasDiscrepancy ? "#c62828" : "#2e7d32",
                        }}
                      >
                        {p.receivedQty}
                      </span>
                    )}
                    {hasDiscrepancy && !isEditing && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          color: "#c62828",
                        }}
                      >
                        -{p.purchaseOrderQty - p.receivedQty} short
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
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
                          textAlign: "center",
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
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 600,
                        ...deliveryStyle[p.deliveryStatus],
                      }}
                    >
                      {p.deliveryStatus === "Verified"
                        ? "✅"
                        : p.deliveryStatus === "Discrepancy"
                          ? "🚨"
                          : "⏳"}{" "}
                      {p.deliveryStatus}
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
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => startEdit(p)}
                        title="Edit"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          border: "none",
                          background: "#e8f5e9",
                          color: "#1a3c2e",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✏️
                      </button>
                      {p.deliveryStatus !== "Verified" && (
                        <button
                          onClick={() => handleVerify(p)}
                          title="Verify delivery"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "7px",
                            border: "none",
                            background: "#e3f2fd",
                            color: "#1565c0",
                            cursor: "pointer",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "0.5px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: "12px", color: "#888" }}>
            Showing {filtered.length} of {items.length} items
          </p>
          {selectedCount > 0 && (
            <p style={{ fontSize: "12px", color: "#1a3c2e", fontWeight: 600 }}>
              {selectedCount} selected
            </p>
          )}
        </div>
      </div>

      {/* ── Add Item Modal ── */}
      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
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
              width: "520px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <p
                style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}
              >
                + Add Restock Item
              </p>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "#f5f5f5",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              {[
                {
                  label: "Product Code *",
                  key: "code",
                  placeholder: "e.g. COLA22",
                },
                {
                  label: "Product Name *",
                  key: "name",
                  placeholder: "e.g. Coca Cola",
                },
                {
                  label: "Supplier *",
                  key: "supplier",
                  placeholder: "e.g. Cola Dist.",
                },
                {
                  label: "Expiry Date",
                  key: "expiryDate",
                  placeholder: "e.g. 07 Apr 2030",
                },
                {
                  label: "PO Quantity *",
                  key: "purchaseOrderQty",
                  placeholder: "e.g. 30",
                  type: "number",
                },
                {
                  label: "Received Qty",
                  key: "receivedQty",
                  placeholder: "Leave blank if same as PO",
                  type: "number",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#555",
                      fontWeight: 600,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {["Cola", "Soda", "Sports", "Energy", "Others"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discrepancy warning */}
            {form.receivedQty &&
              form.purchaseOrderQty &&
              Number(form.receivedQty) < Number(form.purchaseOrderQty) && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "#fff3e0",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    border: "1px solid #ffcc80",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#e65100",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Discrepancy detected: Received {form.receivedQty} vs PO{" "}
                    {form.purchaseOrderQty} — this will be flagged for review.
                  </p>
                </div>
              )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
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
              <button
                onClick={handleAddItem}
                disabled={
                  !form.code ||
                  !form.name ||
                  !form.supplier ||
                  !form.purchaseOrderQty
                }
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "20px",
                  border: "none",
                  background:
                    !form.code ||
                    !form.name ||
                    !form.supplier ||
                    !form.purchaseOrderQty
                      ? "#ccc"
                      : "#1a3c2e",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Verify Delivery Modal ── */}
      {showVerifyModal && verifyItem && (
        <>
          <div
            onClick={() => setShowVerifyModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
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
              width: "400px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📦</div>
              <p
                style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}
              >
                Verify Delivery
              </p>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
                Confirm that the delivery for <strong>{verifyItem.name}</strong>{" "}
                has been received and verified.
              </p>
            </div>
            <div
              style={{
                background: "#f9f9f9",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "20px",
              }}
            >
              {[
                ["Product", verifyItem.name],
                ["Supplier", verifyItem.supplier],
                ["PO Quantity", String(verifyItem.purchaseOrderQty)],
                ["Received Qty", String(verifyItem.receivedQty)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: "0.5px solid #f0f0f0",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {verifyItem.receivedQty < verifyItem.purchaseOrderQty && (
              <div
                style={{
                  background: "#fff3e0",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "14px",
                  border: "1px solid #ffcc80",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#e65100",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Discrepancy:{" "}
                  {verifyItem.purchaseOrderQty - verifyItem.receivedQty} unit
                  {verifyItem.purchaseOrderQty - verifyItem.receivedQty > 1
                    ? "s"
                    : ""}{" "}
                  short from PO.
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{
                  flex: 1,
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
              <button
                onClick={confirmVerify}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "20px",
                  border: "none",
                  background: "#1a3c2e",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✅ Confirm Verified
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
