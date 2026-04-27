"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { isAnalyticsEnabled } from "@/lib/analytics";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";

// ── Types ───────────────────────────────────────────────────────────────
interface MetricDelta { current: number; previous: number; }
interface TrendPoint { date: string; clinics: number; patients: number; bookings: number; }
interface TopClinic { id: string; name: string; slug: string; booking_count: number; last_booking_at: string | null; }
interface AtRiskClinic { id: string; name: string; slug: string; signed_up_at: string; days_since_signup: number; admin_email?: string | null; }
interface RecentClinic { id: string; name: string; slug: string; signed_up_at: string; }
interface RecentPatient { id: string; full_name: string; email: string; signed_up_at: string; }
interface FunnelStage { label: string; count: number; pct_of_top: number; }
interface CohortRow { cohort_label: string; cohort_size: number; weeks: (number | null)[]; }
interface CityStat { city: string; clinic_count: number; patient_count: number; }
interface RevenueMetrics { mrr_cents: number; paying_clinics: number; trial_clinics: number; arpa_cents: number; }
interface DigestPreview { subject: string; period_label: string; summary_lines: string[]; body_html: string; body_text: string; generated_at: string; }
interface Metrics {
  days_window: number;
  total_clinics: number; active_clinics: number; total_patients: number;
  total_bookings: number; pending_bookings: number;
  avg_bookings_per_active_clinic: number;
  clinics_added: MetricDelta;
  patients_added: MetricDelta;
  bookings: MetricDelta;
  trend: TrendPoint[];
  top_clinics: TopClinic[];
  at_risk_clinics: AtRiskClinic[];
  recent_clinics: RecentClinic[];
  recent_patients: RecentPatient[];
  funnel: FunnelStage[];
  cohorts: CohortRow[];
  cities: CityStat[];
  revenue: RevenueMetrics;
}

// ── Helpers ─────────────────────────────────────────────────────────────
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

function formatINR(cents: number): string {
  const rupees = cents / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${rupees.toFixed(0)}`;
}

// ── Reusable widgets ────────────────────────────────────────────────────
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

function FunnelWidget({ stages }: { stages: FunnelStage[] }) {
  const colors = ["from-brand-500 to-brand-700", "from-violet-500 to-purple-700", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];
  const top = stages[0]?.count || 1;
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const conv = i === 0 ? 100 : Math.round((s.count / top) * 100);
        const fromPrev = i === 0 ? null : (stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : 0);
        return (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
              <span className="text-sm tabular-nums">
                <span className="font-bold text-slate-900">{s.count}</span>
                <span className="text-slate-400 ml-2 text-xs">{conv}% of top{fromPrev !== null && ` · ${fromPrev}% from prev`}</span>
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(2, conv)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CohortHeatmap({ rows }: { rows: CohortRow[] }) {
  const weeks = rows[0]?.weeks.length || 6;
  const cellColor = (v: number | null) => {
    if (v === null) return "bg-slate-50 text-slate-300";
    if (v === 0) return "bg-slate-100 text-slate-400";
    if (v < 25) return "bg-brand-100 text-brand-700";
    if (v < 50) return "bg-brand-300 text-brand-900";
    if (v < 75) return "bg-brand-500 text-white";
    return "bg-brand-700 text-white";
  };
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-xs border-separate" style={{ borderSpacing: "4px" }}>
        <thead>
          <tr>
            <th className="text-left font-semibold text-slate-500 pr-2">Cohort</th>
            <th className="text-left font-semibold text-slate-500 pr-2">Size</th>
            {Array.from({ length: weeks }).map((_, i) => (
              <th key={i} className="font-semibold text-slate-500 text-center">W{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="font-medium text-slate-700 pr-2 whitespace-nowrap">{r.cohort_label}</td>
              <td className="text-slate-500 pr-2">{r.cohort_size}</td>
              {r.weeks.map((v, j) => (
                <td key={j} className={`text-center font-semibold rounded ${cellColor(v)}`}
                    style={{ minWidth: 36, height: 28 }}>
                  {v === null ? "" : v === 0 ? "—" : `${v}%`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-400 mt-2">% of cohort with at least one booking that week. Darker = more retention.</p>
    </div>
  );
}

function CitiesWidget({ cities }: { cities: CityStat[] }) {
  const max = Math.max(1, ...cities.map(c => c.clinic_count));
  if (cities.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No city data yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {cities.map(c => (
        <li key={c.city} className="flex items-center gap-3">
          <span className="w-24 text-sm font-medium text-slate-700 truncate">{c.city}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
              style={{ width: `${(c.clinic_count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums text-slate-600 w-20 text-right">
            <span className="font-bold">{c.clinic_count}</span>
            <span className="text-xs text-slate-400 ml-1">clinic{c.clinic_count !== 1 ? "s" : ""}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function DigestModal({ onClose, token }: { onClose: () => void; token: string }) {
  const [period, setPeriod] = useState<"daily" | "weekly">("weekly");
  const [data, setData] = useState<DigestPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<DigestPreview>(`/api/admin/digest/preview?period=${period}`, token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, token]);

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(`${data.subject}\n\n${data.body_text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Email digest preview</h3>
            <p className="text-sm text-slate-500">What your daily/weekly summary email looks like</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${period === "daily" ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Daily
            </button>
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${period === "weekly" ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Weekly
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !data ? <Spinner /> : (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</div>
              <div className="text-sm font-bold text-slate-800 mb-4 p-3 bg-slate-50 rounded-lg">{data.subject}</div>
              <div className="border rounded-xl overflow-hidden bg-slate-50">
                <div dangerouslySetInnerHTML={{ __html: data.body_html }} />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between text-xs">
          <p className="text-slate-500">
            To enable real delivery, set <code className="bg-white px-1.5 py-0.5 rounded">SMTP_*</code> env vars and run a daily/weekly cron hitting this endpoint.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={copy}>{copied ? "Copied!" : "Copy plain text"}</Button>
            <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { v: 7, label: "Last 7 days" },
  { v: 30, label: "Last 30 days" },
  { v: 90, label: "Last 90 days" },
  { v: 365, label: "Last year" },
];

export default function SuperDashboard() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDigest, setShowDigest] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get<Metrics>(`/api/admin/metrics?days=${days}`, token)
      .then(setM)
      .finally(() => setLoading(false));
  }, [token, days]);

  if (loading && !m) return <Spinner />;
  if (!m) return <EmptyState message="Failed to load metrics" />;

  const totalEvents = m.trend.reduce(
    (acc, d) => acc + d.clinics + d.patients + d.bookings, 0,
  );
  const analyticsOn = isAnalyticsEnabled();

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
            <p className="text-violet-200 mt-1">{m.total_clinics} clinics · {m.total_patients} patients · {m.total_bookings} bookings to date.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-white/15 border border-white/20 backdrop-blur text-white text-sm font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              {RANGE_OPTIONS.map(o => (
                <option key={o.v} value={o.v} className="text-slate-900">{o.label}</option>
              ))}
            </select>
            <Button variant="secondary" size="md" className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur" onClick={() => setShowDigest(true)}>
              Preview Digest
            </Button>
            <Link href="/super/clinics">
              <Button variant="secondary" size="md" className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur">
                Manage Clinics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Integration status strip */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold ${analyticsOn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${analyticsOn ? "bg-emerald-500" : "bg-slate-400"}`} />
          PostHog: {analyticsOn ? "Live" : "Add NEXT_PUBLIC_POSTHOG_KEY to enable"}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-slate-100 text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Stripe: not configured (plans tracked manually for now)
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-slate-100 text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Email: preview only (no SMTP set)
        </span>
      </div>

      {/* KPI cards (now 8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="MRR" value={formatINR(m.revenue.mrr_cents)} hint={`${m.revenue.paying_clinics} paying · ${m.revenue.trial_clinics} on trial`} accent="from-emerald-600 to-emerald-800" />
        <StatCard label="Clinics" value={m.total_clinics} delta={m.clinics_added} accent="from-amber-500 to-orange-600" />
        <StatCard label="Patients" value={m.total_patients} delta={m.patients_added} accent="from-emerald-500 to-teal-600" />
        <StatCard label="Bookings" value={m.total_bookings} delta={m.bookings} accent="from-brand-500 to-brand-700" />
        <StatCard label="Active Clinics (7d)" value={`${m.active_clinics}/${m.total_clinics}`} hint="Booked in last 7 days" accent="from-violet-500 to-purple-700" />
        <StatCard label="Avg Bookings / Active" value={m.avg_bookings_per_active_clinic} hint="Last 7 days" accent="from-pink-500 to-rose-600" />
        <StatCard label="ARPA" value={formatINR(m.revenue.arpa_cents)} hint="Avg revenue per paying clinic" accent="from-cyan-500 to-blue-700" />
        <StatCard label="Pending Approvals" value={m.pending_bookings} hint="Across all clinics" accent="from-slate-700 to-slate-900" />
      </div>

      {/* Trend chart */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Activity trend</h2>
            <p className="text-sm text-slate-500">Daily clinic signups, patient signups, and bookings</p>
          </div>
          <p className="text-xs text-slate-400">{totalEvents} total events over {m.days_window} days</p>
        </div>
        <TrendChart data={m.trend} />
      </Card>

      {/* Funnel + Cohort */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Activation funnel</h2>
              <p className="text-sm text-slate-500">How many clinics make it to engaged</p>
            </div>
            <Badge className="bg-brand-100 text-brand-700">leak detection</Badge>
          </div>
          <FunnelWidget stages={m.funnel} />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Cohort retention</h2>
              <p className="text-sm text-slate-500">Weekly clinic signup cohorts (last 6 weeks)</p>
            </div>
            <Badge className="bg-violet-100 text-violet-700">stickiness</Badge>
          </div>
          {m.cohorts.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Not enough data yet.</p>
          ) : (
            <CohortHeatmap rows={m.cohorts} />
          )}
        </Card>
      </div>

      {/* Power Users + At-risk */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Power Users</h2>
              <p className="text-sm text-slate-500">Top clinics by bookings (last {m.days_window} days). Click to drill down.</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">case studies</Badge>
          </div>
          {m.top_clinics.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No bookings in this window yet.</p>
          ) : (
            <ul className="space-y-1">
              {m.top_clinics.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/super/clinics/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                      {c.last_booking_at && (
                        <p className="text-xs text-slate-400">last booked {relativeTime(c.last_booking_at)}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{c.booking_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

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
            <ul className="space-y-1">
              {m.at_risk_clinics.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                  <Link href={`/super/clinics/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {c.days_since_signup}d
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                      {c.admin_email && (
                        <span className="text-xs text-slate-500 truncate block">{c.admin_email}</span>
                      )}
                    </div>
                  </Link>
                  {c.admin_email && (
                    <a href={`mailto:${c.admin_email}?subject=Welcome to Tenivra — getting your first patients`} onClick={e => e.stopPropagation()}>
                      <Button variant="secondary" size="sm">Email</Button>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Cities + Recent signups */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Where you're winning</h2>
          <p className="text-sm text-slate-500 mb-4">Top cities by clinic count</p>
          <CitiesWidget cities={m.cities} />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">New Clinics This Week</h2>
          <p className="text-sm text-slate-500 mb-4">Reach out and welcome them.</p>
          {m.recent_clinics.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No new clinics this week.</p>
          ) : (
            <ul className="space-y-1">
              {m.recent_clinics.map(c => (
                <li key={c.id}>
                  <Link href={`/super/clinics/${c.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold flex items-center justify-center">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{relativeTime(c.signed_up_at)}</p>
                    </div>
                  </Link>
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

      {showDigest && token && <DigestModal token={token} onClose={() => setShowDigest(false)} />}
    </div>
  );
}
