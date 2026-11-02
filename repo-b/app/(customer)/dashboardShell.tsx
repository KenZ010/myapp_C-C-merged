"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import { CartProvider } from "@/context/CartContext";
import { useSocketActions } from "@/app/providers";

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/home":          { title: "Dashboard",           sub: "Welcome back" },
  "/products":      { title: "Products",            sub: "Browse our selection" },
  "/orders":        { title: "My Orders",           sub: "Track your transactions" },
  "/faqs":          { title: "FAQs",                sub: "Frequently Asked Questions" },
  "/contact":       { title: "Contact Us",          sub: "We're here to help" },
  "/about":         { title: "About Us",            sub: "Know more about our business" },
  "/transactions":  { title: "Transaction History", sub: "0 completed transaction(s)" },
  "/return-order":  { title: "Return Order",        sub: "Submit a return request" },
  "/settings":      { title: "Settings",            sub: "Manage your account information" },
  "/cart":          { title: "Shopping Cart",       sub: "Review your items" },
  "/checkout":      { title: "Checkout",            sub: "Confirm your order" },
  "/order-placed":  { title: "Order Placed",        sub: "Order placed successfully" },
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const sampleNotifications: NotificationItem[] = [
  { id: "1", title: "Order shipped",   message: "Your order #1042 is on its way.",  time: "10m ago", read: false },
  { id: "2", title: "Order confirmed", message: "Order #1039 has been confirmed.",   time: "1h ago",  read: false },
  { id: "3", title: "Return approved", message: "Your return request was approved.", time: "1d ago",  read: true  },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connectSocket } = useSocketActions();

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { connectSocket(); }, []);

  // Track viewport width
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [notifOpen]);

  const page = pageTitles[pathname] ?? { title: "Julieta Store", sub: "" };

  const user = mounted ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const displayName: string = user?.name || "Guest";
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const markOneRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  if (!mounted) return null;

  // ── Dropdown style: full-width bottom sheet on mobile, popover on desktop ──
  const dropdownStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: "56px",
        left: 0,
        right: 0,
        width: "100%",
        background: "#fff",
        borderRadius: "0 0 20px 20px",
        border: "1px solid #e5e7eb",
        borderTop: "none",
        boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        zIndex: 70,
        animation: "notifFadeIn 0.18s ease",
        overflow: "hidden",
      }
    : {
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: "320px",
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        zIndex: 70,
        animation: "notifFadeIn 0.16s ease",
        overflow: "hidden",
      };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f5f5f5", position: "relative" }}>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Topbar */}
      <header style={{ background: "#2d7a3a", padding: "0 28px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 60 }}>

        {/* Left — hamburger + page title */}
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

        {/* Right — bell + customer name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

          {/* ── Notification bell ── */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setNotifOpen((prev) => !prev); }}
              style={{
                position: "relative", width: "38px", height: "38px", borderRadius: "8px",
                background: notifOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, transition: "background 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: "5px", right: "5px", width: "8px", height: "8px", borderRadius: "50%", background: "#f5c842", border: "1.5px solid #2d7a3a" }} />
              )}
            </button>

            {/* ── Dropdown ── */}
            {notifOpen && (
              <div onClick={(e) => e.stopPropagation()} style={dropdownStyle}>

                {/* Mobile drag handle */}
                {isMobile && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
                    <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e0e0e0" }} />
                  </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 700, color: "#1f2d24", margin: 0 }}>
                      Notifications
                    </p>
                    {unreadCount > 0 && (
                      <span style={{ background: "#2d7a3a", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "10px", padding: "1px 7px" }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ fontSize: "11.5px", fontWeight: 600, color: "#2d7a3a", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Mark all read
                      </button>
                    )}
                    {/* Close button visible on mobile */}
                    {isMobile && (
                      <button
                        onClick={() => setNotifOpen(false)}
                        style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f5f5f5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#888" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: isMobile ? "55vh" : "320px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔔</div>
                      <p style={{ fontSize: "12.5px", color: "#9ca3af", margin: 0 }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markOneRead(n.id)}
                        style={{
                          display: "flex", gap: "10px",
                          padding: isMobile ? "14px 20px" : "12px 16px",
                          borderBottom: "1px solid #f5f5f5", cursor: "pointer",
                          background: n.read ? "#fff" : "#f2f9f3",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <span style={{ marginTop: "5px", width: "7px", height: "7px", borderRadius: "50%", background: n.read ? "transparent" : "#2d7a3a", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: isMobile ? "13px" : "12.5px", fontWeight: n.read ? 500 : 700, color: "#1f2d24", lineHeight: 1.3, margin: 0 }}>
                            {n.title}
                          </p>
                          <p style={{ fontSize: isMobile ? "12px" : "11.5px", color: "#6b7280", lineHeight: 1.4, marginTop: "3px", marginBottom: 0 }}>
                            {n.message}
                          </p>
                          <p style={{ fontSize: "10.5px", color: "#4c9a55", marginTop: "5px", fontWeight: 500, marginBottom: 0 }}>
                            {n.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid #eee", textAlign: "center" }}>
                  <button style={{ fontSize: "11.5px", fontWeight: 600, color: "#2d7a3a", background: "none", border: "none", cursor: "pointer" }}>
                    View all notifications
                  </button>
                </div>

              </div>
            )}

            <style>{`
              @keyframes notifFadeIn {
                from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0)  scale(1); }
              }
            `}</style>
          </div>

          {/* Customer name */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              height: "38px", padding: "0 12px 0 6px", borderRadius: "8px",
              background: "rgba(255,255,255,0.15)", flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "26px", height: "26px", borderRadius: "50%",
                background: "#f5c842", color: "#2d7a3a", fontSize: "12px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {initial}
            </span>
            <span
              title={displayName}
              style={{
                color: "#fff", fontSize: "13px", fontWeight: 500,
                maxWidth: isMobile ? "70px" : "140px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </span>
          </div>

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