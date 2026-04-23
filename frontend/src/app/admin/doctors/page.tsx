"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Textarea, Modal, Spinner, EmptyState } from "@/components/ui";
import { DAY_NAMES } from "@/lib/utils";

interface Doc {
  id?: string; name: string; specialization: string; qualification: string; bio: string;
  available_days: string[]; available_from: string; available_to: string; consultation_fee: number;
}

const BLANK: Doc = {
  name: "", specialization: "", qualification: "", bio: "",
  available_days: [], available_from: "09:00", available_to: "17:00", consultation_fee: 0,
};

export default function DoctorsPage() {
  const { token } = useAuth();
  const [list, setList] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Doc>(BLANK);
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Doc[]>("/api/clinic/doctors", token!).then(setList).finally(() => setLoading(false));
  useEffect(() => { if (token) load(); }, [token]);

  const toggleDay = (d: string) => {
    const days = form.available_days.includes(d) ? form.available_days.filter(x => x !== d) : [...form.available_days, d];
    setForm({ ...form, available_days: days });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await api.patch(`/api/clinic/doctors/${form.id}`, form, token!);
      else await api.post("/api/clinic/doctors", form, token!);
      setOpen(false); load();
    } finally { setBusy(false); }
  };

  const del = async (id: string) => { if (confirm("Delete this doctor?")) { await api.del(`/api/clinic/doctors/${id}`, token!); load(); } };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Doctors</h1>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }}>Add doctor</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No doctors added yet." /> : (
        <div className="grid gap-4">
          {list.map(d => (
            <Card key={d.id} className="p-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{d.name}</h3>
                <p className="text-sm text-slate-500">{d.specialization}{d.qualification && ` · ${d.qualification}`}</p>
                <p className="text-sm text-slate-500">
                  {d.available_days.join(", ")} · {d.available_from}–{d.available_to} · Rs.{d.consultation_fee}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setForm(d); setOpen(true); }}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => del(d.id!)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit doctor" : "Add doctor"}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Specialization" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
          <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
          <Textarea label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Available days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.available_days.includes(day) ? "bg-brand-100 text-brand-700 border-brand-300" : "bg-white text-slate-500 border-slate-300"
                  }`}>{day}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="time" value={form.available_from} onChange={e => setForm({ ...form, available_from: e.target.value })} />
            <Input label="To" type="time" value={form.available_to} onChange={e => setForm({ ...form, available_to: e.target.value })} />
          </div>
          <Input label="Consultation fee (Rs.)" type="number" value={form.consultation_fee} onChange={e => setForm({ ...form, consultation_fee: +e.target.value })} />
          <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
        </div>
      </Modal>
    </div>
  );
}
