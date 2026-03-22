"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen w-full">
      <div
        className="hidden md:flex w-[55%] items-center justify-center relative"
        style={{
          background: "radial-gradient(ellipse at 30% 30%, #3aad3a 0%, #1e7a1e 40%, #0d4d0d 100%)",
          borderRadius: "0 0 100px 0",
        }}
      >
        <div className="flex items-center justify-center">
          <div className="relative flex items-center justify-center rounded-full"
            style={{ width: "320px", height: "320px", backgroundColor: "#F97316", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div className="absolute rounded-full bg-white" style={{ width: "220px", height: "220px" }} />
            <span className="absolute top-8 tracking-widest font-bold text-white text-sm">SOFTDRINKS</span>
            <span className="relative z-10 font-extrabold text-5xl"
              style={{ color: "#2a9d8f", fontFamily: "Georgia, serif", textShadow: "2px 2px 0px #1a7a6e", WebkitTextStroke: "1px white" }}>
              Julieta
            </span>
            <span className="absolute bottom-8 tracking-widest font-bold text-white text-sm">✦ STORE ✦</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-8 flex-col">
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username<span className="text-red-500">*</span></label>
            <input type="text" placeholder="Username/Phone no." value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-indigo-400" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password<span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-indigo-400 pr-10" />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button onClick={handleLogin}
            className="w-full py-3 rounded-lg text-white font-semibold text-base"
            style={{ backgroundColor: "#4f46e5" }}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}