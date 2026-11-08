"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket, useSocketActions } from "@/app/providers";


const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons
const YELLOW       = "#facc15"; // avatar + unread dot
const PAGE_BG      = "#f6faf7"; // app background

const ROLE_LABEL = "Stock Manager";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ── Nav Config ────────────────────────────────────────────────────────────────
const navLinks = [
  {
    href: "/inventory/monitoring",
    label: "Inventory Monitoring",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/inventory/adjustment",
    label: "Inventory Adjustment",
    icon: (
      <svg {...iconProps}>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    href: "/inventory/restocking",
    label: "Restocking",
    icon: (
      <svg {...iconProps}>
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" rx="1" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    href: "/inventory/return",
    label: "Return",
    icon: (
      <svg {...iconProps}>
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    href: "/inventory/loss-report",
    label: "Loss Report",
    icon: (
      <svg {...iconProps}>
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    ),
  },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/inventory/monitoring":  { title: "Inventory Monitoring", sub: "Monitor stock levels" },
  "/inventory/adjustment":  { title: "Inventory Adjustment", sub: "Manage and update stock levels" },
  "/inventory/restocking":  { title: "Restocking",           sub: "Manage restocking orders" },
  "/inventory/return":      { title: "Return",               sub: "Manage product returns" },
  "/inventory/loss-report": { title: "Loss Report",          sub: "Track product losses" },
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
  { id: "1", title: "Low stock alert",  message: "Coke 1.5L is running low (3 left).",   time: "5m ago",  read: false },
  { id: "2", title: "Restock received", message: "Delivery for Sprite 1L has arrived.",   time: "40m ago", read: false },
  { id: "3", title: "Return processed", message: "Return for order #1032 was completed.", time: "2h ago",  read: true  },
];

// ── Layout ────────────────────────────────────────────────────────────────────
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
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

  if (!mounted) return null;

  return (
    <div className="inventory-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", background: PAGE_BG }}>

      <style>{`
        @keyframes notifFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-link:hover:not(.nav-active) { background: ${GREEN_TINT} !important; }
        .nav-link:hover:not(.nav-active) .nav-tile { background: ${GREEN_LIGHT} !important; }
        .logout-btn:hover { background: #fff1f2 !important; }
        .top-icon-btn:hover { background: rgba(255,255,255,0.28) !important; }
        .notif-item:hover { background: ${GREEN_TINT} !important; }
        .text-link:hover { color: ${GREEN_DARK} !important; text-decoration: underline; }
        .inventory-shell a:focus-visible,
        .inventory-shell button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
        .inventory-shell header button:focus-visible { outline-color: #fff; }
      `}</style>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,0.5)", zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      <aside
        style={{
          width: "260px", background: "#fff", display: "flex", flexDirection: "column",
          flexShrink: 0, borderRight: `1px solid ${GREEN_BORDER}`,
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "4px 0 24px rgba(46,125,62,0.10)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >
        {/* Logo / Brand */}
        <div style={{ padding: "0 20px", height: "64px", background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2, margin: 0 }}>Julieta Store</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: "2px", marginBottom: 0 }}>Inventory Panel</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* User Info */}
          <div style={{ padding: "14px 16px", margin: "16px 14px 6px", borderRadius: "14px", background: GREEN_TINT, border: `1px solid ${GREEN_BORDER}`, display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: YELLOW, color: GREEN_DARK, fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 6px rgba(250,204,21,0.45)" }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: INK, lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </p>
              <p style={{ fontSize: "11px", color: GREEN, fontWeight: 600, margin: "2px 0 0" }}>
                {ROLE_LABEL}
              </p>
            </div>
          </div>

          {/* Nav Label */}
          <p style={{ fontSize: "11px", fontWeight: 700, color: FAINT, letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 24px 8px", margin: 0 }}>
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
                  className={`nav-link${isActive ? " nav-active" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "9px 12px", borderRadius: "12px", marginBottom: "6px",
                    fontSize: "14px", textDecoration: "none",
                    color: isActive ? GREEN_DARK : INK,
                    background: isActive ? GREEN_LIGHT : "transparent",
                    border: `1px solid ${isActive ? "#c3e0c8" : "transparent"}`,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                >
                  <span
                    className="nav-tile"
                    style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: isActive ? `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})` : GREEN_TINT,
                      color: isActive ? "#fff" : GREEN,
                      boxShadow: isActive ? "0 4px 10px rgba(46,125,62,0.28)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {link.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Account label + Logout */}
          <div style={{ borderTop: `1px solid ${GREEN_LIGHT}`, margin: "4px 14px 0" }} />
          <p style={{ fontSize: "11px", fontWeight: 700, color: FAINT, letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 24px 8px", margin: 0 }}>
            Account
          </p>
          <div style={{ padding: "0 14px 14px" }}>
            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "9px 12px", borderRadius: "12px", background: "transparent", color: "#dc2626", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s ease" }}
            >
              <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg {...iconProps}>
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
        <div style={{ padding: "12px", borderTop: `1px solid ${GREEN_LIGHT}`, textAlign: "center", flexShrink: 0, background: GREEN_TINT }}>
          <p style={{ fontSize: "11.5px", color: FAINT, margin: 0 }}>© 2026 Julieta Soft Drinks</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}
      >

        {/* Topbar */}
        <header style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 10px rgba(31,95,45,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
              className="lg:hidden top-icon-btn"
              aria-label="Open menu"
              style={{ position: "relative", background: "rgba(255,255,255,0.16)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "10px", color: "#fff", flexShrink: 0, transition: "background 0.15s ease" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <p style={{ color: "#fff", fontSize: "17px", fontWeight: 700, lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>{page.title}</p>
              {page.sub && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", margin: "2px 0 0" }}>{page.sub}</p>}
            </div>
          </div>

          {/* Notification bell + User pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

            {/* Notification Icon + Dropdown */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen((prev) => !prev); }}
                className="top-icon-btn"
                aria-label="Notifications"
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
                    position: "absolute", top: "calc(100% + 10px)", right: 0, width: "340px", maxWidth: "calc(100vw - 32px)",
                    background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`,
                    boxShadow: "0 12px 32px rgba(31,95,45,0.18)", zIndex: 60,
                    animation: "notifFadeIn 0.16s ease",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${GREEN_BORDER}`, background: GREEN_TINT }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ fontSize: "13.5px", fontWeight: 700, color: INK, margin: 0 }}>Notifications</p>
                      {unreadCount > 0 && (
                        <span style={{ background: GREEN, color: "#fff", fontSize: "10.5px", fontWeight: 700, padding: "1px 8px", borderRadius: "10px" }}>{unreadCount}</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-link"
                        style={{ fontSize: "11.5px", fontWeight: 600, color: GREEN, background: "none", border: "none", cursor: "pointer" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "34px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: 0 }}>You&apos;re all caught up</p>
                        <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>Stock updates will show up here.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="notif-item"
                          onClick={() => markOneRead(n.id)}
                          style={{
                            display: "flex", gap: "11px", padding: "12px 16px",
                            borderBottom: `1px solid ${GREEN_LIGHT}`, cursor: "pointer",
                            background: n.read ? "#fff" : GREEN_TINT,
                            transition: "background 0.15s ease",
                          }}
                        >
                          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: n.read ? GREEN_TINT : GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "12.5px", fontWeight: n.read ? 500 : 700, color: INK, lineHeight: 1.3, margin: 0 }}>
                              {n.title}
                            </p>
                            <p style={{ fontSize: "11.5px", color: MUTED, lineHeight: 1.4, margin: "2px 0 0" }}>
                              {n.message}
                            </p>
                            <p style={{ fontSize: "10.5px", color: FAINT, margin: "4px 0 0", fontWeight: 500 }}>
                              {n.time}
                            </p>
                          </div>
                          {!n.read && (
                            <span style={{ marginTop: "6px", width: "8px", height: "8px", borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ padding: "10px 16px", borderTop: `1px solid ${GREEN_BORDER}`, textAlign: "center", background: GREEN_TINT }}>
                    <button
                      className="text-link"
                      style={{ fontSize: "11.5px", fontWeight: 600, color: GREEN, background: "none", border: "none", cursor: "pointer" }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.16)", padding: "5px 14px 5px 6px", borderRadius: "999px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: YELLOW, color: GREEN_DARK, fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {initial}
              </div>
              <div className="hidden sm:block">
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                  {displayName}
                </p>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.75)", lineHeight: 1.2, margin: "1px 0 0" }}>
                  {ROLE_LABEL}
                </p>
              </div>
            </div>

          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}