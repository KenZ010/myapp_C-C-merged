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
    image?: string | null; // ← product photo (same field used on the Products page)
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
// Full class names (Tailwind can't see classes built from string pieces)
const BG_MAP: Record<string, string> = {
  SOFTDRINKS: "bg-[#b71c1c]",
  ENERGY_DRINK: "bg-[#1a237e]",
  BEER: "bg-[#f57f17]",
  JUICE: "bg-[#2e7d32]",
  WATER: "bg-[#0288d1]",
  OTHER: "bg-[#424242]",
};
const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() || ""] || "🥤";
const getBg = (cat?: string) => BG_MAP[cat?.toUpperCase() || ""] || "bg-[#424242]";

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

// Shrinks the screenshot before it is uploaded
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

// ── Product thumbnail (shows the real photo, falls back to the emoji) ────────
function CartThumb({
  image,
  emoji,
  bgClass,
  sizeClass,
}: {
  image?: string | null;
  emoji: string;
  bgClass: string;
  sizeClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!image && !failed;

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-4xl ${
        showImage ? "bg-gray-100" : bgClass
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image as string}
          alt=""
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
        />
      ) : (
        emoji
      )}
    </div>
  );
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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-5 backdrop-blur-[3px]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-[20px] bg-white px-6 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
      >
        <div className="mb-3 text-5xl">🗑️</div>
        <h3 className="mb-2 text-[17px] font-bold text-[#1a1a1a]">Remove Item?</h3>
        <p className="mb-1.5 text-[13px] text-[#888]">Are you sure you want to remove</p>
        <p className="mb-6 text-sm font-semibold text-[#2d7a3a]">{item.product.productName}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-[30px] border-[1.5px] border-[#e0e0e0] bg-white p-3 text-sm font-semibold text-[#888]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-[30px] border-none bg-[#e53935] p-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(229,57,53,0.35)]"
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
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[2000] flex justify-center px-4">
      <style>{`
        @keyframes toastSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="pointer-events-auto flex max-w-[min(92vw,420px)] animate-[toastSlideDown_0.25s_ease-out] items-center gap-3 rounded-[14px] bg-[#1a1a1a] px-5 py-3.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <span className="shrink-0 text-[22px]">⚠️</span>
        <div>
          <p className="m-0 text-[13px] font-bold">Max stock reached</p>
          <p className="mx-0 mb-0 mt-0.5 text-xs text-white/75">
            {productName} — only {stock} case{stock !== 1 ? "s" : ""} in stock.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder QR (shown only if /public/gcash-qr.png is missing) ───────────
function PlaceholderQr() {
  return (
    <svg width="180" height="180" viewBox="0 0 120 120" className="mx-auto block">
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

// Shared class strings
const LABEL = "mb-1.5 block text-xs font-semibold text-[#6a1b9a]";
const THUMB_SIZE = "h-[60px] w-[60px] min-[900px]:h-20 min-[900px]:w-20";

export default function CartPage() {
  const router = useRouter();

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
  const [gcashBusy, setGcashBusy] = useState(false);
  const [gcashError, setGcashError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setGcashError(null);
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
  const canProceedGcash = refValid && gcashImage !== null && secondsLeft > 0 && !gcashBusy;

  const dataUrlToFile = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], "gcash-receipt.jpg", { type: blob.type || "image/jpeg" });
  };

  // Verifies the typed reference, uploads the receipt, then continues to checkout
  const handleGcashProceed = async () => {
    if (!canProceedGcash || !gcashImage) return;
    setGcashBusy(true);
    setGcashError(null);
    try {
      // 1. Reference must be valid and not already used on another order
      const check = await api.checkGcashRef(gcashRef);
      if (!check?.valid) throw new Error("That reference number isn't valid.");
      if (check?.exists) throw new Error("That reference number was already used on another order.");

      // 2. Upload the screenshot; only the returned URL is kept
      const up = await api.uploadReceipt(await dataUrlToFile(gcashImage));
      if (!up?.receiptImage) throw new Error("Receipt upload failed. Please try again.");

      sessionStorage.setItem("paymentMethod", "gcash");
      sessionStorage.setItem("gcashRef", gcashRef);
      sessionStorage.setItem("gcashReceiptUrl", up.receiptImage);
      sessionStorage.removeItem("gcashProof"); // base64 copy no longer needed
      sessionStorage.removeItem("cashGiven");
      router.push("/checkout");
    } catch (err) {
      setGcashError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setGcashBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <p className="text-sm text-[#aaa]">Loading cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center bg-[linear-gradient(160deg,#f0faf2,#e8f5e9)]">
        <div className="mb-5 text-[72px]">🛒</div>
        <h2 className="mb-2.5 text-[22px] font-bold text-[#1a1a1a]">Your cart is empty</h2>
        <p className="mb-7 text-sm text-[#888]">Add some products to get started!</p>
        <Link
          href="/products"
          className="rounded-[30px] bg-[#2d7a3a] px-10 py-[13px] text-[15px] font-semibold text-white no-underline shadow-[0_6px_20px_rgba(45,122,58,0.3)]"
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/55 p-2.5 backdrop-blur-[3px] min-[900px]:p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="GCash payment"
            className="flex max-h-[94vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[20px] bg-white text-[#1a1a1a] shadow-[0_24px_70px_rgba(0,0,0,0.3)] [color-scheme:light] min-[900px]:max-w-[920px]"
          >
            {/* Header + countdown */}
            <div className="shrink-0 bg-[#6a1b9a] text-white">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="m-0 text-base font-bold">📲 GCash Payment</p>
                  <p className="mx-0 mb-0 mt-0.5 text-xs text-white/75">
                    Complete this form before the timer runs out
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex items-center gap-1.5 rounded-[20px] px-3.5 py-1.5 text-[15px] font-bold tabular-nums ${
                      timeLow ? "bg-[#e53935]" : "bg-white/20"
                    }`}
                  >
                    ⏱️ {formatTime(secondsLeft)}
                  </div>
                  <button
                    onClick={() => setGcashOpen(false)}
                    aria-label="Close"
                    className="h-8 w-8 cursor-pointer rounded-full border-none bg-white/20 text-sm text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="h-1 bg-white/20">
                <div
                  className={`h-full transition-[width] duration-1000 ease-linear ${
                    timeLow ? "bg-[#ffcdd2]" : "bg-[#f5c842]"
                  }`}
                  style={{ width: `${(secondsLeft / GCASH_TIME_LIMIT_SECONDS) * 100}%` }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 items-start gap-[22px] overflow-y-auto p-4 min-[900px]:grid-cols-2 min-[900px]:p-[22px]">
              {/* LEFT: QR + amount */}
              <div>
                <div className="rounded-2xl border border-[#e0c8ff] bg-[#f8f0ff] p-[18px] text-center">
                  <p className="mb-3 text-[13px] font-semibold text-[#6a1b9a]">Scan to pay via GCash</p>
                  <div className="inline-block rounded-xl border border-[#e0c8ff] bg-white p-3">
                    {qrFailed ? (
                      <PlaceholderQr />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={GCASH_QR_SRC}
                        alt="GCash QR code"
                        onError={() => setQrFailed(true)}
                        className="block h-[200px] w-[200px] object-contain"
                      />
                    )}
                  </div>
                  <p className="mt-2.5 text-[13px] font-bold text-[#6a1b9a]">{GCASH_NAME}</p>
                  <p className="text-xs text-[#888]">GCash: {GCASH_NUMBER}</p>
                  <div className="mt-3 rounded-xl border-[1.5px] border-dashed border-[#c084fc] bg-white p-2.5">
                    <p className="m-0 text-[11px] text-[#888]">Amount to pay</p>
                    <p className="mx-0 mb-0 mt-0.5 text-2xl font-extrabold text-[#2d7a3a]">{peso(total)}</p>
                  </div>
                </div>

                <ol className="mt-3.5 list-decimal pl-[18px] text-xs leading-[1.7] text-[#666]">
                  <li>Scan the QR code with your GCash app.</li>
                  <li>Pay the exact amount shown above.</li>
                  <li>Enter the reference number from your receipt.</li>
                  <li>Upload a screenshot of your payment.</li>
                </ol>
              </div>

              {/* RIGHT: order review + inputs */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-[#1a1a1a]">🧾 Order Review</p>
                <div className="mb-[18px] rounded-xl border border-[#eee] px-3.5 py-3">
                  <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2.5 text-[12.5px]">
                        <span className="text-[#444]">
                          {item.product.productName} × {item.quantity}
                        </span>
                        <span className="whitespace-nowrap font-semibold text-[#2d7a3a]">
                          {peso(getEffectivePrice(item) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="my-2.5 h-px bg-[#f0f0f0]" />
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="text-[#888]">Subtotal</span>
                    <span className="font-semibold text-[#1a1a1a]">{peso(subtotal)}</span>
                  </div>
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="text-[#888]">VAT (12%)</span>
                    <span className="font-semibold text-[#1a1a1a]">{peso(vat)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
                    <span className="text-sm font-bold text-[#1a1a1a]">Total (incl. VAT)</span>
                    <span className="text-lg font-extrabold text-[#2d7a3a]">{peso(total)}</span>
                  </div>
                </div>

                {/* Reference number */}
                <div className="mb-4">
                  <label className={LABEL}>
                    🔢 GCash Reference Number <span className="text-[#e53935]">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={gcashRef}
                    onChange={(e) =>
                      setGcashRef(e.target.value.replace(/\D/g, "").slice(0, GCASH_REF_LENGTH))
                    }
                    placeholder="e.g. 1234567890123"
                    className={`box-border w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 font-mono text-base font-semibold tracking-[0.12em] text-[#1a1a1a] caret-[#6a1b9a] outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-[#bbb] ${
                      refValid
                        ? "border-[#2d7a3a]"
                        : gcashRef
                        ? "border-[#e53935]"
                        : "border-[#e0c8ff]"
                    }`}
                  />
                  <p className={`mt-1 text-[11px] ${refValid ? "text-[#2e7d32]" : "text-[#999]"}`}>
                    {refValid
                      ? "✅ Looks good"
                      : `${gcashRef.length}/${GCASH_REF_LENGTH} digits — found on your GCash receipt`}
                  </p>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className={LABEL}>
                    📸 Upload Payment Screenshot <span className="text-[#e53935]">*</span>
                  </label>
                  {gcashImage ? (
                    <div className="relative overflow-hidden rounded-[10px] border-[1.5px] border-[#6a1b9a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gcashImage}
                        alt="Payment screenshot"
                        className="block h-[140px] w-full object-cover"
                      />
                      <button
                        onClick={() => setGcashImage(null)}
                        aria-label="Remove screenshot"
                        className="absolute right-1.5 top-1.5 h-6 w-6 cursor-pointer rounded-full border-none bg-black/55 text-xs text-white"
                      >
                        ✕
                      </button>
                      <div className="bg-[#e8f5e9] p-1.5 text-center">
                        <span className="text-[11px] font-semibold text-[#2e7d32]">
                          ✅ Screenshot ready
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer rounded-[10px] border-2 border-dashed border-[#c084fc] bg-white p-5 text-center"
                    >
                      <div className="mb-1 text-[26px]">🖼️</div>
                      <p className="text-xs font-medium text-[#6a1b9a]">Click to upload screenshot</p>
                      <p className="text-[11px] text-[#bbb]">JPG, PNG supported</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadError && (
                    <p className="mt-1.5 text-[11px] text-[#e53935]">⚠️ {uploadError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#f0f0f0] bg-white px-4 py-3 min-[900px]:px-[22px] min-[900px]:py-3.5">
              <button
                onClick={handleGcashProceed}
                disabled={!canProceedGcash}
                className={`w-full rounded-[30px] border-none p-3.5 text-[15px] font-bold text-white ${
                  canProceedGcash
                    ? "cursor-pointer bg-[#2d7a3a] shadow-[0_6px_20px_rgba(45,122,58,0.3)]"
                    : "cursor-not-allowed bg-[#ccc]"
                }`}
              >
                {gcashBusy
                  ? "Verifying payment…"
                  : !refValid
                  ? "Enter your GCash reference number"
                  : !gcashImage
                  ? "Upload your payment screenshot"
                  : "Proceed to Checkout →"}
              </button>
              {gcashError && (
                <p className="mt-2 text-center text-xs font-semibold text-[#e53935]">⚠️ {gcashError}</p>
              )}
              <p className="mt-2 text-center text-[11px] text-[#aaa]">
                You can&apos;t proceed to checkout until the reference number and screenshot are provided.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100vh-56px)] bg-[#f5f5f5] p-4 min-[900px]:p-7">
        <p className="mb-5 text-[13px] text-[#888]">
          🛒 {items.length} item{items.length !== 1 ? "s" : ""} in your cart
        </p>

        <div className="grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-[1fr_400px]">
          {/* ── LEFT: Cart Items ── */}
          <div className="flex flex-col gap-3.5">
            {items.map((item) => {
              const emoji = getEmoji(item.product.category);
              const bgClass = getBg(item.product.category);
              const effectivePrice = getEffectivePrice(item);
              const hasDiscount =
                item.product.finalPrice != null && item.product.finalPrice < item.product.price;
              const atMax = item.quantity >= (item.product.stock ?? Infinity);

              return (
                <div
                  key={item.id}
                  className="flex flex-col items-start gap-[18px] rounded-2xl border-[0.5px] border-[#e8e8e8] bg-white px-[22px] py-[18px] min-[900px]:flex-row min-[900px]:items-center"
                >
                  {/* Product photo (falls back to the emoji if there's no image) */}
                  <CartThumb
                    image={item.product.image}
                    emoji={emoji}
                    bgClass={bgClass}
                    sizeClass={THUMB_SIZE}
                  />
                  <div className="flex-1">
                    <p className="mb-[3px] text-[15px] font-semibold text-[#1a1a1a]">
                      {item.product.productName}
                    </p>
                    <p className="mb-2.5 text-xs text-[#aaa]">
                      {item.product.size ? `Size: ${item.product.size}` : item.product.category || ""}
                    </p>

                    {hasDiscount ? (
                      <div className="flex items-center gap-2">
                        <p className="m-0 text-sm text-[#bbb] line-through">
                          {peso(item.product.price * item.quantity)}
                        </p>
                        <p className="m-0 text-lg font-bold text-[#2d7a3a]">
                          {peso(effectivePrice * item.quantity)}
                        </p>
                        <span className="rounded-md bg-[#e53935] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          PROMO
                        </span>
                      </div>
                    ) : (
                      <p className="m-0 text-lg font-bold text-[#2d7a3a]">
                        {peso(effectivePrice * item.quantity)}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center overflow-hidden rounded-[30px] border-[1.5px] border-[#e8e8e8]">
                        <button
                          onClick={() => handleUpdateQty(item, -1)}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent text-lg font-bold text-[#2d7a3a]"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-[15px] font-semibold text-[#1a1a1a]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item, 1)}
                          className={`flex h-9 w-9 items-center justify-center border-none bg-transparent text-lg font-bold ${
                            atMax ? "cursor-not-allowed text-[#ccc]" : "cursor-pointer text-[#2d7a3a]"
                          }`}
                        >
                          +
                        </button>
                      </div>
                      {stockWarning === item.id && (
                        <span className="whitespace-nowrap text-[10px] font-semibold text-[#e53935]">
                          ⚠️ Max stock reached
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => promptRemove(item)}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-none bg-[#ffebee] text-base"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
            <Link
              href="/products"
              className="flex items-center gap-2 py-1 text-[13px] font-medium text-[#2d7a3a] no-underline"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="relative rounded-[20px] border-[0.5px] border-[#e8e8e8] bg-white p-6 min-[900px]:sticky min-[900px]:top-5">
            <p className="mb-5 text-base font-bold text-[#1a1a1a]">Order Summary</p>

            {/* Itemized list */}
            <div className="mb-4 flex flex-col gap-2.5">
              {items.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const hasDiscount =
                  item.product.finalPrice != null && item.product.finalPrice < item.product.price;

                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-[13px] text-[#555]">
                      {item.product.productName} × {item.quantity}
                    </span>
                    <div className="text-right">
                      {hasDiscount && (
                        <div className="text-[11px] text-[#bbb] line-through">
                          {peso(item.product.price * item.quantity)}
                        </div>
                      )}
                      <div className="text-[13px] font-semibold text-[#2d7a3a]">
                        {peso(effectivePrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-3.5 h-px bg-[#f0f0f0]" />

            <div className="mb-2 flex justify-between">
              <span className="text-[13px] text-[#888]">Subtotal</span>
              <span className="text-[13px] text-[#1a1a1a]">{peso(subtotal)}</span>
            </div>

            <div className="mb-2 flex justify-between">
              <span className="text-[13px] text-[#888]">VAT (12%)</span>
              <span className="text-[13px] text-[#1a1a1a]">{peso(vat)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="mb-2 flex justify-between">
                <span className="text-[13px] text-[#e53935]">🏷️ You saved (promo)</span>
                <span className="text-[13px] font-semibold text-[#e53935]">{peso(totalDiscount)}</span>
              </div>
            )}

            <div className="my-3.5 h-px bg-[#f0f0f0]" />

            <div className="mb-5 flex items-center justify-between">
              <span className="text-base font-bold text-[#1a1a1a]">Total</span>
              <span className="text-[22px] font-bold text-[#2d7a3a]">{peso(total)}</span>
            </div>

            {/* Payment Method */}
            <p className="mb-2.5 text-xs text-[#aaa]">Payment Method</p>
            <div className="mb-4 flex gap-2">
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
                  className={`flex-1 cursor-pointer rounded-[10px] p-2.5 font-sans text-xs font-semibold ${
                    paymentMethod === m.key
                      ? "border-2 border-[#2d7a3a] bg-[#f0faf2] text-[#2d7a3a]"
                      : "border-[1.5px] border-[#e0e0e0] bg-white text-[#888]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── GCash notice (opens the timed form) ── */}
            {paymentMethod === "gcash" && (
              <div className="rounded-[14px] border border-[#e0c8ff] bg-[#f8f0ff] p-4">
                {gcashExpired && (
                  <div className="mb-3 rounded-[10px] border border-[#ef9a9a] bg-[#ffebee] px-3 py-2.5 text-xs font-semibold text-[#c62828]">
                    ⏱️ Your payment session expired. Please click Continue to start again.
                  </div>
                )}

                <p className="mb-2 text-[13px] font-bold text-[#6a1b9a]">📲 GCash Payment Notice</p>
                <p className="mb-2.5 text-[12.5px] leading-[1.6] text-[#555]">
                  Please prepare <strong className="text-[#2d7a3a]">{peso(total)}</strong> in your GCash
                  account before continuing. You will have{" "}
                  <strong>{Math.floor(GCASH_TIME_LIMIT_SECONDS / 60)} minutes</strong> to scan the QR code,
                  pay the exact amount, then enter your reference number and upload your payment
                  screenshot.
                </p>
                <p className="mb-3.5 text-[11.5px] leading-normal text-[#8e6bb0]">
                  If the time runs out, the form will close and you will need to click Continue again.
                </p>

                <button
                  onClick={openGcashForm}
                  disabled={hasStockIssue}
                  className={`w-full rounded-[30px] border-none p-[13px] text-sm font-bold text-white ${
                    hasStockIssue
                      ? "cursor-not-allowed bg-[#ccc]"
                      : "cursor-pointer bg-[#6a1b9a] shadow-[0_6px_18px_rgba(106,27,154,0.3)]"
                  }`}
                >
                  {hasStockIssue ? "⚠️ Reduce quantity to match stock" : "Continue →"}
                </button>
              </div>
            )}

            {/* ── COD Section with Cash Change Calculator ── */}
            {paymentMethod === "cod" && (
              <>
                <div className="mb-4 rounded-[14px] border border-[#a5d6a7] bg-[#f0faf2] p-4">
                  <p className="mb-3.5 text-xs text-[#2e7d32]">
                    💵 Pay in cash when your order arrives. Please prepare the exact amount.
                  </p>

                  <div className="rounded-[10px] border border-[#c8e6c9] bg-white p-3.5">
                    <p className="mb-2.5 text-xs font-semibold text-[#1b5e20]">🧮 Change Calculator</p>

                    <div className="mb-2.5 flex justify-between">
                      <span className="text-xs text-[#888]">Amount Due</span>
                      <span className="text-[13px] font-bold text-[#1a1a1a]">{peso(total)}</span>
                    </div>

                    <label className="mb-1.5 block text-xs font-semibold text-[#2e7d32]">
                      Customer Cash (₱)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      placeholder={`e.g. ${Math.ceil(total + 50)}`}
                      className={`box-border w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] outline-none ${
                        cashInput
                          ? isExactOrOver
                            ? "border-[#2d7a3a]"
                            : "border-[#e53935]"
                          : "border-[#c8e6c9]"
                      }`}
                    />

                    {cashInput !== "" && (
                      <div
                        className={`mt-3 flex items-center justify-between rounded-[10px] border-[1.5px] px-3.5 py-3 ${
                          isExactOrOver
                            ? "border-[#a5d6a7] bg-[#e8f5e9]"
                            : "border-[#ef9a9a] bg-[#ffebee]"
                        }`}
                      >
                        <span
                          className={`text-[13px] font-semibold ${
                            isExactOrOver ? "text-[#2e7d32]" : "text-[#c62828]"
                          }`}
                        >
                          {isExactOrOver ? "💰 Change" : "⚠️ Insufficient"}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            isExactOrOver ? "text-[#2d7a3a]" : "text-[#e53935]"
                          }`}
                        >
                          {isExactOrOver ? peso(change) : `−${peso(Math.abs(change))}`}
                        </span>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[
                        Math.ceil(total),
                        Math.ceil(total / 50) * 50,
                        Math.ceil(total / 100) * 100,
                        Math.ceil(total / 500) * 500,
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .slice(0, 4)
                        .map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setCashInput(String(amt))}
                            className={`cursor-pointer rounded-[20px] border-[1.5px] border-[#a5d6a7] px-2.5 py-[5px] text-[11px] font-semibold ${
                              cashInput === String(amt)
                                ? "bg-[#2d7a3a] text-white"
                                : "bg-white text-[#2e7d32]"
                            }`}
                          >
                            ₱{amt.toLocaleString()}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={canCheckoutCod ? "/checkout" : "#"}
                  onClick={(e) => {
                    if (!canCheckoutCod) {
                      e.preventDefault();
                      return;
                    }
                    sessionStorage.setItem("paymentMethod", "cod");
                    sessionStorage.setItem("cashGiven", cashInput);
                    sessionStorage.removeItem("gcashRef");
                    sessionStorage.removeItem("gcashReceiptUrl");
                    sessionStorage.removeItem("gcashProof");
                  }}
                  className={`block rounded-[30px] p-3.5 text-center text-[15px] font-bold text-white no-underline ${
                    canCheckoutCod
                      ? "cursor-pointer bg-[#2d7a3a] shadow-[0_6px_20px_rgba(45,122,58,0.3)]"
                      : "cursor-not-allowed bg-[#ccc]"
                  }`}
                >
                  {hasStockIssue
                    ? "⚠️ Reduce quantity to match stock"
                    : !canCheckoutCod
                    ? "Enter Cash Amount First"
                    : "Proceed to Checkout →"}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}