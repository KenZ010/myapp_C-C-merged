"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError("");

    // Basic validation
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.login(username, password);

      if (data.token) {
        // ✅ Save real token from backend
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}`;
        localStorage.setItem("employee", JSON.stringify(data.employee));

        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        // ❌ Show error from backend
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Allow login on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">

      {/* LEFT - Green gradient (hidden on small, shown on md+) */}
      <div
        className="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 30% 30%, #3aad3a 0%, #1e7a1e 40%, #0d4d0d 100%)",
          borderRadius: "0 0 100px 0",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-orange-400 flex items-center justify-center shadow-xl">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
              <span
                className="text-2xl font-bold"
                style={{ color: "#2a9d8f", fontFamily: "Georgia, serif" }}
              >
                Julieta
              </span>
            </div>
          </div>
          <p className="text-white text-xl font-bold tracking-widest drop-shadow-lg">SOFTDRINKS STORE</p>
          <p className="text-green-200 text-xs tracking-wider opacity-80">Your favorite drinks, anytime.</p>
        </div>
      </div>

      {/* RIGHT - Login form */}
      {/* ✅ Better vertical centering */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white min-h-screen">

        {/* Mobile logo */}
        <div className="flex md:hidden flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-orange-400 flex items-center justify-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
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

          {/* ✅ Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5">

            {/* ✅ Username with focus glow animation */}
            <div>
              <label className="text-xs font-medium text-gray-600">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
              />
            </div>

            {/* ✅ Password with focus glow + eye icon */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
              <div
                className="flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-200"
                style={{
                  borderColor: passFocused ? "#4f46e5" : "#e5e7eb",
                  boxShadow: passFocused ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
                }}
              >
                <span className="text-gray-400 mr-3 text-sm">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
                />
                {/* ✅ Eye icon toggle */}
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

            {/* ✅ Better Log In button with gradient + shadow + hover lift */}
            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold mt-2"
              style={{ backgroundColor: "#4f46e5" }}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}