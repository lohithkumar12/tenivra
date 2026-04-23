"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Input, Textarea, Button, Spinner } from "@/components/ui";

export default function ProfilePage() {
  const { token } = useAuth();
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (token) api.get<Record<string, unknown>>("/api/clinic/profile", token).then(setP).finally(() => setLoading(false));
  }, [token]);

  const upd = (k: string, v: unknown) => setP(prev => prev ? { ...prev, [k]: v } : prev);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await api.patch<Record<string, unknown>>("/api/clinic/profile", {
        name: p!.name, address: p!.address, phone: p!.phone, email: p!.email,
        description: p!.description, specializations: p!.specializations,
      }, token!);
      setP(res); setMsg("Saved!");
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!p) return null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Clinic Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your clinic information visible to patients</p>
      </div>
      <Card className="p-7 max-w-2xl space-y-5">
        <Input label="Clinic Name" value={(p.name as string) || ""} onChange={e => upd("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" value={(p.phone as string) || ""} onChange={e => upd("phone", e.target.value)} />
          <Input label="Email" value={(p.email as string) || ""} onChange={e => upd("email", e.target.value)} />
        </div>
        <Textarea label="Address" value={(p.address as string) || ""} onChange={e => upd("address", e.target.value)} />
        <Textarea label="Description" value={(p.description as string) || ""} onChange={e => upd("description", e.target.value)} />
        <Input
          label="Specializations (comma-separated)"
          value={((p.specializations as string[]) || []).join(", ")}
          onChange={e => upd("specializations", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className="flex items-center gap-3">
          <Button variant="gradient" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
        </div>
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Slug: <span className="font-mono font-medium text-slate-500">{p.slug as string}</span> — Public page:
            <a href={`/clinic/${p.slug}`} target="_blank" className="text-brand-600 hover:underline ml-1 font-medium">/clinic/{p.slug as string}</a>
          </p>
        </div>
      </Card>
    </div>
  );
}
