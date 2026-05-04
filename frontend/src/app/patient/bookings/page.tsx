"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { useSSE, playNotificationSound, showBrowserNotification, requestBrowserNotificationPermission } from "@/lib/useSSE";

interface Appt {
  id: string;
  service_name?: string;
  doctor_name?: string;
  clinic_name?: string;
  clinic_slug?: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  status: string;
  admin_notes?: string | null;
  created_at?: string;
  tracking_code?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export default function MyBookingsPage() {
  const { token, user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { requestBrowserNotificationPermission(); }, []);

  const load = () => {
    if (!token) return;
    setLoading(true);
    api.get<Appt[]>("/api/patient/appointments", token)
      .then(setAppts)
      .catch(() => setAppts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleSSE = useCallback((evt: { event: string; data: Record<string, unknown> }) => {
    if (evt.event === "status_change") {
      const d = evt.data;
      const status = d.status as string;
      const clinic = (d.clinic_name || "Clinic") as string;
      setAppts(prev => prev.map(a =>
        a.id === d.appointment_id ? { ...a, status } : a
      ));
      playNotificationSound();
      const msg = `Your appointment at ${clinic} is now ${status.toUpperCase()}`;
      setToast(msg);
      setTimeout(() => setToast(null), 5000);
      showBrowserNotification("Appointment Updated", msg);
    }
  }, []);

  useSSE(
    user?.role === "patient" ? "/api/sse/patient" : null,
    token,
    handleSSE,
  );

  const cancel = async (id: string) => {
    if (!token) return;
    if (!confirm("Cancel this appointment?")) return;
    setBusy(id);
    try {
      await api.post(`/api/patient/appointments/${id}/cancel`, {}, token);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setBusy(null);
    }
  };

  const trackingCode = (id: string) => {
    const a = appts.find(x => x.id === id);
    return a?.tracking_code || null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Live toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-brand-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-2xl animate-fade-in-up flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          <span className="text-sm font-medium flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white">&times;</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">My Bookings</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">All your appointment requests, in one place. Updates appear live.</p>
        </div>
        <Link href="/clinics">
          <Button variant="gradient" size="md" className="w-full sm:w-auto">+ Book a New Appointment</Button>
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : appts.length === 0 ? (
        <Card className="p-2">
          <EmptyState message="No bookings yet. Find a clinic to get started." />
          <div className="text-center pb-8">
            <Link href="/clinics">
              <Button variant="gradient">Browse Clinics</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {appts.map(a => {
            const canCancel = a.status === "pending" || a.status === "confirmed";
            return (
              <Card key={a.id} variant="hover" className="p-4 sm:p-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">{a.service_name || "Appointment"}</h3>
                    <Badge className={STATUS_STYLES[a.status] || "bg-slate-100 text-slate-700"}>
                      {a.status}
                    </Badge>
                  </div>
                  {a.clinic_name && (
                    <p className="text-sm text-slate-500 mt-1">
                      at{" "}
                      {a.clinic_slug ? (
                        <Link href={`/clinic/${a.clinic_slug}`} className="text-brand-600 font-semibold hover:underline">
                          {a.clinic_name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{a.clinic_name}</span>
                      )}
                    </p>
                  )}
                  {a.doctor_name && (
                    <p className="text-sm text-slate-500 mt-0.5">with {a.doctor_name}</p>
                  )}

                  <div className="flex items-center gap-4 sm:gap-5 mt-3 text-sm text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {a.preferred_date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {a.preferred_time}
                    </span>
                  </div>

                  {a.notes && <p className="text-sm text-slate-500 mt-3 italic">&ldquo;{a.notes}&rdquo;</p>}
                  {a.admin_notes && (
                    <p className="text-sm text-slate-700 mt-3 px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="font-semibold">Clinic note:</span> {a.admin_notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  {a.tracking_code && (
                    <Link href={`/track/${a.tracking_code}`} target="_blank" className="flex-1 sm:flex-none">
                      <Button variant="ghost" size="sm" className="text-brand-600 w-full sm:w-auto">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Track Live
                      </Button>
                    </Link>
                  )}
                  {canCancel && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cancel(a.id)}
                      disabled={busy === a.id}
                      className="flex-1 sm:flex-none"
                    >
                      {busy === a.id ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
