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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} doctor{list.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Button variant="gradient" onClick={() => { setForm(BLANK); setOpen(true); }}>Add Doctor</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No doctors added yet." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Doctor</th>
                  <th className="px-6 py-3 font-semibold">Availability</th>
                  <th className="px-6 py-3 font-semibold">Fee</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-xs text-slate-400">{d.specialization}{d.qualification && ` · ${d.qualification}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 text-xs">{d.available_days.join(", ")}</p>
                      <p className="text-slate-400 text-xs">{d.available_from} - {d.available_to}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold">Rs. {d.consultation_fee}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setForm(d); setOpen(true); }}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => del(d.id!)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit Doctor" : "Add Doctor"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Specialization" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
          <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
          <Textarea label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Available Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    form.available_days.includes(day) ? "bg-brand-600 text-white border-brand-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-brand-300"
                  }`}>{day}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From" type="time" value={form.available_from} onChange={e => setForm({ ...form, available_from: e.target.value })} />
            <Input label="To" type="time" value={form.available_to} onChange={e => setForm({ ...form, available_to: e.target.value })} />
          </div>
          <Input label="Consultation Fee (Rs.)" type="number" value={form.consultation_fee} onChange={e => setForm({ ...form, consultation_fee: +e.target.value })} />
          <Button variant="gradient" onClick={save} disabled={busy} className="w-full">{busy ? "Saving..." : "Save"}</Button>
        </div>
      </Modal>
    </div>
  );
}
