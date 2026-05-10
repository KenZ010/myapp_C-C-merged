"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { useSocketActions } from "@/app/providers"; // ← added

// Bubble definitions: [size, left%, bottom%, duration(s), delay(s), opacity]
const BUBBLES: [number, number, number, number, number, number][] = [
  [6,  8,  5,  7,  0,    0.50],
  [10, 15, 12, 9,  1.2,  0.40],
  [4,  22, 3,  6,  0.5,  0.60],
  [14, 30, 8,  11, 2.0,  0.30],
  [8,  40, 15, 8,  0.8,  0.50],
  [5,  50, 4,  6,  1.5,  0.60],
  [12, 60, 10, 10, 0.3,  0.40],
  [7,  70, 6,  7,  2.5,  0.50],
  [9,  78, 14, 9,  1.0,  0.40],
  [4,  85, 3,  5,  1.8,  0.60],
  [11, 90, 9,  10, 0.6,  0.35],
  [6,  95, 5,  7,  2.2,  0.50],
  [3,  25, 18, 5,  3.0,  0.70],
  [8,  55, 20, 8,  1.4,  0.40],
  [5,  72, 2,  6,  0.2,  0.55],
  [13, 45, 7,  12, 2.8,  0.30],
  [4,  35, 22, 5,  3.5,  0.60],
  [7,  65, 18, 8,  1.6,  0.45],
  [9,  18, 25, 9,  0.9,  0.40],
  [5,  82, 22, 6,  2.3,  0.50],
];

// Fizz bar heights
const FIZZ_HEIGHTS = [8, 12, 6, 14, 9, 11, 7, 13];

export default function LoginPage() {
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userFocused, setUserFocused]   = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const router = useRouter();
  const { connectSocket } = useSocketActions(); // ← added

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    try {
      const [employeeRes, customerRes] = await Promise.allSettled([
        api.login(username, password),
        api.loginCustomer(username, password),
      ]);
      const employeeData = employeeRes.status === "fulfilled" ? employeeRes.value : null;
      const customerData = customerRes.status === "fulfilled" ? customerRes.value : null;
      const data = employeeData?.token ? employeeData : customerData?.token ? customerData : null;

      if (data?.token) {
        const token = data.token;
        const user  = data.employee || data.customer;
        const role  = user?.role;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        connectSocket(); // ← added: connect socket immediately after login
        const isSecure   = window.location.protocol === "https:";
        const cookieBase = `path=/; max-age=${60 * 60 * 24}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
        document.cookie = `token=${token}; ${cookieBase}`;
        document.cookie = `active_token=${token}; ${cookieBase}`;
        if      (role === "CASHIER")       router.push("/cashier/ordering");
        else if (role === "STOCK_MANAGER") router.push("/inventory/monitoring");
        else if (role === "CUSTOMER")      router.push("/home");
        else setError("Unknown role. Contact your administrator.");
      } else {
        setError("Invalid credentials");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        /* ── Bubble rise animation ── */
        @keyframes riseBubble {
          0%   { transform: translateY(0)       translateX(0);    opacity: var(--op); }
          30%  { transform: translateY(-28vh)   translateX(5px);  opacity: calc(var(--op) * 0.8); }
          60%  { transform: translateY(-58vh)   translateX(-4px); opacity: calc(var(--op) * 0.5); }
          100% { transform: translateY(-108vh)  translateX(2px);  opacity: 0; }
        }

        /* ── Logo pulse ── */
        @keyframes logoPulse {
          0%, 100% {
            box-shadow:
              0 0 0 5px  rgba(251,146,60,0.28),
              0 0 40px   rgba(251,146,60,0.45),
              0 20px 48px rgba(0,0,0,0.38);
          }
          50% {
            box-shadow:
              0 0 0 10px rgba(251,146,60,0.15),
              0 0 60px   rgba(251,146,60,0.65),
              0 20px 48px rgba(0,0,0,0.38);
          }
        }

        /* ── Fizz bar pop ── */
        @keyframes fizzPop {
          0%, 100% { transform: scaleY(1);   opacity: 0.45; }
          50%       { transform: scaleY(1.8); opacity: 1;    }
        }

        /* ── Submit button shimmer ── */
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left:  200%; }
        }

        /* ── Root layout ── */
        .lr-root {
          min-height: 100vh;
          display: flex;
          flex-direction: row;
          font-family: 'Nunito', sans-serif;
        }

        /* ════════════════ LEFT PANEL ════════════════ */
        .lr-left {
          position: relative;
          width: 48%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(160deg, #076b07 0%, #1aab1a 40%, #2dcb2d 65%, #0b4f0b 100%);
        }

        /* Radial depth overlay */
        .lr-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.18) 0%, transparent 55%);
          pointer-events: none;
          z-index: 0;
        }

        /* Can-stripe texture */
        .lr-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            transparent 0px, transparent 6px,
            rgba(255,255,255,0.018) 6px, rgba(255,255,255,0.018) 7px
          );
          pointer-events: none;
          z-index: 0;
        }

        /* Corner badge */
        .lr-corner-tag {
          position: absolute;
          top: 22px; left: 22px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 30px;
          padding: 6px 16px;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.92);
          letter-spacing: 1.5px;
          font-weight: 700;
          text-transform: uppercase;
          z-index: 10;
        }

        /* Decorative can silhouette */
        .lr-can-shape {
          position: absolute;
          right: -55px;
          top: 50%;
          transform: translateY(-50%);
          width: 180px; height: 340px;
          border-radius: 36px 36px 46px 46px;
          background: linear-gradient(135deg,
            rgba(255,255,255,0.09) 0%,
            rgba(255,255,255,0.03) 50%,
            rgba(0,0,0,0.05) 100%
          );
          border: 1px solid rgba(255,255,255,0.12);
          z-index: 1;
        }

        /* Bottom wave glow */
        .lr-wave {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 120px;
          background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
          z-index: 1;
          pointer-events: none;
        }

        /* Bubble */
        .lr-bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 28%,
            rgba(255,255,255,0.80) 0%,
            rgba(255,255,255,0.25) 35%,
            rgba(255,255,255,0.04) 100%
          );
          border: 1px solid rgba(255,255,255,0.45);
          animation: riseBubble ease-in infinite;
          pointer-events: none;
          z-index: 2;
        }

        /* Brand block */
        .lr-brand {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }

        .lr-logo-outer {
          width: 156px; height: 156px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid rgba(255,255,255,0.60);
          display: flex; align-items: center; justify-content: center;
          animation: logoPulse 3.5s ease-in-out infinite;
        }

        .lr-logo-inner {
          width: 148px; height: 148px;
          border-radius: 50%;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }

        .lr-brand-name {
          font-family: 'Fredoka One', cursive;
          font-size: 1.85rem;
          color: #fff;
          letter-spacing: 4px;
          text-shadow: 0 3px 14px rgba(0,0,0,0.35);
          text-align: center;
          line-height: 1;
        }

        .lr-brand-sub {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.65);
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .lr-fizz-row {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          height: 20px;
        }

        .lr-fizz-dot {
          width: 5px;
          background: rgba(255,255,255,0.7);
          border-radius: 3px;
          animation: fizzPop 1.4s ease-in-out infinite;
        }

        .lr-tagline {
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: -6px;
          font-weight: 500;
        }

        /* ════════════════ RIGHT PANEL ════════════════ */
        .lr-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #f0fdf4;
          position: relative;
          overflow: hidden;
        }

        /* Dot grid */
        .lr-right::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, #bbf7d0 1.2px, transparent 1.2px);
          background-size: 26px 26px;
          opacity: 0.55;
          pointer-events: none;
        }

        .lr-blob-tl {
          position: absolute;
          top: -90px; left: -90px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, #86efac 0%, transparent 68%);
          opacity: 0.5;
          pointer-events: none;
        }

        .lr-blob-br {
          position: absolute;
          bottom: -110px; right: -110px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, #bbf7d0 0%, transparent 68%);
          opacity: 0.5;
          pointer-events: none;
        }

        /* Card */
        .lr-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          background: #fff;
          border-radius: 28px;
          padding: 44px 40px;
          box-shadow:
            0 2px 8px   rgba(0,0,0,0.04),
            0 8px 32px  rgba(0,0,0,0.07),
            0 0 0 1.5px rgba(22,163,74,0.10);
        }

        .lr-card-badge {
          width: 54px; height: 54px;
          border-radius: 14px;
          background: linear-gradient(135deg, #15803d, #22c55e);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.55rem;
          margin-bottom: 22px;
          box-shadow: 0 8px 20px rgba(34,197,94,0.38);
        }

        .lr-card-title {
          font-family: 'Fredoka One', cursive;
          font-size: 2.1rem;
          color: #14532d;
          line-height: 1.1;
          margin: 0 0 5px;
        }

        .lr-card-sub {
          font-size: 0.84rem;
          color: #6b7280;
          margin: 0 0 28px;
          font-weight: 500;
        }

        /* Error box */
        .lr-error {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #fef2f2;
          border: 1.5px solid #fca5a5;
          border-radius: 12px;
          padding: 10px 14px;
          color: #dc2626;
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 14px;
        }

        /* Field */
        .lr-field { margin-bottom: 16px; }

        .lr-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 800;
          color: #374151;
          margin-bottom: 7px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .lr-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 16px;
          background: #f9fafb;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .lr-input-row.focused {
          border-color: #16a34a;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.13);
        }

        .lr-input-icon {
          flex-shrink: 0;
          color: #9ca3af;
          transition: color 0.2s;
          width: 18px; height: 18px;
        }

        .lr-input-row.focused .lr-input-icon { color: #16a34a; }

        .lr-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.9rem;
          color: #111827;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
        }

        .lr-input::placeholder { color: #d1d5db; font-weight: 500; }

        .lr-eye {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.15s;
        }
        .lr-eye:hover { color: #16a34a; }

        /* Submit button */
        .lr-submit {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #15803d 0%, #16a34a 55%, #22c55e 100%);
          color: #fff;
          font-family: 'Fredoka One', cursive;
          font-size: 1.1rem;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
          box-shadow: 0 6px 20px rgba(22,163,74,0.42);
          margin-top: 6px;
          position: relative;
          overflow: hidden;
        }

        .lr-submit::after {
          content: '';
          position: absolute;
          top: 0; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          animation: shimmer 2.4s ease-in-out infinite;
          pointer-events: none;
        }

        .lr-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(22,163,74,0.52);
        }
        .lr-submit:active:not(:disabled) { transform: translateY(0); }
        .lr-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .lr-footer-note {
          text-align: center;
          font-size: 0.72rem;
          color: #9ca3af;
          margin-top: 20px;
          font-weight: 500;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .lr-root  { flex-direction: column; }
          .lr-left  { width: 100%; min-height: 250px; border-radius: 0 0 36px 36px; }
          .lr-can-shape { display: none; }
          .lr-logo-outer { width: 100px; height: 100px; }
          .lr-logo-inner { width: 90px;  height: 90px; }
          .lr-brand-name { font-size: 1.4rem; }
          .lr-right { padding: 28px 18px; }
          .lr-card  { padding: 30px 22px; border-radius: 22px; }
        }
      `}</style>

      <div className="lr-root">

        {/* ══════════ LEFT PANEL ══════════ */}
        <div className="lr-left">
          <div className="lr-can-shape" />
          <div className="lr-wave" />

          {BUBBLES.map(([size, left, bottom, dur, delay, op], i) => (
            <div
              key={i}
              className="lr-bubble"
              style={{
                width:             `${size}px`,
                height:            `${size}px`,
                left:              `${left}%`,
                bottom:            `${bottom}%`,
                animationDuration: `${dur}s`,
                animationDelay:    `${delay}s`,
                ["--op" as any]:   op,
              }}
            />
          ))}

          <div className="lr-brand">
            <div className="lr-logo-outer">
              <div className="lr-logo-inner">
                <Image
                  src="/images/Softdrinks Logo.png"
                  alt="Julieta Softdrinks Logo"
                  width={143}
                  height={143}
                  className="object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div className="lr-brand-name">JULIETA</div>
              <div className="lr-brand-sub">Softdrinks Store</div>
            </div>

            <div className="lr-fizz-row">
              {FIZZ_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className="lr-fizz-dot"
                  style={{ height: `${h}px`, animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>

            <p className="lr-tagline">Your favorite drinks, anytime</p>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL ══════════ */}
        <div className="lr-right">
          <div className="lr-blob-tl" />
          <div className="lr-blob-br" />

          <div className="lr-card">
            <h2 className="lr-card-title">Welcome Back!</h2>
            <p className="lr-card-sub">Sign in to continue to your account</p>

            {error && (
              <div className="lr-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="lr-field">
              <label className="lr-label">Username</label>
              <div className={`lr-input-row${userFocused ? " focused" : ""}`}>
                <svg className="lr-input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input
                  className="lr-input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setUserFocused(true)}
                  onBlur={() => setUserFocused(false)}
                  onKeyDown={handleKeyDown}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="lr-field">
              <label className="lr-label">Password</label>
              <div className={`lr-input-row${passFocused ? " focused" : ""}`}>
                <svg className="lr-input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <input
                  className="lr-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lr-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className="lr-submit"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>

            <p className="lr-footer-note">Having trouble? Contact your administrator.</p>
          </div>
        </div>

      </div>
    </>
  );
}