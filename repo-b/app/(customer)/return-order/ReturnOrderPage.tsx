// PIXEL-PERFECT Tailwind conversion (matches original inline styles closely)

"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// types unchanged

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

const RETURNABLE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED"];

function maxReturnable(line: OrderLine) {
  return line.quantity * line.piecesPerCase - line.returnedQty;
}

// shimmer animation restored
const shimmer = "bg-[linear-gradient(90deg,#f0f0f0_25%,#e8e8e8_50%,#f0f0f0_75%)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]";

function SkeletonRow() {
  return (
    <div className="flex gap-4 items-center px-[20px] py-[18px] border-b border-[#f5e8ec]">
      {[200, 120, 80, 60].map((w, i) => (
        <div
          key={i}
          className={`h-[13px] rounded-[6px] ${shimmer}`}
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

function ReturnFormModal({ order, onClose, onSuccess }: any) {
  const [selectedLines, setSelectedLines] = useState<any>({});
  const [quantities, setQuantities] = useState<any>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnableLines = order.orderLines.filter((l: OrderLine) => maxReturnable(l) > 0);

  const canSubmit = returnableLines.some((l: OrderLine) => selectedLines[l.id]) && reason && !submitting;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-[500px] bg-white rounded-[20px] shadow-[0_24px_64px_rgba(233,30,140,0.18)] max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-[linear-gradient(135deg,#c2185b,#e91e8c)] px-[24px] py-[22px] flex justify-between items-center">
          <div>
            <p className="text-white/70 text-[11px] mb-[2px]">Return Request</p>
            <h3 className="text-white text-[16px] font-extrabold">Order #{order.id}</h3>
          </div>
          <button className="bg-white/20 rounded-full w-[32px] h-[32px] text-white">✕</button>
        </div>

        <div className="px-[24px] py-[20px] flex flex-col gap-[16px]">
          {error && (
            <div className="bg-[#ffeaea] border border-[#ffb3b3] rounded-[10px] px-[14px] py-[10px] text-[13px] text-[#c62828]">
              ⚠️ {error}
            </div>
          )}

          <div>
            <p className="text-[12px] font-bold text-[#c2185b] uppercase tracking-[0.5px] mb-[10px]">
              1 · Select items to return
            </p>

            {returnableLines.map((line: OrderLine) => {
              const max = maxReturnable(line);
              return (
                <div key={line.id} className="mb-[8px]">
                  <div className="flex items-center gap-[12px] px-[14px] py-[12px] rounded-[10px] border border-[#f0e0e8] bg-[#fff8fa]">
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#1a1a1a]">
                        {line.productName}
                      </p>
                      <p className="text-[11px] text-[#aaa]">
                        {line.quantity} × {line.piecesPerCase}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold text-[#c2185b]">
                      Max: {max}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#c2185b] uppercase tracking-[0.5px] mb-[8px]">
              2 · Reason for return
            </p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-[14px] py-[11px] rounded-[10px] border-[1.5px] border-[#f0e0e8] bg-[#fff8fa] text-[13px]"
            >
              <option value="">Select a reason...</option>
              <option value="WRONG_ITEM_SENT">Wrong item delivered</option>
              <option value="DAMAGED">Damaged / broken item</option>
              <option value="EXPIRED">Expired product</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <button
            disabled={!canSubmit}
            className={`w-full py-[14px] rounded-[30px] text-white text-[14px] font-bold transition-all ${
              canSubmit
                ? "bg-[linear-gradient(135deg,#ff6b8a,#e91e8c)] shadow-[0_6px_20px_rgba(233,30,140,0.35)]"
                : "bg-[#f0c0cc]"
            }`}
          >
            {submitting ? "Submitting…" : "Submit Return Request"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function ReturnOrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="p-[clamp(14px,3vw,28px)] bg-[#fdf2f6] min-h-[calc(100vh-56px)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-[16px] mb-[12px] overflow-hidden">
            <SkeletonRow />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-[#fdf2f6]">
        <p className="text-[16px] font-bold text-[#c62828]">⚠️ {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-[clamp(14px,3vw,28px)] bg-[#fdf2f6] min-h-[calc(100vh-56px)]">
        <div className="bg-[linear-gradient(135deg,#c2185b,#e91e8c,#ff6b8a)] rounded-[16px] px-[24px] py-[20px] mb-[20px] flex justify-between items-center">
          <div>
            <p className="text-white/75 text-[12px]">Return Orders</p>
            <h2 className="text-white text-[26px] font-extrabold">My Orders</h2>
          </div>
          <h2 className="text-white text-[32px] font-extrabold">{orders.length}</h2>
        </div>

        <div className="bg-white rounded-[16px] border border-[#f5e0e8] overflow-hidden">
          {orders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[1fr_1fr_2fr_1fr_auto] gap-[12px] px-[20px] py-[16px] border-b border-[#fdf0f5] items-center hover:bg-[#fff8fa] transition"
            >
              <p className="text-[13px] font-bold text-[#1a1a1a]">
                #{order.id.slice(0, 8)}
              </p>
              <p className="text-[12px] text-[#555]">{order.date}</p>
              <p className="text-[12px] text-[#555]">
                {order.orderLines.length} items
              </p>
              <p className="text-[14px] font-extrabold text-[#c2185b]">
                ₱{order.total}
              </p>
              <button
                onClick={() => setSelected(order)}
                className="bg-[linear-gradient(135deg,#ff6b8a,#e91e8c)] text-white text-[12px] font-bold px-[16px] py-[8px] rounded-[20px] shadow-[0_4px_12px_rgba(233,30,140,0.3)]"
              >
                Return
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <ReturnFormModal
          order={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => setSelected(null)}
        />
      )}
    </>
  );
}
