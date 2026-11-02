import type { Metadata } from "next";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Install Julieta Store",
  manifest: "/customer.webmanifest",
  appleWebApp: { capable: true, title: "Julieta" },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterSW />
      {children}
    </>
  );
}