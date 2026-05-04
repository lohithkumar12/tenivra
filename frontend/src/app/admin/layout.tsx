"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner, Button } from "@/components/ui";
import { useSSE, playNotificationSound, requestBrowserNotificationPermission, showBrowserNotification } from "@/lib/useSSE";
import Link from "next/link";
import { ReactNode } from "react";
import { OnboardingBanner } from "@/components/OnboardingBanner";

interface PendingAlert {
  id: string;
  patient_name: string;
  service_name: string;
  doctor_name: string | null;
  preferred_date: string;
  preferred_time: string;
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/admin/profile", label: "Clinic Profile", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/admin/doctors", label: "Doctors", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/admin/services", label: "Services", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/admin/faqs", label: "FAQs", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/timings", label: "Timings", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/rules", label: "Appointment Rules", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/admin/appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/live-board", label: "Live Board", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, token } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [alerts, setAlerts] = useState<PendingAlert[]>([]);
  const [tabFlash, setTabFlash] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    if (!tabFlash) return;
    const orig = document.title;
    let on = true;
    const iv = setInterval(() => {
      document.title = on ? `(!) New Appointment!` : orig;
      on = !on;
    }, 800);
    return () => { clearInterval(iv); document.title = orig; };
  }, [tabFlash]);

  const handleSSE = useCallback((evt: { event: string; data: Record<string, unknown> }) => {
    if (evt.event === "new_booking") {
      const d = evt.data;
      setAlerts(prev => [...prev, {
        id: d.appointment_id as string,
        patient_name: d.patient_name as string,
        service_name: d.service_name as string,
        doctor_name: d.doctor_name as string | null,
        preferred_date: d.preferred_date as string,
        preferred_time: d.preferred_time as string,
      }]);
      playNotificationSound();
      setTabFlash(true);
      showBrowserNotification(
        "New Appointment!",
        `${d.patient_name} — ${d.service_name} on ${d.preferred_date} at ${d.preferred_time}`,
        () => { window.focus(); router.push("/admin/appointments"); }
      );
    }
    if (evt.event === "patient_cancelled") {
      const d = evt.data;
      showBrowserNotification(
        "Appointment Cancelled",
        `${d.patient_name} cancelled their ${d.preferred_date} ${d.preferred_time} appointment`,
      );
      playNotificationSound();
    }
  }, [router]);

  useSSE(
    user && (user.role === "clinic_admin" || user.role === "receptionist") ? "/api/sse/clinic" : null,
    token,
    handleSSE,
  );

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (alerts.length <= 1) setTabFlash(false);
  };

  const handleViewAlert = (id: string) => {
    dismissAlert(id);
    router.push("/admin/appointments");
  };

  useEffect(() => {
    if (user?.role === "super_admin") router.replace("/super");
  }, [user, router]);

  if (loading) return <Spinner />;
  if (user?.role === "super_admin") return null;
  if (!user || (user.role !== "clinic_admin" && user.role !== "receptionist")) {
    router.push("/login");
    return null;
  }

  const sidebarContent = (
    <>
      <div className="p-5">
        <Link href="/" className="text-lg font-bold text-white">Tenivra</Link>
        <p className="text-xs text-slate-400 mt-0.5">Clinic Admin</p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(n => {
          const active = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                active
                  ? "bg-brand-600/20 text-brand-300 font-semibold border-l-2 border-brand-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
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
          <div className="w-9 h-9 rounded-xl bg-brand-600/30 flex items-center justify-center text-brand-300 text-sm font-bold">
            {user.full_name?.charAt(0) || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Swiggy-style full-screen alert overlay */}
      {alerts.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-brand-600 to-accent-500 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold">New Appointment!</h2>
              <p className="text-white/80 mt-1 text-sm">{alerts.length} pending {alerts.length === 1 ? "request" : "requests"}</p>
            </div>
            <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
              {alerts.map(a => (
                <div key={a.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-slate-800">{a.patient_name}</p>
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">PENDING</span>
                  </div>
                  <p className="text-sm text-slate-500">{a.service_name}{a.doctor_name ? ` with ${a.doctor_name}` : ""}</p>
                  <p className="text-sm font-medium text-slate-700">{a.preferred_date} at {a.preferred_time}</p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="gradient" size="sm" className="flex-1" onClick={() => handleViewAlert(a.id)}>
                      View & Manage
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => dismissAlert(a.id)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-surface-900 flex flex-col z-50 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-surface-900 flex-col shrink-0">
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-surface-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="text-base font-bold">Tenivra</Link>
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-xs font-bold">
            {user.full_name?.charAt(0) || "A"}
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          <OnboardingBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
