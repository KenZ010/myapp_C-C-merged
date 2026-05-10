"use client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-production-740c.up.railway.app";
const API_URL = `${BACKEND_URL}/api`;

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showToast = (message: string, type: "success" | "info" | "error" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id) return;

    const newSocket = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      newSocket.emit("join", { id: user.id, role: user.role });
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setSocket(null);
    });

    newSocket.on("order:new", ({ message }: { orderId: string; message: string }) => {
      showToast(`🛎️ ${message}`, "info");
    });

    newSocket.on("order:completed", ({ message }: { orderId: string; message: string }) => {
      showToast(`🎉 ${message}`, "success");
    });

    newSocket.on("order:status", ({ message, status }: { orderId: string; status: string; message: string }) => {
      const type = status === "CANCELLED" ? "error" : "info";
      showToast(message, type);
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  const toastColors = {
    success: { bg: "#166534", border: "#16a34a" },
    info:    { bg: "#1e3a5f", border: "#3b82f6" },
    error:   { bg: "#7f1d1d", border: "#ef4444" },
  };

  return (
    <SocketContext.Provider value={socket}>
      {children}

      {mounted && (
        <>
          {/* ── DEV: Test buttons — remove when done debugging ── */}
          <div style={{ position: "fixed", bottom: "20px", left: "20px", zIndex: 99999, display: "flex", gap: "8px" }}>
            <button onClick={() => showToast("✅ Success toast works!", "success")} style={{ background: "#166534", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              Test Success
            </button>
            <button onClick={() => showToast("ℹ️ Info toast works!", "info")} style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              Test Info
            </button>
            <button onClick={() => showToast("❌ Error toast works!", "error")} style={{ background: "#7f1d1d", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              Test Error
            </button>
          </div>

          {/* ── Global Toast ── */}
          {toast && (
            <div style={{
              position:     "fixed",
              top:          "24px",
              right:        "24px",
              zIndex:       99999,
              background:   toastColors[toast.type].bg,
              border:       `1px solid ${toastColors[toast.type].border}`,
              color:        "#fff",
              padding:      "14px 20px",
              borderRadius: "12px",
              fontSize:     "14px",
              fontWeight:   600,
              boxShadow:    "0 8px 32px rgba(0,0,0,0.35)",
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
              animation:    "slideIn 0.3s ease",
              maxWidth:     "360px",
            }}>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          <style>{`
            @keyframes slideIn {
              from { transform: translateX(110%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </>
      )}
    </SocketContext.Provider>
  );
}