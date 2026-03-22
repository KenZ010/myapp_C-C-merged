"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (username && password) {
      document.cookie = "token=logged-in; path=/";
      router.push("/dashboard");
    } else {
      alert("Please enter username and password.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">

      {/* LEFT - Green gradient (hidden on small, shown on md+) */}
      <div
        className="hidden md:flex md:w-1/2 items-center justify-center"
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
          <p className="text-white text-xl font-bold tracking-widest">SOFTDRINKS STORE</p>
        </div>
      </div>

      {/* RIGHT - Login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">

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
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome Back!</h2>
          <p className="text-gray-400 text-sm mb-8">Login to your account</p>

          <div className="flex flex-col gap-4">
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
            <div>
              <label className="text-xs font-medium text-gray-600">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-4 text-gray-400 text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold mt-2"
              style={{ backgroundColor: "#4f46e5" }}
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}