"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/components/ui";
import Link from "next/link";

export default function SuperDashboard() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<{ id: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) api.get<{ id: string; is_active: boolean }[]>("/api/admin/tenants", token).then(setTenants).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total Clinics</p>
          <p className="text-3xl font-bold mt-1">{tenants.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-3xl font-bold mt-1">{tenants.filter(t => t.is_active).length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Suspended</p>
          <p className="text-3xl font-bold mt-1">{tenants.filter(t => !t.is_active).length}</p>
        </Card>
      </div>
      <Link href="/super/clinics" className="text-brand-600 hover:underline text-sm font-medium">Manage clinics &rarr;</Link>
    </div>
  );
}
