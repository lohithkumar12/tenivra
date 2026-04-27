import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AnalyticsProvider } from "@/lib/analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Tenivra - Your Clinic, Automated",
  description: "Multi-tenant SaaS platform for clinics. Automate patient bookings, FAQs, and clinic management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <AnalyticsProvider />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
