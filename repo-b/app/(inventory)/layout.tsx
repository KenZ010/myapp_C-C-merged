"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const navLinks = [
  { href: "/inventory/monitoring", label: "Inventory Monitoring", icon: "🏠" },
  { href: "/inventory/adjustment", label: "Inventory Adjustment", icon: "🛒" },
  { href: "/inventory/purchase-order", label: "Purchase Order", icon: "📋" },
  { href: "/inventory/return", label: "Return", icon: "🔄" },
  { href: "/inventory/loss-report", label: "Loss Report", icon: "📄" },
  { href: "/inventory/restocking", label: "Restocking", icon: "🚚" },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/inventory/monitoring": {
    title: "Inventory Monitoring",
    sub: "Monitor stock levels",
  },
  "/inventory/adjustment": {
    title: "Inventory Adjustment",
    sub: "Manage and update stock levels",
  },
  "/inventory/purchase-order": {
    title: "Purchase Order",
    sub: "Create and manage PO from suppliers",
  },
  "/inventory/return": { title: "Return", sub: "Manage product returns" },
  "/inventory/loss-report": {
    title: "Loss Report",
    sub: "Track product losses",
  },
  "/inventory/restocking": { title: "Restocking", sub: "Restock inventory" },
};

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = pageTitles[pathname] ?? { title: "Inventory Manager", sub: "" };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Expire cookies so middleware stops seeing a valid session
    const expired = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `token=; ${expired}`;
    document.cookie = `active_token=; ${expired}`;

    router.push("/");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#f5f5f5",
      }}
    >
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "220px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid #f0f0f0",
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >
        {/* Logo */}
        <div
          style={{
            padding: "28px 20px 24px",
            borderBottom: "1px solid #f0f0f0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 900,
              color: "#1a237e",
              letterSpacing: "0.5px",
              lineHeight: 1.3,
              textTransform: "uppercase",
            }}
          >
            Julieta Softdrinks
            <br />
            Store
          </p>
        </div>

        {/* User Info */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1a3c2e, #2d7a3a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>
              James Renoblas
            </p>
            <p style={{ fontSize: "11px", color: "#2d7a3a", fontWeight: 500 }}>
              Inventory Manager
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, paddingTop: "16px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 20px",
                  fontSize: "13.5px",
                  textDecoration: "none",
                  color: isActive ? "#2d7a3a" : "#666",
                  fontWeight: isActive ? 700 : 400,
                  background: "transparent",
                  borderRight: isActive
                    ? "3px solid #2d7a3a"
                    : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "17px", opacity: isActive ? 1 : 0.6 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "none",
              background: "#fff5f5",
              color: "#e53935",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "17px" }}>🚪</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Topbar */}
        <header
          style={{
            background: "#1a3c2e",
            padding: "0 16px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                padding: "6px",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
              <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
              <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            </button>

            <div>
              <p style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>
                {page.title}
              </p>
              {page.sub && (
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>
                  {page.sub}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#4caf50",
              }}
            />
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}