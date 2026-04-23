"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";
import Link from "next/link";

const STAT_STYLES = [
  "from-brand-500 to-brand-700",
  "from-green-500 to-green-700",
  "from-red-500 to-red-700",
];

export default function SuperDashboard() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<{ id: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) api.get<{ id: string; is_active: boolean }[]>("/api/admin/tenants", token).then(setTenants).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const stats = [
    { l: "Total Clinics", v: tenants.length, icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { l: "Active", v: tenants.filter(t => t.is_active).length, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { l: "Suspended", v: tenants.filter(t => !t.is_active).length, icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 bg-gradient-to-r from-violet-600 to-brand-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold">Platform Dashboard</h1>
          <p className="text-violet-200 mt-1">Manage all clinics from one place</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
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

      <Link href="/super/clinics" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm font-semibold transition-colors">
        Manage Clinics
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </Link>
    </div>
  );
}
