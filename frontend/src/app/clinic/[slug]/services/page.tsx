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
    <div>
      <h2 className="text-xl font-bold mb-4">Our Services</h2>
      {list.length === 0 ? <EmptyState message="No services listed yet." /> : (
        <div className="grid gap-4">
          {list.map(s => (
            <Card key={s.id} className="p-5">
              <h3 className="font-semibold">{s.name}</h3>
              {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
              <div className="flex gap-4 mt-2 text-sm text-slate-600">
                <span>Rs. {s.fee}</span>
                <span>{s.duration_minutes} min</span>
                <span>{s.appointment_required ? "Appointment required" : "Walk-in OK"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
