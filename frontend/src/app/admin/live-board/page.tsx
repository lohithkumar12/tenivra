"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useSSE, playNotificationSound } from "@/lib/useSSE";
import { Badge } from "@/components/ui";

interface Appt {
  id: string;
  patient_name: string;
  service_name: string;
  doctor_name: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500",
  confirmed: "bg-emerald-500",
  rejected:  "bg-red-500",
  completed: "bg-blue-500",
  cancelled: "bg-slate-500",
};

const STATUS_TEXT: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected:  "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export default function LiveBoardPage() {
  const { token, user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [time, setTime] = useState(new Date());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const load = useCallback(() => {
    if (!token) return;
    const today = new Date().toISOString().split("T")[0];
    api.get<Appt[]>(`/api/clinic/appointments?date=${today}`, token).then(setAppts);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const handleSSE = useCallback((evt: { event: string; data: Record<string, unknown> }) => {
    if (evt.event === "new_booking") {
      load();
      playNotificationSound();
      const id = evt.data.appointment_id as string;
      setNewIds(prev => new Set(prev).add(id));
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 5000);
    }
    if (evt.event === "status_change" || evt.event === "patient_cancelled") {
      load();
    }
  }, [load]);

  useSSE(
    user && (user.role === "clinic_admin" || user.role === "receptionist") ? "/api/sse/clinic" : null,
    token,
    handleSSE,
  );

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const pending = appts.filter(a => a.status === "pending").length;
  const confirmed = appts.filter(a => a.status === "confirmed").length;
  const completed = appts.filter(a => a.status === "completed").length;

  return (
    <div className="min-h-screen bg-surface-900 text-white p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Appointment Board</h1>
          <p className="text-slate-400 mt-1">{today}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold tabular-nums">
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Auto-refreshes every 30s</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Today" value={appts.length} color="from-brand-500 to-brand-700" />
        <StatCard label="Pending" value={pending} color="from-amber-500 to-amber-600" />
        <StatCard label="Confirmed" value={confirmed} color="from-emerald-500 to-emerald-600" />
        <StatCard label="Completed" value={completed} color="from-blue-500 to-blue-600" />
      </div>

      {/* Appointment grid */}
      {appts.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 text-xl">No appointments scheduled for today.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {appts.map(a => {
            const isNew = newIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 transition-all duration-500 ${
                  isNew ? "ring-2 ring-brand-400 animate-pulse scale-105" : "hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-mono font-bold text-white">{a.preferred_time}</span>
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[a.status] || "bg-slate-500"} ${a.status === "pending" ? "animate-pulse" : ""}`} />
                </div>
                <h3 className="font-bold text-lg truncate">{a.patient_name}</h3>
                <p className="text-sm text-slate-400 truncate mt-1">{a.service_name}</p>
                {a.doctor_name && <p className="text-xs text-slate-500 truncate">Dr. {a.doctor_name}</p>}
                <div className="mt-3">
                  <Badge className={STATUS_TEXT[a.status] || "bg-slate-700 text-white"}>
                    {a.status.toUpperCase()}
                  </Badge>
                </div>
                {isNew && (
                  <div className="mt-2 text-xs font-semibold text-brand-400 animate-bounce">NEW</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-5 shadow-lg`}>
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="text-4xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
