"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
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

type Customer = {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  SOFTDRINKS:   "🥤",
  ENERGY_DRINK: "⚡",
  BEER:         "🍺",
  JUICE:        "🍹",
  WATER:        "💧",
  OTHER:        "🛒",
};

const BG_MAP: Record<string, string> = {
  SOFTDRINKS:   "bg-red-900",
  ENERGY_DRINK: "bg-indigo-950",
  BEER:         "bg-amber-600",
  JUICE:        "bg-green-800",
  WATER:        "bg-sky-600",
  OTHER:        "bg-zinc-700",
};

const getEmoji = (cat?: string) => EMOJI_MAP[cat?.toUpperCase() ?? ""] ?? "🥤";
const getBg    = (cat?: string) => BG_MAP[cat?.toUpperCase()    ?? ""] ?? "bg-zinc-700";

const getEffectivePrice = (item: CartItem) =>
  item.product.finalPrice != null && item.product.finalPrice < item.product.price
    ? item.product.finalPrice
    : item.product.price;

const getCustomerId = (): string => {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(localStorage.getItem("user") ?? "{}")?.id ?? ""; }
  catch { return ""; }
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();

  const [items,         setItems]         = useState<CartItem[]>([]);
  const [customer,      setCustomer]      = useState<Customer | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [placing,       setPlacing]       = useState(false);
  const [note,          setNote]          = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [gcashRef,      setGcashRef]      = useState("");
  const [cashGiven,     setCashGiven]     = useState("");

  const fetchCart = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) { setLoading(false); return; }
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
    const customerId = getCustomerId();
    if (customerId) {
      api.getCustomer(customerId)
        .then((data) => setCustomer({
          id:      data.id,
          name:    data.name    || "—",
          phone:   data.phone   || data.contactNumber || "—",
          address: data.address || "—",
        }))
        .catch(() => {
          const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
          setCustomer(stored);
        });
    }

    const pm   = sessionStorage.getItem("paymentMethod") as "cod" | "gcash" | null;
    const ref  = sessionStorage.getItem("gcashRef") ?? "";
    const cash = sessionStorage.getItem("cashGiven") ?? "";
    if (pm)   setPaymentMethod(pm);
    if (ref)  setGcashRef(ref);
    if (cash) setCashGiven(cash);

    fetchCart();
  }, [fetchCart]);

  const subtotal      = items.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0);
  const totalDiscount = items.reduce((sum, i) => {
    const fp = i.product.finalPrice;
    return fp != null && fp < i.product.price
      ? sum + (i.product.price - fp) * i.quantity
      : sum;
  }, 0);
  const VAT_RATE = 0.12;
  const vat  = subtotal * VAT_RATE;
  const total = subtotal + vat;

  // ── Cash / change calculation (carried over from CartPage) ──────────────────
  const cashAmount    = parseFloat(cashGiven.replace(/,/g, "")) || 0;
  const change        = cashAmount - total;
  const isExactOrOver = cashAmount >= total;

  const handlePlaceOrder = () => {
    const customerId = getCustomerId();
    if (!customerId || items.length === 0) return;

    // Save order snapshot to localStorage — OrderPlacedPage reads this and calls the API
    localStorage.setItem("pendingOrder", JSON.stringify({
      customerId,
      paymentMethod,
      gcashRef: paymentMethod === "gcash" ? gcashRef : undefined,
      cashGiven: paymentMethod === "cod" ? cashGiven || undefined : undefined,
      note:     note.trim() || undefined,
      items:    items.map((i) => ({
        productId: i.productId,
        quantity:  i.quantity,
        price:     getEffectivePrice(i),
      })),
    }));

    sessionStorage.removeItem("paymentMethod");
    sessionStorage.removeItem("gcashRef");
    sessionStorage.removeItem("cashGiven");

    setPlacing(true);
    router.push("/order-placed");
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-7 bg-gray-100 min-h-[calc(100vh-56px)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 max-w-[1000px] mx-auto">
          <div className="flex flex-col gap-4">
            {[140, 100, 260, 100].map((h, i) => (
              <SkeletonBlock key={i} className={`h-[${h}px]`} />
            ))}
          </div>
          <SkeletonBlock className="h-[420px]" />
        </div>
      </div>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 bg-gray-100">
        <span className="text-6xl">🛒</span>
        <p className="text-lg font-semibold text-gray-900">No items to checkout</p>
        <Link
          href="/products"
          className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-full text-sm font-semibold transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="p-7 bg-gray-100 min-h-[calc(100vh-56px)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 max-w-[1000px] mx-auto items-start">

        {/* ── LEFT ── */}
        <div className="flex flex-col gap-4">

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-bold text-gray-900 mb-3">📍 Delivery Address</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">{customer?.name ?? "—"}</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">{customer?.phone ?? "—"}</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">{customer?.address ?? "—"}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-bold text-gray-900 mb-3">💳 Payment Method</p>
            {paymentMethod === "cod" ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">💵</span>
                  <div>
                    <p className="text-[13px] font-semibold text-green-700">Cash on Delivery</p>
                    <p className="text-[11px] text-gray-400">Please prepare the exact amount upon delivery.</p>
                  </div>
                </div>

                {/* ── Cash given / change summary (carried over from cart) ── */}
                {cashGiven && (
                  <div className="bg-white rounded-xl border border-green-100 p-3 mt-1">
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-gray-400">Amount Due</span>
                      <span className="font-semibold text-gray-900">
                        ₱{total.toLocaleString()}.00
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-gray-400">Customer Cash</span>
                      <span className="font-semibold text-gray-900">
                        ₱{cashAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div
                      className={[
                        "flex justify-between items-center mt-2 px-3 py-2 rounded-lg",
                        isExactOrOver ? "bg-green-50" : "bg-red-50",
                      ].join(" ")}
                    >
                      <span
                        className={`text-[12px] font-semibold ${
                          isExactOrOver ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {isExactOrOver ? "💰 Change" : "⚠️ Insufficient"}
                      </span>
                      <span
                        className={`text-base font-bold ${
                          isExactOrOver ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {isExactOrOver
                          ? `₱${change.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : `−₱${Math.abs(change).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-[13px] font-semibold text-purple-700">GCash</p>
                  <p className="text-[11px] text-gray-400">
                    Ref no: <span className="font-semibold text-purple-700">{gcashRef}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-bold text-gray-900 mb-4">🛒 Order Items</p>
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const hasDiscount    = item.product.finalPrice != null && item.product.finalPrice < item.product.price;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${getBg(item.product.category)} flex items-center justify-center text-2xl shrink-0`}>
                      {getEmoji(item.product.category)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {item.product.productName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.product.size ? `Size: ${item.product.size}` : item.product.category ?? ""}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {hasDiscount && (
                        <p className="text-[11px] text-gray-300 line-through">
                          ₱{(item.product.price * item.quantity).toLocaleString()}.00
                        </p>
                      )}
                      <p className="text-sm font-bold text-green-700">
                        ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                      </p>
                      <p className="text-[11px] text-gray-400">qty: {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Note */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-bold text-gray-900 mb-3">
              📝 Delivery Note{" "}
              <span className="text-[12px] font-normal text-gray-400">(Optional)</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please call before delivery, leave at gate..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-900 outline-none focus:border-green-500 transition-colors resize-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* ── RIGHT: Summary ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:sticky lg:top-5">
          <p className="text-base font-bold text-gray-900 mb-5">Order Summary</p>

          {/* Line items */}
          <div className="flex flex-col gap-2.5 mb-4">
            {items.map((item) => {
              const effectivePrice = getEffectivePrice(item);
              const hasDiscount    = item.product.finalPrice != null && item.product.finalPrice < item.product.price;
              return (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500 truncate max-w-[180px]">
                    {item.product.productName} × {item.quantity}
                  </span>
                  <div className="text-right">
                    {hasDiscount && (
                      <div className="text-[11px] text-gray-300 line-through">
                        ₱{(item.product.price * item.quantity).toLocaleString()}.00
                      </div>
                    )}
                    <div className="text-[13px] font-semibold text-green-700">
                      ₱{(effectivePrice * item.quantity).toLocaleString()}.00
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-gray-100 my-3" />

          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-gray-400">Subtotal</span>
            <span className="text-[13px] text-gray-900">₱{subtotal.toLocaleString()}.00</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-[13px] text-red-500">🏷️ Promo Discount</span>
              <span className="text-[13px] font-semibold text-red-500">
                −₱{totalDiscount.toLocaleString()}.00
              </span>
            </div>
          )}

          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-gray-400">VAT (12%)</span>
            <span className="text-[13px] text-gray-900">
              ₱{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="h-px bg-gray-100 my-3" />

          <div className="flex justify-between items-center mb-6">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-2xl font-extrabold text-green-700">
              ₱{total.toLocaleString()}.00
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className={[
              "w-full py-4 rounded-full text-white text-[15px] font-bold transition-all",
              placing
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-700 hover:bg-green-800 shadow-lg shadow-green-700/30 active:scale-95",
            ].join(" ")}
          >
            {placing ? "Redirecting…" : "✅ Place Order"}
          </button>

          <Link
            href="/cart"
            className="block text-center text-[13px] text-gray-400 hover:text-gray-600 mt-4 transition-colors"
          >
            ← Back to Cart
          </Link>
        </div>

      </div>
    </div>
  );
}