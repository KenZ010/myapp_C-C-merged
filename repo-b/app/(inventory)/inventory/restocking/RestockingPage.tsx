"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── CASE UNIT SYSTEM ─────────────────────────────────────────────────────────
type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: {
  value: CaseUnit;
  label: string;
  short: string;
  bottlesPerCase: number | null;
  detail: string;
}[] = [
  { value: "case_24", label: "Case (24 pcs)", short: "24-cs", bottlesPerCase: 24, detail: "1 case = 24 bottles" },
  { value: "case_12", label: "Case (12 pcs)", short: "12-cs", bottlesPerCase: 12, detail: "1 case = 12 bottles" },
  { value: "case_6",  label: "Case (6 pcs)",  short: "6-cs",  bottlesPerCase: 6,  detail: "1 case = 6 bottles"  },
  { value: "btl",     label: "Bottles",        short: "btl",   bottlesPerCase: null, detail: "Individual bottle" },
  { value: "pcs",     label: "Pieces",         short: "pcs",   bottlesPerCase: null, detail: "Single piece"      },
];

const getUnit      = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];
const getUnitShort = (u?: string) => getUnit(u).short;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type POStatus = "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
type POStep = "receiving" | "history";

type Supplier = { id: string; supplierName: string; contact?: string; address?: string };

type DeliveryItem = {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  returnedQty: number;
  costPrice: number;
  unit?: string;
  product?: { id: string; productName: string; price: number; stockUnit?: string; size?: string | null };
};

type Delivery = {
  id: string;
  supplierId: string;
  deliveryDate: string;
  status: POStatus;
  totalItems: number;
  notes?: string;
  createdAt: string;
  receiptNumber?: string;
  supplier?: { id: string; supplierName: string };
  items: DeliveryItem[];
};

type ReceiveQty = { deliveryItemId: string; receivedQty: number };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusStyle: Record<POStatus, React.CSSProperties> = {
  PENDING:            { background: "#fff9c4", color: "#f57f17" },
  PARTIALLY_RECEIVED: { background: "#e3f2fd", color: "#1565c0" },
  DELIVERED:          { background: "#e8f5e9", color: "#2e7d32" },
  CANCELLED:          { background: "#ffebee", color: "#c62828" },
};

const STATUS_LABEL: Record<POStatus, string> = {
  PENDING:            "Pending",
  PARTIALLY_RECEIVED: "Partial",
  DELIVERED:          "Delivered",
  CANCELLED:          "Cancelled",
};

const ITEMS_PER_PAGE = 8;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [step, setStep] = useState<POStep>("receiving");

  // API state
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading,    setLoading]    = useState(true);

  // ── Receipt Number Modal ──
  const [receiptModal, setReceiptModal] = useState<{
    show: boolean;
    delivery: Delivery | null;
    receiptNumber: string;
    error: string;
  }>({ show: false, delivery: null, receiptNumber: "", error: "" });

  // Receiving state
  const [receivingDelivery, setReceivingDelivery] = useState<Delivery | null>(null);
  const [receiveQtys,       setReceiveQtys]       = useState<ReceiveQty[]>([]);
  const [receiving,         setReceiving]         = useState(false);
  const [receiveError,      setReceiveError]      = useState("");
  const [receivingSearch,   setReceivingSearch]   = useState("");
  const [receivePage,       setReceivePage]       = useState(1);

  // History state
  const [searchHistory,  setSearchHistory]  = useState("");
  const [historyStatus,  setHistoryStatus]  = useState<string>("All");
  const [historyPage,    setHistoryPage]    = useState(1);
  const [viewDelivery,   setViewDelivery]   = useState<Delivery | null>(null);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const statusDropRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState("");

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm: () => void }>({
    show: false, message: "", onConfirm: () => {},
  });

  // ── Derived ──
  const pendingDeliveries = deliveries.filter(
    (d) => d.status === "PENDING" || d.status === "PARTIALLY_RECEIVED"
  );

  const filteredReceiving = pendingDeliveries.filter(
    (d) =>
      d.id.toLowerCase().includes(receivingSearch.toLowerCase()) ||
      (d.supplier?.supplierName || "").toLowerCase().includes(receivingSearch.toLowerCase())
  );
  const receiveTotalPages  = Math.ceil(filteredReceiving.length / ITEMS_PER_PAGE);
  const paginatedReceiving = filteredReceiving.slice(
    (receivePage - 1) * ITEMS_PER_PAGE, receivePage * ITEMS_PER_PAGE
  );

  const filteredHistory = deliveries.filter(
    (d) =>
      (d.id.toLowerCase().includes(searchHistory.toLowerCase()) ||
        (d.supplier?.supplierName || "").toLowerCase().includes(searchHistory.toLowerCase())) &&
      (historyStatus === "All" || d.status === historyStatus)
  );
  const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory  = filteredHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE
  );

  // ── Effects ──
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node))
        setShowStatusDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  // ── API calls ──
  const fetchAll = async () => {
    try {
      setLoading(true);
      const d = await api.getDeliveries();
      setDeliveries(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Receipt modal ──
  const openReceiptModal = (delivery: Delivery) => {
    setReceiptModal({ show: true, delivery, receiptNumber: "", error: "" });
  };

  const handleReceiptConfirm = () => {
    const trimmed = receiptModal.receiptNumber.trim();
    if (!trimmed) {
      setReceiptModal((m) => ({ ...m, error: "Please enter the supplier receipt number." }));
      return;
    }
    const delivery = receiptModal.delivery!;
    setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" });
    openReceiving(delivery, trimmed);
  };

  const openReceiving = (delivery: Delivery, receiptNumber?: string) => {
    const enriched = receiptNumber ? { ...delivery, receiptNumber } : delivery;
    setReceivingDelivery(enriched);
    setReceiveError("");
    setReceiveQtys(
      delivery.items.map((item) => ({
        deliveryItemId: item.id,
        receivedQty: item.orderedQty - item.receivedQty,
      }))
    );
  };

  const handleReceive = async () => {
    if (!receivingDelivery) return;
    const raw = localStorage.getItem("employee") || localStorage.getItem("user") || "{}";
    const employee = JSON.parse(raw);
    const employeeId = employee?.id ?? employee?.employeeId ?? employee?._id ?? employee?.userId ?? null;
    if (!employeeId) {
      const keys = Object.keys(employee);
      setReceiveError(
        keys.length === 0
          ? "No employee session found. Please log in again."
          : `Employee ID not found. Session fields: ${keys.join(", ")}`
      );
      return;
    }
    try {
      setReceiving(true); setReceiveError("");
      await api.receiveDelivery(
        receivingDelivery.id,
        employeeId,
        receiveQtys.filter((r) => r.receivedQty > 0),
      );
      if (receivingDelivery.receiptNumber) {
        try {
          await api.updateDelivery(receivingDelivery.id, {
            receiptNumber: receivingDelivery.receiptNumber,
          });
        } catch (e) { console.warn("Could not save receipt number:", e); }
      }
      setReceivingDelivery(null);
      await fetchAll();
      setToast("Items received and stock updated!");
      setTimeout(() => setToast(""), 3000);
      setStep("history");
    } catch (e: unknown) {
      setReceiveError((e as Error).message || "Failed to receive items.");
    } finally { setReceiving(false); }
  };

  const showConfirm = (msg: string, fn: () => void) =>
    setConfirmModal({ show: true, message: msg, onConfirm: fn });

  const handleCancel = (id: string) =>
    showConfirm("Are you sure you want to cancel this delivery?", async () => {
      try {
        await api.updateDelivery(id, { status: "CANCELLED" });
        await fetchAll();
        setConfirmModal({ show: false, message: "", onConfirm: () => {} });
      } catch (e) { console.error(e); }
    });

  const handleExport = () => {
    const headers = ["ID", "Supplier", "Delivery Date", "Total Items", "Status", "Receipt No.", "Notes"];
    const rows = deliveries.map((d) => [
      d.id,
      d.supplier?.supplierName || d.supplierId,
      new Date(d.deliveryDate).toLocaleDateString(),
      d.totalItems,
      d.status,
      d.receiptNumber || "",
      d.notes || "",
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([[headers, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv" })
    );
    a.download = "purchase-orders.csv";
    a.click();
  };

  // ── Pagination component ──
  const PaginationBar = ({
    page, totalPages, setPage, total, label,
  }: { page: number; totalPages: number; setPage: (p: number) => void; total: number; label: string }) =>
    totalPages <= 1 ? null : (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "12px", color: "#888" }}>
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {label}
        </p>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", background: "#fff", fontSize: "12px", cursor: page === 1 ? "not-allowed" : "pointer", color: "#555", opacity: page === 1 ? 0.4 : 1 }}
          >← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p} onClick={() => setPage(p)}
              style={{ padding: "5px 10px", borderRadius: "8px", border: page === p ? "none" : "1px solid #e0e0e0", background: page === p ? "#1a3c2e" : "#fff", color: page === p ? "#fff" : "#555", fontSize: "12px", cursor: "pointer", fontWeight: page === p ? 700 : 400 }}
            >{p}</button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", background: "#fff", fontSize: "12px", cursor: page === totalPages ? "not-allowed" : "pointer", color: "#555", opacity: page === totalPages ? 0.4 : 1 }}
          >Next →</button>
        </div>
      </div>
    );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "28px" }}>

      {/* ── Receipt Number Modal ── */}
      {receiptModal.show && (
        <>
          <div
            onClick={() => setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" })}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 50, background: "#fff", borderRadius: "20px",
            width: "min(92vw, 400px)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #1a3c2e 0%, #2e7d32 100%)",
              padding: "22px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                  🧾
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>Supplier Receipt Number</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                    {receiptModal.delivery?.supplier?.supplierName || ""}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "16px", lineHeight: "1.6" }}>
                Please enter the <strong>receipt or delivery note number</strong> provided by the supplier. This will be recorded in the delivery details.
              </p>

              <label style={{ fontSize: "12px", fontWeight: 700, color: "#555", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Receipt / DR Number *
              </label>
              <input
                type="text"
                value={receiptModal.receiptNumber}
                onChange={(e) => setReceiptModal((m) => ({ ...m, receiptNumber: e.target.value, error: "" }))}
                onKeyDown={(e) => e.key === "Enter" && handleReceiptConfirm()}
                placeholder="e.g. DR-2024-00123"
                autoFocus
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "12px",
                  border: receiptModal.error ? "1.5px solid #e53935" : "1.5px solid #e0e0e0",
                  fontSize: "15px", fontWeight: 600, outline: "none", color: "#1a1a1a",
                  background: "#fff", boxSizing: "border-box",
                  transition: "border 0.2s",
                  fontFamily: "monospace",
                }}
              />
              {receiptModal.error && (
                <p style={{ fontSize: "12px", color: "#e53935", marginTop: "6px" }}>⚠️ {receiptModal.error}</p>
              )}

              <div style={{ height: "1px", background: "#f0f0f0", margin: "20px 0" }} />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setReceiptModal({ show: false, delivery: null, receiptNumber: "", error: "" })}
                  style={{ flex: 1, padding: "11px", borderRadius: "14px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiptConfirm}
                  style={{ flex: 2, padding: "11px", borderRadius: "14px", border: "none", background: "#1a3c2e", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(26,60,46,0.25)" }}
                >
                  📦 Proceed to Receive
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <>
          <div onClick={() => setConfirmModal({ show: false, message: "", onConfirm: () => {} })}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 50, background: "#fff", borderRadius: "20px", width: "min(92vw, 360px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", padding: "28px", textAlign: "center",
          }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>⚠️</p>
            <p style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>{confirmModal.message}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmModal({ show: false, message: "", onConfirm: () => {} })}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: "#e53935", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 60,
          background: "#4caf50", color: "#fff", padding: "12px 20px",
          borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600,
        }}>
          ✅ {toast}
        </div>
      )}

      {/* ── Step Tabs ── */}
      <div style={{
        display: "flex", marginBottom: "24px", background: "#fff",
        borderRadius: "14px", border: "0.5px solid #e8e8e8", overflow: "hidden", flexWrap: "wrap",
      }}>
        {([
          { key: "receiving", label: "📦 Receiving", badge: pendingDeliveries.length },
          { key: "history",   label: "🕐 PO History" },
        ] as { key: POStep; label: string; badge?: number }[]).map((t, i) => (
          <button
            key={t.key} onClick={() => setStep(t.key)}
            style={{
              padding: "12px 28px", fontSize: "13px",
              fontWeight: step === t.key ? 700 : 400, cursor: "pointer", border: "none",
              borderRight: i < 1 ? "1px solid #e8e8e8" : "none",
              background: step === t.key ? "#1a3c2e" : "#fff",
              color: step === t.key ? "#fff" : "#555",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{
                background: step === t.key ? "rgba(255,255,255,0.3)" : "#1a3c2e",
                color: "#fff", fontSize: "11px", fontWeight: 700,
                padding: "1px 7px", borderRadius: "20px",
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RECEIVING TAB
      ══════════════════════════════════════════════════════════════════ */}
      {step === "receiving" && (
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) minmax(300px,360px)", gap: "24px", alignItems: "start" }}>
          {/* Left: pending list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Search */}
            <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>🔍</span>
              <input
                value={receivingSearch}
                onChange={(e) => { setReceivingSearch(e.target.value); setReceivePage(1); }}
                placeholder="Search delivery ID or supplier..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: "13px", color: "#1a1a1a", background: "transparent" }}
              />
            </div>

            <p style={{ fontSize: "14px", color: "#888" }}>
              Select a Purchase Order to process receiving:
            </p>

            {loading ? (
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "48px", textAlign: "center" }}>
                <p style={{ color: "#aaa" }}>Loading...</p>
              </div>
            ) : paginatedReceiving.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}>No pending deliveries</p>
                <p style={{ fontSize: "13px", color: "#aaa", marginTop: "6px" }}>All purchase orders have been received or cancelled</p>
              </div>
            ) : paginatedReceiving.map((delivery) => (
              <div
                key={delivery.id}
                style={{
                  background: "#fff", borderRadius: "16px",
                  border: receivingDelivery?.id === delivery.id ? "1.5px solid #1a3c2e" : "0.5px solid #e8e8e8",
                  padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  flexWrap: "wrap", gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 800, color: "#1a3c2e", fontFamily: "monospace" }}>
                      {delivery.id.slice(0, 12)}...
                    </p>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, ...statusStyle[delivery.status] }}>
                      {STATUS_LABEL[delivery.status]}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#1a1a1a" }}>🏢 {delivery.supplier?.supplierName || delivery.supplierId}</p>
                  <p style={{ fontSize: "13px", color: "#888" }}>
                    📅 {new Date(delivery.deliveryDate).toLocaleDateString()} • {delivery.items?.length || 0} item{(delivery.items?.length || 0) > 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => openReceiptModal(delivery)}
                    style={{ padding: "10px 20px", borderRadius: "20px", border: "none", background: "#1a3c2e", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    📦 {receivingDelivery?.id === delivery.id ? "Selected" : "Receive"}
                  </button>
                  <button
                    onClick={() => handleCancel(delivery.id)}
                    style={{ padding: "10px 16px", borderRadius: "20px", border: "1.5px solid #ffcdd2", background: "#fff", color: "#e53935", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
            <PaginationBar page={receivePage} totalPages={receiveTotalPages} setPage={setReceivePage} total={filteredReceiving.length} label="deliveries" />
          </div>

          {/* Right: receive form */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "24px", position: "sticky", top: "20px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>📦 Receiving Summary</p>

            {!receivingDelivery ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>👆</div>
                <p style={{ fontSize: "13px" }}>Click "Receive" on a delivery to confirm quantities</p>
              </div>
            ) : (
              <>
                {receiveError && (
                  <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "#c62828" }}>
                    ⚠️ {receiveError}
                  </div>
                )}
                <div style={{ background: "#f0faf2", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a3c2e" }}>{receivingDelivery.supplier?.supplierName || receivingDelivery.supplierId}</p>
                  <p style={{ fontSize: "12px", color: "#888" }}>📅 {new Date(receivingDelivery.deliveryDate).toLocaleDateString()}</p>
                </div>

                {/* Receipt number display */}
                {receivingDelivery.receiptNumber && (
                  <div style={{
                    background: "#fffde7", border: "1.5px solid #fff176", borderRadius: "10px",
                    padding: "10px 14px", marginBottom: "14px",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                    <span style={{ fontSize: "16px" }}>🧾</span>
                    <div>
                      <p style={{ fontSize: "11px", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier Receipt No.</p>
                      <p style={{ fontSize: "14px", fontWeight: 800, color: "#1a1a1a", fontFamily: "monospace" }}>{receivingDelivery.receiptNumber}</p>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Enter Received Quantities
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {receivingDelivery.items.map((item) => {
                    const rq        = receiveQtys.find((r) => r.deliveryItemId === item.id);
                    const remaining = item.orderedQty - item.receivedQty;
                    const unitInfo  = getUnit(item.unit || item.product?.stockUnit);
                    const diff      = (rq?.receivedQty ?? 0) - item.orderedQty;
                    const receivedBtl = rq?.receivedQty && unitInfo.bottlesPerCase
                      ? rq.receivedQty * unitInfo.bottlesPerCase : null;
                    return (
                      <div key={item.id} style={{
                        background: "#f9f9f9", borderRadius: "12px", padding: "14px",
                        border: diff < 0 ? "1.5px solid #ffcc80" : "1px solid #f0f0f0",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                              {item.product?.productName || item.productId}
                              {item.product?.size && <span style={{ color: "#aaa", fontWeight: 400 }}> {item.product.size}</span>}
                            </p>
                            <p style={{ fontSize: "12px", color: "#888" }}>
                              Ordered: <strong>{item.orderedQty}</strong> {unitInfo.short} •
                              Received: <strong>{item.receivedQty}</strong> •
                              Remaining: <strong style={{ color: "#1a3c2e" }}>{remaining}</strong>
                            </p>
                          </div>
                          {diff < 0 && (
                            <span style={{ background: "#fff3e0", color: "#e65100", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                              ⚠️ {Math.abs(diff)} short
                            </span>
                          )}
                          {diff === 0 && (rq?.receivedQty ?? 0) > 0 && (
                            <span style={{ background: "#e8f5e9", color: "#2e7d32", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                              ✅ Complete
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "12px", color: "#555", flexShrink: 0 }}>Received:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              onClick={() => setReceiveQtys((prev) => prev.map((r) => r.deliveryItemId === item.id ? { ...r, receivedQty: Math.max(0, r.receivedQty - 1) } : r))}
                              style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1a3c2e" }}
                            >−</button>
                            <input
                              type="number" min="0" max={remaining} value={rq?.receivedQty ?? 0}
                              onChange={(e) => setReceiveQtys((prev) => prev.map((r) => r.deliveryItemId === item.id ? { ...r, receivedQty: Math.min(Number(e.target.value), remaining) } : r))}
                              style={{ width: "56px", textAlign: "center", padding: "5px", borderRadius: "8px", border: "1.5px solid #1a3c2e", fontSize: "14px", fontWeight: 700, outline: "none" }}
                            />
                            <button
                              onClick={() => setReceiveQtys((prev) => prev.map((r) => r.deliveryItemId === item.id ? { ...r, receivedQty: Math.min(r.receivedQty + 1, remaining) } : r))}
                              style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "#1a3c2e", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}
                            >+</button>
                            <span style={{ fontSize: "12px", color: "#888" }}>{unitInfo.short}</span>
                          </div>
                          {receivedBtl !== null && receivedBtl > 0 && (
                            <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600 }}>= {receivedBtl} btl</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Receiving totals */}
                {receivingDelivery.items.map((item) => {
                  const rq = receiveQtys.find((r) => r.deliveryItemId === item.id);
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                      <span style={{ fontSize: "12px", color: "#888" }}>{item.product?.productName || item.productId}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: (rq?.receivedQty ?? 0) < item.orderedQty ? "#e65100" : "#2e7d32" }}>
                        {rq?.receivedQty ?? 0}/{item.orderedQty}
                      </span>
                    </div>
                  );
                })}

                <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

                {receiveQtys.some((r) => {
                  const item = receivingDelivery.items.find((i) => i.id === r.deliveryItemId);
                  return item && r.receivedQty < item.orderedQty;
                }) && (
                  <div style={{ background: "#fff3e0", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", border: "1px solid #ffcc80" }}>
                    <p style={{ fontSize: "12px", color: "#e65100", fontWeight: 600 }}>
                      ⚠️ Some items are short. This will be recorded as a discrepancy.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleReceive} disabled={receiving}
                  style={{ width: "100%", padding: "13px", borderRadius: "20px", border: "none", background: receiving ? "#aaa" : "#1a3c2e", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: receiving ? "not-allowed" : "pointer", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {receiving ? "Processing..." : "✅ Confirm Receiving"}
                </button>
                <button
                  onClick={() => { setReceivingDelivery(null); setReceiveQtys([]); }}
                  style={{ width: "100%", padding: "11px", borderRadius: "20px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PO HISTORY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {step === "history" && (
        <div>
          {/* Status summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            {([
              { status: "PENDING",            icon: "📤", count: deliveries.filter((d) => d.status === "PENDING").length },
              { status: "PARTIALLY_RECEIVED", icon: "📦", count: deliveries.filter((d) => d.status === "PARTIALLY_RECEIVED").length },
              { status: "DELIVERED",          icon: "✅", count: deliveries.filter((d) => d.status === "DELIVERED").length },
              { status: "CANCELLED",          icon: "✕",  count: deliveries.filter((d) => d.status === "CANCELLED").length },
            ] as { status: POStatus; icon: string; count: number }[]).map((s) => (
              <div key={s.status} style={{ background: "#fff", borderRadius: "12px", border: "0.5px solid #e8e8e8", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", ...statusStyle[s.status], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: (statusStyle[s.status] as { color: string }).color }}>{s.count}</p>
                  <p style={{ fontSize: "11px", color: "#888" }}>{STATUS_LABEL[s.status]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}>🔍</span>
              <input
                value={searchHistory}
                onChange={(e) => { setSearchHistory(e.target.value); setHistoryPage(1); }}
                placeholder="Search ID or supplier..."
                style={{ padding: "8px 14px 8px 32px", borderRadius: "20px", border: "1.5px solid #ddd", fontSize: "13px", outline: "none", width: "220px", color: "#1a1a1a" }}
              />
            </div>

            {/* Status dropdown */}
            <div ref={statusDropRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowStatusDrop(!showStatusDrop)}
                style={{
                  padding: "8px 14px", borderRadius: "20px",
                  border: historyStatus !== "All" ? "1.5px solid #1a3c2e" : "1.5px solid #ddd",
                  background: historyStatus !== "All" ? "#f0faf2" : "#fff",
                  color: historyStatus !== "All" ? "#1a3c2e" : "#555",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                🔖 {historyStatus === "All" ? "All Status" : STATUS_LABEL[historyStatus as POStatus] || historyStatus} {showStatusDrop ? "▲" : "▼"}
              </button>
              {showStatusDrop && (
                <div style={{ position: "absolute", top: "42px", left: 0, background: "#fff", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, overflow: "hidden", minWidth: "180px" }}>
                  {(["All", "PENDING", "PARTIALLY_RECEIVED", "DELIVERED", "CANCELLED"] as const).map((opt) => (
                    <button key={opt} onClick={() => { setHistoryStatus(opt); setHistoryPage(1); setShowStatusDrop(false); }}
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: "13px", fontWeight: historyStatus === opt ? 700 : 400, color: historyStatus === opt ? "#1a3c2e" : "#555", background: historyStatus === opt ? "#f0faf2" : "#fff", border: "none", cursor: "pointer", borderBottom: "0.5px solid #f5f5f5" }}
                    >
                      {opt === "All" ? "All Status" : STATUS_LABEL[opt]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {historyStatus !== "All" && (
              <button onClick={() => { setHistoryStatus("All"); setHistoryPage(1); }}
                style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #ffcdd2", background: "#fff", color: "#e53935", fontSize: "12px", cursor: "pointer" }}>
                ✕ Clear
              </button>
            )}

            <button onClick={handleExport}
              style={{ padding: "8px 14px", borderRadius: "20px", border: "1.5px solid #ddd", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              📤 Export
            </button>

            <span style={{ marginLeft: "auto", fontSize: "12px", color: "#888", fontWeight: 500 }}>
              {filteredHistory.length} purchase order{filteredHistory.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #e8e8e8", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "#1a3c2e" }}>
                  {["Delivery ID", "Supplier", "Date", "Items", "Receipt No.", "Status", "Action"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#aaa" }}>Loading...</td></tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
                    <p style={{ color: "#aaa", fontSize: "14px" }}>No deliveries found</p>
                  </td></tr>
                ) : paginatedHistory.map((delivery, idx) => (
                  <tr key={delivery.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#37474f", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "monospace" }}>
                        {delivery.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1a1a" }}>
                      {delivery.supplier?.supplierName || delivery.supplierId}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: "#e8f0fe", color: "#1a237e", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>
                        📅 {new Date(delivery.deliveryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#555" }}>
                      {delivery.items?.length || 0} item{(delivery.items?.length || 0) > 1 ? "s" : ""}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {delivery.receiptNumber ? (
                        <span style={{ background: "#fffde7", color: "#f57f17", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, fontFamily: "monospace" }}>
                          🧾 {delivery.receiptNumber}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, ...statusStyle[delivery.status] }}>
                        {STATUS_LABEL[delivery.status]}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setViewDelivery(delivery)}
                          style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: "#e8f0fe", color: "#1565c0", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >👁 View</button>
                        {(delivery.status === "PENDING" || delivery.status === "PARTIALLY_RECEIVED") && (
                          <>
                            <button
                              onClick={() => { openReceiptModal(delivery); setStep("receiving"); }}
                              style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: "#e8f5e9", color: "#1a3c2e", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >📦 Receive</button>
                            <button
                              onClick={() => handleCancel(delivery.id)}
                              style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid #ffcdd2", background: "#fff", color: "#e53935", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >Cancel</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}>
              <PaginationBar page={historyPage} totalPages={historyTotalPages} setPage={setHistoryPage} total={filteredHistory.length} label="purchase orders" />
            </div>
          </div>
        </div>
      )}

      {/* ── View Delivery Modal ── */}
      {viewDelivery && (
        <>
          <div onClick={() => setViewDelivery(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 50, background: "#fff", borderRadius: "20px",
            width: "min(92vw, 520px)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            maxHeight: "85vh", overflowY: "auto",
          }}>
            <div style={{ background: "#1a3c2e", padding: "20px 24px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>Delivery Details</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>{viewDelivery.id}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, ...statusStyle[viewDelivery.status] }}>
                  {STATUS_LABEL[viewDelivery.status]}
                </span>
                <button onClick={() => setViewDelivery(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#fff", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
                {[
                  ["Delivery ID", viewDelivery.id],
                  ["Supplier",    viewDelivery.supplier?.supplierName || viewDelivery.supplierId],
                  ["Date",        new Date(viewDelivery.deliveryDate).toLocaleDateString()],
                  ["Total Items", String(viewDelivery.totalItems)],
                  ...(viewDelivery.receiptNumber ? [["Receipt No.", viewDelivery.receiptNumber]] : []),
                  ...(viewDelivery.notes ? [["Notes", viewDelivery.notes]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", flexWrap: "wrap", rowGap: "4px", borderBottom: "0.5px solid #f0f0f0" }}>
                    <span style={{ fontSize: "12px", color: "#888" }}>{label}</span>
                    <span style={{
                      fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
                      fontFamily: label === "Receipt No." ? "monospace" : "inherit",
                      background: label === "Receipt No." ? "#fffde7" : "transparent",
                      padding: label === "Receipt No." ? "2px 10px" : "0",
                      borderRadius: label === "Receipt No." ? "20px" : "0",
                    }}>
                      {label === "Receipt No." ? `🧾 ${value}` : value}
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>📦 Items Ordered</p>
              <div style={{ borderRadius: "12px", overflowX: "auto", border: "0.5px solid #e8e8e8", marginBottom: "20px" }}>
                <table style={{ minWidth: "420px", borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#1a3c2e" }}>
                      {["Product", "Unit", "Cost", "Ordered", "Received", "Status"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", color: "#fff", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewDelivery.items?.map((item, i) => {
                      const unitInfo = getUnit(item.unit || item.product?.stockUnit);
                      const diff     = item.receivedQty - item.orderedQty;
                      return (
                        <tr key={item.id} style={{ borderBottom: "0.5px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                            {item.product?.productName || item.productId}
                            {item.product?.size && <span style={{ color: "#aaa" }}> {item.product.size}</span>}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#888" }}>{unitInfo.short}</td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#1a1a1a" }}>₱{item.costPrice}</td>
                          <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", textAlign: "center" }}>{item.orderedQty}</td>
                          <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: 600, textAlign: "center", color: item.receivedQty === 0 ? "#aaa" : item.receivedQty < item.orderedQty ? "#e65100" : "#2e7d32" }}>
                            {item.receivedQty === 0 ? "—" : item.receivedQty}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {item.receivedQty === 0 ? (
                              <span style={{ fontSize: "11px", color: "#aaa" }}>Pending</span>
                            ) : diff < 0 ? (
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#e65100", background: "#fff3e0", padding: "2px 8px", borderRadius: "20px" }}>-{Math.abs(diff)} short</span>
                            ) : (
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#2e7d32", background: "#e8f5e9", padding: "2px 8px", borderRadius: "20px" }}>Complete</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setViewDelivery(null)}
                style={{ width: "100%", padding: "11px", borderRadius: "20px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}