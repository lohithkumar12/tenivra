"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";

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
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export default function MyBookingsPage() {
  const { token } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    api.get<Appt[]>("/api/patient/appointments", token)
      .then(setAppts)
      .catch(() => setAppts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">My Bookings</h1>
          <p className="text-slate-500 mt-1">All your appointment requests, in one place.</p>
        </div>
        <Link href="/clinics">
          <Button variant="gradient" size="md">+ Book a New Appointment</Button>
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
              <Card key={a.id} variant="hover" className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-lg">{a.service_name || "Appointment"}</h3>
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

                    <div className="flex items-center gap-5 mt-3 text-sm text-slate-600 flex-wrap">
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

                  {canCancel && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cancel(a.id)}
                      disabled={busy === a.id}
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
