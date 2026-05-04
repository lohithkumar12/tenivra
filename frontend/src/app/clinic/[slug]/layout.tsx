"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth, homeForRole } from "@/lib/auth";
import Link from "next/link";
import { Spinner, Button } from "@/components/ui";

interface Profile { name: string; slug: string; description: string; }

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [clinic, setClinic] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get<Profile>(`/api/public/${slug}/profile`).then(setClinic).catch(() => setErr(true));
  }, [slug]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <p className="text-slate-500 text-lg">Clinic not found</p>
        <Link href="/" className="text-brand-600 text-sm mt-2 hover:underline inline-block">Go to homepage</Link>
      </div>
    </div>
  );
  if (!clinic) return <Spinner />;

  const tabs = [
    { href: `/clinic/${slug}`, label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: `/clinic/${slug}/services`, label: "Services", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { href: `/clinic/${slug}/doctors`, label: "Doctors", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { href: `/clinic/${slug}/assistant`, label: "Ask Us", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { href: `/clinic/${slug}/book`, label: "Book Now", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar with Tenivra branding + user account */}
      <div className="bg-surface-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-bold text-white hover:text-brand-300 transition-colors">Tenivra</Link>
            <span className="text-slate-600">|</span>
            <Link href="/clinics" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Browse Clinics</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={homeForRole(user.role)}>
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white text-xs px-2 py-1">
                    {user.role === "patient" ? "My Bookings" : "Dashboard"}
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold flex items-center justify-center text-[10px]">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-300 hidden sm:inline">{user.full_name}</span>
                </div>
                <button onClick={() => { logout(); router.push("/"); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white text-xs px-2 py-1">Sign In</Button>
                </Link>
                <Link href="/patient/signup">
                  <Button variant="ghost" size="sm" className="text-brand-400 hover:text-brand-300 text-xs px-2 py-1">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              {clinic.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{clinic.name}</h1>
              {clinic.description && <p className="text-brand-100 text-sm mt-0.5 line-clamp-1 max-w-xl">{clinic.description}</p>}
            </div>
          </div>
        </div>
        <nav className="relative z-10 max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 mt-4">
          {tabs.map(t => {
            const active = path === t.href;
            return (
              <Link key={t.href} href={t.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-slate-50 text-brand-700 font-semibold shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      <footer className="text-center py-8 text-xs text-slate-400">
        Powered by <Link href="/" className="text-brand-600 hover:underline font-medium">Tenivra</Link>
      </footer>
    </div>
  );
}
