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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} service{list.length !== 1 ? "s" : ""} listed</p>
        </div>
        <Button variant="gradient" onClick={() => { setForm(BLANK); setOpen(true); }}>Add Service</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No services added yet." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Service</th>
                  <th className="px-6 py-3 font-semibold">Duration</th>
                  <th className="px-6 py-3 font-semibold">Fee</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{s.name}</p>
                      {s.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{s.duration_minutes} min</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold">Rs. {s.fee}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.appointment_required ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                        {s.appointment_required ? "Appointment" : "Walk-in"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setForm(s); setOpen(true); }}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => del(s.id!)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit Service" : "Add Service"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (min)" type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} />
            <Input label="Fee (Rs.)" type="number" value={form.fee} onChange={e => setForm({ ...form, fee: +e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Assigned Doctor</label>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm"
              value={form.doctor_id || ""} onChange={e => setForm({ ...form, doctor_id: e.target.value || null })}>
              <option value="">None (any doctor)</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Toggle checked={form.appointment_required} onChange={v => setForm({ ...form, appointment_required: v })} label="Appointment required" />
          <Button variant="gradient" onClick={save} disabled={busy} className="w-full">{busy ? "Saving..." : "Save"}</Button>
        </div>
      </Modal>
    </div>
  );
}
