export default function ContactPage() {
  return (
    <div style={{ padding: "28px" }}>
      {/* Top 2-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Business Hours */}
        <div
          style={{
            background: "linear-gradient(135deg, #ff7043, #e91e8c)",
            borderRadius: "16px",
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🕐
            </div>
            <p style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>
              Business Hours
            </p>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.25)",
              paddingTop: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {[
              ["Monday - Saturday:", "6:00 AM - 6:00 PM", true],
              ["Sunday:", "7:00 AM - 4:00 PM", true],
            ].map(([day, time, open]) => (
              <div
                key={String(day)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.9)" }}
                >
                  {day}
                </span>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: open ? "#fff" : "#ffcdd2",
                    background: open
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.15)",
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Store Info */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "0.5px solid #e8e8e8",
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🏪
            </div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}>
              About the Store
            </p>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {[
              {
                icon: "🏷️",
                label: "Store Name",
                value: "Julieta Soft Drink Store",
              },
              { icon: "📅", label: "Established", value: "Since 2006" },
              { icon: "👤", label: "Owner", value: "Simeon Salinas" },
              {
                icon: "🥤",
                label: "Specializes",
                value: "Soft Drinks & Beverages",
              },
              {
                icon: "🚚",
                label: "Service",
                value: "Wholesale & Retail Delivery",
              },
              {
                icon: "⭐",
                label: "Rating",
                value: "4.9 / 5.0 — Highly Rated",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  background: "#f9f9f9",
                  borderRadius: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    width: "24px",
                    textAlign: "center",
                  }}
                >
                  {item.icon}
                </span>
                <div>
                  <p style={{ fontSize: "10px", color: "#aaa" }}>
                    {item.label}
                  </p>
                  <p
                    style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Cards — 4 columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            icon: "📞",
            bg: "#e8f5e9",
            label: "Phone Number",
            value: "+63 929 141 0133",
            desc: "Call for immediate help",
          },
          {
            icon: "💬",
            bg: "#e3f2fd",
            label: "Text / SMS",
            value: "0912 345 6789",
            desc: "Send us a text anytime",
          },
          {
            icon: "✉️",
            bg: "#ede7f6",
            label: "Email",
            value: "Not Available",
            desc: "We reply within 24 hours",
          },
          {
            icon: "🔵",
            bg: "#e3f2fd",
            label: "Facebook",
            value: "Not Available",
            desc: "Message us on Facebook",
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: c.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                margin: "0 auto 12px",
              }}
            >
              {c.icon}
            </div>
            <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              {c.label}
            </p>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#1a1a1a",
                marginBottom: "4px",
              }}
            >
              {c.value}
            </p>
            <p style={{ fontSize: "11px", color: "#999" }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Location + Delivery Coverage */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Store Location */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#fff3e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              📍
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>
              Store Location
            </p>
          </div>
          <div
            style={{
              background: "#f9f9f9",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {[
              ["📌", "Address", "3065 JP Rizal St. Pagasa Camarin"],
              ["🏙️", "City", "Caloocan City"],
              ["📮", "ZIP Code", "1400"],
            ].map(([icon, label, val]) => (
              <div
                key={String(label)}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "14px" }}>{icon}</span>
                <div>
                  <p style={{ fontSize: "10px", color: "#aaa" }}>{label}</p>
                  <p
                    style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}
                  >
                    {val}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Coverage */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #e8e8e8",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🚚
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>
              Delivery Coverage
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              "Barangay 175",
              "Barangay 176",
            ].map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  background: "#f9f9f9",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#2d7a3a",
                    flexShrink: 0,
                    display: "block",
                  }}
                />
                <span style={{ fontSize: "13px", color: "#444" }}>{b}</span>
              </div>
            ))}
          </div>
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
