"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Modal, Spinner, EmptyState, Badge } from "@/components/ui";

interface Tenant { id: string; name: string; slug: string; is_active: boolean; }

interface Form {
  name: string; slug: string; email: string; phone: string; address: string;
  description: string; specializations: string[];
  admin_email: string; admin_password: string; admin_name: string;
}

const BLANK: Form = {
  name: "", slug: "", email: "", phone: "", address: "", description: "", specializations: [],
  admin_email: "", admin_password: "", admin_name: "",
};

export default function ClinicsPage() {
  const { token } = useAuth();
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(BLANK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api.get<Tenant[]>("/api/admin/tenants", token!).then(setList).finally(() => setLoading(false));
  useEffect(() => { if (token) load(); }, [token]);

  const create = async () => {
    setBusy(true); setErr("");
    try { await api.post("/api/admin/tenants", form, token!); setOpen(false); setForm(BLANK); load(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };

  const toggle = async (t: Tenant) => {
    await api.patch(`/api/admin/tenants/${t.id}`, { is_active: !t.is_active }, token!); load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clinics</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} clinic{list.length !== 1 ? "s" : ""} on the platform</p>
        </div>
        <Button variant="gradient" onClick={() => { setForm(BLANK); setOpen(true); }}>Create Clinic</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No clinics yet." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Clinic</th>
                  <th className="px-6 py-3 font-semibold">Slug</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                          {t.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">{t.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={t.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                        {t.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggle(t)}>
                        {t.is_active ? "Suspend" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Clinic">
        <div className="space-y-4">
          <Input label="Clinic Name" value={form.name} onChange={e => {
            const name = e.target.value;
            setForm({ ...form, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") });
          }} />
          <Input label="Slug (URL path)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="border-t border-slate-100 pt-4 mt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Clinic Admin Account</p>
            <div className="space-y-4">
              <Input label="Admin Name" value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} />
              <Input label="Admin Email" type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} />
              <Input label="Admin Password" type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} />
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{err}</p>}
          <Button variant="gradient" onClick={create} disabled={busy} className="w-full">{busy ? "Creating..." : "Create Clinic"}</Button>
        </div>
      </Modal>
    </div>
  );
}
