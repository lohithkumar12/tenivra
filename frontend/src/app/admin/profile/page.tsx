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
    <div>
      <h1 className="text-2xl font-bold mb-6">Clinic Profile</h1>
      <Card className="p-6 max-w-2xl space-y-4">
        <Input label="Clinic Name" value={(p.name as string) || ""} onChange={e => upd("name", e.target.value)} />
        <Input label="Phone" value={(p.phone as string) || ""} onChange={e => upd("phone", e.target.value)} />
        <Input label="Email" value={(p.email as string) || ""} onChange={e => upd("email", e.target.value)} />
        <Textarea label="Address" value={(p.address as string) || ""} onChange={e => upd("address", e.target.value)} />
        <Textarea label="Description" value={(p.description as string) || ""} onChange={e => upd("description", e.target.value)} />
        <Input
          label="Specializations (comma-separated)"
          value={((p.specializations as string[]) || []).join(", ")}
          onChange={e => upd("specializations", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
        <p className="text-xs text-slate-400">
          Slug: <span className="font-mono">{p.slug as string}</span> — Public:
          <a href={`/clinic/${p.slug}`} target="_blank" className="text-brand-600 hover:underline ml-1">/clinic/{p.slug as string}</a>
        </p>
      </Card>
    </div>
  );
}
