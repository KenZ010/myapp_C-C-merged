"use client";
import { useState, useMemo } from "react";

const faqs = [
  {
    q: "How do I place an order?",
    a: "Browse the Products page, add items to your cart, then proceed to checkout. You will receive a confirmation once your order is placed.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept cash on delivery and GCash. If paying via GCash, please attach your receipt when handing payment to the rider.",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery time may vary depending on the customer's location and the availability of delivery personnel.",
  },
  {
    q: "What is the minimum order quantity?",
    a: "There is no minimum order quantity. You can order as little or as much as you need.",
  },
  {
    q: "Do you offer discounts or promos?",
    a: "Yes, discounts are available for selected customers. Promotions are also offered occasionally during special events and occasions.",
  },
  {
    q: "What if I receive damaged items?",
    a: "If you receive a damaged item, please visit the Return Page to submit a return request. Once your request has been reviewed and approved, the damaged product will be replaced through delivery.",
  },
  {
    q: "How do I track my order?",
    a: "Go to My Orders to see real-time status updates: Waiting, Processing, Out For Delivery, and Received.",
  },
  {
    q: "What areas do you deliver to?",
    a: "We currently deliver within select barangays in our area. Contact us via the Contacts page to confirm if your location is covered.",
  },
];

// ── Highlight matching keyword inside a string ─────────────────────────────────
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;

  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              background: "#fde68a",
              color: "#92400e",
              borderRadius: "3px",
              padding: "0 2px",
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search,    setSearch]    = useState("");

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  // Filter FAQs based on search — match question or answer
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs.map((faq, i) => ({ ...faq, originalIndex: i }));
    return faqs
      .map((faq, i) => ({ ...faq, originalIndex: i }))
      .filter(
        (faq) =>
          faq.q.toLowerCase().includes(q) ||
          faq.a.toLowerCase().includes(q)
      );
  }, [search]);

  // Auto-expand the only result when searching
  const activeOpen =
    search.trim() && filtered.length === 1 ? filtered[0].originalIndex : openIndex;

  return (
    <div style={{ padding: "28px" }}>

      {/* Help Card */}
      <div
        style={{
          background: "#f3ebfe",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
        }}
      >
        <p style={{ fontWeight: 500, color: "#3c3489", marginBottom: "6px" }}>
          Need Help?
        </p>
        <p style={{ fontSize: "13px", color: "#534ab7", lineHeight: 1.6, margin: 0 }}>
          Find answers to common questions below. If you need further
          assistance, contact our support team.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        {/* Search icon */}
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="#aaa" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpenIndex(null); // reset open state when search changes
          }}
          placeholder="Search questions…"
          style={{
            width: "100%",
            padding: "12px 40px 12px 40px",
            borderRadius: "12px",
            border: "1.5px solid #e5e5e5",
            fontSize: "14px",
            color: "#1a1a1a",
            background: "#fff",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
          onBlur={(e)  => (e.target.style.borderColor = "#e5e5e5")}
        />

        {/* Clear button */}
        {search && (
          <button
            onClick={() => { setSearch(""); setOpenIndex(null); }}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: "#e5e5e5", border: "none", borderRadius: "50%",
              width: "20px", height: "20px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", color: "#666", lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Result count when searching */}
      {search.trim() && (
        <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
          {filtered.length === 0
            ? "No results found"
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search.trim()}"`}
        </p>
      )}

      {/* Accordion */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "48px 24px",
            background: "#fff", borderRadius: "12px",
            border: "0.5px solid #e5e5e5",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
            No questions found
          </p>
          <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>
            Try a different keyword or browse all questions by clearing the search.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((faq) => {
            const isOpen = activeOpen === faq.originalIndex;
            return (
              <div
                key={faq.originalIndex}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: `0.5px solid ${isOpen ? "#c4b5fd" : "#e5e5e5"}`,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
              >
                <button
                  onClick={() => toggle(faq.originalIndex)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: isOpen ? "#f5f3ff" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#1a1a1a",
                    textAlign: "left",
                    transition: "background 0.2s",
                  }}
                >
                  <span>
                    <Highlight text={faq.q} keyword={search} />
                  </span>
                  <span
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      fontSize: "12px",
                      color: isOpen ? "#7c3aed" : "#888",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "12px 20px 16px",
                      fontSize: "13px",
                      color: "#555",
                      lineHeight: 1.6,
                      borderTop: "0.5px solid #f0f0f0",
                    }}
                  >
                    <Highlight text={faq.a} keyword={search} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}