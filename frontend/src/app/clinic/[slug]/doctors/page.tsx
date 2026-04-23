"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Spinner, EmptyState } from "@/components/ui";

interface Doc {
  id: string; name: string; specialization: string; qualification: string; bio: string;
  available_days: string[]; available_from: string; available_to: string; consultation_fee: number;
}

export default function DoctorsPage() {
  const { slug } = useParams();
  const [list, setList] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Doc[]>(`/api/public/${slug}/doctors`).then(setList).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Our Doctors</h2>
      {list.length === 0 ? <EmptyState message="No doctors listed yet." /> : (
        <div className="grid sm:grid-cols-2 gap-5">
          {list.map(d => (
            <Card key={d.id} variant="hover" className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {d.name.split(" ").pop()?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{d.name}</h3>
                  <p className="text-sm text-brand-600 font-medium">{d.specialization}</p>
                  {d.qualification && <p className="text-xs text-slate-400 mt-0.5">{d.qualification}</p>}
                </div>
                <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-bold whitespace-nowrap">
                  Rs. {d.consultation_fee}
                </span>
              </div>
              {d.bio && <p className="text-sm text-slate-500 mt-3 leading-relaxed">{d.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {d.available_days.map(day => (
                  <span key={day} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">{day}</span>
                ))}
                <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-medium">
                  {d.available_from} - {d.available_to}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
