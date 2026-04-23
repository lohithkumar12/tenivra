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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clinics</h1>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }}>Create clinic</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No clinics yet." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b bg-slate-50">
                <th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Status</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">
                    <Badge className={t.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {t.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => toggle(t)}>
                      {t.is_active ? "Suspend" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create clinic">
        <div className="space-y-3">
          <Input label="Clinic name" value={form.name} onChange={e => {
            const name = e.target.value;
            setForm({ ...form, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") });
          }} />
          <Input label="Slug (URL path)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
          <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <hr />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Clinic admin account</p>
          <Input label="Admin name" value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} />
          <Input label="Admin email" type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} />
          <Input label="Admin password" type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button onClick={create} disabled={busy} className="w-full">{busy ? "Creating…" : "Create clinic"}</Button>
        </div>
      </Modal>
    </div>
  );
}
