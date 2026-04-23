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
    <div>
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <Select label="Status" options={ALL_STATUS.map(s => ({ value: s, label: s || "All" }))} value={statusFilter} onChange={e => setSF(e.target.value)} />
        <Input label="Search" placeholder="Name or phone" value={search} onChange={e => setSearch(e.target.value)} />
        <Button onClick={filter} variant="secondary">Filter</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No appointments found." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b bg-slate-50">
                <th className="p-3">Patient</th><th className="p-3">Service</th><th className="p-3">Doctor</th>
                <th className="p-3">Date / Time</th><th className="p-3">Status</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="p-3">
                    <div className="font-medium">{a.patient_name}</div>
                    <div className="text-xs text-slate-400">{a.patient_phone}</div>
                  </td>
                  <td className="p-3">{a.service_name}</td>
                  <td className="p-3">{a.doctor_name || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{a.preferred_date} {a.preferred_time}</td>
                  <td className="p-3"><Badge className={statusColor(a.status)}>{a.status}</Badge></td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => { setSel(a); setNewSt(a.status); setNotes(a.admin_notes || ""); }}>Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title="Manage appointment">
        {sel && (
          <div className="space-y-3 text-sm">
            <p><strong>Patient:</strong> {sel.patient_name} — {sel.patient_phone} {sel.patient_email && `(${sel.patient_email})`}</p>
            <p><strong>Service:</strong> {sel.service_name}</p>
            <p><strong>Doctor:</strong> {sel.doctor_name || "Not specified"}</p>
            <p><strong>Date:</strong> {sel.preferred_date} at {sel.preferred_time}</p>
            {sel.notes && <p><strong>Patient notes:</strong> {sel.notes}</p>}
            <hr />
            <Select label="Update status" options={ALL_STATUS.filter(Boolean).map(s => ({ value: s, label: s }))} value={newSt} onChange={e => setNewSt(e.target.value)} />
            <Input label="Admin notes" value={notes} onChange={e => setNotes(e.target.value)} />
            <Button onClick={update} className="w-full">Update</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
