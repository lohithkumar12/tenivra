"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";

interface MetricDelta { current: number; previous: number; }
interface TrendPoint { date: string; clinics: number; patients: number; bookings: number; }
interface TopClinic { id: string; name: string; slug: string; booking_count: number; last_booking_at: string | null; }
interface AtRiskClinic { id: string; name: string; slug: string; signed_up_at: string; days_since_signup: number; admin_email?: string | null; }
interface RecentClinic { id: string; name: string; slug: string; signed_up_at: string; }
interface RecentPatient { id: string; full_name: string; email: string; signed_up_at: string; }
interface Metrics {
  total_clinics: number;
  active_clinics: number;
  total_patients: number;
  total_bookings: number;
  pending_bookings: number;
  avg_bookings_per_active_clinic: number;
  clinics_added: MetricDelta;
  patients_added: MetricDelta;
  bookings: MetricDelta;
  trend_30d: TrendPoint[];
  top_clinics: TopClinic[];
  at_risk_clinics: AtRiskClinic[];
  recent_clinics: RecentClinic[];
  recent_patients: RecentPatient[];
}

function deltaPct(d: MetricDelta): { pct: number | null; up: boolean } {
  if (d.previous === 0) return { pct: d.current > 0 ? null : 0, up: d.current >= 0 };
  const pct = Math.round(((d.current - d.previous) / d.previous) * 100);
  return { pct, up: pct >= 0 };
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const seconds = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function StatCard({
  label, value, delta, hint, accent,
}: {
  label: string;
  value: string | number;
  delta?: MetricDelta;
  hint?: string;
  accent: string;
}) {
  const d = delta ? deltaPct(delta) : null;
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${accent} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{label}</p>
        <p className="text-3xl font-extrabold mt-2">{value}</p>
        {d && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${d.up ? "bg-emerald-500/30 text-emerald-100" : "bg-red-500/30 text-red-100"}`}>
              {d.up ? "▲" : "▼"} {d.pct === null ? "new" : `${Math.abs(d.pct)}%`}
            </span>
            <span className="text-white/70">vs last week</span>
          </div>
        )}
        {hint && !d && <p className="text-xs text-white/70 mt-3">{hint}</p>}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const W = 800, H = 240, P = { l: 40, r: 16, t: 20, b: 28 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;

  const max = useMemo(() => Math.max(
    1,
    ...data.map(d => Math.max(d.clinics, d.patients, d.bookings))
  ), [data]);

  const xAt = (i: number) => P.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yAt = (v: number) => P.t + innerH - (v / max) * innerH;

  const path = (key: keyof TrendPoint) => data.map((d, i) =>
    `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(d[key] as number).toFixed(2)}`
  ).join(" ");

  const yTicks = [0, max / 2, max].map(v => Math.round(v));
  const xTickEvery = Math.max(1, Math.floor(data.length / 6));

  const lines = [
    { key: "bookings" as const, color: "#6366f1", label: "Bookings" },
    { key: "patients" as const, color: "#10b981", label: "Patients" },
    { key: "clinics" as const, color: "#f59e0b", label: "Clinics" },
  ];

  return (
    <div>
      <div className="flex items-center gap-5 mb-3 text-xs">
        {lines.map(l => (
          <div key={l.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-slate-600 font-medium">{l.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {yTicks.map((t, i) => {
          const y = yAt(t);
          return (
            <g key={i}>
              <line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={P.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          if (i % xTickEvery !== 0) return null;
          const x = xAt(i);
          const label = d.date.slice(5);
          return (
            <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{label}</text>
          );
        })}
        {lines.map(l => (
          <path key={l.key} d={path(l.key)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {lines.map(l => data.map((d, i) => (
          <circle
            key={`${l.key}-${i}`}
            cx={xAt(i)} cy={yAt(d[l.key] as number)}
            r="2.5" fill={l.color}
            opacity={(d[l.key] as number) === 0 ? 0 : 1}
          >
            <title>{`${d.date}\n${l.label}: ${d[l.key]}`}</title>
          </circle>
        )))}
      </svg>
    </div>
  );
}

export default function SuperDashboard() {
  const { token } = useAuth();
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get<Metrics>("/api/admin/metrics", token)
      .then(setM)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;
  if (!m) return <EmptyState message="Failed to load metrics" />;

  const totalEvents30d = m.trend_30d.reduce(
    (acc, d) => acc + d.clinics + d.patients + d.bookings, 0,
  );

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-violet-600 via-brand-600 to-accent-600 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-violet-200 text-sm font-medium">Founder Dashboard</p>
            <h1 className="text-3xl font-extrabold mt-1">How is Tenivra doing today?</h1>
            <p className="text-violet-200 mt-1">{m.total_clinics} clinics &middot; {m.total_patients} patients &middot; {m.total_bookings} bookings to date.</p>
          </div>
          <Link href="/super/clinics">
            <Button variant="secondary" size="md" className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur">
              Manage Clinics
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Clinics" value={m.total_clinics} delta={m.clinics_added} accent="from-amber-500 to-orange-600" />
        <StatCard label="Patients" value={m.total_patients} delta={m.patients_added} accent="from-emerald-500 to-teal-600" />
        <StatCard label="Bookings" value={m.total_bookings} delta={m.bookings} accent="from-brand-500 to-brand-700" />
        <StatCard label="Active Clinics (7d)" value={`${m.active_clinics}/${m.total_clinics}`} hint="Booked in last 7 days" accent="from-violet-500 to-purple-700" />
        <StatCard label="Avg Bookings / Active" value={m.avg_bookings_per_active_clinic} hint="Last 7 days" accent="from-pink-500 to-rose-600" />
        <StatCard label="Pending Approvals" value={m.pending_bookings} hint="Across all clinics" accent="from-slate-700 to-slate-900" />
      </div>

      {/* Trend chart */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">30-day Activity</h2>
            <p className="text-sm text-slate-500">Clinic signups, patient signups, and bookings per day</p>
          </div>
          <p className="text-xs text-slate-400">{totalEvents30d} total events</p>
        </div>
        <TrendChart data={m.trend_30d} />
      </Card>

      {/* Two-column lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top clinics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Power Users</h2>
              <p className="text-sm text-slate-500">Top clinics by bookings (last 30 days)</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">case studies</Badge>
          </div>
          {m.top_clinics.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No bookings in the last 30 days yet.</p>
          ) : (
            <ul className="space-y-2">
              {m.top_clinics.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/clinic/${c.slug}`} target="_blank" className="font-semibold text-slate-800 hover:text-brand-600 truncate block">
                      {c.name}
                    </Link>
                    {c.last_booking_at && (
                      <p className="text-xs text-slate-400">last booked {relativeTime(c.last_booking_at)}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{c.booking_count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* At-risk clinics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Outreach Needed</h2>
              <p className="text-sm text-slate-500">Signed up &gt;14 days ago, zero bookings</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700">churn risk</Badge>
          </div>
          {m.at_risk_clinics.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">All clinics are getting traction. Nice.</p>
          ) : (
            <ul className="space-y-2">
              {m.at_risk_clinics.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {c.days_since_signup}d
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    {c.admin_email && (
                      <a href={`mailto:${c.admin_email}`} className="text-xs text-brand-600 hover:underline truncate block">
                        {c.admin_email}
                      </a>
                    )}
                  </div>
                  {c.admin_email && (
                    <a href={`mailto:${c.admin_email}?subject=Welcome to Tenivra — getting your first patients`}>
                      <Button variant="secondary" size="sm">Email</Button>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent signups */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">New Clinics This Week</h2>
          <p className="text-sm text-slate-500 mb-4">Reach out and welcome them.</p>
          {m.recent_clinics.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No new clinics this week.</p>
          ) : (
            <ul className="space-y-1">
              {m.recent_clinics.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold flex items-center justify-center">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/clinic/${c.slug}`} target="_blank" className="font-semibold text-slate-700 hover:text-brand-600 truncate block">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-400">{relativeTime(c.signed_up_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">New Patients This Week</h2>
          <p className="text-sm text-slate-500 mb-4">Demand-side growth signal.</p>
          {m.recent_patients.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No new patients this week.</p>
          ) : (
            <ul className="space-y-1">
              {m.recent_patients.map(p => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center">
                    {p.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                  </div>
                  <span className="text-xs text-slate-400">{relativeTime(p.signed_up_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
