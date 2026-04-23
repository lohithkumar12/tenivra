"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import Link from "next/link";
import { ReactNode } from "react";

const NAV = [
  { href: "/super", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/super/clinics", label: "Clinics", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
];

export default function SuperLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  if (loading) return <Spinner />;
  if (!user || user.role !== "super_admin") { router.push("/login"); return null; }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-surface-900 flex flex-col shrink-0">
        <div className="p-5">
          <Link href="/" className="text-lg font-bold text-white">Tenivra</Link>
          <p className="text-xs text-slate-400 mt-0.5">Platform Admin</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(n => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  active
                    ? "bg-brand-600/20 text-brand-300 font-semibold border-l-2 border-brand-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center text-violet-300 text-sm font-bold">
              {user.full_name?.charAt(0) || "S"}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push("/login"); }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
