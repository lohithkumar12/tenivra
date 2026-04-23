"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import Link from "next/link";
import { ReactNode } from "react";

const NAV = [
  { href: "/super",         label: "Dashboard" },
  { href: "/super/clinics", label: "Clinics" },
];

export default function SuperLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  if (loading) return <Spinner />;
  if (!user || user.role !== "super_admin") { router.push("/login"); return null; }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <Link href="/" className="text-lg font-bold text-brand-700">Tenivra</Link>
          <p className="text-xs text-slate-400 mt-0.5">Platform Admin</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                path === n.href ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
              }`}>{n.label}</Link>
          ))}
        </nav>
        <div className="p-3 border-t space-y-1">
          <p className="text-xs text-slate-500 px-2 truncate">{user.full_name}</p>
          <button onClick={() => { logout(); router.push("/login"); }}
            className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
