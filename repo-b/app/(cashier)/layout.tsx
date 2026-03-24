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
      className="flex h-screen overflow-hidden"
      style={{ background: "#f5f5f5" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-[220px] flex flex-col shrink-0 bg-white"
        style={{ borderRight: "1px solid #f0f0f0" }}
      >
        {/* Logo */}
        <div
          className="flex flex-col items-center gap-1 px-5 py-6"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        >
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[11px] font-extrabold text-white text-center leading-snug"
            style={{
              background: "linear-gradient(135deg, #ff6b35, #f5c842)",
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
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          >
            👤
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900">Rjay Salina</p>
            <p className="text-[11px]" style={{ color: "#aaa" }}>
              Cashier
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-5 py-3 text-sm no-underline transition-all duration-150"
                style={{
                  color: isActive ? "#1a3c2e" : "#555",
                  background: isActive ? "#f0faf2" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #1a3c2e"
                    : "3px solid transparent",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                }}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid #f0f0f0" }}>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold no-underline"
            style={{
              background: "#fff5f5",
              color: "#e53935",
              textDecoration: "none",
            }}
          >
            <span className="text-lg">🚪</span>
            Log out
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-7 shrink-0"
          style={{ background: "#1a3c2e", height: "56px" }}
        >
          <div>
            <p className="text-white text-base font-semibold">{page.title}</p>
            {page.sub && (
              <p
                className="text-[11px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {page.sub}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Online
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
