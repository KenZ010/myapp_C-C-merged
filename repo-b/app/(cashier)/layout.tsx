"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navLinks = [
  { href: "/cashier/inventory", label: "Inventory", icon: "📦" },
  { href: "/cashier/ordering", label: "Ordering", icon: "🛒" },
  { href: "/cashier/pending", label: "Pending", icon: "⏳" },
  { href: "/cashier/transactions", label: "Transaction History", icon: "🕐" },
];

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/cashier/inventory": {
    title: "Inventory",
    sub: "View products & stock levels",
  },
  "/cashier/ordering": { title: "Ordering", sub: "Create order for customer" },
  "/cashier/pending": { title: "Pending", sub: "Orders waiting for action" },
  "/cashier/transactions": {
    title: "Transaction History",
    sub: "Sales reports & records",
  },
  "/cashier/payment": { title: "Payment", sub: "Complete the customer order" },
};

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = pageTitles[pathname] ?? { title: "Cashier Panel", sub: "" };

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
            display: "block",
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
            padding: "24px 20px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff6b35, #f5c842)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.3,
              border: "3px solid #1a3c2e",
            }}
          >
            Julieta
            <br />
            Store
          </div>
        </div>

        {/* User Info */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>
              Rjay Salina
            </p>
            <p style={{ fontSize: "11px", color: "#aaa" }}>Cashier</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
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
                  gap: "14px",
                  padding: "13px 20px",
                  fontSize: "14px",
                  textDecoration: "none",
                  color: isActive ? "#1a3c2e" : "#555",
                  background: isActive ? "#f0faf2" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #1a3c2e"
                    : "3px solid transparent",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "18px" }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "12px 16px",
              borderRadius: "12px",
              textDecoration: "none",
              background: "#fff5f5",
              color: "#e53935",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: "18px" }}>🚪</span>
            Log out
          </Link>
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
        className=""
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
              <div
                style={{
                  width: "22px",
                  height: "2px",
                  background: "#fff",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "22px",
                  height: "2px",
                  background: "#fff",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "22px",
                  height: "2px",
                  background: "#fff",
                  borderRadius: "2px",
                }}
              />
            </button>
            <div>
              <p style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>
                {page.title}
              </p>
              {page.sub && (
                <p
                  style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}
                >
                  {page.sub}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#4caf50",
              }}
            />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              Online
            </span>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
