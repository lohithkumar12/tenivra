"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Card, Input, Textarea, Select, Spinner } from "@/components/ui";

interface Svc { id: string; name: string; fee: number; }
interface Doc { id: string; name: string; }

export default function BookPage() {
  const { slug } = useParams();
  const router = useRouter();
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
    Promise.all([
      api.get<Svc[]>(`/api/public/${slug}/services`),
      api.get<Doc[]>(`/api/public/${slug}/doctors`),
    ]).then(([s, d]) => {
      setSvcs(s); setDocs(d);
      if (s.length) setForm(f => ({ ...f, service_id: s[0].id }));
    }).finally(() => setLoading(false));
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await api.post<{ id: string; status: string }>(`/api/public/${slug}/appointments`, {
        ...form, doctor_id: form.doctor_id || undefined, patient_email: form.patient_email || undefined,
      });
      router.push(`/clinic/${slug}/book/success?status=${res.status}`);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Book an Appointment</h2>
      <Card className="p-6 max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Your name *" value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} required />
          <Input label="Phone number *" type="tel" value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} required />
          <Input label="Email (optional)" type="email" value={form.patient_email} onChange={e => setForm({ ...form, patient_email: e.target.value })} />

          {svcs.length > 0 && (
            <Select label="Service *"
              options={svcs.map(s => ({ value: s.id, label: `${s.name} (Rs. ${s.fee})` }))}
              value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} />
          )}

          <Select label="Preferred doctor"
            options={[{ value: "", label: "No preference" }, ...docs.map(d => ({ value: d.id, label: d.name }))]}
            value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Preferred date *" type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} required />
            <Input label="Preferred time *" type="time" value={form.preferred_time} onChange={e => setForm({ ...form, preferred_time: e.target.value })} required />
          </div>

          <Textarea label="Notes" placeholder="Any additional details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Submitting..." : "Request appointment"}</Button>
        </form>
      </Card>
    </div>
  );
}
