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
  const [, forceRender] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id) return;

    socketRef.current = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    socketRef.current.emit("join", { id: user.id, role: user.role });

    forceRender(1);

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}