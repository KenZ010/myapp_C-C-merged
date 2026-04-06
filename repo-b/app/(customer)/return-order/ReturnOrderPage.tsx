"use client";
import { useState, useRef } from "react";

const reasons = [
  "Wrong item delivered",
  "Damaged / broken item",
  "Expired product",
  "Missing items in order",
  "Poor product quality",
  "Other",
];

export default function ReturnOrderPage() {
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    quantity: "1",
    reason: "",
    notes: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i: number) =>
    setImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!form.productName || !form.brand || !form.reason) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #fff0f3, #ffe4ec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff6b8a, #e91e8c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              margin: "0 auto 20px",
            }}
          >
            ✅
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "10px",
            }}
          >
            Return Request Submitted!
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#888",
              lineHeight: 1.7,
              maxWidth: "340px",
              margin: "0 auto 28px",
            }}
          >
            We will review your return request within 24–48 hours and contact
            you via your registered contact number.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                productName: "",
                brand: "",
                quantity: "1",
                reason: "",
                notes: "",
              });
              setImages([]);
            }}
            style={{
              background: "linear-gradient(135deg, #ff6b8a, #e91e8c)",
              color: "#fff",
              border: "none",
              borderRadius: "30px",
              padding: "13px 40px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #f0f0f0",
    fontSize: "14px",
    outline: "none",
    background: "#fafafa",
    color: "#1a1a1a",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "8px",
    display: "block",
  };
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: "16px",
    padding: "clamp(14px, 2.5vw, 24px)",
    border: "0.5px solid #f0e8ec",
    marginBottom: "16px",
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        background: "linear-gradient(160deg, #fff5f7 0%, #ffe4ec 100%)",
        padding: "clamp(14px, 3vw, 28px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Product Name */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <span style={{ marginRight: "8px" }}>📦</span> Product Name
            </label>
            <input
              name="productName"
              value={form.productName}
              onChange={handleChange}
              placeholder="Enter product name..."
              style={inputStyle}
            />
          </div>

          {/* Brand */}
          <div style={cardStyle}>
            <label style={labelStyle}>🏷️ Brand</label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              placeholder="Enter brand name..."
              style={inputStyle}
            />
          </div>

          {/* Quantity */}
          <div style={cardStyle}>
            <label style={labelStyle}>🔢 Quantity</label>
            <input
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Reason for Return */}
          <div style={cardStyle}>
            <label style={labelStyle}>❗ Reason for Return</label>
            <select
              name="reason"
              value={form.reason}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select a reason...</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Upload Evidence */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              📸 Upload Evidence{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 400, color: "#aaa" }}
              >
                (photos of the item)
              </span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed #f5a0b5",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                background: "#fff8fa",
                marginBottom: images.length > 0 ? "14px" : "0",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🖼️</div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#e91e8c",
                  marginBottom: "4px",
                }}
              >
                Click to upload photos
              </p>
              <p style={{ fontSize: "11px", color: "#bbb" }}>
                JPG, PNG supported • Max 5 photos
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImages}
              style={{ display: "none" }}
            />

            {/* Image Previews */}
            {images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                  gap: "10px",
                }}
              >
                {images.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      aspectRatio: "1",
                    }}
                  >
                    <img
                      src={src}
                      alt={`evidence-${i}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      onClick={() => removeImage(i)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        color: "#fff",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      borderRadius: "10px",
                      border: "2px dashed #f5a0b5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      cursor: "pointer",
                      aspectRatio: "1",
                      background: "#fff8fa",
                      color: "#e91e8c",
                    }}
                  >
                    +
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              📝 Notes{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 400, color: "#aaa" }}
              >
                (Optional)
              </span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or details about the return..."
              rows={5}
              style={{ ...inputStyle, resize: "none" }}
            />
            <p style={{ fontSize: "11px", color: "#bbb", marginTop: "8px" }}>
              Provide additional details to help us process your return faster.
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!form.productName || !form.brand || !form.reason}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "30px",
              border: "none",
              background:
                !form.productName || !form.brand || !form.reason
                  ? "#f0c0cc"
                  : "linear-gradient(135deg, #ff6b8a, #e91e8c)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor:
                !form.productName || !form.brand || !form.reason
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                !form.productName || !form.brand || !form.reason
                  ? "none"
                  : "0 6px 20px rgba(233,30,140,0.35)",
              marginBottom: "14px",
            }}
          >
            Submit Return Request
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#aaa",
              lineHeight: 1.6,
            }}
          >
            We will review your return request within 24–48 hours and contact
            you via your registered contact number.
          </p>
        </div>
      </div>
    </div>
  );
}
