"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { track, Events } from "@/lib/analytics";
import { Button, Card, Input, Textarea, Select, Spinner } from "@/components/ui";

interface Svc { id: string; name: string; fee: number; }
interface Doc { id: string; name: string; }

function BookInner() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const isPatient = user?.role === "patient";

  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    patient_name: "", patient_phone: "", patient_email: "",
    service_id: "", doctor_id: "", preferred_date: "", preferred_time: "", notes: "",
  });

  useEffect(() => {
    track(Events.BookingStarted, { slug });
    Promise.all([
      api.get<Svc[]>(`/api/public/${slug}/services`),
      api.get<Doc[]>(`/api/public/${slug}/doctors`),
    ]).then(([s, d]) => {
      setSvcs(s); setDocs(d);
      const qSid = searchParams.get("service_id");
      const pick = qSid && s.some(x => x.id === qSid) ? qSid : (s[0]?.id ?? "");
      setForm(f => ({
        ...f,
        service_id: pick,
        doctor_id: searchParams.get("doctor_id") || "",
        preferred_date: searchParams.get("preferred_date") || "",
        preferred_time: searchParams.get("preferred_time") || "",
        notes: searchParams.get("notes") || "",
      }));
    }).finally(() => setLoading(false));
  }, [slug, searchParams]);

  useEffect(() => {
    if (isPatient && user) {
      setForm(f => ({
        ...f,
        patient_name: f.patient_name || user.full_name || "",
        patient_email: f.patient_email || user.email || "",
        patient_phone: f.patient_phone || user.phone || "",
      }));
    }
  }, [isPatient, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.service_id?.trim()) {
      setErr(
        svcs.length === 0
          ? "This clinic has not added any services yet, so online booking is not available. Please call the clinic or try again later."
          : "Please choose a service.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ id: string; status: string; tracking_code?: string }>(
        `/api/public/${slug}/appointments`,
        {
          ...form,
          doctor_id: form.doctor_id || undefined,
          patient_email: form.patient_email || undefined,
        },
        isPatient ? token ?? undefined : undefined,
      );
      track(Events.BookingCompleted, { slug, status: res.status, authenticated: isPatient });
      const trackCode = res.tracking_code || "";
      const dest = isPatient
        ? "/patient/bookings"
        : `/clinic/${slug}/book/success?status=${res.status}&track=${trackCode}`;
      router.push(dest);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  if (loading) return <Spinner />;

  const fromAi = Boolean(searchParams.get("service_id") || searchParams.get("preferred_date"));

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-2">Book an Appointment</h2>
      <p className="text-slate-500 mb-4">Fill in your details and we will get back to you shortly.</p>

      <div className="mb-5 max-w-lg p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 text-sm text-slate-700">
        <p className="font-semibold text-brand-800">Tenivra verified booking</p>
        <p className="mt-1">Your time is checked against clinic hours, doctor schedules, and existing bookings — unlike generic forms that accept impossible slots.</p>
      </div>

      {fromAi && (
        <div className="mb-5 max-w-lg p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-900">
          Details from your AI chat were copied here. Adjust if needed, then submit.
        </div>
      )}

      {!user && (
        <div className="mb-5 max-w-lg p-4 rounded-2xl bg-brand-50 border border-brand-100 text-sm text-slate-700">
          <p>
            <Link href="/patient/signup" className="text-brand-700 font-semibold hover:underline">Create a free patient account</Link>
            {" "}or{" "}
            <Link href="/login" className="text-brand-700 font-semibold hover:underline">sign in</Link>
            {" "}to track all your bookings in one place. (Optional — you can also book as a guest.)
          </p>
        </div>
      )}

      {isPatient && (
        <div className="mb-5 max-w-lg p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Signed in as <span className="font-semibold">{user?.full_name}</span> — this booking will appear in your My Bookings.
        </div>
      )}

      <Card className="p-7 max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <Input label="Your name" value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Enter your full name" required />
          <Input label="Phone number" type="tel" value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} placeholder="+91 98765 43210" required />
          <Input label="Email (optional)" type="email" value={form.patient_email} onChange={e => setForm({ ...form, patient_email: e.target.value })} placeholder="you@example.com" />

          {svcs.length > 0 ? (
            <Select label="Service"
              options={svcs.map(s => ({ value: s.id, label: `${s.name} (Rs. ${s.fee})` }))}
              value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">No services listed yet</p>
              <p className="mt-1 text-amber-800">The clinic admin needs to add at least one service in the dashboard before patients can book here.</p>
            </div>
          )}

          <Select label="Preferred doctor"
            options={[{ value: "", label: "No preference" }, ...docs.map(d => ({ value: d.id, label: d.name }))]}
            value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Preferred date" type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} required />
            <Input label="Preferred time" type="time" value={form.preferred_time} onChange={e => setForm({ ...form, preferred_time: e.target.value })} required />
          </div>

          <Textarea label="Notes (optional)" placeholder="Any additional details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

          {err && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{err}</p>}
          <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={busy || svcs.length === 0}>{busy ? "Submitting..." : "Request Appointment"}</Button>
        </form>
      </Card>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BookInner />
    </Suspense>
  );
}
