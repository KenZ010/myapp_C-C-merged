"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import { CartProvider } from "@/context/CartContext";
import { toast } from "sonner";
import { useSocket, useSocketActions } from "@/app/providers";
import { api } from "@/lib/api";

const ROLE_LABEL = "Customer";

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

const statusTitles: Record<string, string> = {
  PROCESSING:       "Order is being processed",
  OUT_FOR_DELIVERY: "Order out for delivery",
  CANCELLED:        "Order cancelled",
  COMPLETED:        "Order completed",
};

// Pull the real customer name out of the stored user object.
// Checks customer.name first, then falls back to other common shapes.
function extractName(user: any): string {
  if (!user || typeof user !== "object") return "";

  const candidates = [
    user.customer?.name,   // { customer: { name } }
    user.name,             // { name }
    user.fullName,
    user.full_name,
    user.customerName,
    user.username,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  const combined = `${user.firstName ?? user.first_name ?? ""} ${user.lastName ?? user.last_name ?? ""}`.trim();
  return combined;
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const socket = useSocket();
  const { connectSocket } = useSocketActions();

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [customerName,  setCustomerName]  = useState("Guest");
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { connectSocket(); }, []);

  // Load the customer's name: show the stored one instantly, then refresh it
  // from the server (same source the Settings page uses).
  useEffect(() => {
    let cancelled = false;

    const loadName = async () => {
      let stored: any = null;
      try {
        const raw = localStorage.getItem("user");
        stored = raw ? JSON.parse(raw) : null;
      } catch {
        stored = null;
      }

      // 1) whatever is already saved on this device
      const localName = extractName(stored);
      if (!cancelled) setCustomerName(localName || "Guest");

      // 2) the real record from the backend (customer.name)
      if (!stored?.id) return;
      try {
        const res = await api.getCustomer(stored.id);
        const c = res?.customer ?? res;
        const serverName = extractName(c);
        if (cancelled || !serverName) return;

        setCustomerName(serverName);
        // remember it so the next page load shows it immediately
        if (serverName !== stored.name) {
          localStorage.setItem("user", JSON.stringify({ ...stored, name: serverName }));
        }
      } catch (err) {
        console.warn("[Layout] Could not load customer name from the server:", err);
      }
    };

    loadName();

    // Update if another tab changes the stored user
    const onStorage = () => { loadName(); };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  // Toast + bell entry whenever the cashier updates one of this customer's orders
  useEffect(() => {
    if (!socket) return;

    const addNotification = (orderId: string, title: string, message: string) => {
      setNotifications((prev) => [
        { id: `${orderId}-${Date.now()}`, title, message, time: "Just now", read: false },
        ...prev,
      ]);
    };

    const onStatus = (d: { orderId: string; status: string; message: string }) => {
      if (d.status === "CANCELLED") toast.error(d.message, { duration: 8000 });
      else toast.success(d.message, { duration: 8000 });
      addNotification(d.orderId, statusTitles[d.status] ?? "Order update", d.message);
    };

    const onCompleted = (d: { orderId: string; message: string }) => {
      toast.success(d.message, { duration: 8000 });
      addNotification(d.orderId, statusTitles.COMPLETED, d.message);
    };

    // Named handlers: cleanup removes only these, not other components' listeners
    socket.on("order:status", onStatus);
    socket.on("order:completed", onCompleted);
    return () => {
      socket.off("order:status", onStatus);
      socket.off("order:completed", onCompleted);
    };
  }, [socket]);

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

  const initial = customerName.trim().charAt(0).toUpperCase() || "G";

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

          {/* Customer name + role */}
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
            <div style={{ minWidth: 0 }}>
              <p
                title={customerName}
                style={{
                  color: "#fff", fontSize: "13px", fontWeight: 500, lineHeight: 1.15, margin: 0,
                  maxWidth: isMobile ? "70px" : "140px",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {customerName}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.75)", fontSize: "10.5px", fontWeight: 500, lineHeight: 1.15, margin: "1px 0 0",
                }}
              >
                {ROLE_LABEL}
              </p>
            </div>
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