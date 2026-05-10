import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // ← add this

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
  other: {
    "google": "notranslate", // ← tells Google Translate to leave it alone
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers> {/* ← wrap children */}
          {children}
        </Providers>
      </body>
    </html>
  );
}