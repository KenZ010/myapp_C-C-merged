"use client";
import { useState, useMemo } from "react";

type LossType = "Returned" | "Expired" | "Defective" | "Damaged";

type LossItem = {
  id: number;
  lossId: string;
  product: string;
  brand: string;
  quantity: number;
  reason: string;
  lossType: LossType;
  customer: string;
  store: string;
  date: string;
  unitCost: number;
};

const lossTypeStyle: Record<LossType, React.CSSProperties> = {
  Returned: { background: "#e3f2fd", color: "#1565c0" },
  Expired: { background: "#f3e5f5", color: "#6a1b9a" },
  Defective: { background: "#ffebee", color: "#c62828" },
  Damaged: { background: "#fff3e0", color: "#e65100" },
};

const lossData: LossItem[] = [
  {
    id: 1,
    lossId: "L001",
    product: "Coca Cola 1.5L",
    brand: "Coca Cola",
    quantity: 10,
    reason: "Past expiry date",
    lossType: "Expired",
    customer: "-",
    store: "Main Street Store",
    date: "2026-03-15",
    unitCost: 45,
  },
  {
    id: 2,
    lossId: "L002",
    product: "Organic Milk",
    brand: "Fresh Farms",
    quantity: 2,
    reason: "Customer return",
    lossType: "Returned",
    customer: "John Smith",
    store: "Main Street Store",
    date: "2026-01-22",
    unitCost: 60,
  },
  {
    id: 3,
    lossId: "L003",
    product: "Greek Yogurt",
    brand: "Protein Plus",
    quantity: 5,
    reason: "Damaged during delivery",
    lossType: "Damaged",
    customer: "-",
    store: "Downtown Store",
    date: "2026-01-23",
    unitCost: 55,
  },
  {
    id: 4,
    lossId: "L004",
    product: "Orange Juice",
    brand: "Citrus Fresh",
    quantity: 3,
    reason: "Defective packaging",
    lossType: "Defective",
    customer: "Sarah Johnson",
    store: "Main Street Store",
    date: "2026-01-21",
    unitCost: 40,
  },
  {
    id: 5,
    lossId: "L005",
    product: "Mountain Dew",
    brand: "Pepsi",
    quantity: 8,
    reason: "Past expiry date",
    lossType: "Expired",
    customer: "-",
    store: "Kens Sari-Sari",
    date: "2026-03-10",
    unitCost: 35,
  },
  {
    id: 6,
    lossId: "L006",
    product: "Royal 500ml",
    brand: "Coca Cola",
    quantity: 4,
    reason: "Leaking bottles",
    lossType: "Defective",
    customer: "Ana Cruz",
    store: "Ana Grocery",
    date: "2026-02-14",
    unitCost: 25,
  },
  {
    id: 7,
    lossId: "L007",
    product: "Pepsi 500ml",
    brand: "Pepsi",
    quantity: 6,
    reason: "Wrong item delivered",
    lossType: "Returned",
    customer: "Maria Santos",
    store: "Santos Mini Mart",
    date: "2026-02-18",
    unitCost: 25,
  },
  {
    id: 8,
    lossId: "L008",
    product: "Sprite 1.5L",
    brand: "Coca Cola",
    quantity: 12,
    reason: "Crushed during transit",
    lossType: "Damaged",
    customer: "-",
    store: "Lim Store",
    date: "2026-02-20",
    unitCost: 45,
  },
];

const lossTypes: (LossType | "All")[] = [
  "All",
  "Returned",
  "Expired",
  "Defective",
  "Damaged",
];

export default function LossReportPage() {
  const [filter, setFilter] = useState<LossType | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filtered = useMemo(
    () =>
      lossData.filter((l) => {
        const matchType = filter === "All" || l.lossType === filter;
        const matchSearch =
          l.product.toLowerCase().includes(search.toLowerCase()) ||
          l.brand.toLowerCase().includes(search.toLowerCase()) ||
          l.lossId.toLowerCase().includes(search.toLowerCase()) ||
          l.store.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      }),
    [filter, search],
  );

  const totalLoss = filtered.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const totalQty = filtered.reduce((s, l) => s + l.quantity, 0);
  const totalItems = filtered.length;

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === filtered.length ? [] : filtered.map((l) => l.id),
    );

  return (
    <div style={{ padding: "16px" }}>
      {/* Summary Cards */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        style={{
          display: "grid",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total Loss Value",
            value: `₱${totalLoss.toLocaleString()}`,
            icon: "💸",
            bg: "#ffebee",
            color: "#c62828",
          },
          {
            label: "Total Items Lost",
            value: String(totalItems),
            icon: "📦",
            bg: "#fff9c4",
            color: "#f57f17",
          },
          {
            label: "Total Qty Lost",
            value: String(totalQty),
            icon: "🔢",
            bg: "#e3f2fd",
            color: "#1565c0",
          },
          {
            label: "This Month",
            value: `₱${lossData
              .filter((l) => l.date.startsWith("2026-03"))
              .reduce((s, l) => s + l.quantity * l.unitCost, 0)
              .toLocaleString()}`,
            icon: "📅",
            bg: "#f3e5f5",
            color: "#6a1b9a",
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
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: "12px", color: "#888" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Loss by Type Cards */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        style={{
          display: "grid",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {(["Returned", "Expired", "Defective", "Damaged"] as LossType[]).map(
          (type) => {
            const items = lossData.filter((l) => l.lossType === type);
            const value = items.reduce(
              (s, l) => s + l.quantity * l.unitCost,
              0,
            );
            const style = lossTypeStyle[type];
            return (
              <div
                key={type}
                onClick={() => setFilter(filter === type ? "All" : type)}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border:
                    filter === type
                      ? `2px solid ${style.color}`
                      : "0.5px solid #e8e8e8",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      ...style,
                    }}
                  >
                    {type}
                  </span>
                  <span style={{ fontSize: "11px", color: "#aaa" }}>
                    {items.length} items
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: style.color as string,
                  }}
                >
                  ₱{value.toLocaleString()}
                </p>
                <p
                  style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}
                >
                  {items.reduce((s, l) => s + l.quantity, 0)} units lost
                </p>
              </div>
            );
          },
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          padding: "14px 16px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{ position: "relative", flex: "1 1 180px", maxWidth: "100%" }}
        >
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
            placeholder="Search product, brand, store, or ID..."
            style={{
              width: "100%",
              padding: "8px 14px 8px 32px",
              borderRadius: "20px",
              border: "1.5px solid #ddd",
              fontSize: "13px",
              color: "#1a1a1a",
              outline: "none",
            }}
          />
        </div>

        {/* Type Filter Tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {lossTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: "7px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: filter === t ? 700 : 400,
                cursor: "pointer",
                border: filter === t ? "none" : "1px solid #ddd",
                background: filter === t ? "#1a3c2e" : "#fff",
                color: filter === t ? "#fff" : "#555",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Export */}
        <div style={{ marginLeft: "auto" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "20px",
              border: "1.5px solid #1a3c2e",
              background: "#fff",
              color: "#1a3c2e",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ⬇ Export Report
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "900px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              <th style={{ padding: "10px 12px", width: "40px" }}>
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === filtered.length &&
                    filtered.length > 0
                  }
                  onChange={toggleAll}
                  style={{ cursor: "pointer", width: "15px", height: "15px" }}
                />
              </th>
              {[
                "Loss ID",
                "Product",
                "Brand",
                "Qty",
                "Reason",
                "Loss Type",
                "Customer",
                "Store",
                "Date",
                "Unit Cost",
                "Total Loss",
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
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: "14px",
                  }}
                >
                  No loss records found
                </td>
              </tr>
            ) : (
              filtered.map((l, idx) => (
                <tr
                  key={l.id}
                  style={{
                    borderBottom: "0.5px solid #f0f0f0",
                    background: selectedIds.includes(l.id)
                      ? "#fff8f0"
                      : idx % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      style={{
                        cursor: "pointer",
                        width: "15px",
                        height: "15px",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1a3c2e",
                    }}
                  >
                    {l.lossId}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1a1a1a",
                    }}
                  >
                    {l.product}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {l.brand}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#c62828",
                      textAlign: "center",
                    }}
                  >
                    {l.quantity}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                      maxWidth: "180px",
                    }}
                  >
                    {l.reason}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 600,
                        ...lossTypeStyle[l.lossType],
                      }}
                    >
                      {l.lossType}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {l.customer}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {l.store}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background: "#f5f5f5",
                        color: "#555",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                      }}
                    >
                      📅 {l.date}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    ₱{l.unitCost}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#c62828",
                    }}
                  >
                    ₱{(l.quantity * l.unitCost).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Total Row */}
          {filtered.length > 0 && (
            <tfoot>
              <tr
                style={{
                  background: "#f9f9f9",
                  borderTop: "2px solid #e8e8e8",
                }}
              >
                <td
                  colSpan={4}
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  Total ({filtered.length} records)
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#c62828",
                    textAlign: "center",
                  }}
                >
                  {totalQty}
                </td>
                <td colSpan={5} />
                <td style={{ padding: "10px 12px" }} />
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#c62828",
                  }}
                >
                  ₱{totalLoss.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
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
            Showing {filtered.length} of {lossData.length} records
          </p>
          {selectedIds.length > 0 && (
            <p style={{ fontSize: "12px", color: "#1a3c2e", fontWeight: 600 }}>
              {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""}{" "}
              selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
