"use client";
// Cashier: replacements for approved returns.
//
//   APPROVED          → pick a driver → "Send replacement"   (stock is deducted by the backend)
//   OUT_FOR_DELIVERY  → waiting for the customer to confirm  → "Complete"
//
// No payment anywhere: a replacement is free.
//
// Mounted once inside the Active Orders page. It stays mounted (so the tab badge
// keeps its count) and simply renders nothing when `visible` is false.

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/app/providers";

// ── Theme (same palette as the Active Orders page) ───────────────────────────
const GREEN        = "#2e7d3e";
const GREEN_DARK   = "#1f5f2d";
const GREEN_LIGHT  = "#e8f5ea";
const GREEN_TINT   = "#f4faf5";
const GREEN_BORDER = "#d6e8d9";
const INK          = "#14301b";
const MUTED        = "#5f7a66";
const FAINT        = "#8fa596";
const PURPLE       = "#6d28d9";

// ── Types (shape of GET /returns/active) ─────────────────────────────────────
type Driver = { id: string; name: string; phone?: string };

type ReplacementItem = {
  id: string;
  returnQty: number;      // total pieces
  replaceCases: number;
  replacePieces: number;
  orderLine: { product: { productName: string; piecesPerCase: number } };
};

type Replacement = {
  id: string;
  saleId: string;
  reason: "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";
  status: "APPROVED" | "OUT_FOR_DELIVERY";
  reviewedAt?: string | null;
  createdAt: string;
  outForDeliveryAt?: string | null;
  receivedAt?: string | null;
  customer: { id: string; name: string; phone?: string | null; address?: string | null };
  driver?: Driver | null;
  items: ReplacementItem[];
};

const REASON_LABEL: Record<string, string> = {
  WRONG_ITEM_SENT: "Wrong item delivered",
  DAMAGED:         "Damaged / broken item",
  EXPIRED:         "Expired product",
  OTHER:           "Other",
};

// 1 case + 4 pcs
function qtyText(cases: number, pieces: number) {
  const parts: string[] = [];
  if (cases)             parts.push(`${cases} case${cases === 1 ? "" : "s"}`);
  if (pieces || !cases)  parts.push(`${pieces} pc${pieces === 1 ? "" : "s"}`);
  return parts.join(" + ");
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

// ── Component ────────────────────────────────────────────────────────────────
export default function ReplacementsSection({
  visible,
  drivers,
  onCount,
}: {
  visible:  boolean;
  drivers:  Driver[];
  onCount?: (n: number) => void;
}) {
  const socket = useSocket();

  const [rows,            setRows]            = useState<Replacement[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [busyId,          setBusyId]          = useState<string | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({}); // returnId -> driverId

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getActiveReturns();
      const list: Replacement[] = Array.isArray(data) ? data : [];
      // First come, first served: oldest approval on top
      list.sort(
        (a, b) =>
          new Date(a.reviewedAt ?? a.createdAt).getTime() -
          new Date(b.reviewedAt ?? b.createdAt).getTime()
      );
      setRows(list);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to load replacements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tell the page how many replacements are open (tab badge)
  useEffect(() => { onCount?.(rows.length); }, [rows.length, onCount]);

  // Live updates: approvals, dispatches, customer confirmation, completions
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load(true);
    socket.on("return:status",   refresh);
    socket.on("return:received", refresh);
    return () => {
      socket.off("return:status",   refresh);
      socket.off("return:received", refresh);
    };
  }, [socket, load]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load(true);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const send = (r: Replacement) => {
    const driverId = selectedDrivers[r.id];
    if (!driverId) return;
    run(r.id, () => api.dispatchReplacement(r.id, driverId));
  };

  const cancel = (r: Replacement) => {
    if (!window.confirm("Cancel this replacement? The customer will be told the return was cancelled.")) return;
    run(r.id, () => api.cancelReturnRequest(r.id, "Cancelled by the store before dispatch"));
  };

  const complete = (r: Replacement) => {
    if (
      !r.receivedAt &&
      !window.confirm("The customer has not confirmed receiving the replacement yet. Complete it anyway?")
    ) return;
    run(r.id, () => api.completeReturn(r.id));
  };

  if (!visible) return null;

  const solidBtn = (bg: string, disabled: boolean): React.CSSProperties => ({
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: 11, borderRadius: 10, border: "none", background: bg, color: "#fff",
    fontSize: 13, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  });

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: FAINT, margin: "0 0 4px",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div className="rp-section">
      <style>{`
        .rp-grid { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr); }
        .rp-col  { padding: 16px 20px; min-width: 0; }
        .rp-col + .rp-col { border-left: 1px solid ${GREEN_BORDER}; }
        @media (max-width: 900px) {
          .rp-grid { grid-template-columns: minmax(0,1fr); }
          .rp-col + .rp-col { border-left: none; border-top: 1px solid ${GREEN_BORDER}; }
        }
      `}</style>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "13px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>
          <span>⚠️ {error}</span>
          <button onClick={() => load()} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${GREEN_BORDER}`, padding: 28, color: MUTED, fontSize: 13 }}>
          Loading replacements…
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "64px 24px", textAlign: "center", border: `1px dashed ${GREEN_BORDER}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 4px" }}>No replacements to send</p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Approved return requests will show up here, ready to be sent.
          </p>
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r, index) => {
            const busy        = busyId === r.id;
            const isApproved  = r.status === "APPROVED";
            const pickedDriver = selectedDrivers[r.id] ?? "";

            return (
              <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" }}>
                <div className="rp-grid">

                  {/* ── Column 1: who / what return ───────────────────────── */}
                  <div className="rp-col" style={{ background: GREEN_TINT }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ minWidth: 28, height: 28, padding: "0 8px", boxSizing: "border-box", borderRadius: 8, background: index === 0 ? GREEN : "#fff", color: index === 0 ? "#fff" : GREEN_DARK, border: `1px solid ${index === 0 ? GREEN : "#c3e0c8"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                        #{index + 1}
                      </span>
                      <span title={r.id} style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: GREEN_DARK, background: GREEN_LIGHT, border: "1px solid #c3e0c8", padding: "3px 9px", borderRadius: 6 }}>
                        Return {r.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <p style={{ fontSize: 12, color: MUTED, margin: "0 0 10px" }}>
                      Order #{r.saleId.slice(0, 12)} · {REASON_LABEL[r.reason] ?? r.reason}
                      <br />Approved {fmtDate(r.reviewedAt ?? r.createdAt)}
                    </p>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                        background: isApproved ? "#eff6ff" : "#fff7ed",
                        color:      isApproved ? "#1d4ed8" : "#c2410c",
                        border:     `1px solid ${isApproved ? "#bfdbfe" : "#fed7aa"}`,
                      }}>
                        {isApproved ? "Ready to send" : "Out for delivery"}
                      </span>
                      <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: PURPLE, color: "#fff" }}>Replacement</span>
                      {r.receivedAt && (
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: "#f5f3ff", color: PURPLE, border: "1px solid #ddd6fe" }}>
                          Customer received
                        </span>
                      )}
                    </div>

                    <p style={label}>Customer</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: INK, margin: "0 0 10px" }}>
                      {r.customer.name}
                      {r.customer.phone && <span style={{ fontWeight: 400, color: MUTED }}> · {r.customer.phone}</span>}
                    </p>
                    <p style={label}>Address</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: INK, margin: 0, wordBreak: "break-word" }}>
                      {r.customer.address || "—"}
                    </p>

                    {r.driver && (
                      <>
                        <p style={{ ...label, marginTop: 10 }}>Driver</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: INK, margin: 0 }}>
                          {r.driver.name}
                          {r.driver.phone && <span style={{ fontWeight: 400, color: MUTED }}> · {r.driver.phone}</span>}
                        </p>
                      </>
                    )}
                  </div>

                  {/* ── Column 2: exactly what to send ────────────────────── */}
                  <div className="rp-col">
                    <p style={{ fontSize: 11, fontWeight: 700, color: GREEN, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Items to send
                    </p>
                    {r.items.map((it) => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${GREEN_LIGHT}` }}>
                        <span style={{ color: INK, wordBreak: "break-word" }}>{it.orderLine.product.productName}</span>
                        <strong style={{ color: GREEN, whiteSpace: "nowrap" }}>{qtyText(it.replaceCases, it.replacePieces)}</strong>
                      </div>
                    ))}
                    <p style={{ fontSize: 12, color: MUTED, margin: "12px 0 0" }}>
                      Free replacement · no payment to collect.
                    </p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>
                      The driver collects the customer&apos;s {REASON_LABEL[r.reason]?.toLowerCase() ?? "returned"} items on delivery.
                    </p>
                  </div>

                  {/* ── Column 3: actions ─────────────────────────────────── */}
                  <div className="rp-col" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                    {isApproved && (
                      <>
                        <div>
                          <p style={{ ...label, margin: "0 0 6px" }}>Assign driver</p>
                          <select
                            value={pickedDriver}
                            onChange={(e) => setSelectedDrivers((p) => ({ ...p, [r.id]: e.target.value }))}
                            disabled={busy}
                            aria-label="Select a driver"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13, color: INK, background: "#fff", border: `1px solid ${pickedDriver ? GREEN : GREEN_BORDER}`, cursor: "pointer" }}>
                            <option value="">Select a driver…</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
                            ))}
                          </select>
                          {drivers.length === 0 && (
                            <p style={{ fontSize: 12, color: "#b91c1c", margin: "6px 0 0" }}>No active drivers available.</p>
                          )}
                        </div>

                        <button
                          onClick={() => send(r)}
                          disabled={busy || !pickedDriver}
                          title={!pickedDriver ? "Select a driver first" : undefined}
                          style={solidBtn("#d97706", busy || !pickedDriver)}>
                          {busy ? "Sending…" : "🚚 Send replacement"}
                        </button>

                        <button
                          onClick={() => cancel(r)}
                          disabled={busy}
                          style={{ background: "none", border: "none", color: "#b91c1c", fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", padding: 4 }}>
                          Cancel replacement
                        </button>
                      </>
                    )}

                    {!isApproved && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 11, borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 600,
                          background: r.receivedAt ? "#f5f3ff" : "#fff7ed",
                          border:     `1px solid ${r.receivedAt ? "#ddd6fe" : "#fed7aa"}`,
                          color:      r.receivedAt ? PURPLE : "#c2410c" }}>
                          {r.receivedAt
                            ? `✓ Customer confirmed ${fmtDate(r.receivedAt)}`
                            : "Awaiting customer confirmation"}
                        </div>

                        <button
                          onClick={() => complete(r)}
                          disabled={busy}
                          style={solidBtn(GREEN, busy)}>
                          {busy ? "Completing…" : "✓ Complete return"}
                        </button>
                        <p style={{ fontSize: 11.5, color: FAINT, margin: 0, textAlign: "center" }}>
                          Completing records the customer&apos;s bad items as collected
                          {r.reason === "WRONG_ITEM_SENT" ? " and puts them back in stock." : " (not restocked)."}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}