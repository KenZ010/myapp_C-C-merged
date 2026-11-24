"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/app/providers";

// ─── API (return endpoints) ───────────────────────────────────────────────────
// Same base URL the cashier return page uses. Swap for your api helper if you prefer.
const API_URL = "https://backend-production-dcaab.up.railway.app/api";

const getToken = () => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) return t;
  }
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("token="));
  return cookie ? cookie.trim().slice("token=".length) : "";
};

async function returnsRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnReason = "WRONG_ITEM_SENT" | "DAMAGED" | "EXPIRED" | "OTHER";

type OrderLine = {
  id: string;
  productName: string;
  quantity: number;       // cases ordered
  piecesPerCase: number;
  returnedQty: number;    // pieces already returned / locked by an approved return
  price: number;
};

type Order = {
  id: string;
  date: string;
  rawDate: string;        // when the order was completed (start of the 24h return window)
  total: number;
  paymentMethod: string;
  status: string;
  orderType: string;
  orderLines: OrderLine[];
};

type MyReturnItem = {
  id: string;
  returnQty: number;
  receivedQty?: number | null;
  orderLine: { product: { productName: string; piecesPerCase: number } };
};

type MyReturn = {
  id: string;
  saleId: string;
  reason: ReturnReason;
  status: string;
  reviewNote?: string | null;
  closeNote?: string | null;
  createdAt: string;
  receivedAt?: string | null; // customer confirmed the replacement arrived
  driver?: { id: string; name: string; phone?: string } | null;
  items: MyReturnItem[];
};

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_ITEM_SENT: "Wrong item delivered",
  DAMAGED:         "Damaged / broken item",
  EXPIRED:         "Expired product",
  OTHER:           "Other",
};

const RETURNABLE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED"];
const RETURN_WINDOW_MS    = 24 * 60 * 60 * 1000; // returns allowed for 1 day after completion
const MAX_PROOF_IMAGES    = 5;

const RETURN_STATUS_META: Record<string, { label: string; bg: string; color: string; hint: string }> = {
  PENDING:          { label: "Waiting for review",  bg: "#fff8e1", color: "#b45309", hint: "The store is reviewing your request." },
  APPROVED:         { label: "Approved",            bg: "#e8f5e9", color: "#2e7d32", hint: "Your replacement is being prepared." },
  OUT_FOR_DELIVERY: { label: "Out for delivery",    bg: "#e3f2fd", color: "#1565c0", hint: "Your replacement is on its way." },
  COMPLETED:        { label: "Completed",           bg: "#f1f5f2", color: "#2e7d32", hint: "Replacement delivered." },
  REJECTED:         { label: "Rejected",            bg: "#ffebee", color: "#c62828", hint: "" },
  CANCELLED:        { label: "Cancelled",           bg: "#f3f4f6", color: "#6b7280", hint: "" },
};
const ACTIVE_RETURN_STATUSES = ["APPROVED", "OUT_FOR_DELIVERY"];
// An order with a request in any of these statuses can't be returned again (matches backend OPEN_REQUEST_STATUSES)
const OPEN_RETURN_STATUSES   = ["PENDING", "APPROVED", "OUT_FOR_DELIVERY"];

function compressImage(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeOrder(o: Record<string, unknown>): Order {
  const rawLines = (o.orderLines ?? o.items ?? []) as Record<string, unknown>[];
  const orderLines: OrderLine[] = rawLines.map((l) => {
    const product = (l.product ?? null) as Record<string, unknown> | null;
    return {
      id:            String(l.id ?? ""),
      productName:   String(product?.productName ?? l.name ?? "Item"),
      quantity:      Number(l.quantity ?? 1),
      piecesPerCase: Math.max(1, Number(product?.productPiecesPerCase ?? product?.piecesPerCase ?? l.piecesPerCase ?? 1)),
      returnedQty:   Number(l.returnedQty ?? 0),
      price:         Number(l.price ?? 0),
    };
  });
  const payment = o.payment as Record<string, unknown> | null;
  // The 24h window starts when the order was completed
  const rawDate = String(o.completedAt ?? o.createdAt ?? o.date ?? "");
  return {
    id:            String(o.id ?? ""),
    rawDate,
    date: rawDate
      ? new Date(rawDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    total:         Number(o.totalAmount ?? orderLines.reduce((s, l) => s + l.price * l.quantity, 0)),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    status:        String(o.status ?? ""),
    orderType:     String(o.orderType ?? "ONLINE"),
    orderLines,
  };
}

// Whole hours left in the 24h return window (0 = less than an hour)
function hoursLeft(order: Order): number {
  const end = new Date(order.rawDate).getTime() + RETURN_WINDOW_MS;
  return Math.max(0, Math.floor((end - Date.now()) / 3_600_000));
}

// Total pieces originally ordered for this line
function totalOrdered(line: OrderLine): number {
  return line.quantity * line.piecesPerCase;
}

// Pieces still eligible to return (ordered - already returned)
function maxReturnable(line: OrderLine): number {
  return Math.max(0, totalOrdered(line) - line.returnedQty);
}

// Split a piece count into cases + loose pieces
function splitPieces(total: number, ppc: number): { cases: number; pcs: number } {
  if (ppc <= 1) return { cases: 0, pcs: total };
  return { cases: Math.floor(total / ppc), pcs: total % ppc };
}

// Human-readable "2 cases + 5 pcs"
function formatQty(total: number, ppc: number): string {
  if (ppc <= 1) return `${total} pc${total !== 1 ? "s" : ""}`;
  const { cases, pcs } = splitPieces(total, ppc);
  const parts: string[] = [];
  if (cases > 0) parts.push(`${cases} case${cases !== 1 ? "s" : ""}`);
  if (pcs > 0) parts.push(`${pcs} pc${pcs !== 1 ? "s" : ""}`);
  return parts.length ? parts.join(" + ") : "0 pcs";
}

function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
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

// ─── Qty Field (label + − input +) ────────────────────────────────────────────
function QtyField({
  label,
  value,
  invalid,
  disableMinus,
  disablePlus,
  onChange,
  onBlur,
  onStep,
}: {
  label:        string;
  value:        string;
  invalid:      boolean;
  disableMinus: boolean;
  disablePlus:  boolean;
  onChange:     (v: string) => void;
  onBlur:       () => void;
  onStep:       (delta: number) => void;
}) {
  const stepBtn = (disabled: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: "50%",
    border: "1.5px solid #e91e8c", background: "#fff",
    color: disabled ? "#f0c0cc" : "#e91e8c",
    fontWeight: 700, fontSize: 16, lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#888", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStep(-1); }}
          disabled={disableMinus}
          style={stepBtn(disableMinus)}
        >−</button>

        <input
          type="text"
          inputMode="numeric"
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{
            width: 52, textAlign: "center", padding: "4px 6px",
            borderRadius: 8,
            border: `1.5px solid ${invalid ? "#e53935" : "#f0c0cc"}`,
            fontSize: 13, fontWeight: 700,
            color: invalid ? "#e53935" : "#c2185b",
            background: invalid ? "#fff0f0" : "#fff",
            outline: "none", transition: "all 0.15s",
          }}
        />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStep(1); }}
          disabled={disablePlus}
          style={stepBtn(disablePlus)}
        >+</button>
      </div>
    </div>
  );
}

// ─── Return Policy Notice Modal ───────────────────────────────────────────────
function ReturnPolicyModal({
  order,
  onClose,
  onContinue,
}: {
  order:      Order;
  onClose:    () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, backdropFilter: "blur(2px)" }} />

      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 50, width: "min(440px, 92vw)", background: "#fff", borderRadius: "20px",
        overflow: "hidden", boxShadow: "0 24px 64px rgba(233,30,140,0.18)",
        maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#c2185b,#e91e8c)", padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", margin: "0 0 2px" }}>Before you return</p>
            <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 800, margin: 0 }}>1-Day Return Policy</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "#fff0f6", margin: "0 auto", fontSize: 30 }}>
            ⏱️
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>
              Returns are accepted within 1 day
            </p>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7, margin: 0 }}>
              You can only return items within <strong style={{ color: "#c2185b" }}>1 day (24 hours)</strong> after
              your order is completed. Once the window closes, the order can no longer be returned.
            </p>
          </div>

          <div style={{ background: "#f4faf5", border: "1px solid #d6e8d9", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#2e5d3a", lineHeight: 1.6 }}>
            📦 Order #{order.id.slice(0, 8)} · Completed {order.date}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: 13, borderRadius: 30, border: "1.5px solid #f0c0cc", background: "#fff", color: "#c2185b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              style={{ flex: 1.4, padding: 13, borderRadius: 30, border: "none", background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(233,30,140,0.35)" }}
            >
              I Understand, Continue
            </button>
          </div>
        </div>
      </div>
    </>
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
  const [rawCases,      setRawCases]      = useState<Record<string, string>>({});
  const [rawPcs,        setRawPcs]        = useState<Record<string, string>>({});
  const [reason,        setReason]        = useState<ReturnReason | "">("");
  const [proofImages,   setProofImages]   = useState<string[]>([]);
  const [proofError,    setProofError]    = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Only lines from this order that still have returnable pieces
  const returnableLines = order.orderLines.filter((l) => maxReturnable(l) > 0);

  // Current values shown in the inputs (defaults to the max split until edited)
  const getValues = (line: OrderLine) => {
    const max = maxReturnable(line);
    const def = splitPieces(max, line.piecesPerCase);
    return {
      cases: rawCases[line.id] ?? String(def.cases),
      pcs:   rawPcs[line.id]   ?? String(def.pcs),
    };
  };

  // Total pieces the customer entered for this line
  const totalPieces = (line: OrderLine): number => {
    const v = getValues(line);
    return parseNum(v.cases) * line.piecesPerCase + parseNum(v.pcs);
  };

  const isOverMax  = (line: OrderLine) => totalPieces(line) > maxReturnable(line);
  const isUnderMin = (line: OrderLine) => totalPieces(line) < 1;
  const isInvalid  = (line: OrderLine) => isOverMax(line) || isUnderMin(line);

  const setSplit = (line: OrderLine, total: number) => {
    const { cases, pcs } = splitPieces(total, line.piecesPerCase);
    setRawCases((prev) => ({ ...prev, [line.id]: String(cases) }));
    setRawPcs((prev)   => ({ ...prev, [line.id]: String(pcs) }));
  };

  const toggleLine = (line: OrderLine) => {
    setSelectedLines((prev) => {
      const next = { ...prev, [line.id]: !prev[line.id] };
      if (next[line.id] && rawCases[line.id] === undefined && rawPcs[line.id] === undefined) {
        setSplit(line, maxReturnable(line));
      }
      return next;
    });
  };

  // Digits only, no clamping while typing
  const handleCasesChange = (lineId: string, val: string) => {
    if (/^\d*$/.test(val)) setRawCases((prev) => ({ ...prev, [lineId]: val }));
  };
  const handlePcsChange = (lineId: string, val: string) => {
    if (/^\d*$/.test(val)) setRawPcs((prev) => ({ ...prev, [lineId]: val }));
  };

  // On blur: clamp the total into [1, max] and re-split (e.g. 0 cases + 30 pcs → 1 case + 6 pcs)
  const handleBlur = (line: OrderLine) => {
    const max   = maxReturnable(line);
    const total = Math.min(max, Math.max(1, totalPieces(line)));
    setSplit(line, total);
  };

  const stepCases = (line: OrderLine, delta: number) => {
    const v = getValues(line);
    const next = Math.max(0, parseNum(v.cases) + delta);
    const total = next * line.piecesPerCase + parseNum(v.pcs);
    if (total > maxReturnable(line) || total < 1) return;
    setRawCases((prev) => ({ ...prev, [line.id]: String(next) }));
    setRawPcs((prev)   => ({ ...prev, [line.id]: v.pcs }));
  };

  const stepPcs = (line: OrderLine, delta: number) => {
    const v = getValues(line);
    const next = Math.max(0, parseNum(v.pcs) + delta);
    const total = parseNum(v.cases) * line.piecesPerCase + next;
    if (total > maxReturnable(line) || total < 1) return;
    setRawPcs((prev)   => ({ ...prev, [line.id]: String(next) }));
    setRawCases((prev) => ({ ...prev, [line.id]: v.cases }));
  };

  const anySelected = returnableLines.some((l) => selectedLines[l.id]);
  const anyInvalid  = returnableLines.some((l) => selectedLines[l.id] && isInvalid(l));
  const hasProof    = proofImages.length >= 1;
  const canSubmit   = anySelected && !!reason && hasProof && !submitting && !anyInvalid;

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const slots = MAX_PROOF_IMAGES - proofImages.length;
    if (slots <= 0) {
      setProofError(`You can attach up to ${MAX_PROOF_IMAGES} photos.`);
      return;
    }

    setProofError(null);
    const added: string[] = [];
    try {
      for (const file of files.slice(0, slots)) {
        if (!file.type.startsWith("image/")) {
          setProofError("Please attach image files only (JPG or PNG).");
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          setProofError("One image was too large (max 8 MB) and was skipped.");
          continue;
        }
        added.push(await compressImage(file));
      }
      if (added.length > 0) setProofImages((prev) => [...prev, ...added].slice(0, MAX_PROOF_IMAGES));
    } catch {
      setProofError("We couldn't read one of the images. Please try another one.");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      // Upload every photo first (same upload used for GCash receipts → Cloudinary URL)
      const proofUrls: string[] = [];
      for (let i = 0; i < proofImages.length; i++) {
        const upload = await api.uploadReceipt(await dataUrlToFile(proofImages[i], `return-proof-${i + 1}.jpg`));
        const url = upload?.receiptImage;
        if (!url) throw new Error("Photo upload failed. Please try again.");
        proofUrls.push(url);
      }

      // cases and pieces are sent separately; the backend converts them to total pieces
      const items = returnableLines
        .filter((l) => selectedLines[l.id])
        .map((l) => {
          const v = getValues(l);
          return {
            orderLineId: l.id,
            cases:       l.piecesPerCase > 1 ? parseNum(v.cases) : 0,
            pieces:      parseNum(v.pcs),
          };
        });

      const data = await returnsRequest("/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId:      order.id,
          reason,
          proofImages: proofUrls,
          items,
        }),
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

          <div style={{ background: "#f4faf5", border: "1px solid #d6e8d9", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#2e5d3a", lineHeight: 1.6 }}>
            📦 We replace returned items for free. Once approved, your replacement will show up under
            <strong> My Return Requests</strong> with the exact cases and pieces we are sending.
          </div>

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
              const ppc      = line.piecesPerCase;
              const max      = maxReturnable(line);
              const ordered  = totalOrdered(line);
              const checked  = !!selectedLines[line.id];
              const values   = getValues(line);
              const total    = totalPieces(line);
              const overMax  = isOverMax(line);
              const underMin = isUnderMin(line);
              const invalid  = overMax || underMin;
              const hasCases = ppc > 1;
              const maxSplit = splitPieces(max, ppc);

              return (
                <div key={line.id} style={{ marginBottom: 8 }}>
                  {/* Line toggle */}
                  <div
                    onClick={() => toggleLine(line)}
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
                      <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
                        Ordered: {line.quantity} case{line.quantity !== 1 ? "s" : ""} × {ppc} pcs = <strong style={{ color: "#888" }}>{ordered} pcs total</strong>
                      </p>
                      {line.returnedQty > 0 && (
                        <p style={{ fontSize: 11, color: "#e91e8c", margin: "1px 0 0" }}>
                          Already returned: {formatQty(line.returnedQty, ppc)} ({line.returnedQty} pcs)
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
                      <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>
                        How much will you return?
                      </p>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                        {hasCases && (
                          <QtyField
                            label="Cases"
                            value={values.cases}
                            invalid={invalid}
                            disableMinus={parseNum(values.cases) <= 0 || total - ppc < 1}
                            disablePlus={total + ppc > max}
                            onChange={(v) => handleCasesChange(line.id, v)}
                            onBlur={() => handleBlur(line)}
                            onStep={(d) => stepCases(line, d)}
                          />
                        )}
                        <QtyField
                          label="Pieces"
                          value={values.pcs}
                          invalid={invalid}
                          disableMinus={parseNum(values.pcs) <= 0 || total - 1 < 1}
                          disablePlus={total + 1 > max}
                          onChange={(v) => handlePcsChange(line.id, v)}
                          onBlur={() => handleBlur(line)}
                          onStep={(d) => stepPcs(line, d)}
                        />
                      </div>

                      <p style={{ fontSize: 11, color: "#bbb", margin: "8px 0 0" }}>
                        Max you can return: {formatQty(max, ppc)}
                        {hasCases && maxSplit.cases > 0 && maxSplit.pcs > 0 ? ` (${max} pcs)` : ""}
                      </p>

                      {/* Live validation message */}
                      {overMax && (
                        <p style={{ fontSize: 11, color: "#e53935", margin: "8px 0 0" }}>
                          ⚠️ You can only return up to <strong>{formatQty(max, ppc)}</strong> (what you ordered minus already returned).
                        </p>
                      )}
                      {underMin && (
                        <p style={{ fontSize: 11, color: "#e53935", margin: "8px 0 0" }}>
                          ⚠️ Please enter at least 1 piece{hasCases ? " or 1 case" : ""} to return.
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
                            Returning <strong>{formatQty(total, ppc)}</strong>
                            {hasCases && total >= ppc ? <> = <strong>{total}</strong> pcs</> : null}
                            {" "}of <strong>{ordered}</strong> pcs
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

          {/* Step 3 — Proof photos (required) */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              3 · Photo proof <span style={{ color: "#e53935", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>(required, up to {MAX_PROOF_IMAGES})</span>
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
              {proofImages.map((src, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1.5px solid #e91e8c", background: "#fff8fa", aspectRatio: "1 / 1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Proof ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <button
                    type="button"
                    onClick={() => setProofImages((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove photo ${i + 1}`}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {proofImages.length < MAX_PROOF_IMAGES && (
                <div
                  onClick={() => proofInputRef.current?.click()}
                  style={{ cursor: "pointer", borderRadius: 12, border: "2px dashed #f0a6c4", background: "#fff8fa", textAlign: "center", aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                >
                  <div style={{ fontSize: 24 }}>📷</div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#c2185b", margin: 0 }}>Add photo</p>
                </div>
              )}
            </div>

            <p style={{ fontSize: 11, color: "#bbb", margin: "6px 0 0" }}>
              Show the item and the problem clearly · JPG or PNG · up to 8 MB each
            </p>

            <input
              ref={proofInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleProofUpload}
              style={{ display: "none" }}
            />

            {proofError && (
              <p style={{ fontSize: 11, color: "#e53935", margin: "6px 0 0" }}>⚠️ {proofError}</p>
            )}
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
            {submitting ? "Uploading & submitting…" : "Submit Return Request"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── One of the customer's return requests ───────────────────────────────────
function MyReturnCard({ r, onChanged }: { r: MyReturn; onChanged: () => void }) {
  const meta   = RETURN_STATUS_META[r.status] ?? { label: r.status, bg: "#f3f4f6", color: "#6b7280", hint: "" };
  const active = ACTIVE_RETURN_STATUSES.includes(r.status);

  const [confirming,  setConfirming]  = useState(false);
  const [confirmErr,  setConfirmErr]  = useState<string | null>(null);

  const confirmReceived = async () => {
    setConfirming(true);
    setConfirmErr(null);
    try {
      await api.confirmReplacementReceived(r.id);
      onChanged();
    } catch (err) {
      setConfirmErr((err as Error).message || "Could not confirm. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "16px 18px", marginBottom: 12,
      border: active ? "1.5px solid #e91e8c" : "1px solid #f5e0e8",
      boxShadow: active ? "0 6px 18px rgba(233,30,140,0.12)" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            Return #{r.id.slice(0, 8).toUpperCase()}
            <span style={{ fontWeight: 500, color: "#aaa" }}> · Order #{r.saleId.slice(0, 8)}</span>
          </p>
          <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
            {RETURN_REASON_LABELS[r.reason] ?? r.reason} · {new Date(r.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: meta.bg, color: meta.color, whiteSpace: "nowrap" }}>
          {meta.label}
        </span>
      </div>

      {active && (
        <div style={{ marginTop: 10, background: "#fff0f6", border: "1px solid #f8c0d8", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#c2185b", margin: "0 0 6px" }}>
            🔁 Replacement you will receive
          </p>
          {r.items.map((it) => {
            const ppc = it.orderLine?.product?.piecesPerCase ?? 1;
            return (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "2px 0" }}>
                <span style={{ color: "#444" }}>{it.orderLine?.product?.productName ?? "Item"}</span>
                <strong style={{ color: "#c2185b", whiteSpace: "nowrap" }}>{formatQty(it.returnQty, ppc)}</strong>
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: "#888", margin: "8px 0 0" }}>
            {r.status === "OUT_FOR_DELIVERY" && r.driver
              ? `🚚 On its way with ${r.driver.name}${r.driver.phone ? ` · ${r.driver.phone}` : ""}. Please hand over the items you are returning when it arrives.`
              : meta.hint}
          </p>

          {/* Customer confirms the replacement arrived (no payment for replacements) */}
          {r.status === "OUT_FOR_DELIVERY" && (
            r.receivedAt ? (
              <p style={{ fontSize: 12, fontWeight: 700, color: "#2e7d32", margin: "10px 0 0" }}>
                ✅ You confirmed receiving this replacement. The store will finish the return once the items you are returning are collected.
              </p>
            ) : (
              <>
                <button
                  onClick={confirmReceived}
                  disabled={confirming}
                  style={{
                    marginTop: 10, width: "100%", padding: "11px 14px", borderRadius: 24, border: "none",
                    background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: confirming ? "not-allowed" : "pointer",
                    opacity: confirming ? 0.7 : 1, boxShadow: "0 4px 12px rgba(233,30,140,0.3)",
                  }}
                >
                  {confirming ? "Confirming…" : "📦 I received my replacement"}
                </button>
                <p style={{ fontSize: 11, color: "#aaa", margin: "6px 0 0", textAlign: "center" }}>
                  Only tap this once the replacement is in your hands.
                </p>
              </>
            )
          )}
          {confirmErr && (
            <p style={{ fontSize: 12, color: "#c62828", margin: "8px 0 0" }}>⚠️ {confirmErr}</p>
          )}
        </div>
      )}

      {!active && (
        <div style={{ marginTop: 8 }}>
          {r.items.map((it) => {
            const ppc = it.orderLine?.product?.piecesPerCase ?? 1;
            return (
              <p key={it.id} style={{ fontSize: 12, color: "#777", margin: "1px 0" }}>
                {it.orderLine?.product?.productName ?? "Item"} · <strong>{formatQty(it.returnQty, ppc)}</strong>
              </p>
            );
          })}
          {r.status === "REJECTED" && r.reviewNote && (
            <p style={{ fontSize: 12, color: "#c62828", margin: "8px 0 0" }}>Reason from the store: {r.reviewNote}</p>
          )}
          {r.status === "CANCELLED" && r.closeNote && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>Note from the store: {r.closeNote}</p>
          )}
          {r.status === "PENDING" && (
            <p style={{ fontSize: 12, color: "#b45309", margin: "8px 0 0" }}>{meta.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnOrderPage() {
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<Order | null>(null);
  const [policyOrder, setPolicyOrder] = useState<Order | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [myReturns, setMyReturns] = useState<MyReturn[]>([]);

  // saleId -> its open (pending / approved / out for delivery) return request
  const openReturnBySale = useMemo(() => {
    const m = new Map<string, MyReturn>();
    myReturns.forEach((r) => {
      if (OPEN_RETURN_STATUSES.includes(r.status)) m.set(r.saleId, r);
    });
    return m;
  }, [myReturns]);

  const eligibleCount = orders.filter((o) => !openReturnBySale.has(o.id)).length;

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
      const now = Date.now();

      const returnable = raw
        .filter((o) => RETURNABLE_STATUSES.includes(String(o.status ?? "").toUpperCase()))
        .filter((o) => String(o.orderType ?? "ONLINE") === "ONLINE")
        .map(normalizeOrder)
        .filter((o) => {
          if (!o.rawDate) return false;
          // 1-day return window, counted from completion
          return now - new Date(o.rawDate).getTime() <= RETURN_WINDOW_MS;
        });
      setOrders(returnable);
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  // The customer's own return requests (the backend only ever returns their own)
  const fetchMyReturns = useCallback(async () => {
    try {
      const data = await returnsRequest("/returns?limit=50");
      setMyReturns(Array.isArray(data?.requests) ? data.requests : []);
    } catch {
      /* keep the previous list if a refresh fails */
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchMyReturns();
    // keep statuses fresh while the page is open
    const timer = setInterval(fetchMyReturns, 30_000);
    return () => clearInterval(timer);
  }, [fetchOrders, fetchMyReturns]);

  // Live updates: the store approved / sent / completed my return
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchMyReturns();
    socket.on("return:status", refresh);
    return () => { socket.off("return:status", refresh); };
  }, [socket, fetchMyReturns]);

  if (successId) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg,#fff0f3,#ffe4ec)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Return Request Submitted!</h2>
          <p style={{ fontSize: 13, color: "#aaa", marginBottom: 6 }}>Request ID: {successId}</p>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 340, margin: "0 auto 28px" }}>
            Our team will review your request. Once approved, your replacement will appear under
            &quot;My Return Requests&quot; with the exact cases and pieces we will send.
          </p>
          <button
            onClick={() => { setSuccessId(null); fetchOrders(); fetchMyReturns(); }}
            style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: 30, padding: "13px 40px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    COMPLETED:          { bg: "#e8f5e9", color: "#2e7d32", label: "Completed" },
    PARTIALLY_RETURNED: { bg: "#fff8e1", color: "#f57f17", label: "Partial Return" },
  };

  const activeCount = myReturns.filter((r) => ACTIVE_RETURN_STATUSES.includes(r.status)).length;

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .tx-row:hover{background:#fff8fa !important}
      `}</style>

      <div style={{ padding: "clamp(14px,3vw,28px)", background: "#fdf2f6", minHeight: "calc(100vh - 56px)" }}>
        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg,#c2185b,#e91e8c,#ff6b8a)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "0 0 2px" }}>Return Orders</p>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>Returns &amp; Replacements</h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "6px 0 0" }}>
              Returns are accepted within 1 day after your order is completed
            </p>
          </div>
          <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>Eligible Orders</p>
              <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: 0 }}>{eligibleCount}</h2>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>Active Replacements</p>
              <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: 0 }}>{activeCount}</h2>
            </div>
          </div>
        </div>

        {/* ── Section 1: orders you can still return ── */}
        <p style={{ fontSize: 13, fontWeight: 800, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>
          Orders you can return
        </p>

        {error && (
          <div style={{ background: "#ffeaea", border: "1px solid #ffb3b3", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, color: "#c62828", fontSize: 13, fontWeight: 600 }}>
            ⚠️ {error}
            <button onClick={fetchOrders} style={{ marginLeft: "auto", background: "#e91e8c", color: "#fff", border: "none", borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 28 }}>
            <SkeletonRow /><SkeletonRow />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid #f5e0e8", padding: "32px 20px", textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>📦</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>No orders to return right now</p>
            <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>
              Only online orders completed within the last 24 hours can be returned.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid #f5e0e8", overflow: "hidden", marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: 12, padding: "12px 20px", background: "#fff0f5", borderBottom: "1px solid #f5e0e8" }}>
              {["Order ID", "Completed", "Items", "Total", "Action"].map((h) => (
                <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#e91e8c", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{h}</p>
              ))}
            </div>

            {orders.map((order) => {
              const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE["COMPLETED"];
              const left  = hoursLeft(order);
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
                  <div>
                    <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{order.date}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: left < 3 ? "#e53935" : "#b45309", margin: "2px 0 0" }}>
                      ⏳ {left < 1 ? "Less than 1h" : `${left}h`} left to return
                    </p>
                  </div>
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
<<<<<<< HEAD
                  <button
                    onClick={() => setPolicyOrder(order)}
                    style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(233,30,140,0.3)" }}
                  >
                    Return
                  </button>
=======
                  {(() => {
                    const open = openReturnBySale.get(order.id);
                    if (open) {
                      const m = RETURN_STATUS_META[open.status];
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 20, background: m.bg, color: m.color, whiteSpace: "nowrap" }}>
                          Return {m.label.toLowerCase()}
                        </span>
                      );
                    }
                    return (
                      <button
                        onClick={() => setSelected(order)}
                        style={{ background: "linear-gradient(135deg,#ff6b8a,#e91e8c)", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(233,30,140,0.3)" }}
                      >
                        Return
                      </button>
                    );
                  })()}
>>>>>>> fe58d9770002ac21e780ad801bc51b4b15f83d87
                </div>
              );
            })}
          </div>
        )}

        {/* ── Section 2: my return requests ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#c2185b", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
            My Return Requests
          </p>
          <button
            onClick={fetchMyReturns}
            style={{ background: "#fff", color: "#c2185b", border: "1px solid #f0c0cc", borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            ↻ Refresh
          </button>
        </div>

        {myReturns.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid #f5e0e8", padding: "26px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>You have no return requests yet.</p>
          </div>
        ) : (
          <>
            {/* active replacements first */}
            {[...myReturns]
              .sort((a, b) => Number(ACTIVE_RETURN_STATUSES.includes(b.status)) - Number(ACTIVE_RETURN_STATUSES.includes(a.status)))
              .map((r) => <MyReturnCard key={r.id} r={r} onChanged={fetchMyReturns} />)}
          </>
        )}
      </div>

      {policyOrder && !selected && (
        <ReturnPolicyModal
          order={policyOrder}
          onClose={() => setPolicyOrder(null)}
          onContinue={() => { setSelected(policyOrder); setPolicyOrder(null); }}
        />
      )}

      {selected && (
        <ReturnFormModal
          order={selected}
          onClose={() => setSelected(null)}
          onSuccess={(id) => { setSelected(null); setSuccessId(id); fetchMyReturns(); }}
        />
      )}
    </>
  );
}