"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Select, Input, Modal, Spinner, EmptyState, Badge } from "@/components/ui";
import { statusColor } from "@/lib/utils";
import { useSSE } from "@/lib/useSSE";

interface Appt {
  id: string; patient_name: string; patient_phone: string; patient_email: string;
  service_name: string; doctor_name: string; preferred_date: string; preferred_time: string;
  notes: string; status: string; admin_notes: string; created_at: string;
}

const ALL_STATUS = ["", "pending", "confirmed", "rejected", "completed", "cancelled"];
const AUTO_CONFIRM_MINUTES = 15;

function AutoConfirmCountdown({ createdAt }: { createdAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const created = new Date(createdAt).getTime();
      const deadline = created + AUTO_CONFIRM_MINUTES * 60 * 1000;
      const diff = deadline - Date.now();
      if (diff <= 0) { setRemaining("Auto-confirming..."); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);

  return (
    <span className="text-xs text-amber-600 font-mono font-semibold" title="Auto-confirms if no action is taken">
      Auto-confirm in {remaining}
    </span>
  );
}

export default function ApptsPage() {
  const { token, user } = useAuth();
  const [list, setList] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setSF] = useState("");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Appt | null>(null);
  const [newSt, setNewSt] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback((st?: string, q?: string) => {
    let p = "/api/clinic/appointments?";
    if (st) p += `status=${st}&`;
    if (q) p += `search=${encodeURIComponent(q)}&`;
    api.get<Appt[]>(p, token!).then(setList).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleSSE = useCallback((evt: { event: string; data: Record<string, unknown> }) => {
    if (evt.event === "new_booking" || evt.event === "status_change" || evt.event === "patient_cancelled") {
      load(statusFilter, search);
    }
  }, [load, statusFilter, search]);

  useSSE(
    user && (user.role === "clinic_admin" || user.role === "receptionist") ? "/api/sse/clinic" : null,
    token,
    handleSSE,
  );

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Appointments</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">{list.length} appointment{list.length !== 1 ? "s" : ""} found — updates appear in real time</p>
      </div>

      <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <Select label="Status" options={ALL_STATUS.map(s => ({ value: s, label: s || "All" }))} value={statusFilter} onChange={e => setSF(e.target.value)} />
          <Input label="Search" placeholder="Name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button onClick={filter} variant="secondary" className="w-full sm:w-auto">Filter</Button>
        </div>
      </Card>

      {list.length === 0 ? <EmptyState message="No appointments found." /> : (
        <>
          {/* Desktop table */}
          <Card className="overflow-hidden hidden lg:block">
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
                      <td className="px-6 py-4">
                        <Badge className={statusColor(a.status)}>{a.status}</Badge>
                        {a.status === "pending" && a.created_at && (
                          <div className="mt-1">
                            <AutoConfirmCountdown createdAt={a.created_at} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSel(a); setNewSt(a.status); setNotes(a.admin_notes || ""); }}>Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {list.map(a => (
              <Card key={a.id} variant="hover" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-800">{a.patient_name}</p>
                  <Badge className={statusColor(a.status)}>{a.status}</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-2">{a.patient_phone}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
                  <span>{a.service_name}</span>
                  {a.doctor_name && <span>with {a.doctor_name}</span>}
                </div>
                <p className="text-sm text-slate-600 mb-3">{a.preferred_date} at {a.preferred_time}</p>
                {a.status === "pending" && a.created_at && (
                  <div className="mb-3">
                    <AutoConfirmCountdown createdAt={a.created_at} />
                  </div>
                )}
                <Button variant="gradient" size="sm" className="w-full" onClick={() => { setSel(a); setNewSt(a.status); setNotes(a.admin_notes || ""); }}>
                  Manage
                </Button>
              </Card>
            ))}
          </div>
        </>
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
            {sel.status === "pending" && sel.created_at && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Auto-confirm countdown</p>
                  <p className="text-xs text-amber-600">This appointment will auto-confirm if no action is taken within 15 minutes of booking.</p>
                </div>
              </div>
            )}
            <Select label="Update Status" options={ALL_STATUS.filter(Boolean).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} value={newSt} onChange={e => setNewSt(e.target.value)} />
            <Input label="Admin Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." />
            <Button variant="gradient" onClick={update} className="w-full">Update Status</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
