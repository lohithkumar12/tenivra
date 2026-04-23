"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Select, Input, Modal, Spinner, EmptyState, Badge } from "@/components/ui";
import { statusColor } from "@/lib/utils";

interface Appt {
  id: string; patient_name: string; patient_phone: string; patient_email: string;
  service_name: string; doctor_name: string; preferred_date: string; preferred_time: string;
  notes: string; status: string; admin_notes: string; created_at: string;
}

const ALL_STATUS = ["", "pending", "confirmed", "rejected", "completed", "cancelled"];

export default function ApptsPage() {
  const { token } = useAuth();
  const [list, setList] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setSF] = useState("");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Appt | null>(null);
  const [newSt, setNewSt] = useState("");
  const [notes, setNotes] = useState("");

  const load = (st?: string, q?: string) => {
    let p = "/api/clinic/appointments?";
    if (st) p += `status=${st}&`;
    if (q) p += `search=${encodeURIComponent(q)}&`;
    api.get<Appt[]>(p, token!).then(setList).finally(() => setLoading(false));
  };

  useEffect(() => { if (token) load(); }, [token]);

  const filter = () => { setLoading(true); load(statusFilter, search); };

  const update = async () => {
    if (!sel || !newSt) return;
    await api.patch(`/api/clinic/appointments/${sel.id}/status`, { status: newSt, admin_notes: notes || undefined }, token!);
    setSel(null); load(statusFilter, search);
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-sm text-slate-500 mt-1">{list.length} appointment{list.length !== 1 ? "s" : ""} found</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <Select label="Status" options={ALL_STATUS.map(s => ({ value: s, label: s || "All" }))} value={statusFilter} onChange={e => setSF(e.target.value)} />
          <Input label="Search" placeholder="Name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button onClick={filter} variant="secondary">Filter</Button>
        </div>
      </Card>

      {list.length === 0 ? <EmptyState message="No appointments found." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Patient</th>
                  <th className="px-6 py-3 font-semibold">Service</th>
                  <th className="px-6 py-3 font-semibold">Doctor</th>
                  <th className="px-6 py-3 font-semibold">Date / Time</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{a.patient_name}</p>
                      <p className="text-xs text-slate-400">{a.patient_phone}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{a.service_name}</td>
                    <td className="px-6 py-4 text-slate-600">{a.doctor_name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{a.preferred_date} {a.preferred_time}</td>
                    <td className="px-6 py-4"><Badge className={statusColor(a.status)}>{a.status}</Badge></td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSel(a); setNewSt(a.status); setNotes(a.admin_notes || ""); }}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title="Manage Appointment">
        {sel && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Patient</span><span className="font-medium">{sel.patient_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="font-medium">{sel.patient_phone}</span></div>
              {sel.patient_email && <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-medium">{sel.patient_email}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Service</span><span className="font-medium">{sel.service_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Doctor</span><span className="font-medium">{sel.doctor_name || "Not specified"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="font-medium">{sel.preferred_date} at {sel.preferred_time}</span></div>
              {sel.notes && <div className="pt-2 border-t border-slate-200"><span className="text-slate-400 block mb-1">Patient Notes:</span><span className="text-slate-600">{sel.notes}</span></div>}
            </div>
            <Select label="Update Status" options={ALL_STATUS.filter(Boolean).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} value={newSt} onChange={e => setNewSt(e.target.value)} />
            <Input label="Admin Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." />
            <Button variant="gradient" onClick={update} className="w-full">Update Status</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
