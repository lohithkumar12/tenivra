"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/components/ui";
import { DAY_NAMES } from "@/lib/utils";
import Link from "next/link";

interface Profile { name: string; phone: string; email: string; address: string; specializations: string[]; }
interface Timing { day_of_week: number; is_open: boolean; open_time: string; close_time: string; }

export default function ClinicHome() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Profile>(`/api/public/${slug}/profile`),
      api.get<Timing[]>(`/api/public/${slug}/timings`),
    ]).then(([p, t]) => { setProfile(p); setTimings(t); }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Contact</h2>
          {profile.phone && <p className="text-sm mb-1">Phone: {profile.phone}</p>}
          {profile.email && <p className="text-sm mb-1">Email: {profile.email}</p>}
          {profile.address && <p className="text-sm text-slate-500 mt-2">{profile.address}</p>}
          {profile.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.specializations.map(s => (
                <span key={s} className="px-2.5 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full font-medium">{s}</span>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Timings</h2>
          <div className="space-y-1.5 text-sm">
            {timings.sort((a, b) => a.day_of_week - b.day_of_week).map(t => (
              <div key={t.day_of_week} className="flex justify-between">
                <span className="font-medium">{DAY_NAMES[t.day_of_week]}</span>
                <span className={t.is_open ? "text-slate-700" : "text-slate-400"}>
                  {t.is_open ? `${t.open_time} – ${t.close_time}` : "Closed"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href={`/clinic/${slug}/book`}
          className="inline-flex items-center px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          Book an appointment
        </Link>
        <Link href={`/clinic/${slug}/assistant`}
          className="inline-flex items-center px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          Ask a question
        </Link>
      </div>
    </div>
  );
}
