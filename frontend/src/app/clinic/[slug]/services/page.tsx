"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Spinner, EmptyState } from "@/components/ui";

interface Svc { id: string; name: string; description: string; duration_minutes: number; fee: number; appointment_required: boolean; }

export default function ServicesPage() {
  const { slug } = useParams();
  const [list, setList] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Svc[]>(`/api/public/${slug}/services`).then(setList).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Our Services</h2>
      {list.length === 0 ? <EmptyState message="No services listed yet." /> : (
        <div className="grid sm:grid-cols-2 gap-5">
          {list.map(s => (
            <Card key={s.id} variant="hover" className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{s.name}</h3>
                <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-bold whitespace-nowrap">
                  Rs. {s.fee}
                </span>
              </div>
              {s.description && <p className="text-sm text-slate-500 leading-relaxed mb-3">{s.description}</p>}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full text-slate-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {s.duration_minutes} min
                </span>
                <span className={`px-2.5 py-1 rounded-full font-medium ${s.appointment_required ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                  {s.appointment_required ? "Appointment required" : "Walk-in OK"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
