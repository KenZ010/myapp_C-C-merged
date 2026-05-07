"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// ── SVG Icons ──────────────────────────────────────────────────────────
const IconMonitoring = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
    <rect x="10" y="1" width="6" height="6" rx="1.2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
    <rect x="1" y="10" width="6" height="6" rx="1.2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
    <rect x="10" y="10" width="6" height="6" rx="1.2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
  </svg>
);

const IconAdjustment = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M1 3h15M1 8.5h15M1 14h15" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="5" cy="3" r="2" fill={active ? "#5c6bc0" : "#9e9e9e"}/>
    <circle cx="12" cy="8.5" r="2" fill={active ? "#5c6bc0" : "#9e9e9e"}/>
    <circle cx="7" cy="14" r="2" fill={active ? "#5c6bc0" : "#9e9e9e"}/>
  </svg>
);

const IconRestocking = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <rect x="1" y="7" width="15" height="9" rx="1.2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
    <path d="M5 7V5a3.5 3.5 0 0 1 7 0v2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8.5" y1="10" x2="8.5" y2="13" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="7" y1="11.5" x2="10" y2="11.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconReturn = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M15 8.5A6.5 6.5 0 1 1 8.5 2" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <polyline points="8.5,2 12,2 12,5.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLossReport = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <rect x="3" y="1" width="11" height="15" rx="1.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5"/>
    <line x1="6" y1="5.5" x2="11" y2="5.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="8.5" x2="11" y2="8.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="11.5" x2="9" y2="11.5" stroke={active ? "#5c6bc0" : "#9e9e9e"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M7 2H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round"/>
    <polyline points="11,5 15,8.5 11,12" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15" y1="8.5" x2="6" y2="8.5" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Nav Config ─────────────────────────────────────────────────────────
const navLinks = [
  { href: "/inventory/monitoring",  label: "Inventory Monitoring",  Icon: IconMonitoring },
  { href: "/inventory/adjustment",  label: "Inventory Adjustment",  Icon: IconAdjustment },
  { href: "/inventory/restocking",  label: "Restocking",            Icon: IconRestocking },
  { href: "/inventory/return",      label: "Return",                Icon: IconReturn },
  { href: "/inventory/loss-report", label: "Loss Report",           Icon: IconLossReport },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/inventory/monitoring":  { title: "Inventory Monitoring",  sub: "Monitor stock levels" },
  "/inventory/adjustment":  { title: "Inventory Adjustment",  sub: "Manage and update stock levels" },
  "/inventory/restocking":  { title: "Restocking",            sub: "Manage restocking orders" },
  "/inventory/return":      { title: "Return",                sub: "Manage product returns" },
  "/inventory/loss-report": { title: "Loss Report",           sub: "Track product losses" },
};

// ── Layout ─────────────────────────────────────────────────────────────
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = pageTitles[pathname] ?? { title: "Inventory Manager", sub: "" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const expired = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `token=; ${expired}`;
    document.cookie = `active_token=; ${expired}`;
    router.push("/");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f5f6fa" }}>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "230px",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid #ebebf0",
          boxShadow: "2px 0 12px rgba(92,107,192,0.06)",
          position: "fixed",
          top: 0, left: 0, height: "100%",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >

        {/* Logo */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid #ebebf0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "linear-gradient(135deg, #5c6bc0, #7986cb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "0 2px 8px rgba(92,107,192,0.35)",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10L10 3L17 10V18H13V13H7V18H3V10Z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "13.5px", fontWeight: 800, color: "#1a237e", letterSpacing: "0.2px", lineHeight: 1.2 }}>
              Julieta Store
            </p>
            <p style={{ fontSize: "11px", color: "#9fa8da", fontWeight: 500 }}>
              Inventory Panel
            </p>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: "14px 16px", margin: "14px 14px 0", background: "#f3f4fb", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #5c6bc0, #7986cb)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="4" fill="#fff" opacity="0.9"/>
              <path d="M2 17c0-3.866 3.134-7 7-7s7 3.134 7 7" fill="#fff" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#1a237e" }}>James Renoblas</p>
            <p style={{ fontSize: "10.5px", color: "#5c6bc0", fontWeight: 500 }}>Inventory Manager</p>
          </div>
        </div>

        {/* Nav label */}
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#bdbdbd", letterSpacing: "1.2px", padding: "18px 20px 8px", textTransform: "uppercase" }}>
          Navigation
        </p>

        {/* Nav Links */}
        <nav style={{ flex: 1, paddingBottom: "8px" }}>
          {navLinks.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px",
                  margin: "2px 10px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  textDecoration: "none",
                  color: isActive ? "#3949ab" : "#757575",
                  fontWeight: isActive ? 700 : 400,
                  background: isActive ? "#ede7f6" : "transparent",
                  borderLeft: isActive ? "3px solid #5c6bc0" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <Icon active={isActive} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 14px 20px", borderTop: "1px solid #ebebf0" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 14px", borderRadius: "10px", border: "none",
              background: "#fff5f5", color: "#e53935",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            <IconLogout />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          background: "#3949ab",
          padding: "0 20px", height: "56px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, boxShadow: "0 2px 8px rgba(57,73,171,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{
                background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: "4px",
                padding: "8px", borderRadius: "8px", flexShrink: 0,
              }}
            >
              <div style={{ width: "20px", height: "2px", background: "#fff", borderRadius: "2px" }} />
              <div style={{ width: "20px", height: "2px", background: "#fff", borderRadius: "2px" }} />
              <div style={{ width: "20px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            </button>

            <div>
              <p style={{ color: "#fff", fontSize: "15px", fontWeight: 700, letterSpacing: "0.2px" }}>
                {page.title}
              </p>
              {page.sub && (
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>
                  {page.sub}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#69f0ae" }} />
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}