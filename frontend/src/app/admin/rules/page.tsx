"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Spinner, Toggle } from "@/components/ui";

interface Rules {
  allow_same_day: boolean; minimum_notice_hours: number; max_advance_days: number;
  walk_in_allowed: boolean; manual_approval_required: boolean;
}

const DEFAULTS: Rules = {
  allow_same_day: true, minimum_notice_hours: 2, max_advance_days: 30,
  walk_in_allowed: true, manual_approval_required: true,
};

export default function RulesPage() {
  const { token } = useAuth();
  const [r, setR] = useState<Rules>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (token) api.get<Rules>("/api/clinic/appointment-rules", token).then(setR).finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    setSaving(true); setMsg("");
    try { const u = await api.put<Rules>("/api/clinic/appointment-rules", r, token!); setR(u); setMsg("Saved!"); }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Appointment Rules</h1>
      <Card className="p-6 max-w-lg space-y-5">
        <Toggle checked={r.allow_same_day} onChange={v => setR({ ...r, allow_same_day: v })} label="Allow same-day booking" />
        <Toggle checked={r.walk_in_allowed} onChange={v => setR({ ...r, walk_in_allowed: v })} label="Walk-ins allowed" />
        <Toggle checked={r.manual_approval_required} onChange={v => setR({ ...r, manual_approval_required: v })} label="Manual approval required" />
        <Input label="Minimum notice (hours)" type="number" value={r.minimum_notice_hours} onChange={e => setR({ ...r, minimum_notice_hours: +e.target.value })} />
        <Input label="Max advance booking (days)" type="number" value={r.max_advance_days} onChange={e => setR({ ...r, max_advance_days: +e.target.value })} />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save rules"}</Button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
      </Card>
    </div>
  );
}
