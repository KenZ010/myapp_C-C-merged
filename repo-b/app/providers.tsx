"use client";

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
    // Get user from localStorage after login
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      transports: ["websocket"],
    });

    socketRef.current.emit("join", { id: user.id, role: user.role });

    // Force re-render so context value updates
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