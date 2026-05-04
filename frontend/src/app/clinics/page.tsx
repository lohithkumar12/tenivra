"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

interface ClinicSummary {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  specializations: string[];
  doctor_count: number;
  service_count: number;
}

export default function ClinicsDirectoryPage() {
  const { user, logout } = useAuth();
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      const path = q.trim()
        ? `/api/public/clinics?q=${encodeURIComponent(q.trim())}`
        : "/api/public/clinics";
      api.get<ClinicSummary[]>(path)
        .then(rows => { if (alive) setClinics(rows); })
        .catch(() => { if (alive) setClinics([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative bg-surface-900 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        <div className="absolute inset-0 bg-grid-pattern" />
        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">Tenivra</Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href={homeForRole(user.role)}>
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">
                    {user.role === "patient" ? "My Bookings" : "Dashboard"}
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold flex items-center justify-center text-xs">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-white/80 hidden sm:inline">{user.full_name}</span>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Sign In</Button>
                </Link>
                <Link href="/patient/signup">
                  <Button variant="gradient" size="sm">Patient Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Find a clinic. Book in seconds.
          </h1>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Browse verified clinics on Tenivra and book your next visit online.
          </p>
          <div className="mt-8 max-w-xl mx-auto">
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name, location, or specialty..."
              className="w-full px-5 py-4 rounded-2xl bg-white/95 backdrop-blur text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/50 shadow-xl text-base"
            />
          </div>
        </div>
      </section>

      {/* Listing */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {loading ? "Loading..." : `${clinics.length} clinic${clinics.length === 1 ? "" : "s"}`}
            {q && !loading && <span className="text-slate-500 font-normal"> matching &ldquo;{q}&rdquo;</span>}
          </h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl bg-white p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded mt-3 w-full" />
                <div className="h-4 bg-slate-100 rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : clinics.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-slate-600 text-lg font-semibold">No clinics found</p>
            <p className="text-slate-400 text-sm mt-1">
              Try a different search, or{" "}
              <Link href="/signup" className="text-brand-600 font-semibold hover:underline">list your own clinic</Link>.
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clinics.map(c => (
              <Card key={c.id} variant="hover" className="p-6 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{c.name}</h3>
                    {c.address && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.address}</p>
                    )}
                  </div>
                </div>

                {c.description && (
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{c.description}</p>
                )}

                {c.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.specializations.slice(0, 3).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                        {s}
                      </span>
                    ))}
                    {c.specializations.length > 3 && (
                      <span className="text-xs text-slate-400">+{c.specializations.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span>{c.doctor_count} doctor{c.doctor_count === 1 ? "" : "s"}</span>
                  <span>•</span>
                  <span>{c.service_count} service{c.service_count === 1 ? "" : "s"}</span>
                </div>

                <div className="mt-auto pt-5 flex gap-2">
                  <Link href={`/clinic/${c.slug}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">View</Button>
                  </Link>
                  <Link href={`/clinic/${c.slug}/book`} className="flex-1">
                    <Button variant="gradient" size="sm" className="w-full">Book</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        {user?.role === "patient" ? (
          <Card className="p-8 sm:p-10 text-center bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
            <h3 className="text-2xl font-extrabold text-slate-800">Track all your appointments</h3>
            <p className="text-slate-600 mt-2 max-w-xl mx-auto">
              Book from any clinic above and manage all your appointments in one place.
            </p>
            <Link href="/patient/bookings" className="inline-block mt-5">
              <Button variant="gradient" size="lg">Go to My Bookings</Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-8 sm:p-10 text-center bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
            <h3 className="text-2xl font-extrabold text-slate-800">Run a clinic? Get listed for free.</h3>
            <p className="text-slate-600 mt-2 max-w-xl mx-auto">
              Set up your page, accept online appointments, and reach new patients on Tenivra.
            </p>
            <Link href="/signup" className="inline-block mt-5">
              <Button variant="gradient" size="lg">List Your Clinic</Button>
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
