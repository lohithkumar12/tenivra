"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, Textarea, Modal, Spinner, EmptyState } from "@/components/ui";

interface FAQ { id?: string; question: string; answer: string; sort_order: number; }
const BLANK: FAQ = { question: "", answer: "", sort_order: 0 };

export default function FAQsPage() {
  const { token } = useAuth();
  const [list, setList] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FAQ>(BLANK);
  const [busy, setBusy] = useState(false);

  const load = () => api.get<FAQ[]>("/api/clinic/faqs", token!).then(setList).finally(() => setLoading(false));
  useEffect(() => { if (token) load(); }, [token]);

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await api.patch(`/api/clinic/faqs/${form.id}`, form, token!);
      else await api.post("/api/clinic/faqs", form, token!);
      setOpen(false); load();
    } finally { setBusy(false); }
  };

  const del = async (id: string) => { if (confirm("Delete this FAQ?")) { await api.del(`/api/clinic/faqs/${id}`, token!); load(); } };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">FAQs</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} FAQ{list.length !== 1 ? "s" : ""} configured</p>
        </div>
        <Button variant="gradient" onClick={() => { setForm(BLANK); setOpen(true); }}>Add FAQ</Button>
      </div>

      {list.length === 0 ? <EmptyState message="No FAQs added yet." /> : (
        <div className="space-y-3">
          {list.map((f, i) => (
            <Card key={f.id} variant="hover" className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{f.question}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.answer}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => { setForm(f); setOpen(true); }}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => del(f.id!)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit FAQ" : "Add FAQ"}>
        <div className="space-y-4">
          <Input label="Question" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
          <Textarea label="Answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })} />
          <Button variant="gradient" onClick={save} disabled={busy} className="w-full">{busy ? "Saving..." : "Save"}</Button>
        </div>
      </Modal>
    </div>
  );
}
