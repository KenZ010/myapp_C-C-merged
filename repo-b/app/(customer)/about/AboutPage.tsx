const stats = [
  { num: "15+", label: "Years in Business", sub: "Since 2010" },
  { num: "500+", label: "Partner Stores", sub: "Across multiple barangays" },
  { num: "20+", label: "Beverage Brands", sub: "Trusted suppliers" },
  { num: "98%", label: "Customer Satisfaction", sub: "Based on order reviews" },
];
const values = [
  {
    icon: "🎯",
    bg: "#e8f0fe",
    title: "Our Mission",
    desc: "To provide high-quality soft drinks to stores and businesses across the region with reliable and efficient delivery service.",
  },
  {
    icon: "❤️",
    bg: "#fce4ec",
    title: "Customer First",
    desc: "We prioritize customer satisfaction by ensuring product quality, fair pricing, and excellent service on every order.",
  },
  {
    icon: "⭐",
    bg: "#fffde7",
    title: "Quality Products",
    desc: "We partner with trusted beverage brands to deliver only the best soft drinks to our customers.",
  },
  {
    icon: "🚚",
    bg: "#e8f5e9",
    title: "Reliable Delivery",
    desc: "Our dedicated delivery team ensures your orders arrive on time and in perfect condition.",
  },
];
const team = [
  {
    initial: "J",
    name: "Julieta R.",
    role: "Founder & Owner",
    color: "#2d7a3a",
  },
  {
    initial: "M",
    name: "Marco S.",
    role: "Operations Manager",
    color: "#7c3aed",
  },
  { initial: "A", name: "Ana L.", role: "Customer Support", color: "#ec4899" },
];

export default function AboutPage() {
  return (
    <div style={{ padding: "16px" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed, #ec4899)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "8px",
          }}
        >
          Julieta Soft Drinks
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
          Your trusted beverage distribution partner since 2010
        </p>
      </div>

      {/* Story + Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "12px",
            }}
          >
            Our Story
          </h2>
          {[
            "Julieta Soft Drinks started as a small family-owned business with a simple goal: to make quality beverages accessible to every store and sari-sari store in our community.",
            "Over the years, we've grown from serving just a handful of local stores to becoming a trusted distributor for hundreds of businesses across multiple barangays.",
            "Today, we continue to uphold our commitment to quality, affordability, and exceptional customer service. We've embraced technology to make ordering easier through our mobile application.",
          ].map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: "13px",
                color: "#555",
                lineHeight: 1.75,
                marginBottom: "10px",
              }}
            >
              {p}
            </p>
          ))}
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#aaa",
              fontWeight: 500,
            }}
          >
            By the numbers
          </p>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f9f9f9",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#2d7a3a",
                  minWidth: "58px",
                }}
              >
                {s.num}
              </span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>
                  {s.label}
                </p>
                <p
                  style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}
                >
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Values */}
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
        Our core values
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {values.map((v) => (
          <div
            key={v.title}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "20px",
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: v.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              {v.icon}
            </div>
            <div>
              <p
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "5px",
                }}
              >
                {v.title}
              </p>
              <p style={{ fontSize: "12.5px", color: "#777", lineHeight: 1.6 }}>
                {v.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Team */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#1a1a1a",
            marginBottom: "16px",
          }}
        >
          Meet the Team
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          {team.map((t) => (
            <div
              key={t.name}
              style={{
                textAlign: "center",
                padding: "16px 12px",
                background: "#f9f9f9",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: t.color,
                  margin: "0 auto 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {t.initial}
              </div>
              <p
                style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}
              >
                {t.name}
              </p>
              <p style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                {t.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#2d7a3a",
          fontWeight: 500,
          paddingBottom: "8px",
        }}
      >
        TECHNOLOGIA @2026
      </p>
    </div>
  );
}
