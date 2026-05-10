"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import { CartProvider, useCart } from "@/context/CartContext";
import { useSocket } from "@/app/providers";

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/home": { title: "Dashboard", sub: "Welcome back" },
  "/products": { title: "Products", sub: "Browse our selection" },
  "/orders": { title: "My Orders", sub: "Track your transactions" },
  "/faqs": { title: "FAQs", sub: "Frequently Asked Questions" },
  "/contact": { title: "Contact Us", sub: "We're here to help" },
  "/about": { title: "About Us", sub: "Know more about our business" },
  "/transactions": { title: "Transaction History", sub: "0 completed transaction(s)" },
  "/return-order": { title: "Return Order", sub: "Submit a return request" },
  "/settings": { title: "Settings", sub: "Manage your account information" },
  "/cart": { title: "Shopping Cart", sub: "Review your items" },
  "/checkout": { title: "Checkout", sub: "Confirm your order" },
  "/order-placed": { title: "Order Placed", sub: "Order placed successfully" },
};

const hideSearchCart = [
  "/contact", "/about", "/faqs", "/home", "/return-order",
  "/transactions", "/settings", "/cart", "/checkout", "/order-placed",
];

// ── Toast type ────────────────────────────────────────────────────────────────
interface Toast {
  id:      number;
  message: string;
  visible: boolean;
}

// ── Toast Component ───────────────────────────────────────────────────────────
function OrderToast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: "12px",
        background: "#fff", borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #e8f5e9",
        padding: "12px 14px", minWidth: "300px", maxWidth: "360px",
        transition: "all 0.5s ease",
        opacity: toast.visible ? 1 : 0,
        transform: toast.visible ? "translateY(0)" : "translateY(-16px)",
        pointerEvents: toast.visible ? "auto" : "none",
      }}
    >
      {/* Icon */}
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
        🛍️
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#1b5e20", margin: "0 0 2px" }}>Order Update</p>
        <p style={{ fontSize: "12px", color: "#555", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.message}</p>
        <Link href="/orders" style={{ fontSize: "11px", fontWeight: 600, color: "#2d7a3a", textDecoration: "none", marginTop: "4px", display: "inline-block" }}>
          View My Orders →
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "14px", flexShrink: 0, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Inner layout (needs CartContext) ──────────────────────────────────────────
function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const socket   = useSocket();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts,     setToasts]     = useState<Toast[]>([]);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const page = pageTitles[pathname] ?? { title: "Julieta Store", sub: "" };
  const { totalCount } = useCart();

  const user = mounted
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};
  const displayName = user?.name || "Guest";

  // ── Dismiss toast ───────────────────────────────────────────────────────
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 500);
  }, []);

  // ── Listen for order events ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const showToast = (message: string) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, visible: false }]);
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: true } : t));
      }, 50);
      setTimeout(() => dismissToast(id), 6000);
    };

    socket.on("order:completed", ({ message }: { message: string }) => showToast(message));
    socket.on("order:status",    ({ message }: { message: string }) => showToast(message));

    return () => {
      socket.off("order:completed");
      socket.off("order:status");
    };
  }, [socket, dismissToast]);

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f5f5f5", position: "relative" }}>

      {/* ── Toast stack (top-right) ───────────────────────────────────────── */}
      <div style={{ position: "fixed", top: "64px", right: "16px", zIndex: 100, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <OrderToast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customerName={displayName}
      />

      {/* Topbar */}
      <header style={{ background: "#2d7a3a", padding: "0 28px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "5px", padding: "6px", borderRadius: "8px" }}
          >
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
          </button>
          <div>
            <p style={{ color: "#fff", fontSize: "16px", fontWeight: 500 }}>{page.title}</p>
            {page.sub && <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>{page.sub}</p>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!hideSearchCart.includes(pathname) && (
            <Link href="/cart" style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", textDecoration: "none", position: "relative" }}>
              🛒
              {totalCount > 0 && (
                <span style={{ position: "absolute", top: "4px", right: "4px", width: "16px", height: "16px", borderRadius: "50%", background: "#f5c842", fontSize: "9px", color: "#2d7a3a", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {totalCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DashboardInner>{children}</DashboardInner>
    </CartProvider>
  );
}