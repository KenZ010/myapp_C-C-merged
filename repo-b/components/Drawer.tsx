"use client";
import { useRouter, usePathname } from "next/navigation";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
}

const menuItems = [
  { href: "/home",    icon: "🏠", bg: "#e8f5e9", label: "Home" },
  { href: "/products",icon: "🥤", bg: "#e6f9f1", label: "Products" },
  { href: "/orders",  icon: "📦", bg: "#e3f2fd", label: "My Orders" },
  { href: "/faqs",    icon: "❓", bg: "#f3ebfe", label: "FAQs" },
  { href: "/about",   icon: "ℹ️", bg: "#fce4ec", label: "About Us" },
  { href: "/contact", icon: "📞", bg: "#fff0e6", label: "Contacts" },
];

const bottomItems = [
  { href: "/transactions",  icon: "🕐", bg: "#e3f2fd", label: "Transaction History" },
  { href: "/return-order",  icon: "↩️", bg: "#fce4ec", label: "Return Order" },
  { href: "/settings",      icon: "⚙️", bg: "#ede7f6", label: "Settings" },
];

export default function Drawer({ isOpen, onClose, customerName = "Customer Name" }: DrawerProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onClose();
    router.push("/logout");
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <>
          {/* Dim layer — pointerEvents none so it never blocks drawer clicks */}
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40, pointerEvents: "none" }} />
          {/* Close zone — only covers area outside the drawer */}
          <div onClick={onClose} style={{ position: "fixed", top: 0, left: "280px", right: 0, bottom: 0, zIndex: 41 }} />
        </>
      )}

      {/* Drawer Panel */}
      <div style={{ position: "fixed", top: 0, left: 0, height: "100%", width: "280px", background: "#fff", zIndex: 50, transform: isOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", borderRadius: "0 16px 16px 0", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#2d7a3a", padding: "24px 20px 20px", position: "relative", flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
          <p style={{ color: "#fff", fontSize: "20px", fontWeight: 700, marginBottom: "2px" }}>Julieta</p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "16px" }}>Premium Soft Drinks</p>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
              👤
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", marginBottom: "2px" }}>Welcome back</p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{customerName}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Menu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 0" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#bbb", fontWeight: 500, padding: "8px 8px 6px" }}>Navigation</p>

          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.label} onClick={() => handleNavigate(item.href)}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 12px", borderRadius: "12px", cursor: "pointer", background: isActive ? "#f0faf2" : "transparent", marginBottom: "2px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: "14px", fontWeight: isActive ? 600 : 500, color: isActive ? "#2d7a3a" : "#1a1a1a" }}>
                  {item.label}
                </span>
                {isActive && <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#2d7a3a" }} />}
              </div>
            );
          })}

          <div style={{ height: "1px", background: "#f0f0f0", margin: "12px 0" }} />

          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#bbb", fontWeight: 500, padding: "0 8px 6px" }}>Account</p>

          {bottomItems.map((item) => (
            <div key={item.label} onClick={() => handleNavigate(item.href)}
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 12px", borderRadius: "12px", cursor: "pointer", marginBottom: "2px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                {item.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{item.label}</span>
            </div>
          ))}

          <div style={{ height: "1px", background: "#f0f0f0", margin: "12px 0" }} />

          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 12px", borderRadius: "12px", border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left", marginBottom: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#ffebee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
              🚪
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#e53935" }}>Logout</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", textAlign: "center", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
          <p style={{ fontSize: "11px", color: "#bbb" }}>© 2026 Julieta Soft Drinks</p>
        </div>
      </div>
    </>
  );
}