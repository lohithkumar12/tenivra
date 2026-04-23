"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Spinner, Badge } from "@/components/ui";
import { statusColor } from "@/lib/utils";
import Link from "next/link";

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-6">
        Welcome, {user?.full_name}.
        {slug && <> Public page: <Link href={`/clinic/${slug}`} target="_blank" className="text-brand-600 hover:underline">/clinic/{slug}</Link></>}
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { l: "Doctors", v: counts.doctors },
          { l: "Services", v: counts.services },
          { l: "Appointments", v: counts.total },
          { l: "Pending", v: counts.pending },
        ].map(c => (
          <Card key={c.l} className="p-5">
            <p className="text-sm text-slate-500">{c.l}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{c.v}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Recent appointments</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No appointments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2">Patient</th><th className="pb-2">Service</th><th className="pb-2">Date</th><th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(a => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2">{a.patient_name}</td>
                  <td className="py-2">{a.service_name}</td>
                  <td className="py-2">{a.preferred_date} {a.preferred_time}</td>
                  <td className="py-2"><Badge className={statusColor(a.status)}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
