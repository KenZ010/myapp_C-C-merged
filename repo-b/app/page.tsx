"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        const user = data.employee || data.customer;
        const role = user?.role;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        const isSecure = window.location.protocol === "https:";
        const cookieBase = `path=/; max-age=${60 * 60 * 24}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
        document.cookie = `token=${token}; ${cookieBase}`;
        document.cookie = `active_token=${token}; ${cookieBase}`;
        if (role === "CASHIER")            router.push("/cashier/ordering");
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

  // [size(px), left(%), animDelay(s), animDuration(s), opacity]
  const bubbles: [number, number, number, number, number][] = [
    [8,  10, 0,    6,   0.25],
    [14, 20, 1.2,  8,   0.18],
    [6,  35, 0.5,  5,   0.30],
    [20, 50, 2.0,  9,   0.15],
    [10, 65, 0.8,  7,   0.22],
    [5,  75, 1.5,  5.5, 0.28],
    [16, 85, 0.3,  8.5, 0.17],
    [9,  92, 2.5,  6.5, 0.24],
    [12, 28, 3.0,  7.5, 0.20],
    [7,  55, 1.8,  5.8, 0.26],
    [18, 42, 0.6,  9.5, 0.14],
    [5,  78, 2.2,  4.5, 0.32],
    [11, 15, 3.5,  7,   0.21],
    [4,  60, 1.0,  5.2, 0.29],
    [22, 70, 2.8,  10,  0.12],
    [6,  48, 0.4,  6.2, 0.27],
    [13, 88, 1.6,  8.2, 0.19],
    [8,  5,  3.2,  6.8, 0.23],
  ];

  return (
    <>
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0) scale(1);       opacity: var(--bop); }
          50%  { transform: translateY(-40%) scale(1.05); opacity: calc(var(--bop) * 0.6); }
          100% { transform: translateY(-110%) scale(0.9); opacity: 0; }
        }
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.25);
          animation: floatBubble linear infinite;
          bottom: -10%;
          pointer-events: none;
        }
      `}</style>

      <div className="flex min-h-screen flex-col md:flex-row">

        {/* LEFT - Green fizzy side */}
        <div
          className="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 30% 30%, #3aad3a 0%, #1e7a1e 40%, #0d4d0d 100%)",
            borderRadius: "0 0 100px 0",
          }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10" style={{ background: "#fff" }} />
          <div className="absolute bottom-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10" style={{ background: "#fff" }} />
          <div className="absolute top-[40%] right-[-40px] w-40 h-40 rounded-full opacity-10" style={{ background: "#fff" }} />
          <div className="absolute bottom-[20%] left-[-30px] w-32 h-32 rounded-full opacity-10" style={{ background: "#fff" }} />

          {/* Fizz bubbles */}
          {bubbles.map(([size, left, delay, duration, opacity], i) => (
            <div
              key={i}
              className="bubble"
              style={{
                width:  `${size}px`,
                height: `${size}px`,
                left:   `${left}%`,
                animationDelay:    `${delay}s`,
                animationDuration: `${duration}s`,
                ["--bop" as any]:  opacity,
              }}
            />
          ))}

          {/* Logo */}
          <div className="flex flex-col items-center gap-4 z-10">
            <div
              className="w-36 h-36 rounded-full bg-orange-400 flex items-center justify-center shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(251,146,60,0.4)" }}
            >
              <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <Image src="/images/Remove Logo.png" alt="Julieta Logo" width={100} height={100} className="object-contain" />
                <span className="text-2xl font-bold" style={{ color: "#2a9d8f", fontFamily: "Georgia, serif" }}>
                  Julieta
                </span>
              </div>
            </div>
            <p className="text-white text-xl font-bold tracking-widest drop-shadow-lg">SOFTDRINKS STORE</p>
            <p className="text-green-200 text-xs tracking-wider opacity-80">Your favorite drinks, anytime.</p>
          </div>
        </div>

        {/* RIGHT - Login form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white min-h-screen">

          {/* Mobile logo */}
          <div className="flex md:hidden flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-orange-400 flex items-center justify-center shadow-xl">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden">
                {/* Same swap here — use width={52} height={52} */}
                <span className="text-sm font-bold" style={{ color: "#2a9d8f", fontFamily: "Georgia, serif" }}>
                  Julieta
                </span>
              </div>
            </div>
            <p className="text-green-700 text-sm font-bold mt-2 tracking-widest">SOFTDRINKS STORE</p>
          </div>

          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-gray-800 mb-1">Welcome Back!</h2>
            <p className="text-gray-400 text-sm mb-8">Login to your account</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-5">

              {/* Username */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Username</label>
                <div
                  className="flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-200"
                  style={{
                    borderColor: userFocused ? "#4f46e5" : "#e5e7eb",
                    boxShadow: userFocused ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setUserFocused(true)}
                    onBlur={() => setUserFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your username"
                    className="flex-1 outline-none text-sm text-gray-900 bg-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
                <div
                  className="flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-200"
                  style={{
                    borderColor: passFocused ? "#4f46e5" : "#e5e7eb",
                    boxShadow: passFocused ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your password"
                    className="flex-1 outline-none text-sm text-gray-900 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold mt-1 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? "linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 100%)"
                    : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  boxShadow: loading ? "none" : "0 4px 15px rgba(79,70,229,0.4)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(79,70,229,0.6)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 15px rgba(79,70,229,0.4)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }
                }}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}