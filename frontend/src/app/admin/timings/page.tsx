"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Spinner, Toggle } from "@/components/ui";
import { DAY_NAMES } from "@/lib/utils";

interface Timing {
  day_of_week: number; is_open: boolean;
  open_time: string | null; close_time: string | null;
  break_start: string | null; break_end: string | null;
}

export default function TimingsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Timing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    api.get<Timing[]>("/api/clinic/timings", token).then(data => {
      const map = new Map(data.map(t => [t.day_of_week, t]));
      setRows(Array.from({ length: 7 }, (_, i) => map.get(i) ?? {
        day_of_week: i, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null,
      }));
    }).finally(() => setLoading(false));
  }, [token]);

  const upd = (i: number, p: Partial<Timing>) => { const n = [...rows]; n[i] = { ...n[i], ...p }; setRows(n); };

  const save = async () => {
    setSaving(true); setMsg("");
    try { await api.put("/api/clinic/timings", { timings: rows }, token!); setMsg("Saved!"); }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Clinic Timings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your weekly opening hours and break times</p>
      </div>
      <Card className="p-6 max-w-4xl">
        <div className="space-y-4">
          {rows.map((t, i) => (
            <div key={i} className={`flex items-center gap-4 flex-wrap p-3 rounded-xl transition-colors ${t.is_open ? "bg-green-50/50" : "bg-slate-50"}`}>
              <span className="w-24 text-sm font-semibold text-slate-700">{DAY_NAMES[i]}</span>
              <Toggle checked={t.is_open} onChange={v => upd(i, { is_open: v })} />
              {t.is_open && (
                <>
                  <Input type="time" value={t.open_time ?? ""} onChange={e => upd(i, { open_time: e.target.value })} className="!w-28" />
                  <span className="text-xs text-slate-400 font-medium">to</span>
                  <Input type="time" value={t.close_time ?? ""} onChange={e => upd(i, { close_time: e.target.value })} className="!w-28" />
                  <span className="text-xs text-slate-400 font-medium ml-2">break</span>
                  <Input type="time" value={t.break_start ?? ""} onChange={e => upd(i, { break_start: e.target.value })} className="!w-28" />
                  <span className="text-xs text-slate-400">-</span>
                  <Input type="time" value={t.break_end ?? ""} onChange={e => upd(i, { break_end: e.target.value })} className="!w-28" />
                </>
              )}
              {!t.is_open && <span className="text-xs text-slate-400 font-medium">Closed</span>}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="gradient" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Timings"}</Button>
          {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
        </div>
      </Card>
    </div>
  );
}
