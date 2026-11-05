import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/RegisterSW";
import DashboardShell from "./dashboardShell";


export const viewport: Viewport = {
  themeColor: "#2d7a3a",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterSW />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}