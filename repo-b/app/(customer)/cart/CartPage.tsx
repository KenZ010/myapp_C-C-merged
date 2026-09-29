"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    productName: string;
    price: number;
    finalPrice?: number;
    category?: string;
    size?: string;
    stock?: number;
  };
};

// ── Settings you may want to tweak ────────────────────────────────────────────
const VAT_RATE = 0.12;
const GCASH_TIME_LIMIT_SECONDS = 5 * 60; // how long the customer has to finish the GCash form
const GCASH_REF_LENGTH = 13;             // GCash reference numbers are 13 digits
const GCASH_QR_SRC = "/gcash-qr.png";    // put your real QR image in /public/gcash-qr.png
const GCASH_NUMBER = "0912 345 6789";
const GCASH_NAME = "Julieta Soft Drinks";

const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS: "🥤",
  ENERGY_DRINK: "⚡",
  BEER: "🍺",
  JUICE: "🍹",
  WATER: "💧",
  OTHER: "🛒",
};
const BG_MAP: Record<string, string> = {
  SOFTDRINKS: "#b71c1c",
  ENERGY_DRINK: "#1a237e",
  BEER: "#f57f17",
  JUICE: "#2e7d32",
  WATER: "#0288d1",
  OTHER: "#424242",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";
const getBg = (cat?: string) => BG_MAP[cat?.toUpperCase() || ""] || "#424242";

const peso = (n: number) =>
  "₱" +
  n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// Shrinks the screenshot so it can be safely kept in sessionStorage
function compressImage(file: File, maxWidth = 1000, quality = 0.75): Promise<string> {
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

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: CartItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(3px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "28px 24px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗑️</div>
        <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>
          Remove Item?
        </h3>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>
          Are you sure you want to remove
        </p>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#2d7a3a", marginBottom: "24px" }}>
          {item.product.productName}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "30px",
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              color: "#888",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "30px",
              border: "none",
              background: "#e53935",
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(229,57,53,0.35)",
            }}
          >
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Max Stock Toast ─────────────────────────────────────────────────────────
function MaxStockToast({ productName, stock }: { productName: string; stock: number }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        background: "#1a1a1a",
        color: "#fff",
        borderRadius: "14px",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        maxWidth: "min(92vw, 420px)",
        animation: "toastSlideDown 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes toastSlideDown {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <span style={{ fontSize: "22px", flexShrink: 0 }}>⚠️</span>
      <div>
        <p style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>Max stock reached</p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", margin: "2px 0 0" }}>
          {productName} — only {stock} case{stock !== 1 ? "s" : ""} in stock.
        </p>
      </div>
    </div>
  );
}

// ── Placeholder QR (shown only if /public/gcash-qr.png is missing) ───────────
function PlaceholderQr() {
  return (
    <svg width="180" height="180" viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto" }}>
      <rect x="2" y="2" width="116" height="116" rx="8" fill="white" stroke="#6a1b9a" strokeWidth="3" />
      {[[10, 10], [80, 10], [10, 80]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="30" height="30" rx="3" fill="#6a1b9a" />
          <rect x={x + 5} y={y + 5} width="20" height="20" rx="2" fill="white" />
          <rect x={x + 9} y={y + 9} width="12" height="12" rx="1" fill="#6a1b9a" />
        </g>
      ))}
      {[
        [50, 10],[56, 10],[62, 10],[50, 16],[62, 16],[50, 22],[54, 22],[58, 22],[62, 22],
        [10, 50],[16, 50],[22, 50],[28, 50],[10, 56],[22, 56],[28, 56],[10, 62],[16, 62],
        [28, 62],[50, 50],[58, 50],[66, 50],[74, 50],[50, 58],[54, 58],[62, 58],[70, 58],
        [50, 66],[58, 66],[66, 66],[80, 50],[88, 50],[96, 50],[104, 50],[80, 58],[96, 58],
        [80, 66],[88, 66],[96, 66],[104, 66],[50, 80],[58, 80],[66, 80],[50, 88],[62, 88],
        [70, 88],[54, 96],[58, 96],[66, 96],[74, 96],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="5" height="5" fill="#6a1b9a" />
      ))}
    </svg>
  );
}

export default function CartPage() {
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [maxStockToast, setMaxStockToast] = useState<{
    productName: string;
    stock: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);
  const [cashInput, setCashInput] = useState("");

  // ── GCash flow state ──
  const [gcashOpen, setGcashOpen] = useState(false);
  const [gcashExpired, setGcashExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(GCASH_TIME_LIMIT_SECONDS);
  const [gcashRef, setGcashRef] = useState("");
  const [gcashImage, setGcashImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // ── GCash countdown: closes and clears the form when time runs out ──
  useEffect(() => {
    if (!gcashOpen) return;
    const endsAt = Date.now() + GCASH_TIME_LIMIT_SECONDS * 1000;
    setSecondsLeft(GCASH_TIME_LIMIT_SECONDS);

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        setGcashOpen(false);
        setGcashRef("");
        setGcashImage(null);
        setUploadError(null);
        setGcashExpired(true);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [gcashOpen]);

  // Close the GCash form with the Escape key
  useEffect(() => {
    if (!gcashOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGcashOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gcashOpen]);

  const getCustomerId = () => {
    if (typeof window === "undefined") return "";
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?.id || "";
    } catch {
      return "";
    }
  };

  const fetchCart = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getCart(customerId);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQty = async (item: CartItem, delta: number) => {
    const customerId = getCustomerId();
    const newQty = item.quantity + delta;
    const stock = item.product.stock ?? Infinity;

    if (delta > 0 && newQty > stock) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setStockWarning(item.id);
      warningTimerRef.current = setTimeout(() => setStockWarning(null), 2500);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setMaxStockToast({ productName: item.product.productName, stock });
      toastTimerRef.current = setTimeout(() => setMaxStockToast(null), 2800);
      return;
    }

    // Ask for confirmation instead of removing immediately when qty would hit 0
    if (newQty <= 0) {
      setDeleteTarget(item);
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));

    try {
      await api.updateCartItem(customerId, item.id, newQty);
    } catch (err) {
      console.error("Failed to update cart:", err);
      await fetchCart();
    }
  };

  const promptRemove = (item: CartItem) => setDeleteTarget(item);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    const customerId = getCustomerId();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.removeCartItem(customerId, item.id);
    } catch (err) {
      console.error("Failed to remove item:", err);
      await fetchCart();
    }
  };

  // ── GCash actions ──
  const openGcashForm = () => {
    setGcashExpired(false);
    setGcashRef("");
    setGcashImage(null);
    setUploadError(null);
    setGcashOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows re-selecting the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG or PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("That image is too large. Please choose one under 8 MB.");
      return;
    }
    try {
      setUploadError(null);
      setGcashImage(await compressImage(file));
    } catch {
      setUploadError("We couldn't read that image. Please try another one.");
    }
  };

  const getEffectivePrice = (item: CartItem) =>
    item.product.finalPrice != null && item.product.finalPrice < item.product.price
      ? item.product.finalPrice
      : item.product.price;

  const subtotal = items.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0);

  const totalDiscount = items.reduce((sum, i) => {
    const fp = i.product.finalPrice;
    if (fp != null && fp < i.product.price) {
      return sum + (i.product.price - fp) * i.quantity;
    }
    return sum;
  }, 0);

  // VAT (12%) applied on top of subtotal
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;

  // Cash change logic (Cash on Delivery)
  const cashAmount = parseFloat(cashInput.replace(/,/g, "")) || 0;
  const change = cashAmount - total;
  const isExactOrOver = cashAmount >= total;

  const hasStockIssue = items.some((i) => i.quantity > (i.product.stock ?? Infinity));

  const canCheckoutCod = items.length > 0 && !hasStockIssue && isExactOrOver;

  const refValid = gcashRef.length === GCASH_REF_LENGTH;
  const canProceedGcash = refValid && gcashImage !== null && secondsLeft > 0;

  const handleGcashProceed = () => {
    if (!canProceedGcash || !gcashImage) return;
    sessionStorage.setItem("paymentMethod", "gcash");
    sessionStorage.setItem("gcashRef", gcashRef);
    sessionStorage.removeItem("cashGiven");
    try {
      sessionStorage.setItem("gcashProof", gcashImage);
    } catch {
      sessionStorage.removeItem("gcashProof");
    }
    router.push("/checkout");
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6a1b9a",
    marginBottom: "6px",
    display: "block",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#aaa", fontSize: "14px" }}>Loading cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #f0faf2, #e8f5e9)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>🛒</div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>
          Your cart is empty
        </h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px" }}>
          Add some products to get started!
        </p>
        <Link
          href="/products"
          style={{
            background: "#2d7a3a",
            color: "#fff",
            textDecoration: "none",
            padding: "13px 40px",
            borderRadius: "30px",
            fontSize: "15px",
            fontWeight: 600,
            boxShadow: "0 6px 20px rgba(45,122,58,0.3)",
          }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const timeLow = secondsLeft <= 60;

  return (
    <>
      {/* ── Max Stock Toast ── */}
      {maxStockToast && (
        <MaxStockToast productName={maxStockToast.productName} stock={maxStockToast.stock} />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={confirmRemove}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── GCash Payment Form (timed) ── */}
      {gcashOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "10px" : "20px",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="GCash payment"
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: isMobile ? "480px" : "920px",
              maxHeight: "94vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header + countdown */}
            <div style={{ background: "#6a1b9a", color: "#fff", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "16px 20px",
                }}
              >
                <div>
                  <p style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>📲 GCash Payment</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", margin: "2px 0 0" }}>
                    Complete this form before the timer runs out
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      background: timeLow ? "#e53935" : "rgba(255,255,255,0.18)",
                      borderRadius: "20px",
                      padding: "6px 14px",
                      fontSize: "15px",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ⏱️ {formatTime(secondsLeft)}
                  </div>
                  <button
                    onClick={() => setGcashOpen(false)}
                    aria-label="Close"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.2)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(secondsLeft / GCASH_TIME_LIMIT_SECONDS) * 100}%`,
                    background: timeLow ? "#ffcdd2" : "#f5c842",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                padding: isMobile ? "16px" : "22px",
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "22px",
                alignItems: "start",
              }}
            >
              {/* LEFT: QR + amount */}
              <div>
                <div
                  style={{
                    background: "#f8f0ff",
                    border: "1px solid #e0c8ff",
                    borderRadius: "16px",
                    padding: "18px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#6a1b9a", marginBottom: "12px" }}>
                    Scan to pay via GCash
                  </p>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "12px",
                      border: "1px solid #e0c8ff",
                      display: "inline-block",
                    }}
                  >
                    {qrFailed ? (
                      <PlaceholderQr />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={GCASH_QR_SRC}
                        alt="GCash QR code"
                        onError={() => setQrFailed(true)}
                        style={{ width: "200px", height: "200px", objectFit: "contain", display: "block" }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#6a1b9a", marginTop: "10px" }}>
                    {GCASH_NAME}
                  </p>
                  <p style={{ fontSize: "12px", color: "#888" }}>GCash: {GCASH_NUMBER}</p>
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1.5px dashed #c084fc",
                      padding: "10px",
                    }}
                  >
                    <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>Amount to pay</p>
                    <p style={{ fontSize: "24px", fontWeight: 800, color: "#2d7a3a", margin: "2px 0 0" }}>
                      {peso(total)}
                    </p>
                  </div>
                </div>

                <ol
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    lineHeight: 1.7,
                    paddingLeft: "18px",
                    marginTop: "14px",
                  }}
                >
                  <li>Scan the QR code with your GCash app.</li>
                  <li>Pay the exact amount shown above.</li>
                  <li>Enter the reference number from your receipt.</li>
                  <li>Upload a screenshot of your payment.</li>
                </ol>
              </div>

              {/* RIGHT: order review + inputs */}
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>
                  🧾 Order Review
                </p>
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {items.map((item) => (
                      <div
                        key={item.id}
                        style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12.5px" }}
                      >
                        <span style={{ color: "#555" }}>
                          {item.product.productName} × {item.quantity}
                        </span>
                        <span style={{ fontWeight: 600, color: "#2d7a3a", whiteSpace: "nowrap" }}>
                          {peso(getEffectivePrice(item) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: "1px", background: "#f0f0f0", margin: "10px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span style={{ color: "#888" }}>Subtotal</span>
                    <span>{peso(subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span style={{ color: "#888" }}>VAT (12%)</span>
                    <span>{peso(vat)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid #f0f0f0",
                      paddingTop: "10px",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 700 }}>Total (incl. VAT)</span>
                    <span style={{ fontSize: "18px", fontWeight: 800, color: "#2d7a3a" }}>{peso(total)}</span>
                  </div>
                </div>

                {/* Reference number */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>
                    🔢 GCash Reference Number <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={gcashRef}
                    onChange={(e) =>
                      setGcashRef(e.target.value.replace(/\D/g, "").slice(0, GCASH_REF_LENGTH))
                    }
                    placeholder="e.g. 1234567890123"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: refValid
                        ? "1.5px solid #2d7a3a"
                        : gcashRef
                        ? "1.5px solid #e53935"
                        : "1.5px solid #e0c8ff",
                      fontSize: "14px",
                      outline: "none",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      marginTop: "4px",
                      color: refValid ? "#2e7d32" : "#999",
                    }}
                  >
                    {refValid
                      ? "✅ Looks good"
                      : `${gcashRef.length}/${GCASH_REF_LENGTH} digits — found on your GCash receipt`}
                  </p>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label style={labelStyle}>
                    📸 Upload Payment Screenshot <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  {gcashImage ? (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid #6a1b9a",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gcashImage}
                        alt="Payment screenshot"
                        style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
                      />
                      <button
                        onClick={() => setGcashImage(null)}
                        aria-label="Remove screenshot"
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✕
                      </button>
                      <div style={{ background: "#e8f5e9", padding: "6px", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "#2e7d32", fontWeight: 600 }}>
                          ✅ Screenshot uploaded
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: "2px dashed #c084fc",
                        borderRadius: "10px",
                        padding: "20px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: "26px", marginBottom: "4px" }}>🖼️</div>
                      <p style={{ fontSize: "12px", fontWeight: 500, color: "#6a1b9a" }}>
                        Click to upload screenshot
                      </p>
                      <p style={{ fontSize: "11px", color: "#bbb" }}>JPG, PNG supported</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                  {uploadError && (
                    <p style={{ fontSize: "11px", color: "#e53935", marginTop: "6px" }}>⚠️ {uploadError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: isMobile ? "12px 16px" : "14px 22px",
                borderTop: "1px solid #f0f0f0",
                flexShrink: 0,
                background: "#fff",
              }}
            >
              <button
                onClick={handleGcashProceed}
                disabled={!canProceedGcash}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "30px",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#fff",
                  background: canProceedGcash ? "#2d7a3a" : "#ccc",
                  cursor: canProceedGcash ? "pointer" : "not-allowed",
                  boxShadow: canProceedGcash ? "0 6px 20px rgba(45,122,58,0.3)" : "none",
                }}
              >
                {!refValid
                  ? "Enter your GCash reference number"
                  : !gcashImage
                  ? "Upload your payment screenshot"
                  : "Proceed to Checkout →"}
              </button>
              <p style={{ textAlign: "center", fontSize: "11px", color: "#aaa", marginTop: "8px" }}>
                You can&apos;t proceed to checkout until the reference number and screenshot are provided.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          padding: isMobile ? "16px" : "28px",
          background: "#f5f5f5",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
          🛒 {items.length} item{items.length !== 1 ? "s" : ""} in your cart
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 400px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Cart Items ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {items.map((item) => {
              const emoji = getEmoji(item.product.category);
              const bg = getBg(item.product.category);
              const effectivePrice = getEffectivePrice(item);
              const hasDiscount =
                item.product.finalPrice != null && item.product.finalPrice < item.product.price;
              const atMax = item.quantity >= (item.product.stock ?? Infinity);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: "0.5px solid #e8e8e8",
                    padding: "18px 22px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: "18px",
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? "60px" : "80px",
                      height: isMobile ? "60px" : "80px",
                      borderRadius: "14px",
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "36px",
                      flexShrink: 0,
                    }}
                  >
                    {emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "3px" }}>
                      {item.product.productName}
                    </p>
                    <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>
                      {item.product.size ? `Size: ${item.product.size}` : item.product.category || ""}
                    </p>

                    {hasDiscount ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontSize: "14px", color: "#bbb", textDecoration: "line-through", margin: 0 }}>
                          {peso(item.product.price * item.quantity)}
                        </p>
                        <p style={{ fontSize: "18px", fontWeight: 700, color: "#2d7a3a", margin: 0 }}>
                          {peso(effectivePrice * item.quantity)}
                        </p>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#fff",
                            background: "#e53935",
                            borderRadius: "6px",
                            padding: "2px 6px",
                          }}
                        >
                          PROMO
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#2d7a3a", margin: 0 }}>
                        {peso(effectivePrice * item.quantity)}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1.5px solid #e8e8e8",
                          borderRadius: "30px",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => handleUpdateQty(item, -1)}
                          style={{
                            width: "36px",
                            height: "36px",
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor: "pointer",
                            color: "#2d7a3a",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: "32px",
                            textAlign: "center",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item, 1)}
                          style={{
                            width: "36px",
                            height: "36px",
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor: atMax ? "not-allowed" : "pointer",
                            color: atMax ? "#ccc" : "#2d7a3a",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>
                      {stockWarning === item.id && (
                        <span style={{ fontSize: "10px", color: "#e53935", fontWeight: 600, whiteSpace: "nowrap" }}>
                          ⚠️ Max stock reached
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => promptRemove(item)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#ffebee",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
            <Link
              href="/products"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#2d7a3a",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                padding: "4px 0",
              }}
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              border: "0.5px solid #e8e8e8",
              padding: "24px",
              position: isMobile ? "relative" : "sticky",
              top: isMobile ? "auto" : "20px",
            }}
          >
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>
              Order Summary
            </p>

            {/* Itemized list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {items.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const hasDiscount =
                  item.product.finalPrice != null && item.product.finalPrice < item.product.price;

                return (
                  <div
                    key={item.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {item.product.productName} × {item.quantity}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      {hasDiscount && (
                        <div style={{ fontSize: "11px", color: "#bbb", textDecoration: "line-through" }}>
                          {peso(item.product.price * item.quantity)}
                        </div>
                      )}
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#2d7a3a" }}>
                        {peso(effectivePrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>Subtotal</span>
              <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{peso(subtotal)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>VAT (12%)</span>
              <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{peso(vat)}</span>
            </div>

            {totalDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#e53935" }}>🏷️ You saved (promo)</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e53935" }}>
                  {peso(totalDiscount)}
                </span>
              </div>
            )}

            <div style={{ height: "1px", background: "#f0f0f0", margin: "14px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>Total</span>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#2d7a3a" }}>{peso(total)}</span>
            </div>

            {/* Payment Method */}
            <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>Payment Method</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[
                { key: "cod", label: "💵 Cash on Delivery" },
                { key: "gcash", label: "📱 GCash" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setPaymentMethod(m.key as "cod" | "gcash");
                    setGcashExpired(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    border: paymentMethod === m.key ? "2px solid #2d7a3a" : "1.5px solid #e0e0e0",
                    background: paymentMethod === m.key ? "#f0faf2" : "#fff",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: paymentMethod === m.key ? "#2d7a3a" : "#888",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── GCash notice (opens the timed form) ── */}
            {paymentMethod === "gcash" && (
              <div
                style={{
                  background: "#f8f0ff",
                  borderRadius: "14px",