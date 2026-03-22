"use client";
import { useState } from "react";

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
    a: "Delivery usually takes 1–2 hours depending on your location and current order volume.",
  },
  {
    q: "Can I modify my order after placing it?",
    a: 'You may request modifications while your order is still in "Waiting" status. Once it moves to "Processing," changes can no longer be made.',
  },
  {
    q: "What is the minimum order quantity?",
    a: "There is no minimum order quantity. You can order as little or as much as you need.",
  },
  {
    q: "Do you offer discounts or promos?",
    a: "Yes! We regularly offer promos such as Buy 3 Get 1 Free. Check the Home page for current announcements and special offers.",
  },
  {
    q: "What if I receive damaged items?",
    a: 'You may return damaged items through the My Orders page. Select the order and choose "Return" then provide details about the issue.',
  },
  {
    q: "How do I track my order?",
    a: "Go to My Orders to see real-time status updates: Waiting, Processing, Out For Delivery, and Received.",
  },
  {
    q: "Can I reorder previous purchases?",
    a: "Yes! In the My Orders page, find any past order and tap the Reorder button to quickly add the same items to your cart.",
  },
  {
    q: "What areas do you deliver to?",
    a: "We currently deliver within select barangays in our area. Contact us via the Contacts page to confirm if your location is covered.",
  },
];

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div style={{ padding: "28px" }}>
      {/* Help Card */}
      <div
        style={{
          background: "#f3ebfe",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}
      >
        <p style={{ fontWeight: 500, color: "#3c3489", marginBottom: "6px" }}>
          Need Help?
        </p>
        <p style={{ fontSize: "13px", color: "#534ab7", lineHeight: 1.6 }}>
          Find answers to common questions below. If you need further
          assistance, contact our support team.
        </p>
      </div>

      {/* Accordion */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {faqs.map((faq, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "0.5px solid #e5e5e5",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggle(i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                color: "#1a1a1a",
                textAlign: "left",
              }}
            >
              {faq.q}
              <span
                style={{
                  transform:
                    openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  fontSize: "12px",
                  color: "#888",
                  flexShrink: 0,
                  marginLeft: "12px",
                }}
              >
                ▼
              </span>
            </button>
            {openIndex === i && (
              <div
                style={{
                  padding: "12px 20px 16px",
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: 1.6,
                  borderTop: "0.5px solid #f0f0f0",
                }}
              >
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
