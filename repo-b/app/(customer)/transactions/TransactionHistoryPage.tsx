"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type TxItem = { name: string; qty: number; price: number };

type Transaction = {
  id:            string;
  date:          string;
  total:         number;
  paymentMethod: string;
  items:         TxItem[];
};

function normalizeCompleted(o: Record<string, unknown>): Transaction {
  // getCustomerOrders pre-shapes items as { name, qty, price }
  const rawItems = (o.items ?? o.orderLines ?? []) as Record<string, unknown>[];

  const items: TxItem[] = rawItems.map((i) => {
    // handle both pre-shaped and raw orderLine shape
    const product = i.product as Record<string, unknown> | null;
    return {
      name:  product ? String(product.productName ?? "Item") : String(i.name ?? "Item"),
      qty:   Number(i.quantity ?? i.qty ?? 1),
      price: Number(i.price ?? 0),
    };
  });

  const payment = o.payment as Record<string, unknown> | null;
  const rawDate = String(o.createdAt ?? o.date ?? "");

  return {
    id:            String(o.id ?? ""),
    date:          rawDate
      ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    total:         Number(o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0)),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    items,
  };
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "20px" }}>
      {[140, 100, 80, 60, 100].map((w, i) => (
        <div key={i} style={{ height: "13px", width: `${w}px`, borderRadius: "6px", marginBottom: "10px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
      <div style={{ height: "34px", borderRadius: "20px", marginTop: "8px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
    </div>
  );
}

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected,     setSelected]     = useState<Transaction | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchTransactions = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setError("Not logged in."); setLoading(false); return; }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomerOrders(customerId);

      if (data?.message) { setError(data.message); return; }

      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];

      // Only COMPLETED orders
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

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalSpent = transactions.reduce((s, t) => s + t.total, 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "28px", background: "#f5f5f5", minHeight: "calc(100vh - 56px)" }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ height: "100px", borderRadius: "16px", marginBottom: "24px", background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", background: "#f5f5f5" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#c62828" }}>⚠️ {error}</p>
        <button onClick={fetchTransactions} style={{ background: "#2d7a3a", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#e8f5f0,#dff0ea)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ fontSize: "64px" }}>🧾</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>No completed orders yet</h2>
        <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Your completed orders will appear here.</p>
        <Link href="/products" style={{ background: "#2d7a3a", color: "#fff", textDecoration: "none", padding: "12px 32px", borderRadius: "30px", fontSize: "14px", fontWeight: 600 }}>
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ padding: "28px", background: "#f5f5f5", minHeight: "calc(100vh - 56px)" }}>

        {/* Summary Banner */}
        <div style={{ background: "linear-gradient(135deg,#2d7a3a,#56ab6e)", borderRadius: "16px", padding: "20px 28px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", margin: 0 }}>Completed Orders</p>
            <h2 style={{ color: "#fff", fontSize: "32px", fontWeight: 800, margin: 0 }}>{transactions.length}</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", margin: 0 }}>Total Spent</p>
            <h2 style={{ color: "#f5c842", fontSize: "32px", fontWeight: 800, margin: 0 }}>₱{totalSpent.toLocaleString()}.00</h2>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
          {transactions.map((tx) => (
            <div key={tx.id} style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>Order ID</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{tx.id}</p>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: tx.paymentMethod === "CASH" ? "#e3f2fd" : "#ede7f6", color: tx.paymentMethod === "CASH" ? "#1565c0" : "#6a1b9a" }}>
                  {tx.paymentMethod}
                </span>
              </div>

              {/* Date */}
              <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>📅 {tx.date}</p>

              {/* Items preview */}
              <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "10px 12px" }}>
                {tx.items.slice(0, 2).map((item, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "#555", margin: "0 0 2px" }}>
                    {item.name} <span style={{ color: "#aaa" }}>x{item.qty}</span>
                  </p>
                ))}
                {tx.items.length > 2 && (
                  <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>+{tx.items.length - 2} more item{tx.items.length - 2 !== 1 ? "s" : ""}</p>
                )}
              </div>

              {/* Total + Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#2d7a3a", margin: 0 }}>₱{tx.total.toLocaleString()}.00</p>
                <button onClick={() => setSelected(tx)}
                  style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt Modal */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, width: "400px", background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Receipt Header */}
            <div style={{ background: "linear-gradient(135deg,#1a3c2e,#2d7a3a)", padding: "24px 28px", textAlign: "center", position: "relative" }}>
              <button onClick={() => setSelected(null)} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#fff", fontSize: "14px" }}>✕</button>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "24px" }}>🧾</div>
              <p style={{ color: "#fff", fontSize: "18px", fontWeight: 800, margin: "0 0 2px" }}>Julieta Soft Drinks</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", margin: 0 }}>Official Receipt</p>
            </div>

            {/* Zigzag */}
            <div style={{ height: "12px", background: "linear-gradient(135deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(225deg,#2d7a3a 25%,transparent 25%) -10px 0,linear-gradient(315deg,#2d7a3a 25%,transparent 25%),linear-gradient(45deg,#2d7a3a 25%,transparent 25%)", backgroundSize: "20px 12px", backgroundRepeat: "repeat-x" }} />

            {/* Body */}
            <div style={{ padding: "20px 28px" }}>
              {[
                ["Order ID", selected.id],
                ["Date",     selected.date],
                ["Payment",  selected.paymentMethod],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>{value}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />

              <p style={{ fontSize: "11px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Ordered</p>
              {selected.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "#333", margin: 0 }}>{item.name}</p>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>x{item.qty} × ₱{item.price.toLocaleString()}.00</p>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>₱{(item.price * item.qty).toLocaleString()}.00</span>
                </div>
              ))}

              <div style={{ borderTop: "1px dashed #e0e0e0", margin: "14px 0" }} />

              <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>TOTAL</span>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#1a3c2e" }}>₱{selected.total.toLocaleString()}.00</span>
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
