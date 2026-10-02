"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnReason = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";

type OrderLine = {
  id: string;
  productName: string;
  quantity: number;
  piecesPerCase: number;
  returnedQty: number;
  price: number;
};

type Order = {
  id: string;
  date: string;
  rawDate: string;
  total: number;
  paymentMethod: string;
  status: string;
  orderLines: OrderLine[];
};

type ReturnItem = {
  orderLineId: string;
  returnQty: number;
};

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong item delivered",
  DAMAGED:         "Damaged / broken item",
  EXPIRED:         "Expired product",
  OTHER:           "Other",
};

const RETURNABLE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeOrder(o: Record<string, unknown>): Order {
  const rawLines = (o.orderLines ?? o.items ?? []) as Record<string, unknown>[];
  const orderLines: OrderLine[] = rawLines.map((l) => {
    const product = (l.product ?? null) as Record<string, unknown> | null;
    return {
      id:            String(l.id ?? ""),
      productName:   String(product?.productName ?? l.name ?? "Item"),
      quantity:      Number(l.quantity ?? 1),
      piecesPerCase: Number(product?.productPiecesPerCase ?? product?.piecesPerCase ?? l.piecesPerCase ?? 1),
      returnedQty:   Number(l.returnedQty ?? 0),
      price:         Number(l.price ?? 0),
    };
  });
  const payment = o.payment as Record<string, unknown> | null;
  const rawDate = String(o.createdAt ?? o.date ?? "");
  return {
    id:            String(o.id ?? ""),
    rawDate,
    date: rawDate
      ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    total:         Number(o.totalAmount ?? orderLines.reduce((s, l) => s + l.price * l.quantity, 0)),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    status:        String(o.status ?? ""),
    orderLines,
  };
}

// Total pieces originally ordered for this line
function totalOrdered(line: OrderLine): number {
  return line.quantity * line.piecesPerCase;
}

// Pieces still eligible to return (ordered - already returned)
function maxReturnable(line: OrderLine): number {
  return totalOrdered(line) - line.returnedQty;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #f5e8ec" }}>
      {[200, 120, 80, 60].map((w, i) => (
        <div key={i} style={{ height: 13, borderRadius: 6, width: w, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
    </div>
  );
}

// ─── Return Form Modal ────────────────────────────────────────────────────────
function ReturnFormModal({
  order,
  onClose,
  onSuccess,
}: {
  order:     Order;
  onClose:   () => void;
  onSuccess: (returnRequestId: string) => void;
}) {
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});
  const [rawValues,     setRawValues]     = useState<Record<string, string>>({});
  const [reason,        setReason]        = useState<ReturnReason | "">("");
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Only lines from this order that still have returnable pieces
  const returnableLines = order.orderLines.filter((l) => maxReturnable(l) > 0);

  // Resolve raw string → valid number (falls back to max when blank)
  const resolvedQty = (lineId: string, max: number): number => {
    const raw = rawValues[lineId];
    if (raw === undefined || raw === "") return max;
    const n = parseInt(raw, 10);
    return isNaN(n) ? max : Math.min(max, Math.max(1, n));
  };

  // Check whether the current raw value is out of range (for live feedback)
  const isOverMax = (lineId: string, max: number): boolean => {
    const raw = rawValues[lineId];
    if (!raw) return false;
    const n = parseInt(raw, 10);
    return !isNaN(n) && n > max;
  };

  const isUnderMin = (lineId: string): boolean => {
    const raw = rawValues[lineId];
    if (!raw) return false;
    const n = parseInt(raw, 10);
    return !isNaN(n) && n < 1;
  };

  const toggleLine = (lineId: string, max: number) => {
    setSelectedLines((prev) => {
      const next = { ...prev, [lineId]: !prev[lineId] };
      if (next[lineId] && rawValues[lineId] === undefined) {
        setRawValues((r) => ({ ...r, [lineId]: String(max) }));
      }
      return next;
    });
  };

  // Allow free typing of digits only — no immediate clamping
  const handleRawChange = (lineId: string, val: string) => {
    if (/^\d*$/.test(val)) {
      setRawValues((prev) => ({ ...prev, [lineId]: val }));
    }
  };

  // Clamp & normalise on blur
  const handleBlur = (lineId: string, max: number) => {
    const raw = rawValues[lineId];
    const n   = parseInt(raw ?? "", 10);
    const clamped = isNaN(n) || n < 1 ? 1 : Math.min(n, max);
    setRawValues((prev) => ({ ...prev, [lineId]: String(clamped) }));
  };

  const stepQty = (lineId: string, delta: number, max: number) => {
    const current = resolvedQty(lineId, max);
    const next    = Math.min(max, Math.max(1, current + delta));
    setRawValues((prev) => ({ ...prev, [lineId]: String(next) }));
  };

  const anySelected  = returnableLines.some((l) => selectedLines[l.id]);
  // Block submit if any selected line has an out-of-range raw value
  const anyInvalid   = returnableLines.some((l) =>
    selectedLines[l.id] && (isOverMax(l.id, maxReturnable(l)) || isUnderMin(l.id))
  );
  const canSubmit    = anySelected && !!reason && !submitting && !anyInvalid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const items: ReturnItem[] = returnableLines
        .filter((l) => selectedLines[l.id])
        .map((l) => ({
          orderLineId: l.id,
          returnQty:   resolvedQty(l.id, maxReturnable(l)),
        }));

      const data = await api.submitReturnRequest({
        saleId: order.id,
        reason: reason as ReturnReason,
        items,
      });

      onSuccess(data.returnRequest?.id ?? order.id);
    } catch (err: any) {
      setError(err?.message || "Failed to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "10px",
    border: "1.5px solid #f0e0e8", fontSize: "13px", outline: "none",
    background: "#fff8fa", color: "#1a1a1a", fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, backdropFilter: "blur(2px)" }} />

      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 50, width: "min(500px, 95vw)", background: "#fff", borderRadius: "20px",
        overflow: "hidden", boxShadow: "0 24px 64px rgba(233,30,140,0.18)",
        maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#c2185b,#e91e8c)", padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", margin: "0 0 2px" }}>Return Request</p>
            <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 800, margin: 0 }}>Order #{order.id}</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Error */}
          {error && (
            <div style={{ background: "#ffeaea", border: "1px solid #ffb3b3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c62828" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Step 1 — Select items */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              1 · Select items to return
            </p>

            {returnableLines.length === 0 && (
              <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "16px 0" }}>
                All items in this order have already been returned.
              </p>
            )}

            {returnableLines.map((line) => {
              const max      = maxReturnable(line);
              const ordered  = totalOrdered(line);
              const checked  = !!selectedLines[line.id];
              const raw      = rawValues[line.id] ?? String(max);
              const overMax  = isOverMax(line.id, max);
              const underMin = isUnderMin(line.id);
              const invalid  = overMax || underMin;

              return (
                <div key={line.id} style={{ marginBottom: 8 }}>
                  {/* Line toggle */}
                  <div
                    onClick={() => toggleLine(line.id, max)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      borderRadius: checked ? "10px 10px 0 0" : 10,
                      border: `1.5px solid ${checked ? "#e91e8c" : "#f0e0e8"}`,
                      background: checked ? "#fff0f6" : "#fff8fa",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {/* Checkbox circle */}
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${checked ? "#e91e8c" : "#ddd"}`,
                      background: checked ? "#e91e8c" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: "#fff", fontSize: 11, fontWeight: 700,
                    }}>
                      {checked ? "✓" : ""}
                    </div>

                    {/* Product info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                        {line.productName}
                      </p>
                      {/* Ordered breakdown */}
                      <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
                        Ordered: {line.quantity} case{line.quantity !== 1 ? "s" : ""} × {line.piecesPerCase} pcs = <strong style={{ color: "#888" }}>{ordered} pcs total</strong>
                      </p>
                      {line.returnedQty > 0 && (
                        <p style={{ fontSize: 11, color: "#e91e8c", margin: "1px 0 0" }}>
                          Already returned: {line.returnedQty} pcs
                        </p>
                      )}
                    </div>

                    {/* Max badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{
                        display: "inline-block", fontSize: 11, fontWeight: 700,
                        color: "#fff", background: "#e91e8c",
                        borderRadius: 20, padding: "2px 10px",
                      }}>
                        Max {max} pcs
                      </span>
                    </div>
                  </div>

                  {/* Qty selector — visible only when checked */}
                  {checked && (
                    <div style={{
                      padding: "12px 14px",
                      border: `1.5px solid ${invalid ? "#e53935" : "#e91e8c"}`,
                      borderTop: "none",
                      borderRadius: "0 0 10px 10px",
                      background: invalid ? "#fff5f5" : "#fff8fb",
                      transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#888", flex: 1 }}>Pieces to return:</span>

                        <button
                          onClick={(e) => { e.stopPropagation(); stepQty(line.id, -1, max); }}
                          disabled={resolvedQty(line.id, max) <= 1}
                          style={{
                            width: 28, height: 28, borderRadius: "50%",
                            border: "1.5px solid #e91e8c", background: "#fff",
                            color: resolvedQty(line.id, max) <= 1 ? "#f0c0cc" : "#e91e8c",
                            fontWeight: 700, fontSize: 16, cursor: resolvedQty(line.id, max) <= 1 ? "not-allowed" : "pointer", lineHeight: 1,
                          }}
                        >−</button>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={raw}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleRawChange(line.id, e.target.value)}
                          onBlur={() => handleBlur(line.id, max)}
                          style={{
                            width: 52, textAlign: "center", padding: "4px 8px",
                            borderRadius: 8,
                            border: `1.5px solid ${invalid ? "#e53935" : "#f0c0cc"}`,
                            fontSize: 13, fontWeight: 700,
                            color: invalid ? "#e53935" : "#c2185b",
                            background: invalid ? "#fff0f0" : "#fff",
                            outline: "none",
                            transition: "all 0.15s",
                          }}
                        />

                        <button
                          onClick={(e) => { e.stopPropagation(); stepQty(line.id, 1, max); }}
                          disabled={resolvedQty(line.id, max) >= max}
                          style={{
                            width: 28, height: 28, borderRadius: "50%",
                            border: "1.5px solid #e91e8c", background: "#fff",
                            color: resolvedQty(line.id, max) >= max ? "#f0c0cc" : "#e91e8c",
                            fontWeight: 700, fontSize: 16, cursor: resolvedQty(line.id, max) >= max ? "not-allowed" : "pointer", lineHeight: 1,
                          }}
                        >+</button>

                        <span style={{ fontSize: 11, color: "#bbb" }}>/ {max} max</span>
                      </div>

                      {/* Live validation message */}
                      {overMax && (
                        <p style={{ fontSize: 11, color: "#e53935", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                          ⚠️ You can only return up to <strong>{max} pcs</strong> (what you ordered minus already returned).
                        </p>
                      )}
                      {underMin && (
                        <p style={{ fontSize: 11, color: "#e53935", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                          ⚠️ Minimum return quantity is 1 piece.
                        </p>
                      )}

                      {/* Return summary pill */}
                      {!invalid && (
                        <div style={{
                          marginTop: 8, padding: "6px 12px", borderRadius: 20,
                          background: "#fff0f6", border: "1px solid #f8c0d8",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}>
                          <span style={{ fontSize: 11, color: "#c2185b" }}>
                            Returning <strong>{resolvedQty(line.id, max)}</strong> of <strong>{ordered}</strong> pcs
                            {line.returnedQty > 0 && ` (${line.returnedQty} already returned)`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 2 — Reason */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              2 · Reason for return
            </p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason | "")}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select a reason...</option>
              {(Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Validation hint before submit */}
          {anyInvalid && (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#856404" }}>
              ⚠️ Please fix the quantity errors above before submitting.
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: 14, borderRadius: 30, border: "none",
              background: canSubmit ? "linear-gradient(135deg,#ff6b8a,#e91e8c)" : "#f0c0cc",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 6px 20px rgba(233,30,140,0.35)" : "none",
              opacity: submitting ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Submitting…" : "Submit Return Request"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnOrderPage() {
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<Order | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const getCustomerId = () =>
    JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "";

  const fetchOrders = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setError("Not logged in."); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomerOrders(customerId);
      if (data?.message) { setError(data.message); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const returnable = raw
        .filter((o) => RETURNABLE_STATUSES.includes(String(o.status ?? "").toUpperCase()))
        .map(normalizeOrder)
        .filter((o) => {
          if (!o.rawDate) return false;
          return now - new Date(o.rawDate).getTime() <= THREE_DAYS_MS;
        });
      setOrders(returnable);
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (successId) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#fff0f3,#ffe4ec)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Return Request Submitted!</h2>
          <p style={{ fontSize: 13, color: "#aaa", marginBottom: 6 }}>Request ID: {successId}</p>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 320, margin: "0 auto 28px" }}>
            Our team will review your request and get back to you shortly.
          </p>
          <button
            onClick={() => { setSuccessId(null); fetchOrders(); }}
            style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: 30, padding: "13px 40px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "clamp(14px,3vw,28px)", background: "#fdf2f6", minHeight: "calc(100vh - 56px)" }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ height: 80, borderRadius: 16, marginBottom: 20, background: "linear-gradient(90deg,#f5e0e8 25%,#efe0e8 50%,#f5e0e8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
            <SkeletonRow />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#fdf2f6" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#c62828" }}>⚠️ {error}</p>
        <button onClick={fetchOrders} style={{ background: "#e91e8c", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#fff0f3,#ffe4ec)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ fontSize: 60 }}>📦</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>No returnable orders</h2>
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>Only completed or partially returned orders are eligible.</p>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    COMPLETED:          { bg: "#e8f5e9", color: "#2e7d32", label: "Completed" },
    PARTIALLY_RETURNED: { bg: "#fff8e1", color: "#f57f17", label: "Partial Return" },
  };

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .tx-row:hover{background:#fff8fa !important}
      `}</style>

      <div style={{ padding: "clamp(14px,3vw,28px)", background: "#fdf2f6", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ background: "linear-gradient(135deg,#c2185b,#e91e8c,#ff6b8a)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "0 0 2px" }}>Return Orders</p>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>My Orders</h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "6px 0 0" }}>
              Select an order below to submit a return request
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>Eligible Orders</p>
            <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: 0 }}>{orders.length}</h2>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid #f5e0e8", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: 12, padding: "12px 20px", background: "#fff0f5", borderBottom: "1px solid #f5e0e8" }}>
            {["Order ID", "Date", "Items", "Total", "Action"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#e91e8c", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{h}</p>
            ))}
          </div>

          {orders.map((order) => {
            const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE["COMPLETED"];
            return (
              <div
                key={order.id}
                className="tx-row"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: 12, padding: "16px 20px", borderBottom: "1px solid #fdf0f5", alignItems: "center", background: "#fff", transition: "background 0.15s" }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>#{order.id.slice(0, 8)}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{order.date}</p>
                <div>
                  {order.orderLines.slice(0, 2).map((line, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#555", margin: "0 0 1px" }}>
                      {line.productName} <span style={{ color: "#bbb" }}>×{line.quantity}</span>
                    </p>
                  ))}
                  {order.orderLines.length > 2 && (
                    <p style={{ fontSize: 11, color: "#bbb", margin: 0 }}>+{order.orderLines.length - 2} more</p>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#c2185b", margin: 0 }}>
                  ₱{order.total.toLocaleString()}.00
                </p>
                <button
                  onClick={() => setSelected(order)}
                  style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(233,30,140,0.3)" }}
                >
                  Return
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <ReturnFormModal
          order={selected}
          onClose={() => setSelected(null)}
          onSuccess={(id) => { setSelected(null); setSuccessId(id); }}
        />
      )}
    </>
  );
}