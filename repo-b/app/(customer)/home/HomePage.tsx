import Link from "next/link";

const quickCards = [
  {
    href: "/home",
    icon: "🏠",
    bg: "#e8f0fe",
    label: "Home",
    desc: "Featured content & announcements",
  },
  {
    href: "/products",
    icon: "🥤",
    bg: "#e6f9f1",
    label: "Products",
    desc: "Browse our soft drink selection",
  },
  {
    href: "/faqs",
    icon: "❓",
    bg: "#f3ebfe",
    label: "FAQs",
    desc: "Common questions answered",
  },
  {
    href: "/contact",
    icon: "📞",
    bg: "#fff0e6",
    label: "Contacts",
    desc: "Get in touch with us",
  },
  {
    href: "/about",
    icon: "ℹ️",
    bg: "#fce4ec",
    label: "About Us",
    desc: "Learn about our business",
  },
  {
    href: "/orders",
    icon: "📦",
    bg: "#e8f5e9",
    label: "View My Orders",
    desc: "Track your orders",
  },
];

export default function HomePage() {
  return (
    <div style={{ padding: "28px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500, color: "#1a1a1a" }}>
          Good day, KENDY 👋
        </h1>
        <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
          Welcome back to Julieta Soft Drink Store
        </p>
      </div>

      {/* Promo Banner */}
      <div
        style={{
          background: "#2d7a3a",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Todays promo
          </p>
          <h2 style={{ fontSize: "18px", fontWeight: 500, color: "#f5c842" }}>
            Buy 3, Get 1 Free!
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.7)",
              marginTop: "4px",
            }}
          >
            On selected soft drinks — today only
          </p>
        </div>
        <span style={{ fontSize: "36px" }}>🎉</span>
      </div>

      <p
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "#aaa",
          fontWeight: 500,
          marginBottom: "14px",
        }}
      >
        Quick access
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "20px",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: card.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                marginBottom: "12px",
              }}
            >
              {card.icon}
            </div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#1a1a1a",
                marginBottom: "4px",
              }}
            >
              {card.label}
            </p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
