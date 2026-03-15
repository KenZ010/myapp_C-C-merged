"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await api.login(username, password);

      if (data.token) {
        // Save token and employee info
        localStorage.setItem("token", data.token);
        localStorage.setItem("employee", JSON.stringify(data.employee));

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* LEFT SIDE */}
      <div
        className="hidden md:flex w-[55%] items-center justify-center relative"
        style={{
          background: "radial-gradient(ellipse at 30% 30%, #3aad3a 0%, #1e7a1e 40%, #0d4d0d 100%)",
          borderRadius: "0 0 100px 0",
        }}
      >
        <div className="flex items-center justify-center">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{ width: "320px", height: "320px", backgroundColor: "#F97316", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
          >
            <div className="absolute rounded-full bg-white" style={{ width: "220px", height: "220px" }} />
            <span className="absolute top-8 tracking-widest font-bold text-white text-sm" style={{ letterSpacing: "0.2em" }}>
              SOFTDRINKS
            </span>
            <span
              className="relative z-10 font-extrabold text-5xl"
              style={{ color: "#2a9d8f", fontFamily: "Georgia, serif", textShadow: "2px 2px 0px #1a7a6e", WebkitTextStroke: "1px white" }}
            >
              Julieta
            </span>
            <span className="absolute bottom-8 tracking-widest font-bold text-white text-sm" style={{ letterSpacing: "0.2em" }}>
              ✦ STORE ✦
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 flex-col">

        {/* Mobile logo */}
        <div className="flex md:hidden flex-col items-center mb-8">
          <div className="relative flex items-center justify-center rounded-full mb-2"
            style={{ width: "120px", height: "120px", backgroundColor: "#F97316" }}>
            <div className="absolute rounded-full bg-white" style={{ width: "85px", height: "85px" }} />
            <span className="relative z-10 font-extrabold text-xl" style={{ color: "#2a9d8f", fontFamily: "Georgia, serif" }}>Julieta</span>
          </div>
          <p className="text-green-700 text-xs font-bold tracking-widest">SOFTDRINKS STORE</p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold mb-6" style={{ color: "#1e1b4b" }}>Log In</h1>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Username Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Username/Phone no."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-indigo-400 transition-colors pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
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

          {/* Log In Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: loading ? "#a5b4fc" : "#4f46e5" }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}