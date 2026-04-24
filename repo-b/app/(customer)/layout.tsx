"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import { CartProvider, useCart } from "@/context/CartContext";

const pageTitles: Record<string, { title: string; sub: string }> = {
  "/home": { title: "Dashboard", sub: "Welcome back" },
  "/products": { title: "Products", sub: "Browse our selection" },
  "/orders": { title: "My Orders", sub: "Track your transactions" },
  "/faqs": { title: "FAQs", sub: "Frequently Asked Questions" },
  "/contact": { title: "Contact Us", sub: "We're here to help" },
  "/about": { title: "About Us", sub: "Know more about our business" },
  "/transactions": { title: "Transaction History", sub: "0 completed transaction(s)" },
  "/return-order": { title: "Return Order", sub: "Submit a return request" },
  "/settings": { title: "Settings", sub: "Manage your account information" },
  "/cart": { title: "Shopping Cart", sub: "Review your items" },
  "/checkout": { title: "Checkout", sub: "Confirm your order" },
  "/order-placed": { title: "Order Placed", sub: "Order placed successfully" },
};

const hideSearchCart = [
  "/contact", "/about", "/faqs", "/home", "/return-order",
  "/transactions", "/settings", "/cart", "/checkout", "/order-placed",
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const page = pageTitles[pathname] ?? { title: "Julieta Store", sub: "" };
  const { totalCount } = useCart();

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};
  const displayName = user?.name || "Guest";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f5f5f5", position: "relative" }}>

      {/* Drawer handles its own logout internally */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customerName={displayName}
      />

      {/* Topbar */}
      <header style={{ background: "#2d7a3a", padding: "0 28px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "5px", padding: "6px", borderRadius: "8px" }}
          >
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
            <div style={{ width: "22px", height: "2px", background: "#fff", borderRadius: "2px" }} />
          </button>
          <div>
            <p style={{ color: "#fff", fontSize: "16px", fontWeight: 500 }}>{page.title}</p>
            {page.sub && <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>{page.sub}</p>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!hideSearchCart.includes(pathname) && (
            <Link href="/cart" style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", textDecoration: "none", position: "relative" }}>
              🛒
              {totalCount > 0 && (
                <span style={{ position: "absolute", top: "4px", right: "4px", width: "16px", height: "16px", borderRadius: "50%", background: "#f5c842", fontSize: "9px", color: "#2d7a3a", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {totalCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DashboardInner>{children}</DashboardInner>
    </CartProvider>
  );
}