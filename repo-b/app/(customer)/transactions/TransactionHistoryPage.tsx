"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type TxItem = { name: string; qty: number; price: number };

type Transaction = {
  id: string;
  date: string;
  rawDate: Date | null;
  total: number;
  paymentMethod: string;
  items: TxItem[];
};

type FilterPeriod = "today" | "weekly" | "monthly" | "yearly";

function normalizeCompleted(o: Record<string, unknown>): Transaction {
  const rawItems = (o.items ?? o.orderLines ?? []) as Record<string, unknown>[];

  const items: TxItem[] = rawItems.map((i) => {
    const product = i.product as Record<string, unknown> | null;
    return {
      name: product
        ? String(product.productName ?? "Item")
        : String(i.name ?? "Item"),
      qty: Number(i.quantity ?? i.qty ?? 1),
      price: Number(i.price ?? 0),
    };
  });

  const payment = o.payment as Record<string, unknown> | null;
  const rawDateStr = String(o.createdAt ?? o.date ?? "");
  const parsedDate = rawDateStr ? new Date(rawDateStr) : null;

  return {
    id: String(o.id ?? ""),
    date: parsedDate
      ? parsedDate.toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—",
    rawDate: parsedDate,
    total: Number(
      o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0),
    ),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    items,
  };
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "20px" }}>
      {[140, 100, 80, 60, 100].map((w, i) => (
        <div
          key={i}
          style={{
            height: "13px",
            width: `${w}px`,
            borderRadius: "6px",
            marginBottom: "10px",
            background:
              "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
          }}
        />
      ))}
      <div
        style={{
          height: "34px",
          borderRadius: "20px",
          marginTop: "8px",
          background:
            "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }}
      />
    </div>
  );
}

const FILTERS: { key: FilterPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function getFilterStart(period: FilterPeriod): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "weekly": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "monthly": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "yearly": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<FilterPeriod>("today");

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchTransactions = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomerOrders(customerId);

      if (data?.message) {
        setError(data.message);
        return;
      }

      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];

      const completed = raw
        .filter((o) => String(o.status ?? "").toUpperCase() === "COMPLETED")
        .map(normalizeCompleted);

      setTransactions(completed);
    } catch (err) {
      setError((err as Error).message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    const start = getFilterStart(activePeriod);
    return transactions.filter(
      (tx) => tx.rawDate !== null && tx.rawDate >= start,
    );
  }, [transactions, activePeriod]);

  const totalSpent = filteredTransactions.reduce((s, t) => s + t.total, 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          padding: "clamp(14px, 3vw, 28px)",
          background: "#f5f5f5",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div
          style={{
            height: "100px",
            borderRadius: "16px",
            marginBottom: "24px",
            background:
              "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "#f5f5f5",
        }}
      >
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#c62828" }}>
          ⚠️ {error}
        </p>
        <button
          onClick={fetchTransactions}
          style={{
            background: "#2d7a3a",
            color: "#fff",
            border: "none",
            borderRadius: "20px",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty (all time) ───────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg,#e8f5f0,#dff0ea)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "64px" }}>🧾</div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          No completed orders yet
        </h2>
        <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
          Your completed orders will appear here.
        </p>
        <Link
          href="/products"
          style={{
            background: "#2d7a3a",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 32px",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        .filter-btn {
          transition: background 0.18s, color 0.18s, box-shadow 0.18s;
        }
        .filter-btn:hover {
          opacity: 0.88;
        }
      `}</style>

      <div
        style={{
          padding: "28px",
          background: "#f5f5f5",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* Summary Banner */}
        <div
          style={{
            background: "linear-gradient(135deg,#2d7a3a,#56ab6e)",
            borderRadius: "16px",
            padding: "20px 28px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Completed Orders
            </p>
            <h2
              style={{
                color: "#fff",
                fontSize: "32px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {filteredTransactions.length}
            </h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Total Spent
            </p>
            <h2
              style={{
                color: "#f5c842",
                fontSize: "32px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              ₱{totalSpent.toLocaleString()}.00
            </h2>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            background: "#fff",
            borderRadius: "50px",
            padding: "5px",
            width: "fit-content",
            boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          }}
        >
          {FILTERS.map(({ key, label }) => {
            const isActive = activePeriod === key;
            return (
              <button
                key={key}
                className="filter-btn"
                onClick={() => setActivePeriod(key)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "50px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: isActive
                    ? "linear-gradient(135deg,#2d7a3a,#56ab6e)"
                    : "transparent",
                  color: isActive ? "#fff" : "#888",
                  boxShadow: isActive
                    ? "0 2px 8px rgba(45,122,58,0.30)"
                    : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* No results for this period */}
        {filteredTransactions.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "60px 0",
            }}
          >
            <div style={{ fontSize: "48px" }}>📭</div>
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#555",
                margin: 0,
              }}
            >
              No orders found for this period
            </p>
            <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
              Try selecting a different time range.
            </p>
          </div>
        ) : (
          /* Grid */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
                      Order ID
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                        margin: 0,
                      }}
                    >
                      {tx.id}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background:
                        tx.paymentMethod === "CASH" ? "#e3f2fd" : "#ede7f6",
                      color:
                        tx.paymentMethod === "CASH" ? "#1565c0" : "#6a1b9a",
                    }}
                  >
                    {tx.paymentMethod}
                  </span>
                </div>

                {/* Date */}
                <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                  📅 {tx.date}
                </p>

                {/* Items preview */}
                <div
                  style={{
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    padding: "10px 12px",
                  }}
                >
                  {tx.items.slice(0, 2).map((item, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        margin: "0 0 2px",
                      }}
                    >
                      {item.name}{" "}
                      <span style={{ color: "#aaa" }}>x{item.qty}</span>
                    </p>
                  ))}
                  {tx.items.length > 2 && (
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
                      +{tx.items.length - 2} more item
                      {tx.items.length - 2 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Total + Button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#2d7a3a",
                      margin: 0,
                    }}
                  >
                    ₱{tx.total.toLocaleString()}.00
                  </p>
                  <button
                    onClick={() => setSelected(tx)}
                    style={{
                      background: "#7c3aed",
                      color: "#fff",
                      border: "none",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal — thermal paper style */}
      {selected && (() => {
        const TAX_RATE = 0.12;
        const subtotal = selected.items.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * TAX_RATE;
        const totalDue = subtotal + tax;

        return (
          <>
            <div
              onClick={() => setSelected(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                zIndex: 40,
              }}
            />

            {/* Paper wrapper — torn-edge top/bottom */}
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 50,
                width: "clamp(300px, 90vw, 380px)",
                maxHeight: "90vh",
                overflowY: "auto",
                overflowX: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
                /* torn top edge */
                borderRadius: "2px",
              }}
            >
              {/* Torn top */}
              <div style={{
                height: "14px",
                background: "linear-gradient(135deg, #f0ede6 25%, transparent 25%) -8px 0,linear-gradient(225deg, #f0ede6 25%, transparent 25%) -8px 0,linear-gradient(315deg, #f0ede6 25%, transparent 25%),linear-gradient(45deg, #f0ede6 25%, transparent 25%)",
                backgroundSize: "16px 14px",
                backgroundRepeat: "repeat-x",
                backgroundColor: "#e8e4da",
              }} />

              {/* Receipt body */}
              <div
                style={{
                  background: "#f7f4ee",
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "13px",
                  color: "#1a1a1a",
                  padding: "18px 24px 10px",
                  lineHeight: 1.55,
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    position: "absolute",
                    top: "18px",
                    right: "14px",
                    background: "rgba(0,0,0,0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: "26px",
                    height: "26px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#555",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>

                {/* Store header */}
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", letterSpacing: "0.5px" }}>
                    ☐ JULIETA SOFT DRINKS
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555" }}>
                    Drinks • Beverages • Refreshments
                  </p>
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#555" }}>
                    123 Cola Street, Quezon City
                  </p>
                </div>

                <Dash />

                {/* Invoice meta */}
                <p style={{ margin: "0 0 1px" }}>
                  <span style={{ color: "#555" }}>Invoice #: </span>
                  <span style={{ fontWeight: 700 }}>{selected.id}</span>
                </p>
                <p style={{ margin: "0 0 1px" }}>
                  <span style={{ color: "#555" }}>Date: </span>{selected.date}
                </p>
                <p style={{ margin: "0 0 10px" }}>
                  <span style={{ color: "#555" }}>Payment: </span>{selected.paymentMethod}
                </p>

                <Dash />

                {/* Column header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "4px 0",
                  color: "#333",
                }}>
                  <span>Description</span>
                  <span style={{ textAlign: "center" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Unit</span>
                  <span style={{ textAlign: "right" }}>Total</span>
                </div>

                <Dash />

                {/* Items */}
                {selected.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      padding: "3px 0",
                      fontSize: "12px",
                      alignItems: "start",
                    }}
                  >
                    <span style={{ wordBreak: "break-word", paddingRight: "6px" }}>
                      {item.name}
                    </span>
                    <span style={{ textAlign: "center" }}>{item.qty}</span>
                    <span style={{ textAlign: "right" }}>
                      ₱{item.price.toFixed(2)}
                    </span>
                    <span style={{ textAlign: "right", fontWeight: 600 }}>
                      ₱{(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}

                <Dash />

                {/* Subtotal / Tax */}
                <ThermalRow label="Subtotal:" value={`₱${subtotal.toFixed(2)}`} />
                <ThermalRow label="Tax (8%):" value={`₱${tax.toFixed(2)}`} />

                <Dash />

                {/* TOTAL DUE */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "15px",
                  padding: "4px 0 6px",
                }}>
                  <span>TOTAL DUE:</span>
                  <span>₱{totalDue.toFixed(2)}</span>
                </div>

                <Dash />

                {/* Footer meta */}
                <p style={{ margin: "6px 0 1px", fontSize: "12px" }}>
                  <span style={{ color: "#555" }}>Paid: </span>{selected.paymentMethod === "CASH" ? "Cash" : "Card / E-Wallet"}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "12px" }}>
                  <span style={{ color: "#555" }}>Staff: </span>#JST-2026
                </p>

                <Dash />

                {/* Footer note */}
                <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: "11px", color: "#666" }}>
                  <p style={{ margin: "0 0 2px" }}>Thank you for your purchase!</p>
                  <p style={{ margin: 0 }}>Visit us at: julietasoftdrinks.com</p>
                  <p style={{ margin: "6px 0 0", fontSize: "10px", color: "#aaa" }}>
                    Julieta Soft Drink Store • TECHNOLOGIA @2026
                  </p>
                </div>
              </div>

              {/* Torn bottom */}
              <div style={{
                height: "14px",
                background: "linear-gradient(135deg, transparent 25%, #f7f4ee 25%) -8px 0,linear-gradient(225deg, transparent 25%, #f7f4ee 25%) -8px 0,linear-gradient(315deg, transparent 25%, #f7f4ee 25%),linear-gradient(45deg, transparent 25%, #f7f4ee 25%)",
                backgroundSize: "16px 14px",
                backgroundRepeat: "repeat-x",
                backgroundColor: "#e8e4da",
              }} />
            </div>
          </>
        );
      })()}
    </>
  );
}

/* ── Helpers ── */
function Dash() {
  return (
    <div style={{
      borderTop: "1px dashed #bbb",
      margin: "8px 0",
    }} />
  );
}

function ThermalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: "12px",
      padding: "1px 0",
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}