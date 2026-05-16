"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── Data ─────────────────────────────────────────────────────────────────────

const quickCards = [
  { href: "/products",     icon: "🥤", iconBg: "bg-emerald-50", label: "Products",  desc: "Browse our soft drink selection" },
  { href: "/orders",       icon: "📦", iconBg: "bg-green-50",   label: "My Orders", desc: "Track your orders" },
  { href: "/contact",      icon: "📞", iconBg: "bg-orange-50",  label: "Contacts",  desc: "Get in touch with us" },
  { href: "/transactions", icon: "🕐", iconBg: "bg-blue-50",    label: "History",   desc: "Your completed transactions" },
];

const promos = [
  {
    label: "Today's Promo",
    title: "Buy 3, Get 1 Free!",
    desc: "On selected soft drinks — today only",
    emoji: "🎉",
    gradientFrom: "from-emerald-700",
    gradientTo: "to-emerald-500",
  },
  {
    label: "New Arrival",
    title: "Fanta Grape is here!",
    desc: "Try our newest flavor now",
    emoji: "🍇",
    gradientFrom: "from-purple-900",
    gradientTo: "to-purple-700",
  },
  {
    label: "Free Delivery",
    title: "Free delivery on ₱1,000+",
    desc: "Order more, save more",
    emoji: "🚚",
    gradientFrom: "from-blue-800",
    gradientTo: "to-blue-500",
  },
];

const INTERVAL_MS = 3500;

// ─── Types ────────────────────────────────────────────────────────────────────

type TxItem = { name: string; qty: number; price: number };

type ReceiptData = {
  id: string;
  date: string;
  total: number;
  paymentMethod: string;
  status: string;
  items: TxItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusClasses(status: string): { text: string; bg: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "out_for_delivery" || s === "out for delivery")
    return { text: "text-orange-700", bg: "bg-orange-50" };
  if (s === "delivered" || s === "received" || s === "completed")
    return { text: "text-green-700", bg: "bg-green-50" };
  if (s === "processing" || s === "pending")
    return { text: "text-blue-700", bg: "bg-blue-50" };
  if (s === "cancelled")
    return { text: "text-red-700", bg: "bg-red-50" };
  return { text: "text-gray-600", bg: "bg-gray-100" };
}

function formatStatus(status: string) {
  return (status ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000
  );
  if (diffDays === 0)
    return "Today, " + d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatDateLong(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function orderLabel(order: Record<string, unknown>) {
  const items = (order.items ?? order.orderLines ?? order.orderItems ?? []) as Record<string, unknown>[];
  if (!items.length) return "Order #" + ((order._id ?? order.id ?? "") as string).slice(-6);
  const first = items[0];
  const productName =
    (first.productName as string) ??
    ((first.product as Record<string, unknown>)?.name as string) ??
    "Item";
  const qty = (first.quantity ?? first.qty ?? 1) as number;
  const extra = items.length > 1 ? ` +${items.length - 1} more` : "";
  return `${productName} x${qty}${extra}`;
}

function normalizeToReceipt(order: Record<string, unknown>): ReceiptData {
  const rawItems = (order.items ?? order.orderLines ?? order.orderItems ?? []) as Record<string, unknown>[];

  const items: TxItem[] = rawItems.map((i) => {
    const product = i.product as Record<string, unknown> | null;
    return {
      name: product
        ? String(product.productName ?? product.name ?? "Item")
        : String(i.productName ?? i.name ?? "Item"),
      qty: Number(i.quantity ?? i.qty ?? 1),
      price: Number(i.price ?? i.unitPrice ?? 0),
    };
  });

  const payment = order.payment as Record<string, unknown> | null;
  const rawDate = String(order.createdAt ?? order.date ?? "");

  return {
    id: String(order._id ?? order.id ?? ""),
    date: formatDateLong(rawDate),
    total: Number(
      order.totalAmount ?? items.reduce((s, i) => s + i.price * i.qty, 0)
    ),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    status: String(order.status ?? "pending"),
    items,
  };
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(400px,92vw)] bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a3c2e] to-[#2d7a3a] px-7 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/20 border-0 text-white text-sm cursor-pointer flex items-center justify-center hover:bg-white/30"
          >
            ✕
          </button>
          <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-2xl mx-auto mb-2.5">
            🧾
          </div>
          <p className="text-white text-lg font-extrabold m-0">Julieta Soft Drinks</p>
          <p className="text-white/65 text-xs m-0">Official Receipt</p>
        </div>

        {/* Zigzag edge */}
        <div
          className="h-3"
          style={{
            background:
              "linear-gradient(135deg,#2d7a3a 25%,transparent 25%) -10px 0," +
              "linear-gradient(225deg,#2d7a3a 25%,transparent 25%) -10px 0," +
              "linear-gradient(315deg,#2d7a3a 25%,transparent 25%)," +
              "linear-gradient(45deg,#2d7a3a 25%,transparent 25%)",
            backgroundSize: "20px 12px",
            backgroundRepeat: "repeat-x",
          }}
        />

        {/* Body */}
        <div className="px-7 py-5">
          {[
            ["Order ID", receipt.id],
            ["Date", receipt.date],
            ["Payment", receipt.paymentMethod],
            ["Status", formatStatus(receipt.status)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between mb-2">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-xs font-semibold text-gray-700">{value}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-200 my-3.5" />

          <p className="text-[11px] font-bold text-gray-900 mb-2.5 uppercase tracking-wide">
            Items Ordered
          </p>

          {receipt.items.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No item details available.</p>
          ) : (
            receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between mb-2">
                <div>
                  <p className="text-[13px] text-gray-700 m-0">{item.name}</p>
                  <p className="text-[11px] text-gray-400 m-0">
                    x{item.qty} × ₱{item.price.toLocaleString()}.00
                  </p>
                </div>
                <span className="text-[13px] font-semibold">
                  ₱{(item.price * item.qty).toLocaleString()}.00
                </span>
              </div>
            ))
          )}

          <div className="border-t border-dashed border-gray-200 my-3.5" />

          <div className="bg-[#f0faf2] rounded-xl px-4 py-3 flex justify-between items-center mb-4">
            <span className="text-[15px] font-bold text-gray-900">TOTAL</span>
            <span className="text-[22px] font-extrabold text-[#1a3c2e]">
              ₱{receipt.total.toLocaleString()}.00
            </span>
          </div>

          <div className="text-center pt-3.5 border-t border-dashed border-gray-200">
            <p className="text-xs text-emerald-700 font-semibold mb-1">
              Thank you for your purchase! 🎉
            </p>
            <p className="text-[11px] text-gray-400">
              Julieta Soft Drink Store • TECHNOLOGIA @2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [promoIndex, setPromoIndex] = useState(0);
  const [animating,  setAnimating]  = useState(false);
  const [direction,  setDirection]  = useState<"left" | "right">("left");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [customerName,  setCustomerName]  = useState<string>("there");
  const [recentOrders,  setRecentOrders]  = useState<Record<string, unknown>[]>([]);
  const [orderStats,    setOrderStats]    = useState({ total: 0, pending: 0, completed: 0 });
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [formattedDates, setFormattedDates] = useState<string[]>([]);

  // Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  // Load customer + orders
  useEffect(() => {
    async function loadData() {
      try {
        const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const user = userRaw ? JSON.parse(userRaw) : null;
        const customerId: string | undefined = user?._id ?? user?.id ?? user?.customerId;

        if (user?.name) setCustomerName(user.name.toUpperCase());

        if (!customerId) return;

        if (!user?.name) {
          const fresh = await api.getCustomer(customerId);
          if (fresh?.name) setCustomerName(fresh.name.toUpperCase());
        }

        const orders: Record<string, unknown>[] = await api.getCustomerOrders(customerId);

        const sorted = [...orders].sort((a, b) => {
          const da = new Date((a.createdAt ?? a.date ?? "") as string).getTime();
          const db = new Date((b.createdAt ?? b.date ?? "") as string).getTime();
          return db - da;
        });

        const recent = sorted.slice(0, 3);
        setRecentOrders(recent);

        setFormattedDates(
          recent.map((o) => formatDate((o.createdAt ?? o.date ?? "") as string))
        );

        const total     = orders.length;
        const completed = orders.filter((o) => {
          const s = ((o.status ?? "") as string).toLowerCase();
          return s === "completed" || s === "delivered" || s === "received";
        }).length;
        const pending   = orders.filter((o) => {
          const s = ((o.status ?? "") as string).toLowerCase();
          return s === "pending" || s === "processing" || s === "out_for_delivery" || s === "out for delivery";
        }).length;

        setOrderStats({ total, pending, completed });
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setLoadingOrders(false);
      }
    }
    loadData();
  }, []);

  // Promo carousel
  const goTo = (next: number, dir: "left" | "right") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setPromoIndex(next);
      setAnimating(false);
    }, 350);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPromoIndex((prev) => {
        const next = (prev + 1) % promos.length;
        setDirection("left");
        setAnimating(true);
        setTimeout(() => setAnimating(false), 350);
        return next;
      });
    }, INTERVAL_MS);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleDotClick = (i: number) => {
    goTo(i, i > promoIndex ? "left" : "right");
    startTimer();
  };

  const handleOrderClick = (order: Record<string, unknown>) => {
    setSelectedReceipt(normalizeToReceipt(order));
  };

  const promo = promos[promoIndex];

  const slideClass = animating
    ? direction === "left" ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4"
    : "opacity-100 translate-x-0";

  const stats = [
    { label: "Total Orders", value: orderStats.total,     icon: "📦", textColor: "text-emerald-900", bg: "bg-green-50" },
    { label: "Pending",      value: orderStats.pending,   icon: "⏳", textColor: "text-yellow-700",  bg: "bg-yellow-50" },
    { label: "Completed",    value: orderStats.completed, icon: "✅", textColor: "text-green-700",   bg: "bg-green-50" },
  ];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">

      {/* Greeting */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">
            Good day, {customerName} 👋
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Welcome back to Julieta Soft Drink Store
          </p>
        </div>
      </div>

      {/* Promo Banner Carousel */}
      <div
        className={`relative rounded-2xl px-8 py-7 min-h-[140px] flex items-center justify-between gap-3 overflow-hidden mb-3 bg-gradient-to-br ${promo.gradientFrom} ${promo.gradientTo} transition-all duration-500`}
      >
        <button
          onClick={() => handleDotClick((promoIndex - 1 + promos.length) % promos.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 border-0 text-white text-base flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
        >‹</button>

        <div className={`pl-7 flex-1 transition-all duration-[350ms] ease-in-out ${slideClass}`}>
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">
            {promo.label}
          </span>
          <h2 className="text-xl font-bold text-yellow-300 mt-1.5 mb-1">{promo.title}</h2>
          <p className="text-[13px] text-white/75">{promo.desc}</p>
          <Link
            href="/products"
            className="inline-block mt-3.5 bg-white/20 text-white no-underline px-4 py-2 rounded-full text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            Shop Now →
          </Link>
        </div>

        <span className={`text-5xl flex-shrink-0 pr-7 transition-all duration-[350ms] ease-in-out ${slideClass}`}>
          {promo.emoji}
        </span>

        <button
          onClick={() => handleDotClick((promoIndex + 1) % promos.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 border-0 text-white text-base flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
        >›</button>
      </div>

      {/* Dots + progress bar */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex gap-1.5">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={`h-2 rounded-full border-0 cursor-pointer p-0 transition-all duration-300 ${
                i === promoIndex ? "w-5 bg-emerald-700" : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
        <div className="w-20 h-0.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            key={promoIndex}
            className="h-full w-full rounded-full bg-emerald-700 origin-left"
            style={{ animation: `promoProgress ${INTERVAL_MS}ms linear forwards` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes promoProgress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-xl font-extrabold ${s.textColor}`}>
                {loadingOrders ? "—" : s.value}
              </p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Quick Access</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-100 p-4 no-underline flex items-center gap-3 hover:shadow-sm transition-shadow"
          >
            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-semibold text-gray-900 mb-0.5 truncate">{card.label}</p>
              <p className="text-[11px] text-gray-400 truncate">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Recent Orders</p>
        {/* ✅ View All now links to /transactions */}
        <Link href="/transactions" className="text-[12px] text-emerald-700 no-underline font-semibold hover:underline">
          View All →
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        {loadingOrders ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-[18px] py-[14px] gap-2.5 ${i < 2 ? "border-b border-gray-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0 animate-pulse" />
                <div>
                  <div className="w-28 h-3 rounded-full bg-gray-100 mb-1.5 animate-pulse" />
                  <div className="w-16 h-2.5 rounded-full bg-gray-50 animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-6 rounded-full bg-gray-100 animate-pulse" />
            </div>
          ))
        ) : recentOrders.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-gray-400">
            No orders yet.{" "}
            <Link href="/products" className="text-emerald-700 font-semibold hover:underline">
              Start shopping →
            </Link>
          </div>
        ) : (
          recentOrders.map((order, i) => {
            const status = (order.status ?? "pending") as string;
            const { text, bg } = getStatusClasses(status);
            const label = orderLabel(order);
            const time = formattedDates[i] ?? "";

            return (
              <button
                key={(order._id ?? order.id ?? i) as string}
                onClick={() => handleOrderClick(order)}
                className={`w-full text-left flex items-center justify-between px-[18px] py-[14px] gap-2.5 bg-transparent border-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                  i < recentOrders.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-base flex-shrink-0`}>
                    🥤
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400" suppressHydrationWarning>{time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${bg} ${text}`}>
                    {formatStatus(status)}
                  </span>
                  {/* Receipt hint */}
                  <span className="text-[11px] text-gray-300">🧾</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-300 font-medium">TECHNOLOGIA @2026</p>

      {/* ✅ Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}