"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const notifItems = [
  { label: "Order Confirmed", desc: "Get notified when your order is placed", default: true },
  { label: "Out for Delivery", desc: "Get notified when rider is on the way", default: true },
  { label: "Order Received", desc: "Confirmation when order is delivered", default: true },
  { label: "Promos & Discounts", desc: "Be the first to know about deals", default: false },
  { label: "Return Status Updates", desc: "Updates on your return requests", default: true },
];

type Profile = { fullName: string; email: string; phone: string; address: string };
const emptyProfile: Profile = { fullName: "", email: "", phone: "", address: "" };

// Maps a customer record from the backend to the fields shown on this page
const toProfile = (c: any): Profile => ({
  fullName: c?.name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  address: c?.address ?? "",
});

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [meta, setMeta] = useState<{ status: string; since: string; orders: number | null }>({
    status: "",
    since: "",
    orders: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications">("profile");

  const [notif0, setNotif0] = useState(notifItems[0].default);
  const [notif1, setNotif1] = useState(notifItems[1].default);
  const [notif2, setNotif2] = useState(notifItems[2].default);
  const [notif3, setNotif3] = useState(notifItems[3].default);
  const [notif4, setNotif4] = useState(notifItems[4].default);

  const notifStates = [notif0, notif1, notif2, notif3, notif4];
  const notifSetters = [setNotif0, setNotif1, setNotif2, setNotif3, setNotif4];

  // ── Load the logged-in customer's profile ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (!stored?.id) {
          setLoadError("Please log in again.");
          return;
        }

        // show what we already have right away
        setProfile(toProfile(stored));

        // then refresh from the server
        const res = await api.getCustomer(stored.id);
        const c = res?.customer ?? res;
        if (cancelled || !c?.id) return;

        setProfile(toProfile(c));
        setMeta((m) => ({
          ...m,
          status: c.userStatus ?? "",
          since: c.createdAt ? String(new Date(c.createdAt).getFullYear()) : "",
        }));

        // order count is optional: if this call fails, we just show "—"
        try {
          const orders = await api.getCustomerOrders(stored.id);
          const list = Array.isArray(orders) ? orders : orders?.orders ?? orders?.data;
          if (Array.isArray(list) && !cancelled) setMeta((m) => ({ ...m, orders: list.length }));
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setLoadError("Could not load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = meta.status
    ? meta.status.charAt(0) + meta.status.slice(1).toLowerCase()
    : "—";

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle = (editable: boolean, hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    fontSize: "14px",
    border: hasError ? "1.5px solid #e53935" : editable ? "1.5px solid #a855f7" : "1.5px solid #f0f0f0",
    background: editable ? "#fff" : "#f9f9f9",
    outline: "none",
    color: "#1a1a1a",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
    transition: "border 0.2s",
  });

  const tabs = [
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "security", label: "Security", icon: "🔒" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
  ] as const;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg, #fdf4ff 0%, #fce4ec 100%)", padding: "clamp(14px, 3vw, 28px)" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "9px 20px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                border: activeTab === t.key ? "none" : "1px solid #e8e8e8",
                background: activeTab === t.key ? "linear-gradient(135deg, #a855f7, #e91e8c)" : "#fff",
                color: activeTab === t.key ? "#fff" : "#555",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* Left — Avatar + Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #f0e8f8", padding: "32px 24px", textAlign: "center" }}>
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                    <circle cx="26" cy="18" r="10" fill="rgba(255,255,255,0.9)" />
                    <path d="M6 46c0-11 9-18 20-18s20 7 20 18" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>{profile.fullName || "—"}</p>
                <p style={{ fontSize: "13px", color: "#999" }}>{profile.email}</p>
              </div>

              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #f0e8f8", padding: "20px" }}>
                <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#bbb", fontWeight: 500, marginBottom: "14px" }}>Account Status</p>
                {[
                  { icon: "✅", label: "Account", value: statusLabel },
                  { icon: "📦", label: "Total Orders", value: meta.orders ?? "—" },
                  { icon: "⭐", label: "Member Since", value: meta.since || "—" },
                  { icon: "💳", label: "Payment", value: "COD / GCash" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                    <span style={{ fontSize: "13px", color: "#777" }}>{item.icon} {item.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Read-only info */}
            <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #f0e8f8", padding: "28px" }}>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "24px" }}>Personal Information</p>

              {loading && <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "12px" }}>Loading your profile…</p>}
              {loadError && <p style={{ fontSize: "13px", color: "#e53935", marginBottom: "12px" }}>⚠️ {loadError}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", display: "block" }}>👤 Full Name</label>
                  <input value={profile.fullName} readOnly placeholder="Not set" style={inputStyle(false)} />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", display: "block" }}>📞 Phone Number</label>
                  <input value={profile.phone} readOnly placeholder="Not set" style={inputStyle(false)} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", display: "block" }}>✉️ Email Address</label>
                  <input value={profile.email} readOnly placeholder="Not set" style={inputStyle(false)} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", display: "block" }}>🏠 Complete Address</label>
                  <textarea value={profile.address} readOnly placeholder="Not set" rows={3} style={{ ...inputStyle(false), resize: "none" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === "security" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #f0e8f8", padding: "28px" }}>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>🔒 Change Password</p>
              {["Current Password", "New Password", "Confirm New Password"].map((label) => (
                <div key={label} style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", display: "block" }}>{label}</label>
                  <input type="password" placeholder="••••••••" style={inputStyle(true)} />
                </div>
              ))}
              <button style={{ width: "100%", padding: "12px", borderRadius: "20px", border: "none", background: "linear-gradient(135deg, #a855f7, #e91e8c)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginTop: "8px" }}>
                Update Password
              </button>
            </div>
            <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #f0e8f8", padding: "28px" }}>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>🛡️ Security Tips</p>
              {[
                { icon: "✅", tip: "Use at least 8 characters in your password" },
                { icon: "✅", tip: "Mix uppercase, lowercase, numbers and symbols" },
                { icon: "✅", tip: "Don't share your password with anyone" },
                { icon: "✅", tip: "Change your password regularly" },
                { icon: "⚠️", tip: "Log out when using shared devices" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                  <span>{item.icon}</span>
                  <p style={{ fontSize: "13px", color: "#555" }}>{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === "notifications" && (
          <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #f0e8f8", padding: "28px", maxWidth: "600px" }}>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "20px" }}>🔔 Notification Preferences</p>
            {notifItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{item.label}</p>
                  <p style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{item.desc}</p>
                </div>
                <div
                  onClick={() => notifSetters[i](!notifStates[i])}
                  style={{ width: "44px", height: "24px", borderRadius: "12px", background: notifStates[i] ? "linear-gradient(135deg, #a855f7, #e91e8c)" : "#ddd", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
                >
                  <div style={{ position: "absolute", top: "3px", left: notifStates[i] ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}