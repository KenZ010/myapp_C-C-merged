"use client";
import { useState } from "react";

type Period = "Daily" | "Weekly" | "Monthly";
type Tab = "Transactions" | "Sales Reports";

const salesData = {
  Daily: { total: 5700, transactions: 5, cash: 3675, online: 2025 },
  Weekly: { total: 38400, transactions: 34, cash: 24800, online: 13600 },
  Monthly: { total: 152000, transactions: 142, cash: 98000, online: 54000 },
};

const topSelling = [
  {
    rank: 1,
    name: "Coca Cola 1.5L",
    qty: 32,
    revenue: 1440,
    brand: "Coca Cola",
  },
  { rank: 2, name: "Pepsi 1.5L", qty: 25, revenue: 1125, brand: "Pepsi" },
  {
    rank: 3,
    name: "Coca Cola 500ml",
    qty: 24,
    revenue: 600,
    brand: "Coca Cola",
  },
  { rank: 4, name: "Sprite 500ml", qty: 24, revenue: 600, brand: "Coca Cola" },
  { rank: 5, name: "Mountain Dew 1.5L", qty: 15, revenue: 675, brand: "Pepsi" },
  { rank: 6, name: "Royal 1.5L", qty: 10, revenue: 450, brand: "Coca Cola" },
  { rank: 7, name: "Fanta Orange 1.5L", qty: 10, revenue: 450, brand: "Fanta" },
  { rank: 8, name: "Sprite 1.5L", qty: 8, revenue: 360, brand: "Coca Cola" },
];

const transactions = [
  {
    id: "TX-1001",
    customer: "Ken Masilungan",
    date: "Mar 15, 2026 10:30 AM",
    items: 2,
    total: 960,
    payment: "GCash",
    status: "Completed",
  },
  {
    id: "TX-1002",
    customer: "Maria Santos",
    date: "Mar 15, 2026 09:15 AM",
    items: 1,
    total: 480,
    payment: "Cash",
    status: "Completed",
  },
  {
    id: "TX-1003",
    customer: "Walk-in Customer",
    date: "Mar 15, 2026 08:45 AM",
    items: 3,
    total: 1380,
    payment: "Cash",
    status: "Completed",
  },
  {
    id: "TX-1004",
    customer: "Ana Cruz",
    date: "Mar 15, 2026 08:00 AM",
    items: 1,
    total: 520,
    payment: "GCash",
    status: "Completed",
  },
  {
    id: "TX-1005",
    customer: "Pedro Lim",
    date: "Mar 15, 2026 07:30 AM",
    items: 2,
    total: 940,
    payment: "Cash",
    status: "Completed",
  },
];

const rankColors = [
  "#e53935",
  "#fb8c00",
  "#f9a825",
  "#aaa",
  "#aaa",
  "#aaa",
  "#aaa",
  "#aaa",
];

export default function CashierTransactionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Sales Reports");
  const [period, setPeriod] = useState<Period>("Daily");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedTx, setSelectedTx] = useState<(typeof transactions)[0] | null>(
    null,
  );

  const data = salesData[period];

  const statCards = [
    {
      icon: "$",
      label: "Total Sales",
      value: `₱${data.total.toLocaleString()}`,
      bg: "linear-gradient(135deg, #1565c0, #42a5f5)",
      color: "#fff",
    },
    {
      icon: "✓",
      label: "Transactions",
      value: String(data.transactions),
      bg: "linear-gradient(135deg, #2e7d32, #66bb6a)",
      color: "#fff",
    },
    {
      icon: "$",
      label: "Cash Sales",
      value: `₱${data.cash.toLocaleString()}`,
      bg: "linear-gradient(135deg, #6a1b9a, #ab47bc)",
      color: "#fff",
    },
    {
      icon: "$",
      label: "Online Sales",
      value: `₱${data.online.toLocaleString()}`,
      bg: "linear-gradient(135deg, #e65100, #ffa726)",
      color: "#fff",
    },
  ];

  return (
    <div style={{ padding: "28px" }}>
      {/* Hero Banner */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a3c2e 0%, #2d7a3a 60%, #e65100 100%)",
          borderRadius: "16px",
          padding: "28px 36px",
          marginBottom: "24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#fff" }}>
              Transaction History
            </h1>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            Sales reports, top products & transaction records
          </p>
        </div>
        <div
          style={{
            fontSize: "80px",
            opacity: 0.15,
            position: "absolute",
            right: "32px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          🥤
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["Transactions", "Sales Reports"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: "9px 24px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: activeTab === t ? "none" : "1px solid #e0e0e0",
              background: activeTab === t ? "#1a3c2e" : "#fff",
              color: activeTab === t ? "#fff" : "#555",
              boxShadow:
                activeTab === t ? "0 4px 12px rgba(26,60,46,0.3)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── SALES REPORTS TAB ── */}
      {activeTab === "Sales Reports" && (
        <>
          {/* Period + Export */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#888" }}>
                📅 Report Period:
              </span>
              {(["Daily", "Weekly", "Monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontWeight: period === p ? 700 : 400,
                    cursor: "pointer",
                    border: "none",
                    background: period === p ? "#1a3c2e" : "#f0f0f0",
                    color: period === p ? "#fff" : "#555",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 20px",
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
              {showExportMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "44px",
                    right: 0,
                    background: "#fff",
                    borderRadius: "12px",
                    border: "0.5px solid #e8e8e8",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    zIndex: 10,
                    minWidth: "160px",
                  }}
                >
                  {["Export as PDF", "Export as CSV", "Send to Admin"].map(
                    (opt) => (
                      <button
                        key={opt}
                        onClick={() => setShowExportMenu(false)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 18px",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          fontSize: "13px",
                          color: "#333",
                          cursor: "pointer",
                        }}
                      >
                        {opt === "Export as PDF"
                          ? "📄"
                          : opt === "Export as CSV"
                            ? "📊"
                            : "📤"}{" "}
                        {opt}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {statCards.map((s) => (
              <div
                key={s.label}
                style={{
                  background: s.bg,
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.75)",
                    marginBottom: "8px",
                  }}
                >
                  {s.label}
                </p>
                <p style={{ fontSize: "26px", fontWeight: 800, color: "#fff" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* 2-column: Top Selling + Chart placeholder */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 2fr))",
              gap: "20px",
            }}
          >
            {/* Top Selling Table */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "0.5px solid #e8e8e8",
                padding: "22px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                <span style={{ fontSize: "18px" }}>📈</span>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  Top Selling Items
                </p>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    color: "#aaa",
                    background: "#f5f5f5",
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {period}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {[
                      "Rank",
                      "Product Name",
                      "Total Qty Sold",
                      "Total Revenue",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: "11px",
                          color: "#aaa",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topSelling.map((item) => (
                    <tr
                      key={item.rank}
                      style={{ borderBottom: "0.5px solid #f5f5f5" }}
                    >
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: rankColors[item.rank - 1],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: item.rank <= 3 ? "#fff" : "#fff",
                          }}
                        >
                          {item.rank}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#1a1a1a",
                        }}
                      >
                        {item.name}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          color: "#555",
                        }}
                      >
                        {item.qty} units
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#1a3c2e",
                        }}
                      >
                        ₱{item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Breakdown */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>📉</span>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                    }}
                  >
                    Low Stock Alert
                  </p>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#ffebee",
                      color: "#c62828",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "20px",
                    }}
                  >
                    4 items
                  </span>
                </div>
                {[
                  {
                    name: "Mountain Dew 500ml",
                    brand: "Pepsi",
                    stock: 12,
                    emoji: "💚",
                  },
                  {
                    name: "Royal 500ml",
                    brand: "Coca Cola",
                    stock: 8,
                    emoji: "🍊",
                  },
                  {
                    name: "Pepsi 500ml",
                    brand: "Pepsi",
                    stock: 15,
                    emoji: "🥤",
                  },
                  {
                    name: "Sprite 500ml",
                    brand: "Coca Cola",
                    stock: 0,
                    emoji: "🍋",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 0",
                      borderBottom: "0.5px solid #f5f5f5",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: "#f5f5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {item.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#1a1a1a",
                        }}
                      >
                        {item.name}
                      </p>
                      <p style={{ fontSize: "11px", color: "#aaa" }}>
                        {item.brand}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: item.stock === 0 ? "#ffebee" : "#fff3e0",
                        color: item.stock === 0 ? "#c62828" : "#e65100",
                      }}
                    >
                      {item.stock === 0 ? "Out of Stock" : `${item.stock} left`}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "22px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: "14px",
                  }}
                >
                  📊 Quick Stats
                </p>
                {[
                  {
                    label: "Avg Order Value",
                    value: `₱${Math.round(data.total / data.transactions).toLocaleString()}`,
                  },
                  {
                    label: "Total Transactions",
                    value: String(data.transactions),
                  },
                  { label: "Top Product", value: "Coca Cola 1.5L" },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "0.5px solid #f5f5f5",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#888" }}>
                      {s.label}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "Transactions" && (
        <div>
          {/* Search */}
          <div
            style={{
              position: "relative",
              marginBottom: "20px",
              maxWidth: "420px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
                color: "#aaa",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by order number, customer, or store..."
              style={{
                width: "100%",
                padding: "11px 16px 11px 38px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                fontSize: "13px",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Transaction Cards — 2 per row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  border: "0.5px solid #e8e8e8",
                  padding: "20px 24px",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      {tx.id}
                    </p>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background:
                          tx.payment === "Cash" ? "#e3f2fd" : "#ede7f6",
                        color: tx.payment === "Cash" ? "#1565c0" : "#6a1b9a",
                      }}
                    >
                      {tx.payment.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTx(tx)}
                    style={{
                      background: "#1a3c2e",
                      color: "#fff",
                      border: "none",
                      borderRadius: "20px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                </div>

                {/* Info */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    <span style={{ color: "#aaa" }}>Customer:</span>{" "}
                    {tx.customer}
                  </p>
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    <span style={{ color: "#aaa" }}>Store:</span> Kens Sari-Sari
                    Store
                  </p>
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    <span style={{ color: "#aaa" }}>Cashier:</span> Maria Cruz
                  </p>
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    <span style={{ color: "#aaa" }}>Date:</span> {tx.date}
                  </p>
                </div>

                {/* Total */}
                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "0.5px solid #f0f0f0",
                  }}
                >
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#1a1a1a",
                    }}
                  >
                    Total:{" "}
                    <span style={{ color: "#1a3c2e" }}>
                      ₱{tx.total.toLocaleString()}.00
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {selectedTx && (
        <>
          <div
            onClick={() => setSelectedTx(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
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
              width: "400px",
              background: "#fff",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Receipt Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1a3c2e, #2d7a3a)",
                padding: "24px 28px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <button
                onClick={() => setSelectedTx(null)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                  fontSize: "24px",
                }}
              >
                🧾
              </div>
              <p
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 800,
                  marginBottom: "2px",
                }}
              >
                Julieta Soft Drinks
              </p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>
                Official Receipt
              </p>
            </div>

            {/* Zigzag */}
            <div
              style={{
                height: "12px",
                background:
                  "linear-gradient(135deg, #2d7a3a 25%, transparent 25%) -10px 0, linear-gradient(225deg, #2d7a3a 25%, transparent 25%) -10px 0, linear-gradient(315deg, #2d7a3a 25%, transparent 25%), linear-gradient(45deg, #2d7a3a 25%, transparent 25%)",
                backgroundSize: "20px 12px",
                backgroundRepeat: "repeat-x",
              }}
            />

            {/* Receipt Body */}
            <div style={{ padding: "20px 28px" }}>
              {/* Order + Customer Info */}
              {[
                ["Order ID", selectedTx.id],
                ["Customer", selectedTx.customer],
                ["Store", "Kens Sari-Sari Store"],
                ["Cashier", "Maria Cruz"],
                ["Date", selectedTx.date],
                ["Payment", selectedTx.payment],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    {label}
                  </span>
                  <span
                    style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}
                  >
                    {value}
                  </span>
                </div>
              ))}

              <div
                style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }}
              />

              {/* Items */}
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Items Ordered
              </p>
              {[...Array(selectedTx.items)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "13px", color: "#333" }}>
                      Cola Regular 1.5L
                    </p>
                    <p style={{ fontSize: "11px", color: "#aaa" }}>
                      x1 × ₱{Math.round(selectedTx.total / selectedTx.items)}.00
                    </p>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    ₱
                    {Math.round(
                      selectedTx.total / selectedTx.items,
                    ).toLocaleString()}
                    .00
                  </span>
                </div>
              ))}

              <div
                style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }}
              />

              {/* Total */}
              <div
                style={{
                  background: "#f0faf2",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  TOTAL
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#1a3c2e",
                  }}
                >
                  ₱{selectedTx.total.toLocaleString()}.00
                </span>
              </div>

              <div
                style={{
                  textAlign: "center",
                  paddingTop: "14px",
                  borderTop: "1px dashed #e0e0e0",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#2d7a3a",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Thank you for your purchase! 🎉
                </p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>
                  Julieta Soft Drink Store • TECHNOLOGIA @2026
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
