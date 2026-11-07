"use client";
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .then(() => ("caches" in window ? caches.keys() : Promise.resolve([])))
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(console.error);
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(console.error);
  }, []);
  return null;
}