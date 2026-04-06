"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

type Period = "Daily" | "Weekly" | "Monthly";
type Tab = "Transactions" | "Sales Reports";

type OrderLine = {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: { productName: string; category: string };
};

type Transaction = {
  id: string;
  date: string;
  customer: string;
  employeeName: string;
  total: number;
  payment: string;
  items: OrderLine[];
};

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤", ENERGY_DRINK: "⚡", BEER: "🍺",
  JUICE: "🍹", WATER: "💧", OTHER: "🛒",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer  = o.customer  as Record<string, unknown> | null;
  const employee  = o.employee  as Record<string, unknown> | null;
  const payment   = o.payment   as Record<string, unknown> | null;
  const rawLines  = (o.orderLines ?? []) as Record<string, unknown>[];

  return {
    id:           String(o.id ?? ""),
    date:         o.createdAt
      ? new Date(String(o.createdAt)).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    customer:     customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    employeeName: customer
      ? "Online Order"  // customer-placed orders have no cashier
      : employee ? String(employee.name ?? "—") : "—",
    total:        Number(o.totalAmount ?? 0),
    payment:      payment ? String(payment.method ?? "CASH") : "CASH",
    items:        rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        id:       String(l.id ?? ""),
        quantity: Number(l.quantity ?? 0),
        price:    Number(l.price ?? 0),
        subtotal: Number(l.subtotal ?? 0),
        product:  {
          productName: product ? String(product.productName ?? "Item") : "Item",
          category:    product ? String(product.category ?? "") : "" as string,
        },
      };
    }),
  };
}

function filterByPeriod(txs: Transaction[], period: Period): Transaction[] {
  const now = new Date();
  return txs.filter((tx) => {
    const d = new Date(tx.date);
    if (period === "Daily") {
      return d.toDateString() === now.toDateString();
    }
    if (period === "Weekly") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    // Monthly
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "20px 24px" }}>
      {[160, 120, 100, 80].map((w, i) => (
        <div key={i} style={{ height: "13px", width: `${w}px`, borderRadius: "6px", marginBottom: "10px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
    </div>
  );
}

export default function CashierTransactionsPage() {
  const [activeTab,      setActiveTab]      = useState<Tab>("Transactions");
  const [period,         setPeriod]         = useState<Period>("Daily");
  const [search,         setSearch]         = useState("");
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedTx,     setSelectedTx]     = useState<Transaction | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCompletedOrders();

      if (data?.message) { setError(data.message); return; }

      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      setTransactions(raw.map(normalizeTransaction));
    } catch (err) {
      setError((err as Error).message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Filtered for current period (Sales Reports tab)
  const periodFiltered = filterByPeriod(transactions, period);

  // Filtered for search (Transactions tab)
  const searchFiltered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      tx.id.toLowerCase().includes(q) ||
      tx.customer.toLowerCase().includes(q) ||
      tx.employeeName.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalSales    = periodFiltered.reduce((s, t) => s + t.total, 0);
  const cashSales     = periodFiltered.filter((t) => t.payment === "CASH").reduce((s, t) => s + t.total, 0);
  const onlineSales   = periodFiltered.filter((t) => t.payment !== "CASH").reduce((s, t) => s + t.total, 0);
  const txCount       = periodFiltered.length;
  const avgOrder      = txCount > 0 ? Math.round(totalSales / txCount) : 0;

  // Top selling
  const productMap: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
  periodFiltered.forEach((tx) => {
    tx.items.forEach((line) => {
      const key = line.product.productName;
      if (!productMap[key]) {
        productMap[key] = { name: key, qty: 0, revenue: 0, category: line.product.category };
      }
      productMap[key].qty     += line.quantity;
      productMap[key].revenue += line.subtotal;
    });
  });
  const topSelling = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const rankColors = ["#e53935", "#fb8c00", "#f9a825", "#aaa", "#aaa", "#aaa", "#aaa", "#aaa"];

  const statCards = [
    { label: "Total Sales",     value: `₱${totalSales.toLocaleString()}`,  bg: "linear-gradient(135deg,#1565c0,#42a5f5)" },
    { label: "Transactions",    value: String(txCount),                     bg: "linear-gradient(135deg,#2e7d32,#66bb6a)" },
    { label: "Cash Sales",      value: `₱${cashSales.toLocaleString()}`,    bg: "linear-gradient(135deg,#6a1b9a,#ab47bc)" },
    { label: "Online Sales",    value: `₱${onlineSales.toLocaleString()}`,  bg: "linear-gradient(135deg,#e65100,#ffa726)" },
  ];

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ padding: "28px" }}>

        {/* Hero Banner */}
        <div style={{ background: "linear-gradient(135deg,#1a3c2e 0%,#2d7a3a 60%,#e65100 100%)", borderRadius: "16px", padding: "28px 36px", marginBottom: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", overflow: "hidden", position: "relative" }}>
          <div style={{ zIndex: 1 }}>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>Transaction History</h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>Sales reports, top products & completed transaction records</p>
          </div>
          <div style={{ fontSize: "80px", opacity: 0.15, position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)" }}>🥤</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["Transactions", "Sales Reports"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding: "9px 24px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: activeTab === t ? "none" : "1px solid #e0e0e0", background: activeTab === t ? "#1a3c2e" : "#fff", color: activeTab === t ? "#fff" : "#555", boxShadow: activeTab === t ? "0 4px 12px rgba(26,60,46,0.3)" : "none" }}>
              {t}
            </button>
          ))}
          <button onClick={fetchTransactions}
            style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid #e0e0e0", background: "#fff", color: "#555" }}>
            🔄 Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#ffebee", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#c62828", margin: 0 }}>⚠️ {error}</p>
            <button onClick={fetchTransactions} style={{ background: "#c62828", color: "#fff", border: "none", borderRadius: "20px", padding: "7px 18px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "Transactions" && (
          <div>
            <div style={{ position: "relative", marginBottom: "20px", maxWidth: "420px" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#aaa" }}>🔍</span>
              <input type="text" placeholder="Search by order ID, customer, or cashier..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "11px 16px 11px 38px", borderRadius: "20px", border: "1px solid #e0e0e0", fontSize: "13px", outline: "none", background: "#fff", boxSizing: "border-box" }} />
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : searchFiltered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "16px", padding: "60px", textAlign: "center", border: "0.5px solid #e8e8e8" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧾</div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>No completed transactions</p>
                <p style={{ fontSize: "13px", color: "#aaa" }}>{search ? "Try a different search term." : "Completed orders will appear here."}</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>
                {searchFiltered.map((tx) => (
                  <div key={tx.id} style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{tx.id}</p>
                        <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: tx.payment === "CASH" ? "#e3f2fd" : "#ede7f6", color: tx.payment === "CASH" ? "#1565c0" : "#6a1b9a" }}>
                          {tx.payment}
                        </span>
                      </div>
                      <button onClick={() => setSelectedTx(tx)}
                        style={{ background: "#1a3c2e", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        View
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <p style={{ fontSize: "13px", color: "#555", margin: 0 }}><span style={{ color: "#aaa" }}>Customer:</span> {tx.customer}</p>
                      <p style={{ fontSize: "13px", color: "#555", margin: 0 }}><span style={{ color: "#aaa" }}>Cashier:</span> {tx.employeeName}</p>
                      <p style={{ fontSize: "13px", color: "#555", margin: 0 }}><span style={{ color: "#aaa" }}>Date:</span> {tx.date}</p>
                      <p style={{ fontSize: "13px", color: "#555", margin: 0 }}><span style={{ color: "#aaa" }}>Items:</span> {tx.items.length}</p>
                    </div>
                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "0.5px solid #f0f0f0" }}>
                      <p style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
                        Total: <span style={{ color: "#1a3c2e" }}>₱{tx.total.toLocaleString()}.00</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SALES REPORTS TAB ── */}
        {activeTab === "Sales Reports" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#888" }}>📅 Report Period:</span>
                {(["Daily", "Weekly", "Monthly"] as Period[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding: "7px 18px", borderRadius: "20px", fontSize: "12.5px", fontWeight: period === p ? 700 : 400, cursor: "pointer", border: "none", background: period === p ? "#1a3c2e" : "#f0f0f0", color: period === p ? "#fff" : "#555" }}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowExportMenu(!showExportMenu)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 20px", borderRadius: "20px", border: "1.5px solid #1a3c2e", background: "#fff", color: "#1a3c2e", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  ⬇ Export
                </button>
                {showExportMenu && (
                  <div style={{ position: "absolute", top: "44px", right: 0, background: "#fff", borderRadius: "12px", border: "0.5px solid #e8e8e8", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden", zIndex: 10, minWidth: "160px" }}>
                    {["Export as PDF", "Export as CSV"].map((opt) => (
                      <button key={opt} onClick={() => setShowExportMenu(false)}
                        style={{ display: "block", width: "100%", padding: "12px 18px", background: "none", border: "none", textAlign: "left", fontSize: "13px", color: "#333", cursor: "pointer" }}>
                        {opt === "Export as PDF" ? "📄" : "📊"} {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stat Cards */}
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px", marginBottom: "24px" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: "90px", borderRadius: "14px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px", marginBottom: "24px" }}>
                {statCards.map((s) => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: "14px", padding: "18px 20px" }}>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", marginBottom: "8px" }}>{s.label}</p>
                    <p style={{ fontSize: "26px", fontWeight: 800, color: "#fff", margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "20px" }}>
              {/* Top Selling */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                  <span style={{ fontSize: "18px" }}>📈</span>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Top Selling Items</p>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#aaa", background: "#f5f5f5", padding: "3px 10px", borderRadius: "20px" }}>{period}</span>
                </div>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: "13px", borderRadius: "6px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    ))}
                  </div>
                ) : topSelling.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "20px 0" }}>No sales data for this period.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                        {["Rank", "Product", "Qty Sold", "Revenue"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSelling.map((item) => (
                        <tr key={item.rank} style={{ borderBottom: "0.5px solid #f5f5f5" }}>
                          <td style={{ padding: "10px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: rankColors[item.rank - 1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                              {item.rank}
                            </div>
                          </td>
                          <td style={{ padding: "10px", fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                            {getEmoji(item.category)} {item.name}
                          </td>
                          <td style={{ padding: "10px", fontSize: "13px", color: "#555" }}>{item.qty}</td>
                          <td style={{ padding: "10px", fontSize: "13px", fontWeight: 700, color: "#1a3c2e" }}>₱{item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Quick Stats */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "22px" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "14px" }}>📊 Quick Stats</p>
                {[
                  { label: "Avg Order Value",   value: `₱${avgOrder.toLocaleString()}` },
                  { label: "Total Transactions", value: String(txCount) },
                  { label: "Cash Transactions",  value: String(periodFiltered.filter((t) => t.payment === "CASH").length) },
                  { label: "Online Transactions",value: String(periodFiltered.filter((t) => t.payment !== "CASH").length) },
                  { label: "Top Product",        value: topSelling[0]?.name ?? "—" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                    <span style={{ fontSize: "13px", color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedTx && (
        <>
          <div onClick={() => setSelectedTx(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, width: "400px", background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ background: "linear-gradient(135deg,#1a3c2e,#2d7a3a)", padding: "24px 28px", textAlign: "center", position: "relative" }}>
              <button onClick={() => setSelectedTx(null)} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#fff", fontSize: "14px" }}>✕</button>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "24px" }}>🧾</div>
              <p style={{ color: "#fff", fontSize: "18px", fontWeight: 800, marginBottom: "2px" }}>Julieta Soft Drinks</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>Official Receipt</p>
            </div>

            <div style={{ height: "12px", background: "linear-gradient(135deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(225deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(315deg,#2d7a3a 25%,transparent 25%),linear-gradient(45deg,#2d7a3a 25%,transparent 25%)", backgroundSize: "20px 12px", backgroundRepeat: "repeat-x" }} />

            <div style={{ padding: "20px 28px" }}>
              {[
                ["Order ID",  selectedTx.id],
                ["Customer", selectedTx.customer],
                ["Cashier",  selectedTx.employeeName],
                ["Date",     selectedTx.date],
                ["Payment",  selectedTx.payment],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>{value}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />

              <p style={{ fontSize: "11px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Ordered</p>
              {selectedTx.items.map((line, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "#333", margin: 0 }}>{getEmoji(line.product.category)} {line.product.productName}</p>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>x{line.quantity} × ₱{line.price.toLocaleString()}.00</p>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>₱{line.subtotal.toLocaleString()}.00</span>
                </div>
              ))}

              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />

              <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>TOTAL</span>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c2e" }}>₱{selectedTx.total.toLocaleString()}.00</span>
              </div>

              <div style={{ textAlign: "center", paddingTop: "14px", borderTop: "1px dashed #e0e0e0" }}>
                <p style={{ fontSize: "12px", color: "#2d7a3a", fontWeight: 600, marginBottom: "4px" }}>Thank you for your purchase! 🎉</p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>Julieta Soft Drink Store • TECHNOLOGIA @2026</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
