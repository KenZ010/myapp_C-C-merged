"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const quickCards = [
  {
    href: "/products",
    icon: "🥤",
    bg: "#e6f9f1",
    color: "#2d7a3a",
    label: "Products",
    desc: "Browse our soft drink selection",
  },
  {
    href: "/orders",
    icon: "📦",
    bg: "#e8f5e9",
    color: "#1a3c2e",
    label: "My Orders",
    desc: "Track your orders",
  },
  {
    href: "/contact",
    icon: "📞",
    bg: "#fff0e6",
    color: "#e65100",
    label: "Contacts",
    desc: "Get in touch with us",
  },
  {
    href: "/transactions",
    icon: "🕐",
    bg: "#e3f2fd",
    color: "#1565c0",
    label: "History",
    desc: "Your completed transactions",
  },
];

const promos = [
  {
    label: "Today's Promo",
    title: "Buy 3, Get 1 Free!",
    desc: "On selected soft drinks — today only",
    emoji: "🎉",
    bg: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
  },
  {
    label: "New Arrival",
    title: "Fanta Grape is here!",
    desc: "Try our newest flavor now",
    emoji: "🍇",
    bg: "linear-gradient(135deg, #4a148c, #7b1fa2)",
  },
  {
    label: "Free Delivery",
    title: "Free delivery on ₱1,000+",
    desc: "Order more, save more",
    emoji: "🚚",
    bg: "linear-gradient(135deg, #1565c0, #1e88e5)",
  },
];

const recentActivity = [
  {
    label: "Cola Regular x2",
    status: "Out For Delivery",
    color: "#e65100",
    bg: "#fff3e0",
    time: "Today, 10:30 AM",
  },
  {
    label: "Orange Soda x1",
    status: "Received",
    color: "#2e7d32",
    bg: "#e8f5e9",
    time: "Yesterday",
  },
  {
    label: "Mango Juice x3",
    status: "Processing",
    color: "#1565c0",
    bg: "#e3f2fd",
    time: "Mar 12",
  },
];

export default function HomePage() {
  const [promoIndex, setPromoIndex] = useState(0);
  const promo = promos[promoIndex];

  const [isTablet, setIsTablet] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsTablet(window.innerWidth < 1100);
      setIsPhone(window.innerWidth < 600);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Greeting */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a" }}>
            Good day, KENDY 👋
          </h1>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
            Welcome back to Julieta Soft Drink Store
          </p>
        </div>
      </div>

      {/* Promo Banner Carousel */}
      <div
        style={{
          background: promo.bg,
          borderRadius: "20px",
          padding: "28px 32px",
          minHeight: "140px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          transition: "all 0.3s",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.65)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            {promo.label}
          </span>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#f5c842",
              margin: "6px 0 4px",
            }}
          >
            {promo.title}
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>
            {promo.desc}
          </p>
          <Link
            href="/products"
            style={{
              display: "inline-block",
              marginTop: "14px",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              textDecoration: "none",
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Shop Now →
          </Link>
        </div>
        <span style={{ fontSize: "52px", flexShrink: 0 }}>{promo.emoji}</span>
      </div>

      {/* Promo Dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "6px",
          marginBottom: "24px",
        }}
      >
        {promos.map((_, i) => (
          <button
            key={i}
            onClick={() => setPromoIndex(i)}
            style={{
              width: i === promoIndex ? "20px" : "8px",
              height: "8px",
              borderRadius: "20px",
              border: "none",
              background: i === promoIndex ? "#2d7a3a" : "#e0e0e0",
              cursor: "pointer",
              transition: "all 0.3s",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total Orders",
            value: "12",
            icon: "📦",
            color: "#1a3c2e",
            bg: "#e8f5e9",
          },
          {
            label: "Pending",
            value: "2",
            icon: "⏳",
            color: "#f57f17",
            bg: "#fff9c4",
          },
          {
            label: "Completed",
            value: "8",
            icon: "✅",
            color: "#2e7d32",
            bg: "#e8f5e9",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: "20px", fontWeight: 800, color: s.color }}>
                {s.value}
              </p>
              <p style={{ fontSize: "11px", color: "#aaa" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <p
        style={{
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "#aaa",
          fontWeight: 600,
          marginBottom: "12px",
        }}
      >
        Quick Access
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isPhone
            ? "1fr"
            : isTablet
              ? "1fr 1fr"
              : "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
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
              padding: "16px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: card.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaa",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {card.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#aaa",
            fontWeight: 600,
          }}
        >
          Recent Orders
        </p>
        <Link
          href="/orders"
          style={{
            fontSize: "12px",
            color: "#2d7a3a",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          View All →
        </Link>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "0.5px solid #e8e8e8",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        {recentActivity.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom:
                i < recentActivity.length - 1 ? "0.5px solid #f5f5f5" : "none",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: item.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                🥤
              </div>
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1a1a1a",
                  }}
                >
                  {item.label}
                </p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>{item.time}</p>
              </div>
            </div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 600,
                background: item.bg,
                color: item.color,
                whiteSpace: "nowrap",
              }}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#ccc",
          fontWeight: 500,
        }}
      >
        TECHNOLOGIA @2026
      </p>
    </div>
  );
}
