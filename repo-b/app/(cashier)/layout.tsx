"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket, useSocketActions } from "@/app/providers";

// ── Theme (matches customer design) ──
const GREEN       = "#2e7d3e";
const GREEN_DARK  = "#1f5f2d";
const GREEN_LIGHT = "#e8f5ea";
const YELLOW      = "#facc15";

const navLinks = [
  {
    href: "/cashier/inventory",
    label: "Inventory",
    tile: "#e8f5ea",
    color: "#2e7d3e",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M7 8h10M7 12h6" />
      </svg>
    ),
  },
  {
    href: "/cashier/ordering",
    label: "Ordering",
    tile: "#e3f0fd",
    color: "#1976d2",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    href: "/cashier/pending",
    label: "Pending",
    tile: "#fff4dc",
    color: "#d98a00",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/cashier/transactions",
    label: "Transaction History",
    tile: "#f1e9fb",
    color: "#7b3fc4",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/cashier/inventory":    { title: "Inventory",           sub: "View products & stock levels" },
  "/cashier/ordering":     { title: "Ordering",            sub: "Create order for customer" },
  "/cashier/pending":      { title: "Pending",             sub: "Orders waiting for action" },
  "/cashier/transactions": { title: "Transaction History", sub: "Sales reports & records" },
  "/cashier/payment":      { title: "Payment",             sub: "Complete the customer order" },
};

// Sample notification data — replace with real data from your backend/socket
type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const sampleNotifications: NotificationItem[] = [
  { id: "1", title: "New order received", message: "Order #1042 was placed for pickup.", time: "2m ago", read: false },
  { id: "2", title: "Low stock alert", message: "Coke 1.5L is running low (3 left).", time: "18m ago", read: false },
  { id: "3", title: "Payment completed", message: "Order #1039 payment was confirmed.", time: "1h ago", read: true },
];

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const socket            = useSocket();
  const { connectSocket } = useSocketActions();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    connectSocket();
  }, []);

  // Close the notification dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const page = pageTitles[pathname] ?? { title: "Cashier Panel", sub: "" };

  const displayName = currentUser?.name || currentUser?.username || "Cashier";
  const initial     = String(displayName).charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const expired = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `token=; ${expired}`;
    document.cookie = `active_token=; ${expired}`;
    router.push("/");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f3f6f3" }}>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      <aside
        style={{
          width: "260px", background: "#fff", display: "flex", flexDirection: "column",
          flexShrink: 0, borderRight: "1px solid #e5ece6",
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "4px 0 24px rgba(46,125,62,0.10)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >
        {/* Logo / Brand */}
        <div style={{ padding: "22px 20px", background: GREEN, display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Julieta Store</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: "2px" }}>Cashier Panel</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* User Info */}
          <div style={{ padding: "14px 16px", margin: "14px 14px 6px", borderRadius: "12px", background: GREEN_LIGHT, display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: YELLOW, color: GREEN_DARK, fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {initial}
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, lineHeight: 1.2 }}>
                {displayName}
              </p>
              <p style={{ fontSize: "11px", color: GREEN, fontWeight: 500 }}>
                {currentUser?.role || "Cashier"}
              </p>
            </div>
          </div>

          {/* Nav Label */}
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#9aa5a0", letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 24px 8px" }}>
            Navigation
          </p>

          {/* Nav Links */}
          <nav style={{ padding: "0 14px 12px" }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "10px 14px", borderRadius: "12px", marginBottom: "6px",
                    fontSize: "14px", textDecoration: "none",
                    color: isActive ? GREEN : "#1f2937",
                    background: isActive ? GREEN_LIGHT : "transparent",
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                >
                  <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: link.tile, color: link.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {link.icon}
                  </span>
                  {link.label}
                  {isActive && (
                    <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", width: "7px", height: "7px", borderRadius: "50%", background: GREEN }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Account label + Logout */}
          <div style={{ borderTop: "1px solid #eef2ef", margin: "4px 14px 0" }} />
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#9aa5a0", letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 10px 8px" }}>
            Account
          </p>
          <div style={{ padding: "0 14px 14px" }}>
            <button
              onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "10px 14px", borderRadius: "12px", background: "transparent", color: "#e11d48", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              Log out
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px", borderTop: "1px solid #eef2ef", textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontSize: "11.5px", color: "#9aa5a0" }}>© 2026 Julieta Soft Drinks</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >

        {/* Topbar */}
        <header style={{ background: GREEN, padding: "0 20px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 8px rgba(31,95,45,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
              className="lg:hidden"
              style={{ background: "transparent", border: "2px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", borderRadius: "10px", color: "#fff", flexShrink: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <p style={{ color: "#fff", fontSize: "17px", fontWeight: 600, lineHeight: 1.2 }}>{page.title}</p>
              {page.sub && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "2px" }}>{page.sub}</p>}
            </div>
          </div>

          {/* Notification bell + User pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

            {/* Notification Icon + Dropdown */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen((prev) => !prev); }}
                style={{
                  position: "relative", background: notifOpen ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0, transition: "background 0.15s ease",
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: "7px", right: "7px", width: "9px", height: "9px", borderRadius: "50%", background: YELLOW, border: `1.5px solid ${GREEN}` }} />
                )}
              </button>

              {notifOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, width: "320px",
                    background: "#fff", borderRadius: "14px", border: "1px solid #e5ece6",
                    boxShadow: "0 12px 32px rgba(20,50,28,0.20)", zIndex: 60,
                    animation: "notifFadeIn 0.16s ease",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #eef2ef" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 700, color: GREEN_DARK }}>Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ fontSize: "11.5px", fontWeight: 600, color: GREEN, background: "none", border: "none", cursor: "pointer" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "28px 16px", textAlign: "center" }}>
                        <p style={{ fontSize: "12.5px", color: "#94a3b8" }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markOneRead(n.id)}
                          style={{
                            display: "flex", gap: "10px", padding: "12px 16px",
                            borderBottom: "1px solid #f3f6f3", cursor: "pointer",
                            background: n.read ? "#fff" : "#f2faf3",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              marginTop: "5px", width: "7px", height: "7px", borderRadius: "50%",
                              background: n.read ? "transparent" : GREEN, flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "12.5px", fontWeight: n.read ? 500 : 700, color: "#1f2937", lineHeight: 1.3 }}>
                              {n.title}
                            </p>
                            <p style={{ fontSize: "11.5px", color: "#64748b", lineHeight: 1.4, marginTop: "2px" }}>
                              {n.message}
                            </p>
                            <p style={{ fontSize: "10.5px", color: "#7fb28a", marginTop: "4px", fontWeight: 500 }}>
                              {n.time}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #eef2ef", textAlign: "center" }}>
                    <button
                      style={{ fontSize: "11.5px", fontWeight: 600, color: GREEN, background: "none", border: "none", cursor: "pointer" }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}

              <style>{`
                @keyframes notifFadeIn {
                  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                  to   { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
            </div>

            {/* User pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.16)", padding: "5px 14px 5px 6px", borderRadius: "999px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: YELLOW, color: GREEN_DARK, fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {initial}
              </div>
              <p className="hidden sm:block" style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                {displayName}
              </p>
            </div>

          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}