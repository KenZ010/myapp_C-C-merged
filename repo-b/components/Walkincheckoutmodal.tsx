"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";

const VAT_RATE = 0.12;

export type WalkInCartItem = {
  id:          string;
  productName: string;
  size?:       string | null;
  qty:         number;
  finalPrice:  number;
};

type Props = {
  cart:       WalkInCartItem[];
  onClose:    () => void;   // cashier backed out before placing the order
  onComplete: () => void;   // order placed → page clears the cart and closes the modal
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const formatMoney = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inputCls =
  "wi-input w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none " +
  "bg-white text-gray-900 placeholder:text-gray-500 " +
  "focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

export default function WalkInCheckoutModal({ cart, onClose, onComplete }: Props) {
  const [method, setMethod]               = useState<"cash" | "gcash">("cash");
  const [cashGiven, setCashGiven]         = useState("");
  const [gcashRef, setGcashRef]           = useState("");
  const [walkInName, setWalkInName]       = useState("");
  const [walkInPhone, setWalkInPhone]     = useState("");
  const [walkInAddress, setWalkInAddress] = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [done, setDone] = useState<{ saleId: string; total: number; change: number | null } | null>(null);

  const subtotal  = useMemo(() => cart.reduce((s, i) => s + i.finalPrice * i.qty, 0), [cart]);
  const vat       = round2(subtotal * VAT_RATE);
  const total     = round2(subtotal + vat);
  const caseCount = cart.reduce((s, i) => s + i.qty, 0);

  const given  = parseFloat(cashGiven);
  const change = Number.isFinite(given) ? round2(given - total) : null;
  const refDigits = gcashRef.replace(/\D/g, "");

  const canSubmit =
    cart.length > 0 &&
    walkInName.trim().length > 0 &&
    walkInAddress.trim().length > 0 &&
    !submitting &&
    (method === "cash"
      ? Number.isFinite(given) && given + 0.005 >= total
      : refDigits.length === 13);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // The server recalculates prices; we only send what was bought.
      const res = await api.placeWalkInOrder({
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
        paymentMethod: method,
        cashGiven: method === "cash" ? given : undefined,
        gcashRef: method === "gcash" ? refDigits : undefined,
        walkInName: walkInName.trim(),
        walkInPhone: walkInPhone.trim() || undefined,
        walkInAddress: walkInAddress.trim(),
      });
      setDone({
        saleId: res.saleId,
        total: res.totalAmount ?? total,
        change: method === "cash" ? res.change ?? change : null,
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdrop = () => {
    if (submitting) return;
    if (done) onComplete();
    else onClose();
  };

  return (
    <>
      <div
        onClick={handleBackdrop}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Walk-in checkout"
        className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(920px,94vw)] max-h-[92vh] overflow-y-auto
                   bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        style={{ colorScheme: "light", color: "#111827" }}
      >
        {/* Force readable inputs even if a global/dark-theme style targets <input> */}
        <style>{`
          .wi-input {
            background-color: #ffffff !important;
            color: #111827 !important;
            -webkit-text-fill-color: #111827 !important;
            caret-color: #111827 !important;
            border-color: #9ca3af !important;
            opacity: 1 !important;
          }
          .wi-input::placeholder {
            color: #6b7280 !important;
            -webkit-text-fill-color: #6b7280 !important;
            opacity: 1 !important;
          }
          .wi-input:focus {
            border-color: #7c3aed !important;
          }
        `}</style>

        {/* ── Success view ── */}
        {done ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-gray-900">Order placed &amp; paid</h2>
            <p className="text-xs text-gray-400 mt-1">Order {done.saleId}</p>
            <p className="text-xs text-gray-500 mt-2">
              Status: Pending. Give the customer this order number. Move it to Out for Delivery from
              Active Orders, then mark it Completed once it arrives.
            </p>

            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold tabular-nums">{formatMoney(done.total)}</span>
              </div>
              {done.change !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Change</span>
                  <span className="font-bold text-green-700 tabular-nums">{formatMoney(done.change)}</span>
                </div>
              )}
            </div>

            <button
              onClick={onComplete}
              className="mt-6 w-full h-11 rounded-full bg-[#1a3c2e] hover:bg-[#14301f] text-white text-sm font-bold"
            >
              New order
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Walk-in order</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  For customers without an account. They pay here, then wait for the order to arrive.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center
                           justify-center text-lg leading-none flex-shrink-0 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[1fr_340px]">
              {/* ── Left: customer + payment ── */}
              <div className="space-y-5">
                <section>
                  <h2 className="text-sm font-bold text-gray-900 mb-1">Customer details</h2>
                  <p className="text-[11px] text-gray-500 mb-3">So staff know whose order this is and where it goes.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="Name *"
                      maxLength={80}
                      className={inputCls}
                    />
                    <input
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      placeholder="Phone"
                      inputMode="tel"
                      maxLength={20}
                      className={inputCls}
                    />
                    <input
                      value={walkInAddress}
                      onChange={(e) => setWalkInAddress(e.target.value)}
                      placeholder="Delivery address *"
                      maxLength={200}
                      className={`sm:col-span-2 ${inputCls}`}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Payment method</h2>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(["cash", "gcash"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMethod(m); setError(null); }}
                        className={[
                          "py-3 rounded-xl text-sm font-semibold border transition-all",
                          method === m
                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {m === "cash" ? "💵 Cash" : "📱 GCash"}
                      </button>
                    ))}
                  </div>

                  {method === "cash" ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cash received</label>
                      <input
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value.replace(/[^\d.]/g, ""))}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="wi-input w-full px-4 py-3 rounded-xl border border-gray-300 text-lg font-semibold tabular-nums
                                   bg-white text-gray-900 placeholder:text-gray-500
                                   outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => setCashGiven(String(total))}
                          className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Exact
                        </button>
                        {[500, 1000, 2000, 5000].map((v) => (
                          <button
                            key={v}
                            onClick={() => setCashGiven(String(v))}
                            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            ₱{v.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Change</span>
                        {change === null ? (
                          <span className="text-gray-300 font-bold">—</span>
                        ) : change < 0 ? (
                          <span className="text-red-600 font-bold text-sm tabular-nums">
                            Short by {formatMoney(Math.abs(change))}
                          </span>
                        ) : (
                          <span className="text-green-700 font-extrabold text-xl tabular-nums">{formatMoney(change)}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        GCash reference number
                      </label>
                      <input
                        value={gcashRef}
                        onChange={(e) => setGcashRef(e.target.value.replace(/[^\d\s-]/g, ""))}
                        inputMode="numeric"
                        placeholder="13-digit reference no."
                        className="wi-input w-full px-4 py-3 rounded-xl border border-gray-300 text-base font-semibold tabular-nums
                                   tracking-wide bg-white text-gray-900 placeholder:text-gray-500
                                   outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                      <p className={`text-[11px] mt-1.5 ${refDigits.length === 13 ? "text-green-600" : "text-gray-400"}`}>
                        {refDigits.length}/13 digits · Confirm the payment of{" "}
                        <strong>{formatMoney(total)}</strong> in the shop&apos;s GCash app before placing the order.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* ── Right: order summary ── */}
              <aside className="rounded-2xl border border-gray-200 bg-gray-50/50 h-fit">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Order summary</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {cart.length} product{cart.length !== 1 ? "s" : ""} · {caseCount} case{caseCount !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="px-5 py-2 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {cart.map((i) => (
                    <div key={i.id} className="py-2.5 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{i.productName}</p>
                        <p className="text-[11px] text-gray-400 tabular-nums">
                          {i.qty} × {formatMoney(i.finalPrice)}
                          {i.size ? ` · ${i.size}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 tabular-nums flex-shrink-0">
                        {formatMoney(i.finalPrice * i.qty)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>VAT (12%)</span>
                    <span className="tabular-nums">{formatMoney(vat)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total</span>
                    <span className="text-2xl font-extrabold text-[#1a3c2e] tabular-nums">{formatMoney(total)}</span>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {error && (
                    <div className="mb-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full h-12 rounded-full text-sm font-bold text-white transition-all active:scale-95
                               bg-[#1a3c2e] hover:bg-[#14301f] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Placing order…" : "Place order"}
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}