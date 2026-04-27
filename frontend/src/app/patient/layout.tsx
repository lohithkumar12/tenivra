"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

const PUBLIC_ROUTES = ["/patient/signup", "/patient/login"];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace("/patient/signup");
    if (user && user.role !== "patient" && !isPublic) {
      router.replace(user.role === "super_admin" ? "/super" : "/admin");
    }
  }, [user, loading, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gradient">Tenivra</Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/clinics">
                <Button variant="ghost" size="sm">Find a Clinic</Button>
              </Link>
              <Link href="/patient/bookings">
                <Button variant="ghost" size="sm" className={pathname === "/patient/bookings" ? "bg-brand-50 text-brand-700" : ""}>
                  My Bookings
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user.full_name}</p>
              <p className="text-xs text-slate-400 leading-tight">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold flex items-center justify-center text-sm">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.push("/"); }}>
              Logout
            </Button>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
