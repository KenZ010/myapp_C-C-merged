"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── Data ─────────────────────────────────────────────────────────────────────

const quickCards = [
  { href: "/products",     icon: "🥤", iconBg: "from-emerald-400 to-emerald-600", label: "Products",  desc: "Browse our soft drinks" },
  { href: "/orders",       icon: "📦", iconBg: "from-lime-400 to-green-600",      label: "My Orders", desc: "Track your orders" },
  { href: "/contact",      icon: "📞", iconBg: "from-orange-300 to-orange-500",   label: "Contacts",  desc: "Get in touch with us" },
  { href: "/transactions", icon: "🧾", iconBg: "from-sky-400 to-blue-600",        label: "History",   desc: "Completed transactions" },
];

const promos = [
  {
    label: "Today's Promo",
    title: "Buy 3, Get 1 Free!",
    desc: "On selected soft drinks — today only",
    emoji: "🎉",
    gradientFrom: "from-emerald-800",
    gradientTo: "to-emerald-500",
  },
  {
    label: "New Arrival",
    title: "Fanta Grape is here!",
    desc: "Try our newest flavor now",
    emoji: "🍇",
    gradientFrom: "from-purple-900",
    gradientTo: "to-fuchsia-600",
  },
  {
    label: "Free Delivery",
    title: "Free delivery on ₱1,000+",
    desc: "Order more, save more",
    emoji: "🚚",
    gradientFrom: "from-blue-900",
    gradientTo: "to-sky-500",
  },
];

// Soda-fizz bubbles that drift up the hero banner (purely decorative)
const bubbles = [
  { left: "8%",  size: 10, delay: 0,   duration: 6.5 },
  { left: "18%", size: 18, delay: 1.8, duration: 8   },
  { left: "32%", size: 8,  delay: 3.2, duration: 6   },
  { left: "46%", size: 14, delay: 0.6, duration: 7.5 },
  { left: "58%", size: 9,  delay: 2.6, duration: 6.8 },
  { left: "70%", size: 20, delay: 4,   duration: 9   },
  { left: "82%", size: 12, delay: 1.2, duration: 7   },
  { left: "92%", size: 8,  delay: 3.6, duration: 6.2 },
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

function getStatusClasses(status: string): { text: string; bg: string; dot: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "out_for_delivery" || s === "out for delivery")
    return { text: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-500" };
  if (s === "delivered" || s === "received" || s === "completed")
    return { text: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" };
  if (s === "processing" || s === "pending")
    return { text: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" };
  if (s === "cancelled")
    return { text: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" };
  return { text: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
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

// Short summary of an order, e.g. "Coke 1.5L x2 +1 more"
function orderLabel(order: Record<string, unknown>) {
  const items = (order.items ?? order.orderLines ?? order.orderItems ?? []) as Record<string, unknown>[];
  if (!items.length) return "Order #" + String(order._id ?? order.id ?? "").slice(-6);
  const first = items[0];
  const productName =
    (first.productName as string) ??
    ((first.product as Record<string, unknown>)?.productName as string) ??
    ((first.product as Record<string, unknown>)?.name as string) ??
    "Item";
  const qty = (first.quantity ?? first.qty ?? 1) as number;
  const extra = items.length > 1 ? ` +${items.length - 1} more` : "";
  return `${productName} x${qty}${extra}`;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

// ─── Receipt Modal — thermal paper style (matches transaction history pages) ──

function Dash() {
  return <div style={{ borderTop: "1px dashed #bbb", margin: "8px 0" }} />;
}

function ThermalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "1px 0" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  const TAX_RATE = 0.12;
  const subtotal = receipt.items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const totalDue = receipt.total || subtotal + tax;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/55 z-40" />

      {/* Paper wrapper — torn-edge top/bottom */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 50,
          width: "clamp(300px, 90vw, 380px)",
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
          borderRadius: "2px",
        }}
      >
        {/* Torn top */}
        <div
          style={{
            height: "14px",
            background:
              "linear-gradient(135deg, #f0ede6 25%, transparent 25%) -8px 0,linear-gradient(225deg, #f0ede6 25%, transparent 25%) -8px 0,linear-gradient(315deg, #f0ede6 25%, transparent 25%),linear-gradient(45deg, #f0ede6 25%, transparent 25%)",
            backgroundSize: "16px 14px",
            backgroundRepeat: "repeat-x",
            backgroundColor: "#e8e4da",
          }}
        />

        {/* Receipt body */}
        <div
          style={{
            background: "#f7f4ee",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "13px",
            color: "#1a1a1a",
            padding: "18px 24px 10px",
            lineHeight: 1.55,
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close receipt"
            style={{
              position: "absolute",
              top: "18px",
              right: "14px",
              background: "rgba(0,0,0,0.08)",
              border: "none",
              borderRadius: "50%",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#555",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          {/* Store header */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", letterSpacing: "0.5px" }}>
              Julieta SoftDrink Store
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555" }}>
              3065 JP Rizal St.
            </p>
            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#555" }}>
              Camarin Caloocan City
            </p>
            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#555" }}>
              Phone: +63 929 141 0133
            </p>
          </div>

          <Dash />

          {/* Invoice meta */}
          <p style={{ margin: "0 0 1px" }}>
            <span style={{ color: "#555" }}>Order ID: </span>
            <span style={{ fontWeight: 700 }}>{receipt.id}</span>
          </p>
          <p style={{ margin: "0 0 1px" }}>
            <span style={{ color: "#555" }}>Date: </span>{receipt.date}
          </p>
          <p style={{ margin: "0 0 1px" }}>
            <span style={{ color: "#555" }}>Payment: </span>{receipt.paymentMethod}
          </p>
          <p style={{ margin: "0 0 10px" }}>
            <span style={{ color: "#555" }}>Status: </span>{formatStatus(receipt.status)}
          </p>

          <Dash />

          {/* Column header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 80px",
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 0",
              color: "#333",
            }}
          >
            <span>Description</span>
            <span style={{ textAlign: "center" }}>Qty</span>
            <span style={{ textAlign: "right" }}>Price</span>
          </div>

          <Dash />

          {/* Items */}
          {receipt.items.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#888", fontStyle: "italic", margin: "6px 0" }}>
              No item details available.
            </p>
          ) : (
            receipt.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 80px",
                  padding: "3px 0",
                  fontSize: "12px",
                  alignItems: "start",
                }}
              >
                <span style={{ wordBreak: "break-word", paddingRight: "6px" }}>{item.name}</span>
                <span style={{ textAlign: "center" }}>{item.qty}</span>
                <span style={{ textAlign: "right" }}>₱{item.price.toFixed(2)}</span>
              </div>
            ))
          )}

          <Dash />

          {/* Subtotal / Tax */}
          <ThermalRow label="Subtotal:" value={`₱${subtotal.toFixed(2)}`} />
          <ThermalRow label="Tax (12%):" value={`₱${tax.toFixed(2)}`} />

          <Dash />

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "15px",
              padding: "4px 0 6px",
            }}
          >
            <span>Total:</span>
            <span>₱{totalDue.toFixed(2)}</span>
          </div>

          <Dash />

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: "6px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px" }}>
              Thank you for your purchase! 🎉
            </p>
            <p style={{ fontSize: "10px", color: "#777", margin: 0 }}>
              Julieta Store • TECHNOLOGIA © 2026
            </p>
          </div>
        </div>

        {/* Torn bottom */}
        <div
          style={{
            height: "14px",
            background:
              "linear-gradient(135deg, transparent 25%, #f7f4ee 25%) -8px 0,linear-gradient(225deg, transparent 25%, #f7f4ee 25%) -8px 0,linear-gradient(315deg, transparent 25%, #f7f4ee 25%),linear-gradient(45deg, transparent 25%, #f7f4ee 25%)",
            backgroundSize: "16px 14px",
            backgroundRepeat: "repeat-x",
            backgroundColor: "#e8e4da",
          }}
        />
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

  // Greeting + today's date are set after mount so server and client markup match
  const [greeting,  setGreeting]  = useState("Welcome back");
  const [todayText, setTodayText] = useState("");

  // Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const now = new Date();
    setGreeting(greetingForHour(now.getHours()));
    setTodayText(
      now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })
    );
  }, []);

  // Load customer + orders
  useEffect(() => {
    async function loadData() {
      try {
        const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const user = userRaw ? JSON.parse(userRaw) : null;
        const customerId: string | undefined = user?._id ?? user?.id ?? user?.customerId;

        if (user?.name) setCustomerName(toTitleCase(user.name));

        if (!customerId) return;

        if (!user?.name) {
          const fresh = await api.getCustomer(customerId);
          if (fresh?.name) setCustomerName(toTitleCase(fresh.name));
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

  const firstName = customerName.split(" ")[0];

  const stats = [
    { label: "Total Orders", value: orderStats.total,     icon: "📦", ring: "bg-emerald-100", textColor: "text-emerald-800" },
    { label: "In Progress",  value: orderStats.pending,   icon: "⏳", ring: "bg-amber-100",   textColor: "text-amber-700"   },
    { label: "Completed",    value: orderStats.completed, icon: "✅", ring: "bg-green-100",   textColor: "text-green-700"   },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">

      <style>{`
        @keyframes promoProgress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.55; }
          100% { transform: translateY(-240px) scale(1); opacity: 0; }
        }
        @keyframes floaty {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-10px) rotate(4deg); }
        }
        .bubble { animation: bubbleRise linear infinite; }
        .floaty { animation: floaty 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bubble, .floaty { animation: none !important; }
        }
      `}</style>

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[13px] font-semibold text-emerald-700" suppressHydrationWarning>
            {greeting} 👋
          </p>
          <h1 className="text-[28px] sm:text-[32px] leading-tight font-extrabold text-gray-900 tracking-tight">
            {firstName}
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Welcome back to Julieta Soft Drink Store
          </p>
        </div>
        {todayText && (
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white border border-emerald-100 px-4 py-2 text-[12px] font-semibold text-emerald-800 shadow-sm"
            suppressHydrationWarning
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {todayText}
          </span>
        )}
      </div>

      {/* Hero — promo carousel */}
      <div
        className={`relative rounded-3xl px-6 sm:px-12 py-8 min-h-[190px] flex items-center justify-between gap-4 overflow-hidden mb-3 bg-gradient-to-br ${promo.gradientFrom} ${promo.gradientTo} shadow-lg shadow-emerald-900/10 transition-all duration-500`}
      >
        {/* Decorative rings + fizz bubbles */}
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full border-[28px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-24 w-64 h-64 rounded-full bg-white/10" />
        {bubbles.map((b, i) => (
          <span
            key={i}
            aria-hidden
            className="bubble pointer-events-none absolute bottom-0 rounded-full border border-white/50 bg-white/20"
            style={{
              left: b.left,
              width: b.size,
              height: b.size,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}

        <button
          onClick={() => handleDotClick((promoIndex - 1 + promos.length) % promos.length)}
          aria-label="Previous promo"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-0 text-white text-lg flex items-center justify-center cursor-pointer hover:bg-white/35 transition-colors"
        >‹</button>

        <div className={`relative pl-6 sm:pl-4 flex-1 transition-all duration-[350ms] ease-in-out ${slideClass}`}>
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] text-white/90 font-semibold">
            {promo.label}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-yellow-300 mt-3 mb-1 leading-tight">
            {promo.title}
          </h2>
          <p className="text-[13px] sm:text-sm text-white/80">{promo.desc}</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 mt-4 bg-white text-emerald-800 no-underline px-5 py-2.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Shop now <span aria-hidden>→</span>
          </Link>
        </div>

        <div className={`relative flex-shrink-0 pr-6 sm:pr-4 transition-all duration-[350ms] ease-in-out ${slideClass}`}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
            <span className="floaty text-5xl sm:text-6xl">{promo.emoji}</span>
          </div>
        </div>

        <button
          onClick={() => handleDotClick((promoIndex + 1) % promos.length)}
          aria-label="Next promo"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-0 text-white text-lg flex items-center justify-center cursor-pointer hover:bg-white/35 transition-colors"
        >›</button>
      </div>

      {/* Dots + progress bar */}
      <div className="flex flex-col items-center gap-2 mb-7">
        <div className="flex gap-1.5">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              aria-label={`Go to promo ${i + 1}`}
              className={`h-2 rounded-full border-0 cursor-pointer p-0 transition-all duration-300 ${
                i === promoIndex ? "w-6 bg-emerald-600" : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
        <div className="w-20 h-0.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            key={promoIndex}
            className="h-full w-full rounded-full bg-emerald-600 origin-left"
            style={{ animation: `promoProgress ${INTERVAL_MS}ms linear forwards` }}
          />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-sm mb-8">
        {stats.map((s) => (
          <div key={s.label} className="px-3 sm:px-6 py-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
            <div className={`w-11 h-11 rounded-full ${s.ring} flex items-center justify-center text-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-extrabold leading-none ${s.textColor}`}>
                {loadingOrders ? "—" : s.value}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <h2 className="text-[15px] font-bold text-gray-900 mb-3">Quick access</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-2xl border border-gray-100 p-4 no-underline flex flex-col gap-3 shadow-sm hover:shadow-lg hover:shadow-emerald-900/5 hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-bold text-gray-900 truncate">{card.label}</p>
                <span aria-hidden className="text-emerald-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">→</span>
              </div>
              <p className="text-[12px] text-gray-500 truncate mt-0.5">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[15px] font-bold text-gray-900">Recent orders</h2>
        <Link href="/transactions" className="text-[12px] text-emerald-700 no-underline font-semibold hover:underline">
          View all →
        </Link>
      </div>

      <div className="mb-8">
        {loadingOrders ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex-shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <div className="w-3/4 h-3 rounded-full bg-gray-100 mb-2 animate-pulse" />
                    <div className="w-1/2 h-2.5 rounded-full bg-gray-50 animate-pulse" />
                  </div>
                </div>
                <div className="h-px bg-gray-50" />
                <div className="flex justify-between items-center">
                  <div className="w-16 h-6 rounded-full bg-gray-100 animate-pulse" />
                  <div className="w-12 h-5 rounded-full bg-gray-50 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-emerald-200 py-12 px-6 text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-3xl">🥤</div>
            <p className="text-[14px] font-bold text-gray-900">No orders yet</p>
            <p className="text-[12px] text-gray-500">Your first order will show up here.</p>
            <Link
              href="/products"
              className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 text-white no-underline px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Start shopping <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentOrders.map((order, i) => {
              const orderId = String(order._id ?? order.id ?? "");
              const time = formattedDates[i] ?? "";
              const total = Number(order.totalAmount ?? 0);
              const itemCount = ((order.items ?? order.orderLines ?? order.orderItems ?? []) as unknown[]).length;
              const status = String(order.status ?? "pending");
              const sc = getStatusClasses(status);

              return (
                <button
                  key={orderId || i}
                  onClick={() => handleOrderClick(order)}
                  className="group text-left bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-emerald-900/5 hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-200 w-full"
                >
                  {/* Card top */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-xl flex-shrink-0">
                      🥤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">
                        {orderLabel(order)}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1 truncate font-mono">
                        #{orderId ? orderId.slice(-8) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {formatStatus(status)}
                    </span>
                    <p className="text-[11px] text-gray-400" suppressHydrationWarning>{time}</p>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Card bottom */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500">
                      {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : "Tap to view"}
                    </p>
                    <div className="flex items-center gap-2">
                      {total > 0 && (
                        <p className="text-[16px] font-extrabold text-emerald-700">
                          ₱{total.toLocaleString()}
                        </p>
                      )}
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        🧾 Receipt
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-300 font-medium">TECHNOLOGIA @2026</p>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}