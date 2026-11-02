"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPage() {
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setUrl(`${base}/install`);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24, background: "#f5f5f5", textAlign: "center" }}>
      <img src="/icons/logo192.png" alt="Julieta Store" width={96} height={96} style={{ borderRadius: 20 }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1f2d24", margin: 0 }}>Julieta Store</h1>

      {installed ? (
        <p>The app is already installed on this device. ✅</p>
      ) : (
        <>
          {installEvent && (
            <button onClick={install} style={{ background: "#2d7a3a", color: "#fff", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              Install app
            </button>
          )}

          {isIOS && (
            <p style={{ maxWidth: 280, color: "#555", fontSize: 14 }}>
              In Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.
            </p>
          )}

          {url && (
            <div style={{ background: "#fff", padding: 16, borderRadius: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <QRCodeSVG value={url} size={200} level="M" marginSize={1} />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#777" }}>Scan with your phone camera</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}