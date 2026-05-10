"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/app/providers";

const navLinks = [
  {
    href: "/cashier/inventory",
    label: "Inventory",
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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/cashier/returns",
    label: "Returns",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
      </svg>
    ),
  },
  {
    href: "/cashier/transactions",
    label: "Transaction History",
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
  "/cashier/returns":      { title: "Returns",             sub: "File and track return requests" },
  "/cashier/transactions": { title: "Transaction History", sub: "Sales reports & records" },
  "/cashier/payment":      { title: "Payment",             sub: "Complete the customer order" },
};

// ── Toast type ────────────────────────────────────────────────────────────────
interface Toast {
  id:      number;
  orderId: string;
  message: string;
  visible: boolean;
}

// ── Toast Component ───────────────────────────────────────────────────────────
function NewOrderToast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <div
      className={[
        "flex items-start gap-3 bg-white rounded-2xl shadow-xl border border-indigo-100",
        "px-4 py-3.5 min-w-[300px] max-w-[360px] transition-all duration-500",
        toast.visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none",
      ].join(" ")}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
        🛒
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 mb-0.5">New Order!</p>
        <p className="text-xs text-gray-500 truncate">{toast.message}</p>
        <Link
          href="/cashier/pending"
          className="text-[11px] font-semibold text-indigo-600 hover:underline mt-1 inline-block no-underline"
        >
          View in Pending Orders →
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-300 hover:text-gray-500 transition-colors text-base leading-none flex-shrink-0 mt-0.5 bg-transparent border-0 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const socket   = useSocket();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts,      setToasts]      = useState<Toast[]>([]);
  const [mounted,     setMounted]     = useState(false); // ← added

  useEffect(() => { setMounted(true); }, []); // ← added

  const page = pageTitles[pathname] ?? { title: "Cashier Panel", sub: "" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const expired = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `token=; ${expired}`;
    document.cookie = `active_token=; ${expired}`;
    router.push("/");
  };

  // ── Dismiss toast ─────────────────────────────────────────────────────────
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 500);
  }, []);

  // ── Listen for new orders ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("order:new", ({ orderId, message }: { orderId: string; message: string }) => {
      const id = Date.now();
      const newToast: Toast = { id, orderId, message, visible: false };

      setToasts((prev) => [...prev, newToast]);
      // Small delay to trigger CSS transition
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: true } : t));
      }, 50);

      // Auto-dismiss after 6 seconds
      setTimeout(() => dismissToast(id), 6000);
    });

    return () => { socket.off("order:new"); };
  }, [socket, dismissToast]);

  if (!mounted) return null; // ← added

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f4f6fb" }}>

      {/* ── Toast stack (top-right) ─────────────────────────────────────── */}
      <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <NewOrderToast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* ── Mobile Overlay ── */}
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
          width: "240px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid #eaecf4",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "4px 0 24px rgba(99,102,241,0.06)",
        }}
        className="lg:relative lg:translate-x-0 lg:transform-none"
      >
        {/* Logo / Brand */}
        <div style={{ padding: "28px 24px 22px", borderBottom: "1px solid #eaecf4", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e1b4b", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Julieta Store</p>
            <p style={{ fontSize: "11px", color: "#a5b4fc", fontWeight: 500, marginTop: "2px" }}>Cashier Panel</p>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: "16px 20px", margin: "12px", borderRadius: "12px", background: "#f5f3ff", display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#3730a3", lineHeight: 1.2 }}>Ray</p>
            <p style={{ fontSize: "11px", color: "#818cf8", fontWeight: 500 }}>Cashier</p>
          </div>
        </div>

        {/* Nav Label */}
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#c7d2fe", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 24px 4px" }}>
          Navigation
        </p>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "4px 12px 12px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", borderRadius: "10px", marginBottom: "2px",
                  fontSize: "13.5px", textDecoration: "none",
                  color: isActive ? "#4338ca" : "#64748b",
                  background: isActive ? "#eef2ff" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {isActive && (
                  <span style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: "3px", borderRadius: "0 3px 3px 0", background: "linear-gradient(to bottom, #6366f1, #818cf8)" }} />
                )}
                <span style={{ color: isActive ? "#6366f1" : "#94a3b8", display: "flex", flexShrink: 0 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px", borderTop: "1px solid #eaecf4" }}>
          <button
            onClick={handleLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "10px", background: "#fff1f2", color: "#e11d48", fontSize: "13.5px", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{ background: "#fff", padding: "0 20px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid #eaecf4", boxShadow: "0 1px 6px rgba(99,102,241,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{ background: "#f5f3ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "8px", color: "#6366f1", flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <p style={{ color: "#1e1b4b", fontSize: "15px", fontWeight: 700, lineHeight: 1.2 }}>{page.title}</p>
              {page.sub && <p style={{ color: "#94a3b8", fontSize: "11.5px", marginTop: "1px" }}>{page.sub}</p>}
            </div>
          </div>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f0fdf4", borderRadius: "20px", padding: "5px 12px", border: "1px solid #bbf7d0" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>Online</span>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </main>
    </div>
  );
}