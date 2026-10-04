"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSocket, useSocketActions } from "@/app/providers";

// ── Theme (matches customer design) ────────────────────────────────────
const GREEN       = "#2e7d3e";
const GREEN_DARK  = "#1f5f2d";
const GREEN_LIGHT = "#e8f5ea";
const YELLOW      = "#facc15";

// ── SVG Icons (color is passed in so each nav item can have its own tint) ──
type IconProps = { color: string };

const IconMonitoring = ({ color }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.2" stroke={color} strokeWidth="1.5"/>
    <rect x="10" y="1" width="6" height="6" rx="1.2" stroke={color} strokeWidth="1.5"/>
    <rect x="1" y="10" width="6" height="6" rx="1.2" stroke={color} strokeWidth="1.5"/>
    <rect x="10" y="10" width="6" height="6" rx="1.2" stroke={color} strokeWidth="1.5"/>
  </svg>
);

const IconAdjustment = ({ color }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <path d="M1 3h15M1 8.5h15M1 14h15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="5" cy="3" r="2" fill={color}/>
    <circle cx="12" cy="8.5" r="2" fill={color}/>
    <circle cx="7" cy="14" r="2" fill={color}/>
  </svg>
);

const IconRestocking = ({ color }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <rect x="1" y="7" width="15" height="9" rx="1.2" stroke={color} strokeWidth="1.5"/>
    <path d="M5 7V5a3.5 3.5 0 0 1 7 0v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8.5" y1="10" x2="8.5" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="7" y1="11.5" x2="10" y2="11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconReturn = ({ color }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <path d="M15 8.5A6.5 6.5 0 1 1 8.5 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <polyline points="8.5,2 12,2 12,5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLossReport = ({ color }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <rect x="3" y="1" width="11" height="15" rx="1.5" stroke={color} strokeWidth="1.5"/>
    <line x1="6" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="8.5" x2="11" y2="8.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="11.5" x2="9" y2="11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
    <path d="M7 2H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round"/>
    <polyline points="11,5 15,8.5 11,12" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15" y1="8.5" x2="6" y2="8.5" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Nav Config ─────────────────────────────────────────────────────────
const navLinks = [
  { href: "/inventory/monitoring",  label: "Inventory Monitoring", Icon: IconMonitoring, tile: "#e8f5ea", color: "#2e7d3e" },
  { href: "/inventory/adjustment",  label: "Inventory Adjustment", Icon: IconAdjustment, tile: "#e3f0fd", color: "#1976d2" },
  { href: "/inventory/restocking",  label: "Restocking",           Icon: IconRestocking, tile: "#fff4dc", color: "#d98a00" },
  { href: "/inventory/return",      label: "Return",               Icon: IconReturn,     tile: "#fde7ee", color: "#d81b60" },
  { href: "/inventory/loss-report", label: "Loss Report",          Icon: IconLossReport, tile: "#f1e9fb", color: "#7b3fc4" },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/inventory/monitoring":  { title: "Inventory Monitoring",  sub: "Monitor stock levels" },
  "/inventory/adjustment":  { title: "Inventory Adjustment",  sub: "Manage and update stock levels" },
  "/inventory/restocking":  { title: "Restocking",            sub: "Manage restocking orders" },
  "/inventory/return":      { title: "Return",                sub: "Manage product returns" },
  "/inventory/loss-report": { title: "Loss Report",           sub: "Track product losses" },
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
  { id: "1", title: "Low stock alert", message: "Coke 1.5L is running low (3 left).", time: "5m ago", read: false },
  { id: "2", title: "Restock received", message: "Delivery for Sprite 1L has arrived.", time: "40m ago", read: false },
  { id: "3", title: "Return processed", message: "Return for order #1032 was completed.", time: "2h ago", read: true },
];

// ── Layout ─────────────────────────────────────────────────────────────
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const socket             = useSocket();
  const { connectSocket }  = useSocketActions();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const page = pageTitles[pathname] ?? { title: "Inventory Manager", sub: "" };

  const displayName = currentUser?.name || currentUser?.username || "Manager";
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
          width: "260px", background: "#ffffff", display: "flex", flexDirection: "column",
          flexShrink: 0, borderRight: "1px solid #e5ece6",
          boxShadow: "4px 0 24px rgba(46,125,62,0.10)",
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >
        {/* Logo / Brand */}
        <div style={{ padding: "22px 20px", background: GREEN, display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10L10 3L17 10V18H13V13H7V18H3V10Z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Julieta Store</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: "2px" }}>Inventory Panel</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* User Info */}
          <div style={{ padding: "14px 16px", margin: "14px 14px 6px", background: GREEN_LIGHT, borderRadius: "12px", display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: YELLOW, color: GREEN_DARK, fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {initial}
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: GREEN_DARK, lineHeight: 1.2 }}>
                {displayName}
              </p>
              <p style={{ fontSize: "11px", color: GREEN, fontWeight: 500 }}>
                {currentUser?.role || "Inventory Manager"}
              </p>
            </div>
          </div>

          {/* Nav label */}
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#9aa5a0", letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 24px 8px" }}>
            Navigation
          </p>

          {/* Nav Links */}
          <nav style={{ padding: "0 14px 12px" }}>
            {navLinks.map(({ href, label, Icon, tile, color }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "10px 14px", marginBottom: "6px", borderRadius: "12px",
                    fontSize: "14px", textDecoration: "none",
                    color: isActive ? GREEN : "#1f2937",
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? GREEN_LIGHT : "transparent",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: tile, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon color={color} />
                  </span>
                  {label}
                  {isActive && (
                    <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", width: "7px", height: "7px", borderRadius: "50%", background: GREEN }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Account + Logout */}
          <div style={{ borderTop: "1px solid #eef2ef", margin: "4px 14px 0" }} />
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#9aa5a0", letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 10px 8px" }}>
            Account
          </p>
          <div style={{ padding: "0 14px 14px" }}>
            <button
              onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "10px 14px", borderRadius: "12px", border: "none", background: "transparent", color: "#e53935", fontSize: "14px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconLogout />
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
                        <p style={{ fontSize: "12.5px", color: "#9e9e9e" }}>No notifications yet</p>
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