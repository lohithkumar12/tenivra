"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Spinner, Badge } from "@/components/ui";
import { statusColor } from "@/lib/utils";
import Link from "next/link";

const STAT_STYLES = [
  "from-brand-500 to-brand-700",
  "from-accent-500 to-accent-600",
  "from-violet-500 to-violet-700",
  "from-amber-500 to-amber-600",
];

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [counts, setCounts] = useState({ doctors: 0, services: 0, total: 0, pending: 0 });
  const [recent, setRecent] = useState<Record<string, string>[]>([]);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<unknown[]>("/api/clinic/doctors", token),
      api.get<unknown[]>("/api/clinic/services", token),
      api.get<Record<string, string>[]>("/api/clinic/appointments", token),
      api.get<{ slug: string }>("/api/clinic/profile", token),
    ]).then(([d, s, a, p]) => {
      setCounts({
        doctors: d.length,
        services: s.length,
        total: a.length,
        pending: a.filter(x => x.status === "pending").length,
      });
      setRecent(a.slice(0, 5));
      setSlug(p.slug);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const stats = [
    { l: "Doctors", v: counts.doctors, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { l: "Services", v: counts.services, icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { l: "Appointments", v: counts.total, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { l: "Pending", v: counts.pending, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold">Welcome back, {user?.full_name}</h1>
          <p className="text-brand-200 mt-1">
            {slug && <>Public page: <Link href={`/clinic/${slug}`} target="_blank" className="text-white underline underline-offset-2">/clinic/{slug}</Link></>}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {stats.map((c, i) => (
          <div key={c.l} className={`bg-gradient-to-br ${STAT_STYLES[i]} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/80">{c.l}</span>
              <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
            </div>
            <p className="text-3xl font-extrabold">{c.v}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-lg">Recent Appointments</h2>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 p-6">No appointments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Patient</th>
                  <th className="px-6 py-3 font-semibold">Service</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{a.patient_name}</td>
                    <td className="px-6 py-4 text-slate-500">{a.service_name}</td>
                    <td className="px-6 py-4 text-slate-500">{a.preferred_date} {a.preferred_time}</td>
                    <td className="px-6 py-4"><Badge className={statusColor(a.status)}>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
