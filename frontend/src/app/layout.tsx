import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AnalyticsProvider } from "@/lib/analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Tenivra - Your Clinic, Automated",
  description:
    "Set up your clinic online in 60 seconds. Patients book appointments, ask questions via AI assistant, and view your services — all from one branded page.",
  metadataBase: new URL("https://tenivra.vercel.app"),
  openGraph: {
    title: "Tenivra - Your Clinic, Automated",
    description:
      "Online presence for Indian clinics. AI-powered patient assistant, verified bookings, doctor profiles, and more.",
    siteName: "Tenivra",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tenivra - Your Clinic, Automated",
    description:
      "Set up your clinic online in 60 seconds. AI assistant, verified bookings, doctor profiles.",
  },
  keywords: [
    "clinic management",
    "online appointment booking",
    "AI clinic assistant",
    "doctor booking India",
    "clinic automation",
    "patient management",
  ],
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
