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
    <div>
      <h2 className="text-xl font-bold mb-4">Our Doctors</h2>
      {list.length === 0 ? <EmptyState message="No doctors listed yet." /> : (
        <div className="grid gap-4">
          {list.map(d => (
            <Card key={d.id} className="p-5">
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-sm text-slate-500">{d.specialization}{d.qualification && ` · ${d.qualification}`}</p>
              {d.bio && <p className="text-sm text-slate-600 mt-2">{d.bio}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                <span>{d.available_days.join(", ")}</span>
                <span>{d.available_from} – {d.available_to}</span>
                <span>Rs. {d.consultation_fee}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
