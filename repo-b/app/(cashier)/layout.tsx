"use client";
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
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "220px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid #f0f0f0",
        }}
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
      >
        {/* Topbar */}
        <header
          style={{
            background: "#1a3c2e",
            padding: "0 28px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
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
