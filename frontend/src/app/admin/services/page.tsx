"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Textarea, Modal, Spinner, EmptyState, Toggle } from "@/components/ui";

interface Svc {
  id?: string; name: string; description: string; duration_minutes: number;
  fee: number; doctor_id: string | null; appointment_required: boolean;
}
interface DocOption { id: string; name: string; }

const BLANK: Svc = { name: "", description: "", duration_minutes: 30, fee: 0, doctor_id: null, appointment_required: true };

export default function ServicesPage() {
  const { token } = useAuth();
  const [list, setList] = useState<Svc[]>([]);
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Svc>(BLANK);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([
    api.get<Svc[]>("/api/clinic/services", token!),
    api.get<DocOption[]>("/api/clinic/doctors", token!),
  ]).then(([s, d]) => { setList(s); setDocs(d); }).finally(() => setLoading(false));

  useEffect(() => { if (token) load(); }, [token]);

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await api.patch(`/api/clinic/services/${form.id}`, form, token!);
      else await api.post("/api/clinic/services", form, token!);
      setOpen(false); load();
    } finally { setBusy(false); }
  };

  const del = async (id: string) => { if (confirm("Delete this service?")) { await api.del(`/api/clinic/services/${id}`, token!); load(); } };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }}>Add service</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No services added yet." /> : (
        <div className="grid gap-4">
          {list.map(s => (
            <Card key={s.id} className="p-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                {s.description && <p className="text-sm text-slate-500">{s.description}</p>}
                <p className="text-sm text-slate-500">Rs.{s.fee} · {s.duration_minutes} min · {s.appointment_required ? "Appointment required" : "Walk-in OK"}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setForm(s); setOpen(true); }}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => del(s.id!)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit service" : "Add service"}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} />
            <Input label="Fee (Rs.)" type="number" value={form.fee} onChange={e => setForm({ ...form, fee: +e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Assigned Doctor</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={form.doctor_id || ""} onChange={e => setForm({ ...form, doctor_id: e.target.value || null })}>
              <option value="">None (any doctor)</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Toggle checked={form.appointment_required} onChange={v => setForm({ ...form, appointment_required: v })} label="Appointment required" />
          <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
        </div>
      </Modal>
    </div>
  );
}
