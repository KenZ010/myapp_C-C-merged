"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type TxItem = { name: string; qty: number; price: number };

type Transaction = {
  id: string;
  date: string;
  rawDate: string; // ISO string for date comparison
  total: number;
  paymentMethod: string;
  items: TxItem[];
};

const RETURN_REASONS = [
  "Wrong item delivered",
  "Damaged / broken item",
  "Expired product",
  "Missing items in order",
  "Poor product quality",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeTransaction(o: Record<string, unknown>): Transaction {
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
  const rawDate = String(o.createdAt ?? o.date ?? "");
  return {
    id: String(o.id ?? ""),
    rawDate,
    date: rawDate
      ? new Date(rawDate).toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—",
    total: Number(
      o.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0)
    ),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    items,
  };
}

function isToday(rawDate: string): boolean {
  if (!rawDate) return false;
  const d = new Date(rawDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="skeleton-row">
      {[200, 120, 80, 60].map((w, i) => (
        <div key={i} className="skeleton-bar" style={{ width: w }} />
      ))}
      <style>{`
        .skeleton-row{display:flex;gap:16px;align-items:center;padding:18px 20px;border-bottom:1px solid #f5e8ec}
        .skeleton-bar{height:13px;border-radius:6px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
    </div>
  );
}

// ─── Return Form Modal ────────────────────────────────────────────────────────
function ReturnFormModal({
  transaction,
  onClose,
  onSuccess,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleItem = (i: number) =>
    setSelectedItems((prev) => ({ ...prev, [i]: !prev[i] }));

  const anySelected = Object.values(selectedItems).some(Boolean);
  const canSubmit = anySelected && !!reason;

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setImages((prev) =>
          prev.length < 5 ? [...prev, ev.target?.result as string] : prev
        );
      reader.readAsDataURL(file);
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1.5px solid #f0e0e8",
    fontSize: "13px",
    outline: "none",
    background: "#fff8fa",
    color: "#1a1a1a",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 50,
          width: "min(480px, 95vw)",
          background: "#fff",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(233,30,140,0.18)",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg,#c2185b,#e91e8c)",
            padding: "22px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", margin: "0 0 2px" }}>
              Return Request
            </p>
            <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 800, margin: 0 }}>
              Order #{transaction.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Step 1 – Select items */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
              1 · Select items to return
            </p>
            {transaction.items.map((item, i) => (
              <div
                key={i}
                onClick={() => toggleItem(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: `1.5px solid ${selectedItems[i] ? "#e91e8c" : "#f0e0e8"}`,
                  background: selectedItems[i] ? "#fff0f6" : "#fff8fa",
                  cursor: "pointer",
                  marginBottom: "8px",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: `2px solid ${selectedItems[i] ? "#e91e8c" : "#ddd"}`,
                    background: selectedItems[i] ? "#e91e8c" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {selectedItems[i] ? "✓" : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{item.name}</p>
                  <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
                    x{item.qty} · ₱{item.price.toLocaleString()}.00 each
                  </p>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#c2185b" }}>
                  ₱{(item.price * item.qty).toLocaleString()}.00
                </span>
              </div>
            ))}
          </div>

          {/* Step 2 – Reason */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              2 · Reason for return
            </p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select a reason...</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Step 3 – Photos */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              3 · Upload photos <span style={{ fontWeight: 400, color: "#bbb" }}>(optional)</span>
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed #f5a0b5",
                borderRadius: "10px",
                padding: "18px",
                textAlign: "center",
                cursor: "pointer",
                background: "#fff8fa",
                marginBottom: images.length ? "12px" : 0,
              }}
            >
              <p style={{ fontSize: "13px", color: "#e91e8c", fontWeight: 600, margin: "0 0 2px" }}>🖼️ Click to upload</p>
              <p style={{ fontSize: "11px", color: "#bbb", margin: 0 }}>JPG, PNG · Max 5 photos</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: "none" }} />
            {images.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {images.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden" }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      style={{ position: "absolute", top: "3px", right: "3px", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: "10px", cursor: "pointer" }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4 – Notes */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              4 · Additional notes <span style={{ fontWeight: 400, color: "#bbb" }}>(optional)</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the issue in more detail..."
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => { if (canSubmit) onSuccess(); }}
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "30px",
              border: "none",
              background: canSubmit
                ? "linear-gradient(135deg,#ff6b8a,#e91e8c)"
                : "#f0c0cc",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 6px 20px rgba(233,30,140,0.35)" : "none",
            }}
          >
            Submit Return Request
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnOrderPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

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
      if (data?.message) { setError(data.message); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      const completed = raw
        .filter((o) => String(o.status ?? "").toUpperCase() === "COMPLETED")
        .map(normalizeTransaction);
      setTransactions(completed);
    } catch (err) {
      setError((err as Error).message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (successId) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#fff0f3,#ffe4ec)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 20px" }}>✅</div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Return Request Submitted!</h2>
          <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "6px" }}>Order #{successId}</p>
          <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.7, maxWidth: "320px", margin: "0 auto 28px" }}>
            We'll review your request within 24–48 hours and contact you via your registered number.
          </p>
          <button
            onClick={() => setSuccessId(null)}
            style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: "30px", padding: "13px 40px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "clamp(14px,3vw,28px)", background: "#fdf2f6", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ height: "80px", borderRadius: "16px", marginBottom: "20px", background: "linear-gradient(90deg,#f5e0e8 25%,#efe0e8 50%,#f5e0e8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: "16px", marginBottom: "12px", overflow: "hidden" }}>
            <SkeletonRow />
          </div>
        ))}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", background: "#fdf2f6" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#c62828" }}>⚠️ {error}</p>
        <button onClick={fetchTransactions} style={{ background: "#e91e8c", color: "#fff", border: "none", borderRadius: "20px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#fff0f3,#ffe4ec)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
        <div style={{ fontSize: "60px" }}>📦</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>No completed orders</h2>
        <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>You have no orders eligible for return.</p>
      </div>
    );
  }

  const todayCount = transactions.filter((t) => isToday(t.rawDate)).length;

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .tx-row{transition:background 0.15s}
        .tx-row:hover{background:#fff8fa !important}
      `}</style>

      <div style={{ padding: "clamp(14px,3vw,28px)", background: "#fdf2f6", minHeight: "calc(100vh - 56px)" }}>
        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg,#c2185b,#e91e8c,#ff6b8a)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", margin: "0 0 2px" }}>Return Orders</p>
            <h2 style={{ color: "#fff", fontSize: "26px", fontWeight: 800, margin: 0 }}>My Orders</h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", margin: "6px 0 0" }}>
              {todayCount > 0
                ? `🟢 ${todayCount} order${todayCount > 1 ? "s" : ""} eligible for return today`
                : "⚠️ Only today's orders can be returned"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", margin: 0 }}>Total Orders</p>
            <h2 style={{ color: "#fff", fontSize: "32px", fontWeight: 800, margin: 0 }}>{transactions.length}</h2>
          </div>
        </div>

        {/* Return Policy Notice */}
        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: "13px", color: "#795548", margin: 0, lineHeight: 1.6 }}>
            <strong>Return Policy:</strong> Returns are only allowed for orders placed <strong>today</strong>. Orders from previous days are no longer eligible.
          </p>
        </div>

        {/* Transaction List */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #f5e0e8", overflow: "hidden" }}>
          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: "12px", padding: "12px 20px", background: "#fff0f5", borderBottom: "1px solid #f5e0e8" }}>
            {["Order ID", "Date", "Items", "Total", "Action"].map((h) => (
              <p key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#e91e8c", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {transactions.map((tx) => {
            const eligible = isToday(tx.rawDate);
            return (
              <div
                key={tx.id}
                className="tx-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 2fr 1fr auto",
                  gap: "12px",
                  padding: "16px 20px",
                  borderBottom: "1px solid #fdf0f5",
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                {/* Order ID */}
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>#{tx.id}</p>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: tx.paymentMethod === "CASH" ? "#e3f2fd" : "#ede7f6", color: tx.paymentMethod === "CASH" ? "#1565c0" : "#6a1b9a" }}>
                    {tx.paymentMethod}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>{tx.date}</p>
                  {eligible && (
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#2e7d32", background: "#e8f5e9", padding: "1px 6px", borderRadius: "10px" }}>
                      Today
                    </span>
                  )}
                </div>

                {/* Items Summary */}
                <div>
                  {tx.items.slice(0, 2).map((item, i) => (
                    <p key={i} style={{ fontSize: "12px", color: "#555", margin: "0 0 1px" }}>
                      {item.name} <span style={{ color: "#bbb" }}>×{item.qty}</span>
                    </p>
                  ))}
                  {tx.items.length > 2 && (
                    <p style={{ fontSize: "11px", color: "#bbb", margin: 0 }}>+{tx.items.length - 2} more</p>
                  )}
                </div>

                {/* Total */}
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#c2185b", margin: 0 }}>
                  ₱{tx.total.toLocaleString()}.00
                </p>

                {/* Action */}
                <div>
                  {eligible ? (
                    <button
                      onClick={() => setSelected(tx)}
                      style={{
                        background: "linear-gradient(135deg,#ff6b8a,#e91e8c)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 12px rgba(233,30,140,0.3)",
                      }}
                    >
                      Return
                    </button>
                  ) : (
                    <span
                      title="Only today's orders can be returned"
                      style={{
                        display: "inline-block",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#f5f5f5",
                        color: "#bbb",
                        cursor: "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Expired
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Return Form Modal */}
      {selected && (
        <ReturnFormModal
          transaction={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            const id = selected.id;
            setSelected(null);
            setSuccessId(id);
          }}
        />
      )}
    </>
  );
}