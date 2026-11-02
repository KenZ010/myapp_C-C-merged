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

      <div className="mb-6">
        {loadingOrders ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 animate-pulse" />
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
          <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center text-[13px] text-gray-400">
            No orders yet.{" "}
            <Link href="/products" className="text-emerald-700 font-semibold hover:underline">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentOrders.map((order, i) => {
              const orderId = String(order._id ?? order.id ?? "");
              const time = formattedDates[i] ?? "";
              const total = Number(order.totalAmount ?? 0);
              const itemCount = ((order.items ?? order.orderLines ?? order.orderItems ?? []) as unknown[]).length;

              return (
                <button
                  key={orderId || i}
                  onClick={() => handleOrderClick(order)}
                  className="text-left bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-0 w-full"
                >
                  {/* Card Top */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
                      🥤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-400 mb-0.5">Order ID</p>
                      <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                        {orderId || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5" suppressHydrationWarning>{time}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-50" />

                  {/* Card Bottom */}
                  <div className="flex items-center justify-between">
                    {itemCount > 0 && (
                      <p className="text-[11px] text-gray-400">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {total > 0 && (
                        <p className="text-[14px] font-bold text-emerald-700">
                          ₱{total.toLocaleString()}
                        </p>
                      )}
                      <span className="text-[11px] text-gray-300">🧾</span>
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