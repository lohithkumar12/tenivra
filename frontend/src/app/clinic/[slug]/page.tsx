"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Spinner, Button } from "@/components/ui";
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
  if (!profile) return (
    <div className="text-center py-16">
      <p className="text-slate-500 text-lg">Clinic information is not available right now.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card variant="hover" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <h2 className="font-bold text-lg">Contact</h2>
          </div>
          {profile.phone && <p className="text-sm mb-2 flex items-center gap-2"><span className="text-slate-400">Phone:</span> <span className="font-medium">{profile.phone}</span></p>}
          {profile.email && <p className="text-sm mb-2 flex items-center gap-2"><span className="text-slate-400">Email:</span> <span className="font-medium">{profile.email}</span></p>}
          {profile.address && <p className="text-sm text-slate-500 mt-3 leading-relaxed">{profile.address}</p>}
          {profile.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.specializations.map(s => (
                <span key={s} className="px-3 py-1 bg-gradient-to-r from-brand-50 to-brand-100 text-brand-700 text-xs rounded-full font-semibold">{s}</span>
              ))}
            </div>
          )}
        </Card>

        <Card variant="hover" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="font-bold text-lg">Timings</h2>
          </div>
          <div className="space-y-2 text-sm">
            {timings.sort((a, b) => a.day_of_week - b.day_of_week).map(t => (
              <div key={t.day_of_week} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-700">{DAY_NAMES[t.day_of_week]}</span>
                {t.is_open
                  ? <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">{t.open_time} - {t.close_time}</span>
                  : <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-xs font-semibold">Closed</span>
                }
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href={`/clinic/${slug}/book`}>
          <Button variant="gradient" size="lg">Book an Appointment</Button>
        </Link>
        <Link href={`/clinic/${slug}/assistant`}>
          <Button variant="secondary" size="lg">Ask a Question</Button>
        </Link>
      </div>
    </div>
  );
}
