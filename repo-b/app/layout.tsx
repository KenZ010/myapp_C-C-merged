import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import RegisterSW from "@/components/RegisterSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Julieta Soft Drink Store",
  description: "Order your favorite soft drinks online - Julieta Store",
  manifest: "/customer.webmanifest",
  appleWebApp: { capable: true, title: "Julieta", statusBarStyle: "default" },
  other: {
    "google": "notranslate",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d7a3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <RegisterSW />
          {children}
        </Providers>
      </body>
    </html>
  );
}