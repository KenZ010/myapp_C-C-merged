"use client";
import { useState, useMemo, useEffect } from "react";

type ReturnStatus = "Pending" | "Processed";
type ReturnReason = "Damaged" | "Defective" | "Expired" | "Wrong Item";

type ReturnItem = {
  id: number;
  returnId: string;
  product: string;
  brand: string;
  quantity: number;
  reason: ReturnReason;
  customer: string;
  store: string;
  date: string;
  status: ReturnStatus;
  notes: string;
};

const reasonStyle: Record<ReturnReason, React.CSSProperties> = {
  Damaged: { background: "#fff3e0", color: "#e65100" },
  Defective: { background: "#ffebee", color: "#c62828" },
  Expired: { background: "#f3e5f5", color: "#6a1b9a" },
  "Wrong Item": { background: "#fce4ec", color: "#880e4f" },
};

const initialReturns: ReturnItem[] = [
  {
    id: 1,
    returnId: "R001",
    product: "Organic Milk",
    brand: "Fresh Farms",
    quantity: 2,
    reason: "Defective",
    customer: "John Smith",
    store: "Main Street Store",
    date: "2026-01-22",
    status: "Processed",
    notes: "",
  },
  {
    id: 2,
    returnId: "R002",
    product: "Greek Yogurt",
    brand: "Protein Plus",
    quantity: 5,
    reason: "Damaged",
    customer: "-",
    store: "Downtown Store",
    date: "2026-01-23",
    status: "Pending",
    notes: "",
  },
  {
    id: 3,
    returnId: "R003",
    product: "Orange Juice",
    brand: "Citrus Fresh",
    quantity: 3,
    reason: "Defective",
    customer: "Sarah Johnson",
    store: "Main Street Store",
    date: "2026-01-21",
    status: "Processed",
    notes: "",
  },
  {
    id: 4,
    returnId: "R004",
    product: "Coca Cola 1.5L",
    brand: "Coca Cola",
    quantity: 6,
    reason: "Expired",
    customer: "Ken M.",
    store: "Kens Sari-Sari",
    date: "2026-01-20",
    status: "Pending",
    notes: "",
  },
  {
    id: 5,
    returnId: "R005",
    product: "Pepsi 500ml",
    brand: "Pepsi",
    quantity: 4,
    reason: "Wrong Item",
    customer: "Maria S.",
    store: "Santos Mini Mart",
    date: "2026-01-19",
    status: "Processed",
    notes: "",
  },
];

export default function ReturnPage() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [returns, setReturns] = useState<ReturnItem[]>(initialReturns);
  const [filter, setFilter] = useState<"All" | ReturnStatus>("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<ReturnItem | null>(null);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // New Return form
  const [form, setForm] = useState({
    product: "",
    brand: "",
    quantity: "",
    reason: "Damaged" as ReturnReason,
    customer: "",
    store: "",
    notes: "",
  });

  let returnCounter = 6;

  const filtered = useMemo(
    () =>
      returns.filter((r) => {
        const matchFilter = filter === "All" || r.status === filter;
        const matchSearch =
          r.product.toLowerCase().includes(search.toLowerCase()) ||
          r.brand.toLowerCase().includes(search.toLowerCase()) ||
          r.returnId.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
      }),
    [returns, filter, search],
  );

  const markProcessed = (id: number) =>
    setReturns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Processed" } : r)),
    );

  const handleSubmit = () => {
    if (!form.product || !form.brand || !form.quantity) return;
    const newReturn: ReturnItem = {
      id: Date.now(),
      returnId: `R00${returnCounter++}`,
      product: form.product,
      brand: form.brand,
      quantity: Number(form.quantity),
      reason: form.reason,
      customer: form.customer || "-",
      store: form.store || "-",
      date: new Date().toISOString().split("T")[0],
      status: "Pending",
      notes: form.notes,
    };
    setReturns((prev) => [newReturn, ...prev]);
    setForm({
      product: "",
      brand: "",
      quantity: "",
      reason: "Damaged",
      customer: "",
      store: "",
      notes: "",
    });
    setShowModal(false);
  };

  const pending = returns.filter((r) => r.status === "Pending").length;
  const processed = returns.filter((r) => r.status === "Processed").length;

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
          gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, 1fr)",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total Returns",
            value: returns.length,
            icon: "🔄",
            bg: "#e8f5e9",
            color: "#1a3c2e",
          },
          {
            label: "Pending",
            value: pending,
            icon: "⏳",
            bg: "#fff9c4",
            color: "#f57f17",
          },
          {
            label: "Processed",
            value: processed,
            icon: "✅",
            bg: "#e8f5e9",
            color: "#2e7d32",
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
              <p style={{ fontSize: "26px", fontWeight: 800, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: "12px", color: "#888" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search Bar */}
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
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: "220px" }}>
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
            placeholder="Search by product name, brand, or ID..."
            style={{ ...inputStyle, paddingLeft: "34px", borderRadius: "20px" }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["All", "Pending", "Processed"] as ("All" | ReturnStatus)[]).map(
            (f) => {
              const isActive = filter === f;
              const bg = isActive
                ? f === "Pending"
                  ? "#fff9c4"
                  : f === "Processed"
                    ? "#e8f5e9"
                    : "#1a3c2e"
                : "#f5f5f5";
              const textColor = isActive
                ? f === "Pending"
                  ? "#f57f17"
                  : f === "Processed"
                    ? "#2e7d32"
                    : "#fff"
                : "#555";
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                    border: "none",
                    background: bg,
                    color: textColor,
                  }}
                >
                  {f}
                </button>
              );
            },
          )}
        </div>

        {/* New Return Button */}
        <div
          style={{
            marginLeft: isNarrow ? "0" : "auto",
            width: isNarrow ? "100%" : "auto",
          }}
        >
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 20px",
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
            + New Return
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
            minWidth: "1000px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ background: "#1a3c2e" }}>
              {[
                "Return ID",
                "Product",
                "Brand",
                "Quantity",
                "Reason",
                "Customer",
                "Store",
                "Date",
                "Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
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
                  colSpan={10}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: "14px",
                  }}
                >
                  No returns found
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "0.5px solid #f0f0f0",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1a3c2e",
                    }}
                  >
                    {r.returnId}
                  </td>
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1a1a1a",
                    }}
                  >
                    {r.product}
                  </td>
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {r.brand}
                  </td>
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      textAlign: "center",
                    }}
                  >
                    {r.quantity}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 600,
                        ...reasonStyle[r.reason],
                      }}
                    >
                      {r.reason}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {r.customer}
                  </td>
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    {r.store}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        background: "#f5f5f5",
                        color: "#555",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                      }}
                    >
                      📅 {r.date}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background:
                          r.status === "Processed" ? "#e8f5e9" : "#fff9c4",
                        color: r.status === "Processed" ? "#2e7d32" : "#f57f17",
                      }}
                    >
                      {r.status === "Processed" ? "✅" : "⏳"} {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => setViewItem(r)}
                        title="View details"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#e8f0fe",
                          color: "#1565c0",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                      {r.status === "Pending" && (
                        <button
                          onClick={() => markProcessed(r.id)}
                          title="Mark as processed"
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Process
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
          <p style={{ fontSize: "12px", color: "#888" }}>
            Showing {filtered.length} of {returns.length} returns
          </p>
        </div>
      </div>

      {/* ── New Return Modal ── */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
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
              width: isNarrow ? "92%" : "480px",
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
                + New Return
              </p>
              <button
                onClick={() => setShowModal(false)}
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
                  label: "Product Name *",
                  key: "product",
                  placeholder: "e.g. Coca Cola 1.5L",
                },
                {
                  label: "Brand *",
                  key: "brand",
                  placeholder: "e.g. Coca Cola",
                },
                {
                  label: "Quantity *",
                  key: "quantity",
                  placeholder: "e.g. 5",
                  type: "number",
                },
                {
                  label: "Customer",
                  key: "customer",
                  placeholder: "Customer name",
                },
                { label: "Store", key: "store", placeholder: "Store name" },
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
                  Reason *
                </label>
                <select
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value as ReturnReason })
                  }
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {(
                    [
                      "Damaged",
                      "Defective",
                      "Expired",
                      "Wrong Item",
                    ] as ReturnReason[]
                  ).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Notes (Optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes about the return..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setShowModal(false)}
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
                onClick={handleSubmit}
                disabled={!form.product || !form.brand || !form.quantity}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "20px",
                  border: "none",
                  background:
                    !form.product || !form.brand || !form.quantity
                      ? "#ccc"
                      : "#1a3c2e",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor:
                    !form.product || !form.brand || !form.quantity
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Submit Return
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── View Detail Modal ── */}
      {viewItem && (
        <>
          <div
            onClick={() => setViewItem(null)}
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
              width: "420px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
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
                Return Details
              </p>
              <button
                onClick={() => setViewItem(null)}
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
                background: "#f9f9f9",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#1a3c2e",
                  }}
                >
                  {viewItem.returnId}
                </p>
                <span
                  style={{
                    padding: "4px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background:
                      viewItem.status === "Processed" ? "#e8f5e9" : "#fff9c4",
                    color:
                      viewItem.status === "Processed" ? "#2e7d32" : "#f57f17",
                  }}
                >
                  {viewItem.status}
                </span>
              </div>
              {[
                ["Product", viewItem.product],
                ["Brand", viewItem.brand],
                ["Quantity", String(viewItem.quantity)],
                ["Customer", viewItem.customer],
                ["Store", viewItem.store],
                ["Date", viewItem.date],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
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
              <div style={{ marginTop: "10px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Reason
                </span>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    ...reasonStyle[viewItem.reason],
                  }}
                >
                  {viewItem.reason}
                </span>
              </div>
              {viewItem.notes && (
                <div style={{ marginTop: "12px" }}>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      marginBottom: "4px",
                    }}
                  >
                    Notes
                  </p>
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    {viewItem.notes}
                  </p>
                </div>
              )}
            </div>
            {viewItem.status === "Pending" && (
              <button
                onClick={() => {
                  markProcessed(viewItem.id);
                  setViewItem(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "20px",
                  border: "none",
                  background: "#1a3c2e",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✅ Mark as Processed
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
